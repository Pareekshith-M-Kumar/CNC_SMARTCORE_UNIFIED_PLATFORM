package com.cncsmartcore.material;

import com.cncsmartcore.cad.dto.CadVersionResponse;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.material.dto.MaterialRecommendationRequest;
import com.cncsmartcore.material.dto.MaterialRecommendationResponse;
import com.cncsmartcore.material.dto.MaterialResponse;
import com.cncsmartcore.material.dto.MaterialSelectionRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class MaterialController {

    private final MaterialService materialService;

    public MaterialController(MaterialService materialService) {
        this.materialService = materialService;
    }

    @GetMapping("/materials")
    public List<MaterialResponse> listMaterials() {
        return materialService.getAllActiveMaterials();
    }

    @GetMapping("/materials/{id}")
    public MaterialResponse getMaterial(@PathVariable UUID id) {
        return materialService.getMaterialById(id);
    }

    @PostMapping("/cad-versions/{cadVersionId}/material-recommendations")
    public ResponseEntity<MaterialRecommendationResponse> recommendMaterials(
            @PathVariable UUID cadVersionId,
            @Valid @RequestBody MaterialRecommendationRequest request,
            @AuthenticationPrincipal CurrentUser currentUser) {
        MaterialRecommendationResponse response = materialService.generateRecommendation(cadVersionId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/cad-versions/{cadVersionId}/material-recommendations")
    public MaterialRecommendationResponse getLatestRecommendation(@PathVariable UUID cadVersionId) {
        return materialService.getLatestRecommendation(cadVersionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No recommendations found for CAD version: " + cadVersionId));
    }

    @PutMapping("/cad-versions/{cadVersionId}/material-selection")
    public CadVersionResponse selectMaterial(
            @PathVariable UUID cadVersionId,
            @Valid @RequestBody MaterialSelectionRequest request,
            @AuthenticationPrincipal CurrentUser currentUser) {
        return materialService.selectMaterial(cadVersionId, request.materialId(), currentUser);
    }
}
