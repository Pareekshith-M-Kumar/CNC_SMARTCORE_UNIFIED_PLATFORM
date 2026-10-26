package com.cncsmartcore.cad;

import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.cad.dto.CadAssetResponse;
import com.cncsmartcore.cad.dto.CadProcessResult;
import com.cncsmartcore.cad.dto.CadVersionResponse;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.storage.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CadAssetService {

    private static final Logger log = LoggerFactory.getLogger(CadAssetService.class);

    private final CadAssetRepository cadAssetRepository;
    private final CadVersionRepository cadVersionRepository;
    private final CadUploadValidator cadUploadValidator;
    private final HashingService hashingService;
    private final StorageService storageService;
    private final GeometryClient geometryClient;
    private final AuditService auditService;

    public CadAssetService(CadAssetRepository cadAssetRepository,
                           CadVersionRepository cadVersionRepository,
                           CadUploadValidator cadUploadValidator,
                           HashingService hashingService,
                           StorageService storageService,
                           GeometryClient geometryClient,
                           AuditService auditService) {
        this.cadAssetRepository = cadAssetRepository;
        this.cadVersionRepository = cadVersionRepository;
        this.cadUploadValidator = cadUploadValidator;
        this.hashingService = hashingService;
        this.storageService = storageService;
        this.geometryClient = geometryClient;
        this.auditService = auditService;
    }

    @Transactional
    public CadAssetResponse createAsset(MultipartFile file, String name, String description, CurrentUser currentUser) {
        CadUploadValidator.ValidatedCadFile validated = cadUploadValidator.validate(file);
        String sha256 = hashingService.computeSha256(validated.content());

        String assetName = (name != null && !name.isBlank()) ? name.trim() : validated.originalFilename();

        CadAsset asset = new CadAsset(currentUser.id(), assetName, description);

        UUID versionId = UUID.randomUUID();
        String storagePath = storageService.buildOriginalPath(asset.getId(), versionId, validated.originalFilename());
        storageService.storeFile("cad-originals", storagePath, validated.content(), "application/octet-stream");

        CadVersion version = new CadVersion(
                asset,
                1,
                validated.originalFilename(),
                validated.format(),
                validated.sizeBytes(),
                sha256,
                "cad-originals",
                storagePath,
                currentUser.id()
        );
        version.setId(versionId);
        asset.addVersion(version);
        asset = cadAssetRepository.save(asset);

        auditService.logEvent(
                currentUser.id(),
                currentUser.role(),
                "CAD_UPLOADED",
                "CAD_ASSET",
                asset.getId(),
                Map.of("filename", validated.originalFilename(), "format", validated.format(), "sha256", sha256),
                null
        );

        // Process CAD geometry and preview
        processVersionGeometry(version.getId(), validated.content(), validated.originalFilename(), validated.format(), version.getUnits());

        return CadAssetResponse.from(cadAssetRepository.findById(asset.getId()).orElse(asset));
    }

    @Transactional
    public CadVersionResponse createNewVersion(UUID assetId, MultipartFile file, CurrentUser currentUser) {
        CadAsset asset = cadAssetRepository.findById(assetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD asset not found"));

        checkAssetAccess(asset, currentUser, true);

        CadUploadValidator.ValidatedCadFile validated = cadUploadValidator.validate(file);
        String sha256 = hashingService.computeSha256(validated.content());

        List<CadVersion> existingVersions = cadVersionRepository.findByAssetIdOrderByVersionNumberDesc(assetId);
        int nextVersionNumber = existingVersions.isEmpty() ? 1 : existingVersions.get(0).getVersionNumber() + 1;

        UUID versionId = UUID.randomUUID();
        String storagePath = storageService.buildOriginalPath(assetId, versionId, validated.originalFilename());
        storageService.storeFile("cad-originals", storagePath, validated.content(), "application/octet-stream");

        CadVersion version = new CadVersion(
                asset,
                nextVersionNumber,
                validated.originalFilename(),
                validated.format(),
                validated.sizeBytes(),
                sha256,
                "cad-originals",
                storagePath,
                currentUser.id()
        );
        version.setId(versionId);
        asset.addVersion(version);
        asset = cadAssetRepository.save(asset);

        auditService.logEvent(
                currentUser.id(),
                currentUser.role(),
                "CAD_VERSION_CREATED",
                "CAD_VERSION",
                version.getId(),
                Map.of("assetId", assetId.toString(), "versionNumber", nextVersionNumber, "sha256", sha256),
                null
        );

        processVersionGeometry(version.getId(), validated.content(), validated.originalFilename(), validated.format(), version.getUnits());

        return CadVersionResponse.from(cadVersionRepository.findById(version.getId()).orElse(version));
    }

    @Transactional(readOnly = true)
    public List<CadAssetResponse> listAssets(CurrentUser currentUser) {
        List<CadAsset> assets;
        if ("designer".equalsIgnoreCase(currentUser.role())) {
            assets = cadAssetRepository.findByOwnerIdOrderByCreatedAtDesc(currentUser.id());
        } else {
            assets = cadAssetRepository.findAllByOrderByCreatedAtDesc();
        }
        return assets.stream().map(CadAssetResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CadAssetResponse getAsset(UUID assetId, CurrentUser currentUser) {
        CadAsset asset = cadAssetRepository.findById(assetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD asset not found"));
        checkAssetAccess(asset, currentUser, false);
        return CadAssetResponse.from(asset);
    }

    @Transactional(readOnly = true)
    public CadVersionResponse getVersion(UUID versionId, CurrentUser currentUser) {
        CadVersion version = cadVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD version not found"));
        checkAssetAccess(version.getAsset(), currentUser, false);
        return CadVersionResponse.from(version);
    }

    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID versionId, CurrentUser currentUser) {
        CadVersion version = cadVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD version not found"));
        checkAssetAccess(version.getAsset(), currentUser, false);

        auditService.logEvent(
                currentUser.id(),
                currentUser.role(),
                "CAD_DOWNLOADED",
                "CAD_VERSION",
                version.getId(),
                Map.of("filename", version.getOriginalFilename(), "sha256", version.getSha256()),
                null
        );

        return storageService.generateSignedDownloadUrl(version.getStorageBucket(), version.getStoragePath(), 300);
    }

    @Transactional(readOnly = true)
    public String getPreviewUrl(UUID versionId, CurrentUser currentUser) {
        CadVersion version = cadVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD version not found"));
        checkAssetAccess(version.getAsset(), currentUser, false);

        if ("READY".equals(version.getPreviewStatus()) && version.getPreviewPath() != null) {
            return storageService.generateSignedDownloadUrl("cad-previews", version.getPreviewPath(), 300);
        }
        return null;
    }

    @Transactional
    public void processVersionGeometry(UUID versionId, byte[] content, String filename, String format, String units) {
        CadVersion version = cadVersionRepository.findById(versionId).orElse(null);
        if (version == null) return;

        CadProcessResult result = geometryClient.processCadFile(content, filename, format, units);

        version.setPreviewStatus(result.previewStatus());
        version.setPreviewError(result.previewError());
        version.setBboxXMm(result.bboxXMm());
        version.setBboxYMm(result.bboxYMm());
        version.setBboxZMm(result.bboxZMm());
        version.setVolumeMm3(result.volumeMm3());
        version.setSurfaceAreaMm2(result.surfaceAreaMm2());
        version.setTriangleCount(result.triangleCount());
        version.setIsWatertight(result.isWatertight());

        if (result.previewGlbBase64() != null && !result.previewGlbBase64().isBlank()) {
            try {
                byte[] glbBytes = Base64.getDecoder().decode(result.previewGlbBase64());
                String previewPath = storageService.buildPreviewPath(versionId);
                storageService.storeFile("cad-previews", previewPath, glbBytes, "model/gltf-binary");
                version.setPreviewPath(previewPath);
            } catch (IllegalArgumentException e) {
                log.warn("Failed to decode preview GLB base64: {}", e.getMessage());
            }
        }

        cadVersionRepository.save(version);
    }

    private void checkAssetAccess(CadAsset asset, CurrentUser user, boolean requiresWrite) {
        if ("admin".equalsIgnoreCase(user.role())) {
            return;
        }

        if (requiresWrite) {
            if ("designer".equalsIgnoreCase(user.role()) && !asset.getOwnerId().equals(user.id())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD asset not found");
            }
            if ("approver".equalsIgnoreCase(user.role())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Approvers cannot create or edit CAD assets");
            }
        } else {
            if ("designer".equalsIgnoreCase(user.role()) && !asset.getOwnerId().equals(user.id())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD asset not found");
            }
        }
    }
}
