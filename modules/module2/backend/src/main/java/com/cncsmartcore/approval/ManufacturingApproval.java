package com.cncsmartcore.approval;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "manufacturing_approvals")
public class ManufacturingApproval {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "cam_job_id", nullable = false)
    private UUID camJobId;

    @Column(name = "cad_version_id", nullable = false)
    private UUID cadVersionId;

    @Column(name = "simulation_id", nullable = false)
    private UUID simulationId;

    @Column(name = "toolpath_file_id")
    private UUID toolpathFileId;

    @Column(name = "gcode_file_id")
    private UUID gcodeFileId;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "submitted_by", nullable = false)
    private UUID submittedBy;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt = Instant.now();

    @Column(name = "submit_note", columnDefinition = "TEXT")
    private String submitNote;

    @Column(name = "decided_by")
    private UUID decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "decision_comment", columnDefinition = "TEXT")
    private String decisionComment;

    @Column(name = "integrity_verified")
    private Boolean integrityVerified;

    @Column(name = "integrity_checked_at")
    private Instant integrityCheckedAt;

    @Column(name = "plan_snapshot", columnDefinition = "TEXT")
    private String planSnapshot;

    @Column(name = "plan_hash", length = 64)
    private String planHash;

    @Version
    @Column(name = "row_version", nullable = false)
    private int rowVersion = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public ManufacturingApproval() {}

    public ManufacturingApproval(UUID camJobId, UUID cadVersionId, UUID simulationId, UUID submittedBy, String submitNote) {
        this.id = UUID.randomUUID();
        this.camJobId = camJobId;
        this.cadVersionId = cadVersionId;
        this.simulationId = simulationId;
        this.submittedBy = submittedBy;
        this.submitNote = submitNote;
        this.status = "PENDING";
        this.submittedAt = Instant.now();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getCamJobId() { return camJobId; }
    public void setCamJobId(UUID camJobId) { this.camJobId = camJobId; }

    public UUID getCadVersionId() { return cadVersionId; }
    public void setCadVersionId(UUID cadVersionId) { this.cadVersionId = cadVersionId; }

    public UUID getSimulationId() { return simulationId; }
    public void setSimulationId(UUID simulationId) { this.simulationId = simulationId; }

    public UUID getToolpathFileId() { return toolpathFileId; }
    public void setToolpathFileId(UUID toolpathFileId) { this.toolpathFileId = toolpathFileId; }

    public UUID getGcodeFileId() { return gcodeFileId; }
    public void setGcodeFileId(UUID gcodeFileId) { this.gcodeFileId = gcodeFileId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public UUID getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(UUID submittedBy) { this.submittedBy = submittedBy; }

    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }

    public String getSubmitNote() { return submitNote; }
    public void setSubmitNote(String submitNote) { this.submitNote = submitNote; }

    public UUID getDecidedBy() { return decidedBy; }
    public void setDecidedBy(UUID decidedBy) { this.decidedBy = decidedBy; }

    public Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(Instant decidedAt) { this.decidedAt = decidedAt; }

    public String getDecisionComment() { return decisionComment; }
    public void setDecisionComment(String decisionComment) { this.decisionComment = decisionComment; }

    public Boolean getIntegrityVerified() { return integrityVerified; }
    public void setIntegrityVerified(Boolean integrityVerified) { this.integrityVerified = integrityVerified; }

    public Instant getIntegrityCheckedAt() { return integrityCheckedAt; }
    public void setIntegrityCheckedAt(Instant integrityCheckedAt) { this.integrityCheckedAt = integrityCheckedAt; }

    public String getPlanSnapshot() { return planSnapshot; }
    public void setPlanSnapshot(String planSnapshot) { this.planSnapshot = planSnapshot; }

    public String getPlanHash() { return planHash; }
    public void setPlanHash(String planHash) { this.planHash = planHash; }

    public int getRowVersion() { return rowVersion; }
    public void setRowVersion(int rowVersion) { this.rowVersion = rowVersion; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
