package com.cncsmartcore.order.dto;

import java.util.UUID;

public record CreateOrderRequest(
    UUID approvalId,
    Integer quantity,
    UUID recipientId
) {}
