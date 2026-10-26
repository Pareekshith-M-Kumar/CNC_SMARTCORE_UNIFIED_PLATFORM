package com.cncsmartcore.simulation.dto;

import com.cncsmartcore.simulation.Simulation;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SimulationResponse(
    UUID id,
    UUID camJobId,
    String status,
    String overallResult,
    String rulesetVersion,
    Map<String, Object> stats,
    UUID runBy,
    Instant createdAt,
    List<SimulationFindingDto> findings
) {
    public static SimulationResponse from(Simulation sim, ObjectMapper mapper) {
        Map<String, Object> parsedStats = null;
        if (sim.getStats() != null && !sim.getStats().isBlank()) {
            try {
                parsedStats = mapper.readValue(sim.getStats(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {}
        }
        List<SimulationFindingDto> findingDtos = (sim.getFindings() != null)
            ? sim.getFindings().stream().map(SimulationFindingDto::from).toList()
            : List.of();

        return new SimulationResponse(
            sim.getId(),
            sim.getCamJobId(),
            sim.getStatus(),
            sim.getOverallResult(),
            sim.getRulesetVersion(),
            parsedStats,
            sim.getRunBy(),
            sim.getCreatedAt(),
            findingDtos
        );
    }
}
