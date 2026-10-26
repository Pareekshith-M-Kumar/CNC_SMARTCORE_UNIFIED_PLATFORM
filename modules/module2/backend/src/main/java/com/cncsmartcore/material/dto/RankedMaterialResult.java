package com.cncsmartcore.material.dto;

import java.util.List;
import java.util.UUID;

public record RankedMaterialResult(
    int rank,
    UUID materialId,
    String code,
    String name,
    String category,
    double score,
    int strengthRating,
    int lightnessRating,
    int corrosionRating,
    int machinabilityRating,
    int costLevel,
    double costPerKg,
    List<String> reasons,
    List<String> warnings
) {}
