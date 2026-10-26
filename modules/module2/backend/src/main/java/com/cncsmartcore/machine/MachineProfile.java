package com.cncsmartcore.machine;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "machine_profiles")
public class MachineProfile {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false)
    private String name;

    @Column(name = "controller_dialect", nullable = false)
    private String controllerDialect = "GENERIC_ISO";

    @Column(name = "travel_x_mm", nullable = false)
    private double travelXMm;

    @Column(name = "travel_y_mm", nullable = false)
    private double travelYMm;

    @Column(name = "travel_z_mm", nullable = false)
    private double travelZMm;

    @Column(name = "max_rpm", nullable = false)
    private int maxRpm;

    @Column(name = "rated_power_kw", nullable = false)
    private double ratedPowerKw;

    @Column(name = "spindle_efficiency", nullable = false)
    private double spindleEfficiency = 0.80;

    @Column(name = "rapid_feed_mm_min", nullable = false)
    private double rapidFeedMmMin;

    @Column(name = "max_feed_mm_min", nullable = false)
    private double maxFeedMmMin;

    @Column(name = "tool_change_s", nullable = false)
    private double toolChangeS = 6.0;

    @Column(name = "machine_rate_per_hr", nullable = false)
    private double machineRatePerHr = 600.0;

    @Column(name = "idle_power_kw", nullable = false)
    private double idlePowerKw = 0.8;

    @Column(name = "is_sample_data", nullable = false)
    private boolean isSampleData = true;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public MachineProfile() {}

    public MachineProfile(UUID id, String name, String controllerDialect,
                          double travelXMm, double travelYMm, double travelZMm,
                          int maxRpm, double ratedPowerKw, double spindleEfficiency,
                          double rapidFeedMmMin, double maxFeedMmMin, double toolChangeS,
                          double machineRatePerHr, double idlePowerKw,
                          boolean isSampleData, boolean isActive) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.controllerDialect = controllerDialect != null ? controllerDialect : "GENERIC_ISO";
        this.travelXMm = travelXMm;
        this.travelYMm = travelYMm;
        this.travelZMm = travelZMm;
        this.maxRpm = maxRpm;
        this.ratedPowerKw = ratedPowerKw;
        this.spindleEfficiency = spindleEfficiency > 0 ? spindleEfficiency : 0.80;
        this.rapidFeedMmMin = rapidFeedMmMin;
        this.maxFeedMmMin = maxFeedMmMin;
        this.toolChangeS = toolChangeS;
        this.machineRatePerHr = machineRatePerHr;
        this.idlePowerKw = idlePowerKw;
        this.isSampleData = isSampleData;
        this.isActive = isActive;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getControllerDialect() { return controllerDialect; }
    public void setControllerDialect(String controllerDialect) { this.controllerDialect = controllerDialect; }

    public double getTravelXMm() { return travelXMm; }
    public void setTravelXMm(double travelXMm) { this.travelXMm = travelXMm; }

    public double getTravelYMm() { return travelYMm; }
    public void setTravelYMm(double travelYMm) { this.travelYMm = travelYMm; }

    public double getTravelZMm() { return travelZMm; }
    public void setTravelZMm(double travelZMm) { this.travelZMm = travelZMm; }

    public int getMaxRpm() { return maxRpm; }
    public void setMaxRpm(int maxRpm) { this.maxRpm = maxRpm; }

    public double getRatedPowerKw() { return ratedPowerKw; }
    public void setRatedPowerKw(double ratedPowerKw) { this.ratedPowerKw = ratedPowerKw; }

    public double getSpindleEfficiency() { return spindleEfficiency; }
    public void setSpindleEfficiency(double spindleEfficiency) { this.spindleEfficiency = spindleEfficiency; }

    public double getRapidFeedMmMin() { return rapidFeedMmMin; }
    public void setRapidFeedMmMin(double rapidFeedMmMin) { this.rapidFeedMmMin = rapidFeedMmMin; }

    public double getMaxFeedMmMin() { return maxFeedMmMin; }
    public void setMaxFeedMmMin(double maxFeedMmMin) { this.maxFeedMmMin = maxFeedMmMin; }

    public double getToolChangeS() { return toolChangeS; }
    public void setToolChangeS(double toolChangeS) { this.toolChangeS = toolChangeS; }

    public double getMachineRatePerHr() { return machineRatePerHr; }
    public void setMachineRatePerHr(double machineRatePerHr) { this.machineRatePerHr = machineRatePerHr; }

    public double getIdlePowerKw() { return idlePowerKw; }
    public void setIdlePowerKw(double idlePowerKw) { this.idlePowerKw = idlePowerKw; }

    public boolean isSampleData() { return isSampleData; }
    public void setSampleData(boolean sampleData) { isSampleData = sampleData; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Instant getCreatedAt() { return createdAt; }
}
