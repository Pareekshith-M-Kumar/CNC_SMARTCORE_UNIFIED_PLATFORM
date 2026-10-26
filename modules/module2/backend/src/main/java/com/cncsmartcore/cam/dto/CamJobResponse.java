package com.cncsmartcore.cam.dto;

import com.cncsmartcore.cam.CamJob;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CamJobResponse(
    UUID id,
    UUID cadVersionId,
    UUID materialId,
    UUID machineId,
    UUID createdBy,
    String name,
    String status,
    double stockAllowanceMm,
    Double stockXMm,
    Double stockYMm,
    Double stockZMm,
    double setupTimeMin,
    CamEstimatesResponse estimates,
    String configHash,
    int generationAttempts,
    String lastError,
    int rowVersion,
    List<ToolpathOperationResponse> operations,
    Instant createdAt,
    Instant updatedAt
) {
    public static CamJobResponse from(CamJob job, ObjectMapper objectMapper) {
        CamEstimatesResponse parsedEstimates = null;
        if (job.getEstimates() != null && !job.getEstimates().isBlank()) {
            try {
                parsedEstimates = objectMapper.readValue(job.getEstimates(), CamEstimatesResponse.class);
            } catch (Exception ignored) {}
        }

        List<ToolpathOperationResponse> opResponses = job.getOperations() != null
                ? job.getOperations().stream().map(ToolpathOperationResponse::from).toList()
                : List.of();

        return new CamJobResponse(
            job.getId(),
            job.getCadVersionId(),
            job.getMaterialId(),
            job.getMachineId(),
            job.getCreatedBy(),
            job.getName(),
            job.getStatus(),
            job.getStockAllowanceMm(),
            job.getStockXMm(),
            job.getStockYMm(),
            job.getStockZMm(),
            job.getSetupTimeMin(),
            parsedEstimates,
            job.getConfigHash(),
            job.getGenerationAttempts(),
            job.getLastError(),
            job.getRowVersion(),
            opResponses,
            job.getCreatedAt(),
            job.getUpdatedAt()
        );
    }
}
