package com.cncsmartcore.monitoring.service;

import com.cncsmartcore.monitoring.dto.AnalyticsDTO;
import com.cncsmartcore.monitoring.model.Machine;
import com.cncsmartcore.monitoring.model.MachineMetrics;
import com.cncsmartcore.monitoring.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final MachineRepository machineRepository;
    private final MachineMetricsRepository metricsRepository;
    private final ProductionJobRepository jobRepository;
    private final AlertRepository alertRepository;
    private final ToolRepository toolRepository;

    @Cacheable(value = "analytics", key = "'fleet_summary'", unless = "#result == null")
    public AnalyticsDTO getFleetSummary(LocalDateTime from, LocalDateTime to) {
        long total     = machineRepository.count();
        long running   = machineRepository.countByStatus(Machine.MachineStatus.RUNNING);
        long idle      = machineRepository.countByStatus(Machine.MachineStatus.IDLE);
        long maint     = machineRepository.countByStatus(Machine.MachineStatus.MAINTENANCE);
        long errors    = machineRepository.countByStatus(Machine.MachineStatus.ERROR)
                       + machineRepository.countByStatus(Machine.MachineStatus.OFFLINE);

        long completed = jobRepository.countByStatus(
                com.cncsmartcore.monitoring.model.ProductionJob.JobStatus.COMPLETED);
        long pending   = jobRepository.countByStatus(
                com.cncsmartcore.monitoring.model.ProductionJob.JobStatus.PENDING)
                       + jobRepository.countByStatus(
                com.cncsmartcore.monitoring.model.ProductionJob.JobStatus.QUEUED);

        long openAlerts    = alertRepository.countOpenAlerts();
        long critAlerts    = alertRepository.findCriticalOpenAlerts().size();
        long toolsToReplace = toolRepository.findToolsNeedingReplacement().size();
        double avgWear = toolRepository.findAll().stream()
                .filter(t -> Boolean.TRUE.equals(t.getIsActive()))
                .mapToDouble(t -> t.getWearPercentage() != null ? t.getWearPercentage() : 0)
                .average().orElse(0);

        double oee = computeFleetOEE(from, to);

        return AnalyticsDTO.builder()
                .totalMachines((int) total)
                .runningMachines((int) running)
                .idleMachines((int) idle)
                .machinesInMaintenance((int) maint)
                .machinesTotalErrors((int) errors)
                .overallEquipmentEffectiveness(oee)
                .totalJobsCompleted(completed)
                .totalJobsPending(pending)
                .openAlerts(openAlerts)
                .criticalAlerts(critAlerts)
                .toolsNeedingReplacement(toolsToReplace)
                .averageToolWear(avgWear)
                .from(from)
                .to(to)
                .build();
    }

    public AnalyticsDTO.MachineAnalytics getMachineAnalytics(Long machineId,
                                                               LocalDateTime from,
                                                               LocalDateTime to) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new com.cncsmartcore.monitoring.exception
                        .ResourceNotFoundException("Machine not found: " + machineId));

        List<MachineMetrics> metrics = metricsRepository
                .findByMachineIdAndRecordedAtBetweenOrderByRecordedAtAsc(machineId, from, to);

        double availability = computeAvailability(machineId, from, to);
        double performance  = computePerformance(metrics, machine);
        double quality      = computeQuality(machineId, from, to);
        double oee          = availability * performance * quality / 10000.0;

        long partsProduced = metrics.stream()
                .filter(m -> m.getPartsProduced() != null)
                .mapToLong(MachineMetrics::getPartsProduced).sum();

        double avgCycleTime = metrics.stream()
                .filter(m -> m.getCycleTime() != null)
                .mapToDouble(MachineMetrics::getCycleTime)
                .average().orElse(0);

        double totalPower = metrics.stream()
                .filter(m -> m.getPowerConsumption() != null)
                .mapToDouble(MachineMetrics::getPowerConsumption).sum() / 60.0; // approx kWh

        // Build temperature trend (sampled every 30 min)
        List<AnalyticsDTO.MetricTrend> tempTrend = metrics.stream()
                .filter(m -> m.getTemperature() != null)
                .filter(m -> m.getRecordedAt().getMinute() % 30 == 0)
                .map(m -> AnalyticsDTO.MetricTrend.builder()
                        .timestamp(m.getRecordedAt())
                        .value(m.getTemperature())
                        .build())
                .collect(Collectors.toList());

        List<AnalyticsDTO.MetricTrend> spindleTrend = metrics.stream()
                .filter(m -> m.getSpindleLoad() != null)
                .filter(m -> m.getRecordedAt().getMinute() % 30 == 0)
                .map(m -> AnalyticsDTO.MetricTrend.builder()
                        .timestamp(m.getRecordedAt())
                        .value(m.getSpindleLoad())
                        .build())
                .collect(Collectors.toList());

        return AnalyticsDTO.MachineAnalytics.builder()
                .machineId(machineId)
                .machineCode(machine.getMachineCode())
                .machineName(machine.getName())
                .availability(availability)
                .performance(performance)
                .quality(quality)
                .oee(oee)
                .partsProduced(partsProduced)
                .avgCycleTime(avgCycleTime)
                .totalPowerConsumed(totalPower)
                .alertCount(alertRepository.countOpenAlertsForMachine(machineId))
                .temperatureTrend(tempTrend)
                .spindleLoadTrend(spindleTrend)
                .build();
    }

    public List<AnalyticsDTO.AlertFrequency> getAlertFrequency(Long machineId,
                                                                 LocalDateTime since) {
        List<Object[]> raw = alertRepository.findAlertFrequencyByType(machineId, since);
        long total = raw.stream().mapToLong(r -> (Long) r[1]).sum();
        return raw.stream()
                .map(r -> AnalyticsDTO.AlertFrequency.builder()
                        .alertType(r[0].toString())
                        .count((Long) r[1])
                        .percentage(total > 0 ? (double)(Long) r[1] / total * 100.0 : 0)
                        .build())
                .collect(Collectors.toList());
    }

    // ─── OEE components ───────────────────────────────────────────────────────

    /**
     * Availability = (Planned time - Downtime) / Planned time * 100.
     * Approximated from status-change history (simplified).
     */
    private double computeAvailability(Long machineId, LocalDateTime from, LocalDateTime to) {
        // Simplified: count intervals where machine had active metrics as "up time"
        List<MachineMetrics> m = metricsRepository
                .findByMachineIdAndRecordedAtBetweenOrderByRecordedAtAsc(machineId, from, to);
        if (m.isEmpty()) return 0;
        long plannedMinutes = java.time.Duration.between(from, to).toMinutes();
        // Each metric entry represents ~1 min of uptime (assumes 1-min polling)
        long uptimeMinutes = Math.min(m.size(), plannedMinutes);
        return plannedMinutes > 0 ? (double) uptimeMinutes / plannedMinutes * 100.0 : 0;
    }

    /**
     * Performance = (Actual output / Theoretical output) * 100.
     */
    private double computePerformance(List<MachineMetrics> metrics, Machine machine) {
        if (metrics.isEmpty() || machine.getMaxSpindleSpeed() == null) return 0;
        double avgSpindleActual = metrics.stream()
                .filter(m -> m.getSpindleSpeed() != null)
                .mapToDouble(MachineMetrics::getSpindleSpeed).average().orElse(0);
        return avgSpindleActual / machine.getMaxSpindleSpeed() * 100.0;
    }

    /**
     * Quality = (Good parts / Total parts) * 100. Simplified to 97% placeholder
     * until a reject/scrap tracking model is added.
     */
    private double computeQuality(Long machineId, LocalDateTime from, LocalDateTime to) {
        return 97.0; // placeholder — replace with real scrap tracking
    }

    private double computeFleetOEE(LocalDateTime from, LocalDateTime to) {
        List<Machine> active = machineRepository.findByIsActiveTrue();
        if (active.isEmpty()) return 0;
        double sum = active.stream()
                .mapToDouble(m -> {
                    AnalyticsDTO.MachineAnalytics a = getMachineAnalytics(m.getId(), from, to);
                    return a.getOee();
                }).sum();
        return sum / active.size();
    }
}
