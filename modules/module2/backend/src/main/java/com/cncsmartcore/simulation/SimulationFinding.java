package com.cncsmartcore.simulation;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "simulation_findings")
public class SimulationFinding {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "simulation_id", nullable = false)
    @JsonIgnore
    private Simulation simulation;

    @Column(name = "rule_code", nullable = false)
    private String ruleCode;

    @Column(nullable = false)
    private String severity; // INFO, WARN, FAIL

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "move_index")
    private Integer moveIndex;

    @Column(name = "x_mm")
    private Double xMm;

    @Column(name = "y_mm")
    private Double yMm;

    @Column(name = "z_mm")
    private Double zMm;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public SimulationFinding() {}

    public SimulationFinding(Simulation simulation, String ruleCode, String severity, String message, Integer moveIndex, Double xMm, Double yMm, Double zMm) {
        this.id = UUID.randomUUID();
        this.simulation = simulation;
        this.ruleCode = ruleCode;
        this.severity = severity;
        this.message = message;
        this.moveIndex = moveIndex;
        this.xMm = xMm;
        this.yMm = yMm;
        this.zMm = zMm;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Simulation getSimulation() { return simulation; }
    public void setSimulation(Simulation simulation) { this.simulation = simulation; }

    public String getRuleCode() { return ruleCode; }
    public void setRuleCode(String ruleCode) { this.ruleCode = ruleCode; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Integer getMoveIndex() { return moveIndex; }
    public void setMoveIndex(Integer moveIndex) { this.moveIndex = moveIndex; }

    public Double getXMm() { return xMm; }
    public void setXMm(Double xMm) { this.xMm = xMm; }

    public Double getYMm() { return yMm; }
    public void setYMm(Double yMm) { this.yMm = yMm; }

    public Double getZMm() { return zMm; }
    public void setZMm(Double zMm) { this.zMm = zMm; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
