package com.cncsmartcore.simulation.dto;

import com.cncsmartcore.simulation.SimulationFinding;
import java.util.UUID;

public record SimulationFindingDto(
    UUID id,
    String ruleCode,
    String severity,
    String message,
    Integer moveIndex,
    Double xMm,
    Double yMm,
    Double zMm
) {
    public static SimulationFindingDto from(SimulationFinding f) {
        return new SimulationFindingDto(
            f.getId(),
            f.getRuleCode(),
            f.getSeverity(),
            f.getMessage(),
            f.getMoveIndex(),
            f.getXMm(),
            f.getYMm(),
            f.getZMm()
        );
    }
}
