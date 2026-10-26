package com.cncsmartcore.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
    Instant timestamp,
    int status,
    String error,
    String code,
    String message,
    String path,
    String requestId,
    List<FieldErrorItem> fieldErrors
) {
    public record FieldErrorItem(String field, String message) {}

    public static ApiError of(int status, String error, String code, String message, String path, String requestId) {
        return new ApiError(Instant.now(), status, error, code, message, path, requestId, null);
    }

    public static ApiError withFieldErrors(int status, String error, String code, String message, String path, String requestId, List<FieldErrorItem> fieldErrors) {
        return new ApiError(Instant.now(), status, error, code, message, path, requestId, fieldErrors);
    }
}
