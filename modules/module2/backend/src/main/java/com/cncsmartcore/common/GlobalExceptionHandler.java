package com.cncsmartcore.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        List<ApiError.FieldErrorItem> fieldErrors = new ArrayList<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.add(new ApiError.FieldErrorItem(fe.getField(), fe.getDefaultMessage()));
        }

        ApiError error = ApiError.withFieldErrors(
            HttpStatus.UNPROCESSABLE_ENTITY.value(),
            "UNPROCESSABLE_ENTITY",
            "VALIDATION_FAILED",
            "Request validation failed. Please correct the highlighted errors.",
            request.getRequestURI(),
            requestId,
            fieldErrors
        );
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(error);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatusException(ResponseStatusException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        String errorName = status != null ? status.name() : "ERROR";

        ApiError error = ApiError.of(
            ex.getStatusCode().value(),
            errorName,
            errorName,
            ex.getReason() != null ? ex.getReason() : "An error occurred",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        ApiError error = ApiError.of(
            HttpStatus.NOT_FOUND.value(),
            "NOT_FOUND",
            "RESOURCE_NOT_FOUND",
            ex.getMessage(),
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        ApiError error = ApiError.of(
            HttpStatus.FORBIDDEN.value(),
            "FORBIDDEN",
            "AUTH_FORBIDDEN",
            "You do not have permission to perform this action.",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthenticationException(AuthenticationException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        ApiError error = ApiError.of(
            HttpStatus.UNAUTHORIZED.value(),
            "UNAUTHORIZED",
            "AUTH_REQUIRED",
            "Authentication required or token expired.",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        String message = "Malformed request payload or invalid parameter format.";
        if (ex.getCause() instanceof com.fasterxml.jackson.databind.exc.InvalidFormatException ife) {
            String field = ife.getPath().isEmpty() ? "property" : ife.getPath().get(0).getFieldName();
            message = "Invalid format for " + field + ": '" + ife.getValue() + "'. Expected format: " + ife.getTargetType().getSimpleName();
        }
        ApiError error = ApiError.of(
            HttpStatus.BAD_REQUEST.value(),
            "BAD_REQUEST",
            "MALFORMED_REQUEST",
            message,
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        String paramName = ex.getName();
        String message = "Parameter '" + paramName + "' has invalid format: " + ex.getValue();
        ApiError error = ApiError.of(
            HttpStatus.BAD_REQUEST.value(),
            "BAD_REQUEST",
            "TYPE_MISMATCH",
            message,
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        ApiError error = ApiError.of(
            HttpStatus.BAD_REQUEST.value(),
            "BAD_REQUEST",
            "ILLEGAL_ARGUMENT",
            ex.getMessage() != null ? ex.getMessage() : "Invalid argument provided",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiError> handleSecurityException(SecurityException ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.warn("Security violation on {} [reqId={}]: {}", request.getRequestURI(), requestId, ex.getMessage());
        ApiError error = ApiError.of(
            HttpStatus.FORBIDDEN.value(),
            "FORBIDDEN",
            "SECURITY_VIOLATION",
            "Access to the requested path is forbidden due to security constraints.",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGenericException(Exception ex, HttpServletRequest request) {
        String requestId = getRequestId(request);
        log.error("Unhandled exception processing {} [reqId={}]: {}", request.getRequestURI(), requestId, ex.getMessage(), ex);
        ApiError error = ApiError.of(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "INTERNAL_SERVER_ERROR",
            "INTERNAL_ERROR",
            "An unexpected internal error occurred. Request ID: " + requestId,
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private String getRequestId(HttpServletRequest request) {
        Object reqId = request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
        return reqId != null ? reqId.toString() : "unknown";
    }
}
