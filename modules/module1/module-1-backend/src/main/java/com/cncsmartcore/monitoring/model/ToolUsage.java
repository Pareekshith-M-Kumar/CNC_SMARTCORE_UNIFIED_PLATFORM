package com.cncsmartcore.monitoring.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "tool_usage", indexes = {
        @Index(name = "idx_tool_usage_tool_id", columnList = "tool_id"),
        @Index(name = "idx_tool_usage_job_id", columnList = "job_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ToolUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id", nullable = false)
    private Tool tool;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id", nullable = false)
    private Machine machine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private ProductionJob job;

    @Column(name = "usage_start")
    private LocalDateTime usageStart;

    @Column(name = "usage_end")
    private LocalDateTime usageEnd;

    @Column(name = "duration_minutes")
    private Double durationMinutes;

    @Column(name = "wear_before")
    private Double wearBefore;             // % wear at start

    @Column(name = "wear_after")
    private Double wearAfter;              // % wear at end

    @Column(name = "avg_spindle_speed")
    private Double avgSpindleSpeed;

    @Column(name = "avg_feed_rate")
    private Double avgFeedRate;

    @Column(name = "avg_cutting_force")
    private Double avgCuttingForce;

    @Column(name = "parts_machined")
    private Integer partsMachined;

    @Column(name = "predicted_remaining_life")
    private Double predictedRemainingLife; // minutes, from ML model

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
