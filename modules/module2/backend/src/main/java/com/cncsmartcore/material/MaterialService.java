package com.cncsmartcore.material;

import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.cad.CadVersion;
import com.cncsmartcore.cad.CadVersionRepository;
import com.cncsmartcore.cad.dto.CadVersionResponse;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.material.dto.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class MaterialService {

    private final MaterialRepository materialRepository;
    private final MaterialRecommendationRepository recommendationRepository;
    private final CadVersionRepository cadVersionRepository;
    private final MaterialScoringRules scoringRules;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public MaterialService(MaterialRepository materialRepository,
                           MaterialRecommendationRepository recommendationRepository,
                           CadVersionRepository cadVersionRepository,
                           MaterialScoringRules scoringRules,
                           AuditService auditService,
                           ObjectMapper objectMapper) {
        this.materialRepository = materialRepository;
        this.recommendationRepository = recommendationRepository;
        this.cadVersionRepository = cadVersionRepository;
        this.scoringRules = scoringRules;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> getAllActiveMaterials() {
        return materialRepository.findAllByIsActiveTrue().stream()
                .map(MaterialResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public MaterialResponse getMaterialById(UUID id) {
        Material m = materialRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found: " + id));
        return MaterialResponse.from(m);
    }

    @Transactional
    public MaterialRecommendationResponse generateRecommendation(UUID cadVersionId,
                                                                 MaterialRecommendationRequest request,
                                                                 CurrentUser currentUser) {
        CadVersion version = cadVersionRepository.findById(cadVersionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD version not found: " + cadVersionId));

        List<Material> materials = materialRepository.findAllByIsActiveTrue();
        if (materials.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Material catalog is empty");
        }

        List<RankedMaterialResult> results = scoringRules.rankMaterials(materials, request);

        String inputsJson;
        String resultsJson;
        try {
            inputsJson = objectMapper.writeValueAsString(request);
            resultsJson = objectMapper.writeValueAsString(results);
        } catch (JsonProcessingException e) {
            inputsJson = "{}";
            resultsJson = "[]";
        }

        UUID actorId = currentUser != null ? currentUser.id() : version.getUploadedBy();
        MaterialRecommendation recommendation = new MaterialRecommendation(
                cadVersionId,
                actorId,
                inputsJson,
                resultsJson
        );
        recommendation = recommendationRepository.save(recommendation);

        return new MaterialRecommendationResponse(
                recommendation.getId(),
                cadVersionId,
                recommendation.getAlgorithmVersion(),
                MaterialScoringRules.LABEL,
                request,
                results,
                recommendation.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public Optional<MaterialRecommendationResponse> getLatestRecommendation(UUID cadVersionId) {
        return recommendationRepository.findTopByCadVersionIdOrderByCreatedAtDesc(cadVersionId)
                .map(r -> {
                    MaterialRecommendationRequest inputs;
                    List<RankedMaterialResult> results;
                    try {
                        inputs = objectMapper.readValue(r.getInputs(), MaterialRecommendationRequest.class);
                        results = objectMapper.readValue(r.getResults(), new TypeReference<List<RankedMaterialResult>>() {});
                    } catch (Exception e) {
                        inputs = new MaterialRecommendationRequest("BALANCED", "INDOOR", "GENERAL", null);
                        results = List.of();
                    }
                    return new MaterialRecommendationResponse(
                            r.getId(),
                            r.getCadVersionId(),
                            r.getAlgorithmVersion(),
                            MaterialScoringRules.LABEL,
                            inputs,
                            results,
                            r.getCreatedAt()
                    );
                });
    }

    @Transactional
    public CadVersionResponse selectMaterial(UUID cadVersionId, UUID materialId, CurrentUser currentUser) {
        CadVersion version = cadVersionRepository.findById(cadVersionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD version not found: " + cadVersionId));

        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found: " + materialId));

        version.setSelectedMaterialId(material.getId());
        version = cadVersionRepository.save(version);

        UUID actorId = currentUser != null ? currentUser.id() : version.getUploadedBy();
        String actorRole = currentUser != null ? currentUser.role() : "designer";
        Map<String, Object> details = Map.of(
                "selectedMaterialCode", material.getCode(),
                "selectedMaterialId", material.getId().toString()
        );
        auditService.logEvent(actorId, actorRole, "MATERIAL_SELECTED", "CAD_VERSION", version.getId(), details, null);

        return CadVersionResponse.from(version);
    }
}
