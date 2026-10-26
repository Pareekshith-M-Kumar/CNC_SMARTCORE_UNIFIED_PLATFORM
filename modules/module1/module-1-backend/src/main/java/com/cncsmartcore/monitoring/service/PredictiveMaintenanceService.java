package com.cncsmartcore.monitoring.service;

import com.cncsmartcore.monitoring.exception.ResourceNotFoundException;
import com.cncsmartcore.monitoring.model.Alert;
import com.cncsmartcore.monitoring.model.Machine;
import com.cncsmartcore.monitoring.model.MachineMetrics;
import com.cncsmartcore.monitoring.repository.AlertRepository;
import com.cncsmartcore.monitoring.repository.MachineMetricsRepository;
import com.cncsmartcore.monitoring.repository.MachineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictiveMaintenanceService {

    private static final int ANALYSIS_WINDOW_HOURS = 24;
    private static final double ANOMALY_SCORE_THRESHOLD = 0.75;

    private final MachineRepository machineRepository;
    private final MachineMetricsRepository metricsRepository;
    private final AlertRepository alertRepository;
    private final MLIntegrationService mlIntegrationService;

    /**
     * Runs every hour: fetches recent metrics per machine and invokes the ML
     * service for failure probability prediction.
     */
    @Scheduled(fixedRateString = "${cnc.maintenance.prediction.interval-ms:3600000}")
    @Transactional
    public void runPredictiveMaintenance() {
        log.info("Starting predictive maintenance analysis cycle");
        List<Machine> activeMachines = machineRepository.findActiveByStatus(Machine.MachineStatus.RUNNING);

        for (Machine machine : activeMachines) {
            try {
                analyzeAndPredictForMachine(machine);
            } catch (Exception e) {
                log.error("Predictive maintenance analysis failed for machine {}: {}",
                        machine.getMachineCode(), e.getMessage());
            }
        }
        log.info("Predictive maintenance cycle complete. Machines analyzed: {}", activeMachines.size());
    }

    @Transactional
    public Map<String, Object> analyzeAndPredictForMachine(Machine machine) {
        LocalDateTime since = LocalDateTime.now().minusHours(ANALYSIS_WINDOW_HOURS);
        List<MachineMetrics> recentMetrics = metricsRepository
                .findByMachineIdAndRecordedAtBetweenOrderByRecordedAtAsc(machine.getId(), since, LocalDateTime.now());

        if (recentMetrics.isEmpty()) {
            return Collections.emptyMap();
        }

        // Statistical baseline analysis
        Map<String, Double> stats = computeStatistics(recentMetrics);

        // Invoke ML service for prediction
        Map<String, Object> mlResult = mlIntegrationService
                .predictFailureProbability(machine.getId(), recentMetrics, stats);

        Double failureProbability = (Double) mlResult.getOrDefault("failure_probability", 0.0);
        String predictedComponent = (String) mlResult.getOrDefault("component", "unknown");

        if (failureProbability >= ANOMALY_SCORE_THRESHOLD) {
            raisePredictiveAlert(machine, failureProbability, predictedComponent, stats);
        }

        // Schedule maintenance if failure is imminent
        if (failureProbability >= 0.9) {
            scheduleEmergencyMaintenance(machine);
        }

        return mlResult;
    }

    public Map<String, Object> getPredictionForMachine(Long machineId) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found: " + machineId));
        return analyzeAndPredictForMachine(machine);
    }

    public List<Map<String, Object>> getMaintenanceRecommendations() {
        List<Machine> machines = machineRepository.findByIsActiveTrue();
        return machines.stream()
                .map(m -> {
                    Map<String, Object> rec = new LinkedHashMap<>();
                    rec.put("machineId", m.getId());
                    rec.put("machineCode", m.getMachineCode());
                    rec.put("machineName", m.getName());
                    rec.put("nextMaintenance", m.getNextMaintenanceDate());
                    rec.put("daysTillMaintenance", m.getNextMaintenanceDate() != null
                            ? java.time.temporal.ChronoUnit.DAYS.between(LocalDateTime.now(), m.getNextMaintenanceDate())
                            : null);
                    rec.put("openAlerts", alertRepository.countOpenAlertsForMachine(m.getId()));
                    return rec;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public Machine recordMaintenanceCompletion(Long machineId, String notes,
                                                LocalDateTime nextScheduled) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found: " + machineId));
        machine.setLastMaintenanceDate(LocalDateTime.now());
        machine.setNextMaintenanceDate(nextScheduled);
        machine.setStatus(Machine.MachineStatus.IDLE);

        // Auto-resolve open maintenance alerts
        alertRepository.findByMachineIdAndStatus(machineId, Alert.AlertStatus.OPEN)
                .stream()
                .filter(a -> a.getAlertType() == Alert.AlertType.MAINTENANCE_DUE
                        || a.getAlertType() == Alert.AlertType.PREDICTIVE_FAILURE)
                .forEach(a -> {
                    a.setStatus(Alert.AlertStatus.RESOLVED);
                    a.setResolvedAt(LocalDateTime.now());
                    a.setResolutionNote(notes);
                    alertRepository.save(a);
                });

        log.info("Maintenance recorded for machine {}. Next scheduled: {}", machine.getMachineCode(), nextScheduled);
        return machineRepository.save(machine);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private Map<String, Double> computeStatistics(List<MachineMetrics> metrics) {
        Map<String, Double> stats = new LinkedHashMap<>();

        DoubleSummaryStatistics tempStats = metrics.stream()
                .filter(m -> m.getTemperature() != null)
                .mapToDouble(MachineMetrics::getTemperature).summaryStatistics();
        stats.put("temp_mean", tempStats.getAverage());
        stats.put("temp_max", tempStats.getMax());
        stats.put("temp_std", computeStdDev(metrics.stream()
                .filter(m -> m.getTemperature() != null)
                .mapToDouble(MachineMetrics::getTemperature).toArray(), tempStats.getAverage()));

        DoubleSummaryStatistics vibStats = metrics.stream()
                .filter(m -> m.getVibrationX() != null)
                .mapToDouble(m -> Math.sqrt(
                        Math.pow(m.getVibrationX(), 2) +
                        Math.pow(m.getVibrationY() != null ? m.getVibrationY() : 0, 2) +
                        Math.pow(m.getVibrationZ() != null ? m.getVibrationZ() : 0, 2)))
                .summaryStatistics();
        stats.put("vibration_rms_mean", vibStats.getAverage());
        stats.put("vibration_rms_max", vibStats.getMax());

        DoubleSummaryStatistics loadStats = metrics.stream()
                .filter(m -> m.getSpindleLoad() != null)
                .mapToDouble(MachineMetrics::getSpindleLoad).summaryStatistics();
        stats.put("spindle_load_mean", loadStats.getAverage());
        stats.put("spindle_load_max", loadStats.getMax());

        stats.put("power_mean", metrics.stream()
                .filter(m -> m.getPowerConsumption() != null)
                .mapToDouble(MachineMetrics::getPowerConsumption).average().orElse(0));

        return stats;
    }

    private double computeStdDev(double[] values, double mean) {
        if (values.length == 0) return 0;
        double variance = Arrays.stream(values)
                .map(v -> Math.pow(v - mean, 2)).average().orElse(0);
        return Math.sqrt(variance);
    }

    private void raisePredictiveAlert(Machine machine, Double probability,
                                       String component, Map<String, Double> stats) {
        List<Alert> existing = alertRepository
                .findOpenAlertsByMachineAndType(machine.getId(), Alert.AlertType.PREDICTIVE_FAILURE);
        if (!existing.isEmpty()) return;

        Alert alert = Alert.builder()
                .machine(machine)
                .alertType(Alert.AlertType.PREDICTIVE_FAILURE)
                .severity(probability >= 0.9 ? Alert.AlertSeverity.CRITICAL : Alert.AlertSeverity.WARNING)
                .status(Alert.AlertStatus.OPEN)
                .title(String.format("Predictive Failure Risk: %s", component))
                .message(String.format(
                        "ML model predicts %.0f%% probability of %s failure on machine %s within 24 hours. " +
                        "Avg temp: %.1f°C, Max vibration RMS: %.2f mm/s², Avg spindle load: %.1f%%",
                        probability * 100, component, machine.getMachineCode(),
                        stats.getOrDefault("temp_mean", 0.0),
                        stats.getOrDefault("vibration_rms_max", 0.0),
                        stats.getOrDefault("spindle_load_mean", 0.0)))
                .metricName("failure_probability")
                .metricValue(probability)
                .thresholdValue(ANOMALY_SCORE_THRESHOLD)
                .mlConfidenceScore(probability)
                .build();

        alertRepository.save(alert);
        log.warn("Predictive failure alert for machine {}: probability={}", machine.getMachineCode(), probability);
    }

    private void scheduleEmergencyMaintenance(Machine machine) {
        machine.setNextMaintenanceDate(LocalDateTime.now().plusHours(4));
        machineRepository.save(machine);
        log.warn("Emergency maintenance scheduled for machine {} in 4 hours", machine.getMachineCode());
    }
}
