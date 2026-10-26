package com.cncsmartcore.asset.dto;

import com.cncsmartcore.asset.AssetStatus;
import java.time.Instant;
import java.util.UUID;

public record AssetResponse(
    UUID id,
    String assetTag,
    UUID orderId,
    String orderNo,
    String assetKind,
    AssetStatus status,
    UUID ownerId,
    String ownerName,
    String serialNo,
    boolean registered,
    Instant registeredAt,
    boolean integrityOk,
    String planHash,
    String machineCode,
    boolean machineLinked,
    Instant createdAt,
    Instant updatedAt
) {}
