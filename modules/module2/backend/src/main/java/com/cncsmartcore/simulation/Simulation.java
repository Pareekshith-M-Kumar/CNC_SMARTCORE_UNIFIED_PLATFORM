package com.cncsmartcore.simulation;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "simulations")
public class Simulation {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "cam_job_id", nullable = false)
    private UUID camJobId;

    @Column(name = "toolpath_file_id")
    private UUID toolpathFileId;

    @Column(nullable = false)
    private String status = "COMPLETED";

    @Column(name = "overall_result", nullable = false)
    private String overallResult = "PASS";

    @Column(columnDefinition = "TEXT")
    private String stats;

    @Column(name = "ruleset_version", nullable = false)
    private String rulesetVersion = "sim-1.0";

    @Column(name = "run_by", nullable = false)
    private UUID runBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "simulation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("moveIndex ASC")
    private List<SimulationFinding> findings = new ArrayList<>();

    public Simulation() {}

    public Simulation(UUID camJobId, UUID runBy, String overallResult, String stats, String rulesetVersion) {
        this.id = UUID.randomUUID();
        this.camJobId = camJobId;
        this.runBy = runBy;
        this.overallResult = overallResult;
        this.stats = stats;
        this.rulesetVersion = (rulesetVersion != null) ? rulesetVersion : "sim-1.0";
        this.status = "COMPLETED";
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getCamJobId() { return camJobId; }
    public void setCamJobId(UUID camJobId) { this.camJobId = camJobId; }

    public UUID getToolpathFileId() { return toolpathFileId; }
    public void setToolpathFileId(UUID toolpathFileId) { this.toolpathFileId = toolpathFileId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOverallResult() { return overallResult; }
    public void setOverallResult(String overallResult) { this.overallResult = overallResult; }

    public String getStats() { return stats; }
    public void setStats(String stats) { this.stats = stats; }

    public String getRulesetVersion() { return rulesetVersion; }
    public void setRulesetVersion(String rulesetVersion) { this.rulesetVersion = rulesetVersion; }

    public UUID getRunBy() { return runBy; }
    public void setRunBy(UUID runBy) { this.runBy = runBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public List<SimulationFinding> getFindings() { return findings; }
    public void setFindings(List<SimulationFinding> findings) { this.findings = findings; }

    public void addFinding(SimulationFinding finding) {
        findings.add(finding);
        finding.setSimulation(this);
    }
}
