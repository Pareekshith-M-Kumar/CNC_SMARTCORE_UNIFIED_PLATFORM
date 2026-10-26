package com.cncsmartcore.cad.dto;

public record CadProcessResult(
    String sha256,
    String previewStatus,
    String previewError,
    Double bboxXMm,
    Double bboxYMm,
    Double bboxZMm,
    Double volumeMm3,
    Double surfaceAreaMm2,
    Integer triangleCount,
    Boolean isWatertight,
    String previewGlbBase64,
    java.util.List<String> warnings
) {}
