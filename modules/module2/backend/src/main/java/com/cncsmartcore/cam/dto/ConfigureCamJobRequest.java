package com.cncsmartcore.cam.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

public record ConfigureCamJobRequest(
    @PositiveOrZero(message = "Stock allowance must be zero or positive")
    double stockAllowanceMm,

    @PositiveOrZero(message = "Setup time must be zero or positive")
    double setupTimeMin,

    @NotNull(message = "Operations list is required")
    @Valid
    List<OperationConfigRequest> operations
) {}
