package com.cncsmartcore.approval.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ApprovalDecisionRequest(
    @NotBlank(message = "Decision must be APPROVED or REJECTED")
    String decision,

    @NotBlank(message = "Decision comment is required")
    @Size(min = 10, message = "Decision comment must be at least 10 characters long")
    String comment
) {}
