package com.cncsmartcore.monitoring.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tools")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tool_code", unique = true, nullable = false, length = 50)
    private String toolCode;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "tool_type", nullable = false)
    private ToolType toolType;

    @Column(name = "material", length = 100)
    private String material;

    @Column(name = "diameter")
    private Double diameter;              // mm

    @Column(name = "length")
    private Double length;               // mm

    @Column(name = "number_of_flutes")
    private Integer numberOfFlutes;

    @Column(name = "max_life_minutes")
    private Double maxLifeMinutes;       // manufacturer-rated life

    @Column(name = "used_life_minutes")
    @Builder.Default
    private Double usedLifeMinutes = 0.0;

    @Column(name = "wear_percentage")
    @Builder.Default
    private Double wearPercentage = 0.0; // 0-100%

    @Enumerated(EnumType.STRING)
    @Column(name = "condition")
    @Builder.Default
    private ToolCondition condition = ToolCondition.NEW;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_machine_id")
    private Machine currentMachine;

    @Column(name = "tool_magazine_slot")
    private Integer toolMagazineSlot;

    @Column(name = "replacement_threshold")
    @Builder.Default
    private Double replacementThreshold = 80.0; // % wear to trigger replacement alert

    @Column(name = "last_replaced_at")
    private LocalDateTime lastReplacedAt;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "tool", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ToolUsage> usageHistory = new ArrayList<>();

    public enum ToolType {
        END_MILL, DRILL, REAMER, BORING_BAR, FACE_MILL, TAP,
        THREAD_MILL, INSERT, BALL_NOSE, CHAMFER, TURNING_INSERT
    }

    public enum ToolCondition {
        NEW, GOOD, WORN, CRITICAL, REPLACED, BROKEN
    }
}
