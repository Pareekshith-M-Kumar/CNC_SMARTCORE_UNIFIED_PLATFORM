package com.cncsmartcore.cad.dto;

import com.cncsmartcore.cad.CadAsset;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CadAssetResponse(
    UUID id,
    UUID ownerId,
    String name,
    String description,
    Instant archivedAt,
    Instant createdAt,
    Instant updatedAt,
    List<CadVersionResponse> versions,
    CadVersionResponse latestVersion
) {
    public static CadAssetResponse from(CadAsset asset) {
        List<CadVersionResponse> versionResponses = asset.getVersions().stream()
                .map(CadVersionResponse::from)
                .toList();
        CadVersionResponse latest = versionResponses.isEmpty() ? null : versionResponses.get(0);

        return new CadAssetResponse(
            asset.getId(),
            asset.getOwnerId(),
            asset.getName(),
            asset.getDescription(),
            asset.getArchivedAt(),
            asset.getCreatedAt(),
            asset.getUpdatedAt(),
            versionResponses,
            latest
        );
    }
}
