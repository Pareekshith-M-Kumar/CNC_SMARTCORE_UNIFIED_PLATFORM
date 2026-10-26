package com.cncsmartcore.approval.dto;

import java.time.Instant;
import java.util.UUID;

public record ApprovalResponse(
    UUID id,
    UUID camJobId,
    String camJobName,
    UUID cadVersionId,
    Integer cadVersionNumber,
    String originalFilename,
    String cadSha256,
    UUID simulationId,
    String simulationResult,
    String status,
    UUID submittedBy,
    String submittedByName,
    Instant submittedAt,
    String submitNote,
    UUID decidedBy,
    String decidedByName,
    Instant decidedAt,
    String decisionComment,
    Boolean integrityVerified,
    Instant integrityCheckedAt,
    String planHash,
    boolean hasPlanSnapshot,
    int rowVersion
) {}
