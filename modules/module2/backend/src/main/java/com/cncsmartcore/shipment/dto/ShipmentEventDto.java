package com.cncsmartcore.shipment.dto;

import java.time.Instant;
import java.util.UUID;

public record ShipmentEventDto(
    Long id,
    UUID shipmentId,
    String fromStatus,
    String toStatus,
    UUID actorId,
    String note,
    Instant createdAt
) {}
