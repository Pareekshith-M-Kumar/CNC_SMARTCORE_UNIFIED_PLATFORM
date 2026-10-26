package com.cncsmartcore.cam.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateCamJobRequest(
    @NotNull(message = "CAD Version ID is required")
    UUID cadVersionId,

    @NotBlank(message = "Job name is required")
    String name,

    UUID materialId,

    @NotNull(message = "Machine Profile ID is required")
    UUID machineId
) {}
