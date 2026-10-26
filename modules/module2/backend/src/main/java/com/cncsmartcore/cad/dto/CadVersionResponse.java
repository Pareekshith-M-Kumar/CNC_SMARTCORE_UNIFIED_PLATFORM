package com.cncsmartcore.cad.dto;

import com.cncsmartcore.cad.CadVersion;
import java.time.Instant;
import java.util.UUID;

public record CadVersionResponse(
    UUID id,
    UUID assetId,
    int versionNumber,
    String originalFilename,
    String fileFormat,
    long fileSizeBytes,
    String sha256,
    String units,
    String previewStatus,
    String previewPath,
    String previewError,
    int processingAttempts,
    Double bboxXMm,
    Double bboxYMm,
    Double bboxZMm,
    Double volumeMm3,
    Double surfaceAreaMm2,
    Integer triangleCount,
    Boolean isWatertight,
    UUID selectedMaterialId,
    UUID uploadedBy,
    Instant createdAt
) {
    public static CadVersionResponse from(CadVersion v) {
        return new CadVersionResponse(
            v.getId(),
            v.getAsset() != null ? v.getAsset().getId() : null,
            v.getVersionNumber(),
            v.getOriginalFilename(),
            v.getFileFormat(),
            v.getFileSizeBytes(),
            v.getSha256(),
            v.getUnits(),
            v.getPreviewStatus(),
            v.getPreviewPath(),
            v.getPreviewError(),
            v.getProcessingAttempts(),
            v.getBboxXMm(),
            v.getBboxYMm(),
            v.getBboxZMm(),
            v.getVolumeMm3(),
            v.getSurfaceAreaMm2(),
            v.getTriangleCount(),
            v.getIsWatertight(),
            v.getSelectedMaterialId(),
            v.getUploadedBy(),
            v.getCreatedAt()
        );
    }
}
