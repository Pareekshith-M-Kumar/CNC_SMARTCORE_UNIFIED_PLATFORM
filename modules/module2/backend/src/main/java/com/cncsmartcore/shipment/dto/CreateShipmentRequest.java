package com.cncsmartcore.shipment.dto;

public record CreateShipmentRequest(
    String carrierLabel,
    String trackingNo
) {}
