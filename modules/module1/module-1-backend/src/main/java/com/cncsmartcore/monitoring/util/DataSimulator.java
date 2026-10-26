package com.cncsmartcore.monitoring.util;

import com.cncsmartcore.monitoring.model.*;
import com.cncsmartcore.monitoring.repository.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

/**
 * Active only in the "dev" profile.
 * Seeds the database with demo machines and tools on startup,
 * then pushes a synthetic metrics reading every 10 seconds to simulate
 * live sensor data so the dashboard is never empty during development.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSimulator {

    private final MachineRepository    machineRepository;
    private final MachineMetricsRepository metricsRepository;
    private final ToolRepository       toolRepository;
    private final ProductionJobRepository jobRepository;

    @Value("${cnc.simulator.enabled:true}")
    private boolean simulatorEnabled;

    private final Random random = new Random();

    // ─── Seed on startup ─────────────────────────────────────────────────────

    @PostConstruct
    @Transactional
    public void seedDemoData() {
        if (!simulatorEnabled) return;
        if (machineRepository.count() > 0) {
            log.info("DataSimulator: demo data already present — skipping seed.");
            return;
        }

        log.info("DataSimulator: seeding demo machines, tools and jobs...");
        seedMachines();
        seedTools();
        seedJobs();
        log.info("DataSimulator: seed complete.");
    }

    // ─── Live metric simulation ───────────────────────────────────────────────

    @Scheduled(fixedRateString = "${cnc.simulator.interval-ms:10000}")
    @Transactional
    public void pushSimulatedMetrics() {
        if (!simulatorEnabled) return;

        List<Machine> runningMachines = machineRepository
                .findActiveByStatus(Machine.MachineStatus.RUNNING);

        for (Machine machine : runningMachines) {
            MachineMetrics m = buildMetrics(machine);
            metricsRepository.save(m);
        }
        if (!runningMachines.isEmpty()) {
            log.debug("DataSimulator: pushed metrics for {} machines", runningMachines.size());
        }
    }

    // ─── Seed helpers ─────────────────────────────────────────────────────────

    private void seedMachines() {
        String[][] defs = {
            {"CNC-001", "Haas VF-2", "VF-2",     "Haas",     "LINE-A"},
            {"CNC-002", "DMG Mori NLX", "NLX-2500", "DMG Mori", "LINE-A"},
            {"CNC-003", "Fanuc Robodrill", "D21MiB5", "Fanuc",  "LINE-B"},
            {"CNC-004", "Mazak Variaxis", "i-700",  "Mazak",    "LINE-B"},
            {"CNC-005", "Okuma Genos",   "M460-VE", "Okuma",   "LINE-C"},
        };

        Machine.MachineStatus[] statuses = {
            Machine.MachineStatus.RUNNING,
            Machine.MachineStatus.RUNNING,
            Machine.MachineStatus.IDLE,
            Machine.MachineStatus.RUNNING,
            Machine.MachineStatus.MAINTENANCE,
        };

        for (int i = 0; i < defs.length; i++) {
            String[] d = defs[i];
            Machine machine = Machine.builder()
                    .machineCode(d[0])
                    .name(d[1])
                    .model(d[2])
                    .manufacturer(d[3])
                    .location(d[4])
                    .status(statuses[i])
                    .maxSpindleSpeed(12000)
                    .maxFeedRate(30000.0)
                    .ipAddress("192.168.1." + (100 + i))
                    .installationDate(LocalDateTime.now().minusYears(2))
                    .lastMaintenanceDate(LocalDateTime.now().minusDays(30))
                    .nextMaintenanceDate(LocalDateTime.now().plusDays(60))
                    .isActive(true)
                    .build();
            machineRepository.save(machine);
        }
        log.info("DataSimulator: {} machines seeded.", defs.length);
    }

    private void seedTools() {
        List<Machine> machines = machineRepository.findByIsActiveTrue();
        if (machines.isEmpty()) return;

        String[][] toolDefs = {
            {"T001", "20mm End Mill",       "END_MILL",    "Carbide", "20.0", "75.0", "200.0"},
            {"T002", "10mm Drill Bit",       "DRILL",       "HSS",     "10.0", "25.0", "150.0"},
            {"T003", "32mm Face Mill",       "FACE_MILL",   "Carbide", "32.0", "85.0", "180.0"},
            {"T004", "8mm Ball Nose",        "BALL_NOSE",   "Carbide",  "8.0", "55.0", "120.0"},
            {"T005", "M12 Tap",             "TAP",         "HSS",      "0.0", "10.0",  "90.0"},
        };

        for (int i = 0; i < toolDefs.length; i++) {
            String[] td = toolDefs[i];
            double wear = Double.parseDouble(td[5]);
            Tool tool = Tool.builder()
                    .toolCode(td[0])
                    .name(td[1])
                    .toolType(Tool.ToolType.valueOf(td[2]))
                    .material(td[3])
                    .diameter(Double.parseDouble(td[4]))
                    .wearPercentage(wear)
                    .maxLifeMinutes(Double.parseDouble(td[6]))
                    .usedLifeMinutes(Double.parseDouble(td[6]) * wear / 100.0)
                    .replacementThreshold(80.0)
                    .condition(wear >= 80 ? Tool.ToolCondition.CRITICAL
                            : wear >= 50 ? Tool.ToolCondition.WORN : Tool.ToolCondition.GOOD)
                    .currentMachine(machines.get(i % machines.size()))
                    .toolMagazineSlot(i + 1)
                    .isActive(true)
                    .build();
            toolRepository.save(tool);
        }
        log.info("DataSimulator: {} tools seeded.", toolDefs.length);
    }

    private void seedJobs() {
        List<Machine> runningMachines = machineRepository
                .findActiveByStatus(Machine.MachineStatus.RUNNING);
        if (runningMachines.isEmpty()) return;

        String[][] jobDefs = {
            {"JOB-2024-001", "Hydraulic Bracket",   "HB-1001", "Aluminium 6061"},
            {"JOB-2024-002", "Shaft Housing",        "SH-2045", "Steel 4140"},
            {"JOB-2024-003", "Cover Plate",          "CP-3012", "Stainless 316"},
            {"JOB-2024-004", "Bearing Retainer",     "BR-4089", "Aluminium 7075"},
            {"JOB-2024-005", "Valve Body",           "VB-5023", "Cast Iron"},
        };

        ProductionJob.JobStatus[] statuses = {
            ProductionJob.JobStatus.IN_PROGRESS,
            ProductionJob.JobStatus.QUEUED,
            ProductionJob.JobStatus.PENDING,
            ProductionJob.JobStatus.QUEUED,
            ProductionJob.JobStatus.PENDING,
        };

        for (int i = 0; i < jobDefs.length; i++) {
            String[] jd = jobDefs[i];
            ProductionJob job = ProductionJob.builder()
                    .jobNumber(jd[0])
                    .partName(jd[1])
                    .partNumber(jd[2])
                    .material(jd[3])
                    .machine(i < runningMachines.size() ? runningMachines.get(i) : null)
                    .status(statuses[i])
                    .priority(i + 1)
                    .quantityRequired(10 + i * 5)
                    .quantityCompleted(i == 0 ? 4 : 0)
                    .estimatedCycleTime(300.0 + i * 60)   // seconds
                    .estimatedSetupTime(30.0 + i * 5)     // minutes
                    .dueDate(LocalDateTime.now().plusDays(3 + i))
                    .build();
            jobRepository.save(job);
        }
        log.info("DataSimulator: {} jobs seeded.", jobDefs.length);
    }

    // ─── Metric builder ───────────────────────────────────────────────────────

    private MachineMetrics buildMetrics(Machine machine) {
        // Simulate realistic CNC cutting conditions with small random drift
        double baseTemp    = 55 + random.nextGaussian() * 3;
        double baseVib     = 1.5 + random.nextGaussian() * 0.4;
        double baseLoad    = 65 + random.nextGaussian() * 8;
        double baseSpeed   = 8000 + random.nextGaussian() * 200;
        double baseFeed    = 3000 + random.nextGaussian() * 100;
        double basePower   = 12 + random.nextGaussian() * 1.5;

        // Occasionally inject an anomaly (5% chance per machine per cycle)
        boolean anomaly = random.nextDouble() < 0.05;
        if (anomaly) {
            baseTemp  += 25;     // temperature spike
            baseVib   += 6;      // vibration spike
            baseLoad  += 20;
        }

        return MachineMetrics.builder()
                .machine(machine)
                .spindleSpeed(clamp(baseSpeed, 0, machine.getMaxSpindleSpeed()))
                .feedRate(clamp(baseFeed, 0, machine.getMaxFeedRate()))
                .spindleLoad(clamp(baseLoad, 0, 100))
                .temperature(clamp(baseTemp, 20, 120))
                .vibrationX(clamp(baseVib + random.nextGaussian() * 0.3, 0, 20))
                .vibrationY(clamp(baseVib + random.nextGaussian() * 0.2, 0, 20))
                .vibrationZ(clamp(baseVib + random.nextGaussian() * 0.1, 0, 20))
                .powerConsumption(clamp(basePower, 0, 50))
                .coolantLevel(clamp(80 + random.nextGaussian() * 5, 0, 100))
                .coolantTemperature(clamp(28 + random.nextGaussian() * 2, 0, 60))
                .cuttingForce(clamp(250 + random.nextGaussian() * 20, 0, 1000))
                .axisPositionX(random.nextDouble() * 500)
                .axisPositionY(random.nextDouble() * 400)
                .axisPositionZ(random.nextDouble() * 200)
                .cycleTime(295 + random.nextGaussian() * 10)
                .partsProduced(random.nextDouble() < 0.1 ? 1 : 0)
                .build();
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
