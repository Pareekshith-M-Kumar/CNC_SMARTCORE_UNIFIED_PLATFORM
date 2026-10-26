package com.cncsmartcore.monitoring.dto;

import com.cncsmartcore.monitoring.model.Alert;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlertDTO {

    private Long id;
    private Long machineId;
    private String machineCode;
    private String machineName;
    private Alert.AlertType alertType;
    private Alert.AlertSeverity severity;
    private Alert.AlertStatus status;
    private String title;
    private String message;
    private String metricName;
    private Double metricValue;
    private Double thresholdValue;
    private Double mlConfidenceScore;
    private String acknowledgedBy;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;
    private String resolutionNote;
    private LocalDateTime createdAt;

    // Request body for acknowledging / resolving
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AcknowledgeRequest {
        private String acknowledgedBy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResolveRequest {
        private String resolutionNote;
    }
}
