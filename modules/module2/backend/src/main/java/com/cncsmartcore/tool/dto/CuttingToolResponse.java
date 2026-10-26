package com.cncsmartcore.tool.dto;

import com.cncsmartcore.tool.CuttingTool;
import java.util.UUID;

public record CuttingToolResponse(
    UUID id,
    String name,
    String toolType,
    double diameterMm,
    int fluteCount,
    double fluteLengthMm,
    double overallLengthMm,
    String toolMaterial,
    boolean centerCutting,
    double price,
    double expectedLifeMin,
    boolean isSampleData,
    boolean isActive
) {
    public static CuttingToolResponse from(CuttingTool t) {
        return new CuttingToolResponse(
            t.getId(),
            t.getName(),
            t.getToolType(),
            t.getDiameterMm(),
            t.getFluteCount(),
            t.getFluteLengthMm(),
            t.getOverallLengthMm(),
            t.getToolMaterial(),
            t.isCenterCutting(),
            t.getPrice(),
            t.getExpectedLifeMin(),
            t.isSampleData(),
            t.isActive()
        );
    }
}
