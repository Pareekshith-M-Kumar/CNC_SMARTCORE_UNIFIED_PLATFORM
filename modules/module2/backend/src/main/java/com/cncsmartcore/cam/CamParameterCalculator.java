package com.cncsmartcore.cam;

import com.cncsmartcore.machine.MachineProfile;
import com.cncsmartcore.material.Material;
import com.cncsmartcore.tool.CuttingTool;
import org.springframework.stereotype.Component;

@Component
public class CamParameterCalculator {

    public record CalculatedParameters(
            int spindleRpm,
            double cuttingSpeedVcMMin,
            double feedMmMin,
            double plungeFeedMmMin,
            double feedPerToothFzMm,
            double apMm,
            double aeMm,
            double finishAllowanceMm,
            double mrrMm3PerMin,
            double cuttingPowerKw,
            String powerWarning
    ) {}

    public CalculatedParameters calculateOperationParameters(
            String opType,
            Material material,
            CuttingTool tool,
            MachineProfile machine,
            double stockAllowanceMm,
            Double partHeightMm
    ) {
        double d = tool.getDiameterMm();
        int z = Math.max(1, tool.getFluteCount());
        double fluteLen = tool.getFluteLengthMm();

        // 1. Tool material factor: Carbide = 1.0, HSS = 0.35
        double kTool = "HSS".equalsIgnoreCase(tool.getToolMaterial()) ? 0.35 : 1.0;

        // 2. Base cutting speed Vc (m/min)
        double vcMid = (material.getVcMinMMin() + material.getVcMaxMMin()) / 2.0;
        double vc = vcMid * kTool;

        // 3. Spindle RPM: n = (Vc * 1000) / (pi * D)
        double theoreticalRpm = (vc * 1000.0) / (Math.PI * d);
        int rpm = (int) Math.round(theoreticalRpm);

        // Clamp to machine max RPM
        if (rpm > machine.getMaxRpm()) {
            rpm = machine.getMaxRpm();
            // Recompute actual Vc
            vc = (Math.PI * d * rpm) / 1000.0;
        }
        rpm = Math.max(100, rpm);

        // 4. Feed per tooth fz = fzFactor * D
        double fzFactor = material.getFzFactor() > 0 ? material.getFzFactor() : 0.003;
        double fz = fzFactor * d;

        // 5. Table feed: vf = fz * z * n
        double vf = fz * z * rpm;

        // Clamp to machine max feed
        if (vf > machine.getMaxFeedMmMin()) {
            vf = machine.getMaxFeedMmMin();
            fz = vf / (z * rpm);
        }
        vf = Math.max(10.0, Math.round(vf * 10.0) / 10.0);

        // 6. Plunge feed = 0.3 * vf
        double plungeFeed = Math.round(vf * 0.3 * 10.0) / 10.0;

        // 7. Depth of cut (ap) and width of cut (ae) based on opType
        double ap;
        double ae;
        double finishAllowance = 0.3;

        String upperOp = opType != null ? opType.toUpperCase() : "ROUGH_POCKET";
        switch (upperOp) {
            case "FACE" -> {
                ap = Math.min(1.0, Math.max(0.5, stockAllowanceMm));
                ae = Math.round(d * 0.7 * 10.0) / 10.0;
            }
            case "CONTOUR" -> {
                double targetHeight = partHeightMm != null && partHeightMm > 0 ? partHeightMm : 20.0;
                ap = Math.min(fluteLen * 0.8, targetHeight);
                ae = finishAllowance;
                vf = Math.round(vf * 0.7 * 10.0) / 10.0; // 30% reduction for surface finish
            }
            case "DRILL" -> {
                ap = Math.min(fluteLen * 0.9, partHeightMm != null ? partHeightMm : 30.0);
                ae = d;
                vf = Math.round(fz * rpm * 0.5 * 10.0) / 10.0;
                plungeFeed = vf;
            }
            default -> { // ROUGH_POCKET
                ap = Math.min(d * 0.5, fluteLen * 0.8);
                ae = Math.round(d * 0.4 * 10.0) / 10.0;
            }
        }
        ap = Math.round(ap * 100.0) / 100.0;

        // 8. Material Removal Rate: MRR = ap * ae * vf
        double mrr = ap * ae * vf;

        // 9. Cutting Power: Pc [kW] = (ap * ae * vf * kc) / (60 * 10^6 * eta)
        double kc = material.getKcNMm2();
        double eta = machine.getSpindleEfficiency() > 0 ? machine.getSpindleEfficiency() : 0.8;
        double powerKw = (ap * ae * vf * kc) / (60.0 * 1_000_000.0 * eta);
        powerKw = Math.round(powerKw * 1000.0) / 1000.0;

        String powerWarning = null;
        if (powerKw > machine.getRatedPowerKw()) {
            powerWarning = String.format("Calculated spindle power (%.2f kW) exceeds machine rated capacity (%.2f kW). Reduce depth of cut or feed rate.",
                    powerKw, machine.getRatedPowerKw());
        } else if (powerKw > 0.80 * machine.getRatedPowerKw()) {
            powerWarning = String.format("High spindle load: %.1f%% of rated power capacity (%.2f kW).",
                    (powerKw / machine.getRatedPowerKw()) * 100.0, machine.getRatedPowerKw());
        }

        return new CalculatedParameters(
                rpm,
                Math.round(vc * 10.0) / 10.0,
                vf,
                plungeFeed,
                Math.round(fz * 1000.0) / 1000.0,
                ap,
                ae,
                finishAllowance,
                Math.round(mrr * 10.0) / 10.0,
                powerKw,
                powerWarning
        );
    }
}
