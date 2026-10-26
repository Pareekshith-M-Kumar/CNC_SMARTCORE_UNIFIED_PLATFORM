package com.cncsmartcore.material;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "materials")
public class Material {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // 'ALUMINIUM', 'STEEL', 'STAINLESS', 'TITANIUM', 'BRASS', 'PLASTIC'

    @Column(name = "density_kg_m3", nullable = false)
    private double densityKgM3;

    @Column(name = "kc_n_mm2", nullable = false)
    private double kcNMm2;

    @Column(name = "vc_min_m_min", nullable = false)
    private double vcMinMMin;

    @Column(name = "vc_max_m_min", nullable = false)
    private double vcMaxMMin;

    @Column(name = "fz_factor", nullable = false)
    private double fzFactor;

    @Column(name = "strength_rating", nullable = false)
    private int strengthRating; // 1 to 5

    @Column(name = "lightness_rating", nullable = false)
    private int lightnessRating; // 1 to 5

    @Column(name = "corrosion_rating", nullable = false)
    private int corrosionRating; // 1 to 5

    @Column(name = "machinability_rating", nullable = false)
    private int machinabilityRating; // 1 to 5

    @Column(name = "cost_level", nullable = false)
    private int costLevel; // 1 to 5

    @Column(name = "cost_per_kg", nullable = false)
    private double costPerKg;

    @Column(name = "suitable_applications")
    private String suitableApplications; // e.g. "structural_bracket,housing,fixture"

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_sample_data", nullable = false)
    private boolean isSampleData = true;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Material() {}

    public Material(UUID id, String code, String name, String category, double densityKgM3,
                    double kcNMm2, double vcMinMMin, double vcMaxMMin, double fzFactor,
                    int strengthRating, int lightnessRating, int corrosionRating,
                    int machinabilityRating, int costLevel, double costPerKg,
                    String suitableApplications, String notes, boolean isSampleData) {
        if (id != null) this.id = id;
        this.code = code;
        this.name = name;
        this.category = category;
        this.densityKgM3 = densityKgM3;
        this.kcNMm2 = kcNMm2;
        this.vcMinMMin = vcMinMMin;
        this.vcMaxMMin = vcMaxMMin;
        this.fzFactor = fzFactor;
        this.strengthRating = strengthRating;
        this.lightnessRating = lightnessRating;
        this.corrosionRating = corrosionRating;
        this.machinabilityRating = machinabilityRating;
        this.costLevel = costLevel;
        this.costPerKg = costPerKg;
        this.suitableApplications = suitableApplications;
        this.notes = notes;
        this.isSampleData = isSampleData;
        this.isActive = true;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public double getDensityKgM3() {
        return densityKgM3;
    }

    public void setDensityKgM3(double densityKgM3) {
        this.densityKgM3 = densityKgM3;
    }

    public double getKcNMm2() {
        return kcNMm2;
    }

    public void setKcNMm2(double kcNMm2) {
        this.kcNMm2 = kcNMm2;
    }

    public double getVcMinMMin() {
        return vcMinMMin;
    }

    public void setVcMinMMin(double vcMinMMin) {
        this.vcMinMMin = vcMinMMin;
    }

    public double getVcMaxMMin() {
        return vcMaxMMin;
    }

    public void setVcMaxMMin(double vcMaxMMin) {
        this.vcMaxMMin = vcMaxMMin;
    }

    public double getFzFactor() {
        return fzFactor;
    }

    public void setFzFactor(double fzFactor) {
        this.fzFactor = fzFactor;
    }

    public int getStrengthRating() {
        return strengthRating;
    }

    public void setStrengthRating(int strengthRating) {
        this.strengthRating = strengthRating;
    }

    public int getLightnessRating() {
        return lightnessRating;
    }

    public void setLightnessRating(int lightnessRating) {
        this.lightnessRating = lightnessRating;
    }

    public int getCorrosionRating() {
        return corrosionRating;
    }

    public void setCorrosionRating(int corrosionRating) {
        this.corrosionRating = corrosionRating;
    }

    public int getMachinabilityRating() {
        return machinabilityRating;
    }

    public void setMachinabilityRating(int machinabilityRating) {
        this.machinabilityRating = machinabilityRating;
    }

    public int getCostLevel() {
        return costLevel;
    }

    public void setCostLevel(int costLevel) {
        this.costLevel = costLevel;
    }

    public double getCostPerKg() {
        return costPerKg;
    }

    public void setCostPerKg(double costPerKg) {
        this.costPerKg = costPerKg;
    }

    public String getSuitableApplications() {
        return suitableApplications;
    }

    public void setSuitableApplications(String suitableApplications) {
        this.suitableApplications = suitableApplications;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public boolean isSampleData() {
        return isSampleData;
    }

    public void setSampleData(boolean sampleData) {
        isSampleData = sampleData;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
