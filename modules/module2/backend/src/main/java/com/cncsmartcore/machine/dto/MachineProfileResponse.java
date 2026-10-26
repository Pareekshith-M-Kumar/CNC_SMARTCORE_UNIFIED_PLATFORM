package com.cncsmartcore.machine.dto;

import com.cncsmartcore.machine.MachineProfile;
import java.util.UUID;

public record MachineProfileResponse(
    UUID id,
    String name,
    String controllerDialect,
    double travelXMm,
    double travelYMm,
    double travelZMm,
    int maxRpm,
    double ratedPowerKw,
    double spindleEfficiency,
    double rapidFeedMmMin,
    double maxFeedMmMin,
    double toolChangeS,
    double machineRatePerHr,
    double idlePowerKw,
    boolean isSampleData,
    boolean isActive
) {
    public static MachineProfileResponse from(MachineProfile m) {
        return new MachineProfileResponse(
            m.getId(),
            m.getName(),
            m.getControllerDialect(),
            m.getTravelXMm(),
            m.getTravelYMm(),
            m.getTravelZMm(),
            m.getMaxRpm(),
            m.getRatedPowerKw(),
            m.getSpindleEfficiency(),
            m.getRapidFeedMmMin(),
            m.getMaxFeedMmMin(),
            m.getToolChangeS(),
            m.getMachineRatePerHr(),
            m.getIdlePowerKw(),
            m.isSampleData(),
            m.isActive()
        );
    }
}
