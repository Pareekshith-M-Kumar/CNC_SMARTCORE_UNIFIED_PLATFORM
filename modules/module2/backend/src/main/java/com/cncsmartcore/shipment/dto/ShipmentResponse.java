package com.cncsmartcore.shipment.dto;

import com.cncsmartcore.shipment.ShipmentStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ShipmentResponse(
    UUID id,
    String shipmentNo,
    UUID orderId,
    String orderNo,
    ShipmentStatus status,
    String carrierLabel,
    String trackingNo,
    Instant createdAt,
    Instant updatedAt,
    List<ShipmentEventDto> events
) {}
