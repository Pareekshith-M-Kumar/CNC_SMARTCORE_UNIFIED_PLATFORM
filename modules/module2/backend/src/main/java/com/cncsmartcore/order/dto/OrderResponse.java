package com.cncsmartcore.order.dto;

import com.cncsmartcore.order.OrderStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    String orderNo,
    UUID approvalId,
    String planHash,
    int quantity,
    OrderStatus status,
    UUID recipientId,
    String recipientName,
    UUID createdBy,
    Instant createdAt,
    Instant updatedAt,
    List<String> assetTags
) {}
