package com.cncsmartcore.tool;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cutting_tools")
public class CuttingTool {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    @Column(name = "tool_type", nullable = false)
    private String toolType; // FLAT_END_MILL, BALL_END_MILL, FACE_MILL, DRILL

    @Column(name = "diameter_mm", nullable = false)
    private double diameterMm;

    @Column(name = "flute_count", nullable = false)
    private int fluteCount;

    @Column(name = "flute_length_mm", nullable = false)
    private double fluteLengthMm;

    @Column(name = "overall_length_mm", nullable = false)
    private double overallLengthMm;

    @Column(name = "tool_material", nullable = false)
    private String toolMaterial = "CARBIDE"; // CARBIDE, HSS

    @Column(name = "center_cutting", nullable = false)
    private boolean centerCutting = true;

    @Column(nullable = false)
    private double price = 1200.0;

    @Column(name = "expected_life_min", nullable = false)
    private double expectedLifeMin = 120.0;

    @Column(name = "is_sample_data", nullable = false)
    private boolean isSampleData = true;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public CuttingTool() {}

    public CuttingTool(UUID id, String name, String toolType, double diameterMm,
                       int fluteCount, double fluteLengthMm, double overallLengthMm,
                       String toolMaterial, boolean centerCutting, double price,
                       double expectedLifeMin, boolean isSampleData, boolean isActive) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.toolType = toolType;
        this.diameterMm = diameterMm;
        this.fluteCount = fluteCount;
        this.fluteLengthMm = fluteLengthMm;
        this.overallLengthMm = overallLengthMm;
        this.toolMaterial = toolMaterial != null ? toolMaterial : "CARBIDE";
        this.centerCutting = centerCutting;
        this.price = price;
        this.expectedLifeMin = expectedLifeMin;
        this.isSampleData = isSampleData;
        this.isActive = isActive;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getToolType() { return toolType; }
    public void setToolType(String toolType) { this.toolType = toolType; }

    public double getDiameterMm() { return diameterMm; }
    public void setDiameterMm(double diameterMm) { this.diameterMm = diameterMm; }

    public int getFluteCount() { return fluteCount; }
    public void setFluteCount(int fluteCount) { this.fluteCount = fluteCount; }

    public double getFluteLengthMm() { return fluteLengthMm; }
    public void setFluteLengthMm(double fluteLengthMm) { this.fluteLengthMm = fluteLengthMm; }

    public double getOverallLengthMm() { return overallLengthMm; }
    public void setOverallLengthMm(double overallLengthMm) { this.overallLengthMm = overallLengthMm; }

    public String getToolMaterial() { return toolMaterial; }
    public void setToolMaterial(String toolMaterial) { this.toolMaterial = toolMaterial; }

    public boolean isCenterCutting() { return centerCutting; }
    public void setCenterCutting(boolean centerCutting) { this.centerCutting = centerCutting; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public double getExpectedLifeMin() { return expectedLifeMin; }
    public void setExpectedLifeMin(double expectedLifeMin) { this.expectedLifeMin = expectedLifeMin; }

    public boolean isSampleData() { return isSampleData; }
    public void setSampleData(boolean sampleData) { isSampleData = sampleData; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Instant getCreatedAt() { return createdAt; }
}
