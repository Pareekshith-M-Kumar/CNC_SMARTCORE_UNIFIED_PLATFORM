package com.cncsmartcore.monitoring.service;

import com.cncsmartcore.monitoring.dto.MachineStatusDTO;
import com.cncsmartcore.monitoring.exception.ResourceNotFoundException;
import com.cncsmartcore.monitoring.exception.ValidationException;
import com.cncsmartcore.monitoring.model.Alert;
import com.cncsmartcore.monitoring.model.Machine;
import com.cncsmartcore.monitoring.model.MachineMetrics;
import com.cncsmartcore.monitoring.repository.AlertRepository;
import com.cncsmartcore.monitoring.repository.MachineMetricsRepository;
import com.cncsmartcore.monitoring.repository.MachineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MachineMonitoringService {

    private static final double TEMP_WARNING_THRESHOLD    = 75.0;   // °C
    private static final double VIBRATION_WARNING_THRESHOLD = 5.0;  // mm/s²
    private static final double SPINDLE_LOAD_WARNING      = 85.0;   // %
    private static final double COOLANT_LOW_THRESHOLD     = 20.0;   // %

    private final MachineRepository machineRepository;
    private final MachineMetricsRepository metricsRepository;
    private final AlertRepository alertRepository;

    // ─── Machine CRUD ─────────────────────────────────────────────────────────

    @Transactional
    public Machine createMachine(Machine machine) {
        if (machineRepository.existsByMachineCode(machine.getMachineCode())) {
            throw new ValidationException("Machine code already exists: " + machine.getMachineCode());
        }
        machine.setStatus(Machine.MachineStatus.OFFLINE);
        return machineRepository.save(machine);
    }

    @Cacheable(value = "machines", key = "#id")
    public Machine getMachineById(Long id) {
        return machineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found with id: " + id));
    }

    public List<Machine> getAllActiveMachines() {
        return machineRepository.findByIsActiveTrue();
    }

    @Transactional
    @CacheEvict(value = "machines", key = "#id")
    public Machine updateMachineStatus(Long id, Machine.MachineStatus status) {
        Machine machine = getMachineById(id);
        Machine.MachineStatus previous = machine.getStatus();
        machine.setStatus(status);
        log.info("Machine {} status changed: {} → {}", machine.getMachineCode(), previous, status);
        return machineRepository.save(machine);
    }

    @Transactional
    @CacheEvict(value = "machines", key = "#machine.id")
    public Machine updateMachine(Machine machine) {
        getMachineById(machine.getId()); // ensure exists
        return machineRepository.save(machine);
    }

    @Transactional
    @CacheEvict(value = "machines", key = "#id")
    public void deactivateMachine(Long id) {
        Machine machine = getMachineById(id);
        machine.setIsActive(false);
        machine.setStatus(Machine.MachineStatus.OFFLINE);
        machineRepository.save(machine);
    }

    // ─── Metrics Ingestion ────────────────────────────────────────────────────

    @Transactional
    public MachineMetrics ingestMetrics(Long machineId, MachineMetrics metrics) {
        Machine machine = getMachineById(machineId);
        metrics.setMachine(machine);
        MachineMetrics saved = metricsRepository.save(metrics);

        // Auto-detect anomalies and raise alerts
        checkThresholdsAndAlert(machine, saved);

        // Auto-update machine status based on metrics
        syncMachineStatusFromMetrics(machine, saved);

        return saved;
    }

    public List<MachineMetrics> getMetricsHistory(Long machineId, LocalDateTime from, LocalDateTime to) {
        getMachineById(machineId); // validate exists
        return metricsRepository
                .findByMachineIdAndRecordedAtBetweenOrderByRecordedAtAsc(machineId, from, to);
    }

    public MachineMetrics getLatestMetrics(Long machineId) {
        return metricsRepository
                .findTopByMachineIdOrderByRecordedAtDesc(machineId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No metrics found for machine id: " + machineId));
    }

    // ─── Dashboard Status ─────────────────────────────────────────────────────

    public List<MachineStatusDTO> getDashboardStatus() {
        return machineRepository.findByIsActiveTrue()
                .stream()
                .map(this::buildStatusDTO)
                .collect(Collectors.toList());
    }

    public MachineStatusDTO getMachineStatus(Long machineId) {
        Machine machine = getMachineById(machineId);
        return buildStatusDTO(machine);
    }

    private MachineStatusDTO buildStatusDTO(Machine machine) {
        MachineStatusDTO dto = MachineStatusDTO.builder()
                .id(machine.getId())
                .machineCode(machine.getMachineCode())
                .name(machine.getName())
                .model(machine.getModel())
                .manufacturer(machine.getManufacturer())
                .status(machine.getStatus())
                .location(machine.getLocation())
                .nextMaintenanceDate(machine.getNextMaintenanceDate())
                .maintenanceDue(machine.getNextMaintenanceDate() != null &&
                        machine.getNextMaintenanceDate().isBefore(LocalDateTime.now().plusDays(7)))
                .openAlertCount(alertRepository.countOpenAlertsForMachine(machine.getId()))
                .build();

        // Attach latest metrics snapshot
        metricsRepository.findTopByMachineIdOrderByRecordedAtDesc(machine.getId())
                .ifPresent(m -> {
                    dto.setSpindleSpeed(m.getSpindleSpeed());
                    dto.setFeedRate(m.getFeedRate());
                    dto.setSpindleLoad(m.getSpindleLoad());
                    dto.setTemperature(m.getTemperature());
                    dto.setVibrationX(m.getVibrationX());
                    dto.setVibrationY(m.getVibrationY());
                    dto.setVibrationZ(m.getVibrationZ());
                    dto.setPowerConsumption(m.getPowerConsumption());
                    dto.setCoolantLevel(m.getCoolantLevel());
                    dto.setAxisPositionX(m.getAxisPositionX());
                    dto.setAxisPositionY(m.getAxisPositionY());
                    dto.setAxisPositionZ(m.getAxisPositionZ());
                    dto.setMetricsTimestamp(m.getRecordedAt());
                    dto.setTemperatureWarning(m.getTemperature() != null && m.getTemperature() > TEMP_WARNING_THRESHOLD);
                    dto.setVibrationWarning(isVibrationHigh(m));
                    dto.setSpindleLoadWarning(m.getSpindleLoad() != null && m.getSpindleLoad() > SPINDLE_LOAD_WARNING);
                });

        return dto;
    }

    // ─── Threshold Checks ─────────────────────────────────────────────────────

    private void checkThresholdsAndAlert(Machine machine, MachineMetrics m) {
        if (m.getTemperature() != null && m.getTemperature() > TEMP_WARNING_THRESHOLD) {
            raiseAlertIfNoneOpen(machine, Alert.AlertType.TEMPERATURE_HIGH,
                    Alert.AlertSeverity.WARNING,
                    "High Temperature Detected",
                    String.format("Machine %s temperature %.1f°C exceeds threshold %.1f°C",
                            machine.getMachineCode(), m.getTemperature(), TEMP_WARNING_THRESHOLD),
                    "temperature", m.getTemperature(), TEMP_WARNING_THRESHOLD);
        }

        if (isVibrationHigh(m)) {
            double maxVib = Math.max(Math.max(
                    m.getVibrationX() != null ? m.getVibrationX() : 0,
                    m.getVibrationY() != null ? m.getVibrationY() : 0),
                    m.getVibrationZ() != null ? m.getVibrationZ() : 0);
            raiseAlertIfNoneOpen(machine, Alert.AlertType.VIBRATION_ANOMALY,
                    Alert.AlertSeverity.WARNING,
                    "Abnormal Vibration Detected",
                    String.format("Machine %s vibration %.2f mm/s² exceeds threshold %.2f mm/s²",
                            machine.getMachineCode(), maxVib, VIBRATION_WARNING_THRESHOLD),
                    "vibration", maxVib, VIBRATION_WARNING_THRESHOLD);
        }

        if (m.getSpindleLoad() != null && m.getSpindleLoad() > SPINDLE_LOAD_WARNING) {
            raiseAlertIfNoneOpen(machine, Alert.AlertType.SPINDLE_OVERLOAD,
                    m.getSpindleLoad() > 95 ? Alert.AlertSeverity.CRITICAL : Alert.AlertSeverity.WARNING,
                    "Spindle Overload",
                    String.format("Machine %s spindle load %.1f%% exceeds threshold %.1f%%",
                            machine.getMachineCode(), m.getSpindleLoad(), SPINDLE_LOAD_WARNING),
                    "spindle_load", m.getSpindleLoad(), SPINDLE_LOAD_WARNING);
        }

        if (m.getCoolantLevel() != null && m.getCoolantLevel() < COOLANT_LOW_THRESHOLD) {
            raiseAlertIfNoneOpen(machine, Alert.AlertType.COOLANT_LOW,
                    Alert.AlertSeverity.WARNING,
                    "Low Coolant Level",
                    String.format("Machine %s coolant level %.1f%% is below minimum %.1f%%",
                            machine.getMachineCode(), m.getCoolantLevel(), COOLANT_LOW_THRESHOLD),
                    "coolant_level", m.getCoolantLevel(), COOLANT_LOW_THRESHOLD);
        }
    }

    private void raiseAlertIfNoneOpen(Machine machine, Alert.AlertType type,
                                       Alert.AlertSeverity severity, String title,
                                       String message, String metricName,
                                       Double metricValue, Double threshold) {
        List<Alert> existing = alertRepository.findOpenAlertsByMachineAndType(machine.getId(), type);
        if (existing.isEmpty()) {
            alertRepository.save(Alert.builder()
                    .machine(machine)
                    .alertType(type)
                    .severity(severity)
                    .status(Alert.AlertStatus.OPEN)
                    .title(title)
                    .message(message)
                    .metricName(metricName)
                    .metricValue(metricValue)
                    .thresholdValue(threshold)
                    .build());
            log.warn("Alert raised for machine {}: {}", machine.getMachineCode(), title);
        }
    }

    private boolean isVibrationHigh(MachineMetrics m) {
        return (m.getVibrationX() != null && m.getVibrationX() > VIBRATION_WARNING_THRESHOLD)
                || (m.getVibrationY() != null && m.getVibrationY() > VIBRATION_WARNING_THRESHOLD)
                || (m.getVibrationZ() != null && m.getVibrationZ() > VIBRATION_WARNING_THRESHOLD);
    }

    private void syncMachineStatusFromMetrics(Machine machine, MachineMetrics m) {
        if (m.getSpindleSpeed() != null && m.getSpindleSpeed() > 0
                && machine.getStatus() == Machine.MachineStatus.IDLE) {
            machine.setStatus(Machine.MachineStatus.RUNNING);
            machineRepository.save(machine);
        }
    }

    // ─── Scheduled Cleanup ────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 2 * * SUN")  // Every Sunday at 2 AM
    @Transactional
    public void purgeOldMetrics() {
        LocalDateTime cutoff = LocalDateTime.now().minusMonths(6);
        machineRepository.findByIsActiveTrue().forEach(machine ->
                metricsRepository.deleteByMachineIdAndRecordedAtBefore(machine.getId(), cutoff));
        log.info("Purged metrics older than {}", cutoff);
    }

    public List<Machine> getMachinesDueForMaintenance() {
        return machineRepository.findMachinesDueForMaintenance(LocalDateTime.now().plusDays(7));
    }
}
