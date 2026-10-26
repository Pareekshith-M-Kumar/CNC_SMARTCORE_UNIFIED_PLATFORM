package com.cncsmartcore.material.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MaterialRecommendationResponse(
    UUID id,
    UUID cadVersionId,
    String algorithmVersion,
    String label, // "Rule-based recommendation"
    MaterialRecommendationRequest inputs,
    List<RankedMaterialResult> results,
    Instant createdAt
) {}
