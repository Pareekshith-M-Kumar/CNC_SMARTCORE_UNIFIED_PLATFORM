package com.cncsmartcore.cam.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.UUID;

public record OperationConfigRequest(
    int seq,

    @NotNull(message = "Operation type is required")
    String opType, // FACE, ROUGH_POCKET, CONTOUR, DRILL

    @NotNull(message = "Tool ID is required")
    UUID toolId,

    @Positive(message = "Spindle RPM must be positive")
    Integer spindleRpm,

    @Positive(message = "Feed rate must be positive")
    Double feedMmMin,

    @Positive(message = "Plunge feed rate must be positive")
    Double plungeFeedMmMin,

    @Positive(message = "Depth of cut (ap) must be positive")
    Double apMm,

    @Positive(message = "Width of cut (ae) must be positive")
    Double aeMm,

    Double finishAllowanceMm,

    String parametersSource // CALCULATED, EDITED
) {}
