package com.cncsmartcore.cam;

import com.cncsmartcore.cam.dto.CamEstimatesResponse;
import com.cncsmartcore.machine.MachineProfile;
import com.cncsmartcore.material.Material;
import com.cncsmartcore.tool.CuttingTool;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;

@Component
public class CamEstimator {

    public static final double ENERGY_TARIFF_PER_KWH = 8.50; // INR / kWh industrial tariff
    public static final double DRIVE_EFFICIENCY = 0.90;

    public CamEstimatesResponse calculateEstimates(
            double stockXMm,
            double stockYMm,
            double stockZMm,
            double stockAllowanceMm,
            double setupTimeMin,
            Double partVolumeMm3,
            Material material,
            MachineProfile machine,
            List<ToolpathOperation> operations,
            Map<UUID, CuttingTool> toolMap
    ) {
        List<String> warnings = new ArrayList<>();

        // 1. Volumes: Stock vs Part
        double stockVolumeMm3 = stockXMm * stockYMm * stockZMm;
        double partVol = partVolumeMm3 != null && partVolumeMm3 > 0
                ? partVolumeMm3
                : stockVolumeMm3 * 0.45; // 45% default if non-watertight/unknown
        double removedVolumeMm3 = Math.max(100.0, stockVolumeMm3 - partVol);

        // 2. Average MRR and Power across operations
        double totalMrr = 0.0;
        double totalPowerKw = 0.0;
        int activeOpCount = 0;

        for (ToolpathOperation op : operations) {
            double opMrr = op.getApMm() * op.getAeMm() * op.getFeedMmMin();
            CuttingTool tool = toolMap.get(op.getToolId());
            double eta = machine.getSpindleEfficiency() > 0 ? machine.getSpindleEfficiency() : 0.80;
            double kc = material != null ? material.getKcNMm2() : 1000.0;
            double opPower = (op.getApMm() * op.getAeMm() * op.getFeedMmMin() * kc) / (60.0 * 1_000_000.0 * eta);

            totalMrr += opMrr;
            totalPowerKw += opPower;
            activeOpCount++;

            if (opPower > machine.getRatedPowerKw()) {
                warnings.add(String.format("Op #%d (%s): Spindle power (%.2f kW) exceeds machine limit (%.2f kW).",
                        op.getSeq(), op.getOpType(), opPower, machine.getRatedPowerKw()));
            }
        }

        double avgMrr = activeOpCount > 0 ? totalMrr / activeOpCount : 10000.0;
        double avgPowerKw = activeOpCount > 0 ? totalPowerKw / activeOpCount : 1.5;

        // 3. Time Breakdown
        // Cutting time: V_removed / avgMrr (in minutes)
        double cuttingMin = removedVolumeMm3 / Math.max(500.0, avgMrr);
        // Rapid time: approx 12% of cutting time
        double rapidMin = cuttingMin * 0.12;
        // Tool change time: toolCount * toolChangeS / 60
        Set<UUID> uniqueTools = new HashSet<>();
        for (ToolpathOperation op : operations) {
            uniqueTools.add(op.getToolId());
        }
        int toolChanges = Math.max(0, uniqueTools.size() - 1);
        double toolChangeMin = (toolChanges * machine.getToolChangeS()) / 60.0;
        double totalMachiningMin = cuttingMin + rapidMin + toolChangeMin;

        // Round times
        cuttingMin = Math.round(cuttingMin * 100.0) / 100.0;
        rapidMin = Math.round(rapidMin * 100.0) / 100.0;
        toolChangeMin = Math.round(toolChangeMin * 100.0) / 100.0;
        totalMachiningMin = Math.round(totalMachiningMin * 100.0) / 100.0;

        // 4. Energy Estimation: E [kWh] = ((P_cut / etaDrive) * t_cut_s + P_idle * t_idle_s) / 3600
        double tCutSec = cuttingMin * 60.0;
        double tIdleSec = Math.max(0.0, (totalMachiningMin - cuttingMin) * 60.0);
        double energyKwh = ((avgPowerKw / DRIVE_EFFICIENCY) * tCutSec + machine.getIdlePowerKw() * tIdleSec) / 3600.0;
        energyKwh = Math.round(energyKwh * 1000.0) / 1000.0;

        // 5. Cost Breakdown (INR)
        // Machine cost = ratePerHr * totalMachiningHours
        double machineCost = machine.getMachineRatePerHr() * (totalMachiningMin / 60.0);

        // Material cost = stockVolumeCm3 * densityGPerCm3 / 1000 * costPerKg
        double stockVolumeCm3 = stockVolumeMm3 / 1000.0;
        double densityKgM3 = material != null ? material.getDensityKgM3() : 2700.0;
        double costPerKg = material != null ? material.getCostPerKg() : 350.0;
        double stockMassKg = (stockVolumeCm3 * (densityKgM3 / 1000.0)) / 1000.0;
        double materialCost = stockMassKg * costPerKg;

        // Tooling wear cost = sum over operations: (toolPrice / expectedLifeMin) * (cuttingMin / opCount)
        double toolingCost = 0.0;
        double cutPerOpMin = activeOpCount > 0 ? cuttingMin / activeOpCount : 0.0;
        for (ToolpathOperation op : operations) {
            CuttingTool tool = toolMap.get(op.getToolId());
            if (tool != null && tool.getExpectedLifeMin() > 0) {
                toolingCost += (tool.getPrice() / tool.getExpectedLifeMin()) * cutPerOpMin;
            }
        }

        // Setup cost = machineRatePerHr * (setupTimeMin / 60)
        double setupCost = machine.getMachineRatePerHr() * (setupTimeMin / 60.0);

        // Energy cost = energyKwh * tariff
        double energyCost = energyKwh * ENERGY_TARIFF_PER_KWH;

        // Total Cost
        double totalCost = machineCost + materialCost + toolingCost + setupCost + energyCost;

        CamEstimatesResponse.TimeBreakdown timeBreakdown = new CamEstimatesResponse.TimeBreakdown(
                cuttingMin,
                rapidMin,
                toolChangeMin,
                setupTimeMin,
                totalMachiningMin
        );

        CamEstimatesResponse.CostBreakdown costBreakdown = new CamEstimatesResponse.CostBreakdown(
                Math.round(machineCost * 100.0) / 100.0,
                Math.round(materialCost * 100.0) / 100.0,
                Math.round(toolingCost * 100.0) / 100.0,
                Math.round(setupCost * 100.0) / 100.0,
                Math.round(energyCost * 100.0) / 100.0,
                Math.round(totalCost * 100.0) / 100.0,
                "INR"
        );

        Map<String, Object> inputs = Map.of(
                "removedVolumeMm3", Math.round(removedVolumeMm3),
                "stockVolumeMm3", Math.round(stockVolumeMm3),
                "mrrMm3PerMin", Math.round(avgMrr),
                "machineRatePerHr", machine.getMachineRatePerHr(),
                "spindleRatedPowerKw", machine.getRatedPowerKw(),
                "materialCode", material != null ? material.getCode() : "UNKNOWN",
                "energyTariffPerKwh", ENERGY_TARIFF_PER_KWH
        );

        return new CamEstimatesResponse(
                CamEstimatesResponse.LABEL,
                inputs,
                timeBreakdown,
                energyKwh,
                costBreakdown,
                warnings,
                Instant.now()
        );
    }
}
