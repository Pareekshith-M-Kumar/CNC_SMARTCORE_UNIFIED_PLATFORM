package com.cncsmartcore.shipment.dto;

public record TransitionShipmentRequest(
    String toStatus,
    String note
) {}
