package com.cncsmartcore.cam.dto;

import com.cncsmartcore.cam.ToolpathOperation;
import java.util.UUID;

public record ToolpathOperationResponse(
    UUID id,
    int seq,
    String opType,
    UUID toolId,
    int spindleRpm,
    double feedMmMin,
    double plungeFeedMmMin,
    double apMm,
    double aeMm,
    double finishAllowanceMm,
    String parametersSource,
    Double pathLengthMm,
    Double cuttingLengthMm,
    Double rapidLengthMm,
    Integer moveCount,
    Double estTimeS,
    Double estPowerKw
) {
    public static ToolpathOperationResponse from(ToolpathOperation op) {
        return new ToolpathOperationResponse(
            op.getId(),
            op.getSeq(),
            op.getOpType(),
            op.getToolId(),
            op.getSpindleRpm(),
            op.getFeedMmMin(),
            op.getPlungeFeedMmMin(),
            op.getApMm(),
            op.getAeMm(),
            op.getFinishAllowanceMm(),
            op.getParametersSource(),
            op.getPathLengthMm(),
            op.getCuttingLengthMm(),
            op.getRapidLengthMm(),
            op.getMoveCount(),
            op.getEstTimeS(),
            op.getEstPowerKw()
        );
    }
}
