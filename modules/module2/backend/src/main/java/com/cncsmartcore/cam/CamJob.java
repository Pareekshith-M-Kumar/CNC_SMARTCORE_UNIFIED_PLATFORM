package com.cncsmartcore.cam;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "cam_jobs")
public class CamJob {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "cad_version_id", nullable = false)
    private UUID cadVersionId;

    @Column(name = "material_id")
    private UUID materialId;

    @Column(name = "machine_id")
    private UUID machineId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String status = "DRAFT";

    @Column(name = "stock_allowance_mm", nullable = false)
    private double stockAllowanceMm = 2.0;

    @Column(name = "stock_x_mm")
    private Double stockXMm;

    @Column(name = "stock_y_mm")
    private Double stockYMm;

    @Column(name = "stock_z_mm")
    private Double stockZMm;

    @Column(name = "setup_time_min", nullable = false)
    private double setupTimeMin = 15.0;

    @Column(columnDefinition = "TEXT")
    private String estimates;

    @Column(name = "config_hash", length = 64)
    private String configHash;

    @Column(name = "generation_attempts", nullable = false)
    private int generationAttempts = 0;

    @Column(name = "last_error")
    private String lastError;

    @Version
    @Column(name = "row_version", nullable = false)
    private int rowVersion = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "camJob", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("seq ASC")
    private List<ToolpathOperation> operations = new ArrayList<>();

    public CamJob() {}

    public CamJob(UUID cadVersionId, UUID materialId, UUID machineId, UUID createdBy, String name) {
        this.id = UUID.randomUUID();
        this.cadVersionId = cadVersionId;
        this.materialId = materialId;
        this.machineId = machineId;
        this.createdBy = createdBy;
        this.name = name;
        this.status = "DRAFT";
        this.stockAllowanceMm = 2.0;
        this.setupTimeMin = 15.0;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getCadVersionId() { return cadVersionId; }
    public void setCadVersionId(UUID cadVersionId) { this.cadVersionId = cadVersionId; }

    public UUID getMaterialId() { return materialId; }
    public void setMaterialId(UUID materialId) { this.materialId = materialId; }

    public UUID getMachineId() { return machineId; }
    public void setMachineId(UUID machineId) { this.machineId = machineId; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public double getStockAllowanceMm() { return stockAllowanceMm; }
    public void setStockAllowanceMm(double stockAllowanceMm) { this.stockAllowanceMm = stockAllowanceMm; }

    public Double getStockXMm() { return stockXMm; }
    public void setStockXMm(Double stockXMm) { this.stockXMm = stockXMm; }

    public Double getStockYMm() { return stockYMm; }
    public void setStockYMm(Double stockYMm) { this.stockYMm = stockYMm; }

    public Double getStockZMm() { return stockZMm; }
    public void setStockZMm(Double stockZMm) { this.stockZMm = stockZMm; }

    public double getSetupTimeMin() { return setupTimeMin; }
    public void setSetupTimeMin(double setupTimeMin) { this.setupTimeMin = setupTimeMin; }

    public String getEstimates() { return estimates; }
    public void setEstimates(String estimates) { this.estimates = estimates; }

    public String getConfigHash() { return configHash; }
    public void setConfigHash(String configHash) { this.configHash = configHash; }

    public int getGenerationAttempts() { return generationAttempts; }
    public void setGenerationAttempts(int generationAttempts) { this.generationAttempts = generationAttempts; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public int getRowVersion() { return rowVersion; }
    public void setRowVersion(int rowVersion) { this.rowVersion = rowVersion; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public List<ToolpathOperation> getOperations() { return operations; }

    public void addOperation(ToolpathOperation op) {
        operations.add(op);
        op.setCamJob(this);
    }

    public void clearOperations() {
        operations.clear();
    }
}
