package com.cncsmartcore.monitoring.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "production_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductionJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_number", unique = true, nullable = false, length = 50)
    private String jobNumber;

    @Column(name = "part_name", nullable = false, length = 150)
    private String partName;

    @Column(name = "part_number", length = 100)
    private String partNumber;

    @Column(name = "material", length = 100)
    private String material;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private JobStatus status;

    @Column(name = "priority")
    @Builder.Default
    private Integer priority = 5;           // 1 (highest) to 10 (lowest)

    @Column(name = "quantity_required")
    private Integer quantityRequired;

    @Column(name = "quantity_completed")
    @Builder.Default
    private Integer quantityCompleted = 0;

    @Column(name = "estimated_cycle_time")
    private Double estimatedCycleTime;      // seconds per part

    @Column(name = "actual_cycle_time")
    private Double actualCycleTime;

    @Column(name = "estimated_setup_time")
    private Double estimatedSetupTime;      // minutes

    @Column(name = "nc_program_path", length = 500)
    private String ncProgramPath;

    @Column(name = "scheduled_start")
    private LocalDateTime scheduledStart;

    @Column(name = "scheduled_end")
    private LocalDateTime scheduledEnd;

    @Column(name = "actual_start")
    private LocalDateTime actualStart;

    @Column(name = "actual_end")
    private LocalDateTime actualEnd;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum JobStatus {
        PENDING, QUEUED, SETUP, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED, FAILED
    }
}
