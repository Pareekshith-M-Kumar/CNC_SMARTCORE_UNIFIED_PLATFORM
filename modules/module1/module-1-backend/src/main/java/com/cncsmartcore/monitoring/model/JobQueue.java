package com.cncsmartcore.monitoring.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_queue", indexes = {
        @Index(name = "idx_jobqueue_machine_position", columnList = "machine_id, queue_position")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id", nullable = false)
    private Machine machine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private ProductionJob job;

    @Column(name = "queue_position", nullable = false)
    private Integer queuePosition;

    @Enumerated(EnumType.STRING)
    @Column(name = "scheduling_algorithm")
    private SchedulingAlgorithm schedulingAlgorithm;

    @Column(name = "estimated_start")
    private LocalDateTime estimatedStart;

    @Column(name = "estimated_end")
    private LocalDateTime estimatedEnd;

    @Column(name = "makespan")
    private Double makespan;               // total processing time in minutes

    @Column(name = "tardiness")
    private Double tardiness;              // lateness vs due date in minutes

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SchedulingAlgorithm {
        FCFS,           // First Come First Served
        SPT,            // Shortest Processing Time
        EDD,            // Earliest Due Date
        LPT,            // Longest Processing Time
        PRIORITY,       // Priority-based
        GENETIC         // Genetic Algorithm optimization
    }
}
