package com.cncsmartcore.monitoring.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts", indexes = {
        @Index(name = "idx_alerts_machine_status", columnList = "machine_id, status"),
        @Index(name = "idx_alerts_created_at", columnList = "created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id", nullable = false)
    private Machine machine;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    private AlertSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private AlertStatus status = AlertStatus.OPEN;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "metric_name", length = 100)
    private String metricName;

    @Column(name = "metric_value")
    private Double metricValue;

    @Column(name = "threshold_value")
    private Double thresholdValue;

    @Column(name = "acknowledged_by", length = 100)
    private String acknowledgedBy;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;

    @Column(name = "ml_confidence_score")
    private Double mlConfidenceScore;      // 0.0 - 1.0 from ML predictions

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum AlertType {
        TEMPERATURE_HIGH, VIBRATION_ANOMALY, TOOL_WEAR, SPINDLE_OVERLOAD,
        COOLANT_LOW, POWER_SPIKE, MAINTENANCE_DUE, PREDICTIVE_FAILURE,
        JOB_DELAY, QUALITY_DEVIATION, CONNECTIVITY_LOST
    }

    public enum AlertSeverity {
        INFO, WARNING, CRITICAL, EMERGENCY
    }

    public enum AlertStatus {
        OPEN, ACKNOWLEDGED, RESOLVED, SUPPRESSED
    }
}
