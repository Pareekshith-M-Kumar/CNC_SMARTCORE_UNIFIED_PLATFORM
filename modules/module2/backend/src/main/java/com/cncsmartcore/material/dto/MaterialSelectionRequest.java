package com.cncsmartcore.material.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record MaterialSelectionRequest(
    @NotNull(message = "Material ID is required")
    UUID materialId
) {}
