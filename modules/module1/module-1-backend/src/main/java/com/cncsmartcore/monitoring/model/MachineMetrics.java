package com.cncsmartcore.monitoring.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@Entity
@Table(name = "machine_metrics", indexes = {
        @Index(name = "idx_metrics_machine_timestamp", columnList = "machine_id, recorded_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MachineMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id", nullable = false)
    @JsonIgnoreProperties({"metrics", "alerts"})
    private Machine machine;

    @Column(name = "spindle_speed")
    private Double spindleSpeed;           // RPM

    @Column(name = "feed_rate")
    private Double feedRate;               // mm/min

    @Column(name = "spindle_load")
    private Double spindleLoad;            // % of max load

    @Column(name = "temperature")
    private Double temperature;            // Celsius

    @Column(name = "vibration_x")
    private Double vibrationX;             // mm/s²

    @Column(name = "vibration_y")
    private Double vibrationY;

    @Column(name = "vibration_z")
    private Double vibrationZ;

    @Column(name = "power_consumption")
    private Double powerConsumption;       // kW

    @Column(name = "coolant_level")
    private Double coolantLevel;           // %

    @Column(name = "coolant_temperature")
    private Double coolantTemperature;     // Celsius

    @Column(name = "cutting_force")
    private Double cuttingForce;           // N

    @Column(name = "axis_position_x")
    private Double axisPositionX;          // mm

    @Column(name = "axis_position_y")
    private Double axisPositionY;

    @Column(name = "axis_position_z")
    private Double axisPositionZ;

    @Column(name = "cycle_time")
    private Double cycleTime;              // seconds

    @Column(name = "parts_produced")
    private Integer partsProduced;

    @Column(name = "tool_id")
    private Long toolId;

    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;
}
