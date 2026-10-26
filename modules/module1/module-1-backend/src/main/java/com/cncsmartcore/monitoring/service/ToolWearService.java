package com.cncsmartcore.monitoring.service;

import com.cncsmartcore.monitoring.exception.ResourceNotFoundException;
import com.cncsmartcore.monitoring.exception.ValidationException;
import com.cncsmartcore.monitoring.model.Alert;
import com.cncsmartcore.monitoring.model.Machine;
import com.cncsmartcore.monitoring.model.Tool;
import com.cncsmartcore.monitoring.model.ToolUsage;
import com.cncsmartcore.monitoring.repository.AlertRepository;
import com.cncsmartcore.monitoring.repository.MachineRepository;
import com.cncsmartcore.monitoring.repository.ToolRepository;
import com.cncsmartcore.monitoring.repository.ToolUsageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToolWearService {

    private final ToolRepository toolRepository;
    private final ToolUsageRepository toolUsageRepository;
    private final MachineRepository machineRepository;
    private final AlertRepository alertRepository;
    private final MLIntegrationService mlIntegrationService;

    // ─── Tool CRUD ────────────────────────────────────────────────────────────

    @Transactional
    public Tool createTool(Tool tool) {
        if (toolRepository.existsByToolCode(tool.getToolCode())) {
            throw new ValidationException("Tool code already exists: " + tool.getToolCode());
        }
        return toolRepository.save(tool);
    }

    public Tool getToolById(Long id) {
        return toolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found with id: " + id));
    }

    public List<Tool> getToolsForMachine(Long machineId) {
        return toolRepository.findToolsByMachineOrderByWear(machineId);
    }

    public List<Tool> getToolsNeedingReplacement() {
        return toolRepository.findToolsNeedingReplacement();
    }

    @Transactional(readOnly = true)
    public List<Tool> getHighWearTools(Double minWearPercent) {
        return toolRepository.findHighWearTools(minWearPercent);
    }

    // ─── Tool Usage Tracking ──────────────────────────────────────────────────

    @Transactional
    public ToolUsage startToolUsage(Long toolId, Long machineId, Long jobId) {
        Tool tool = getToolById(toolId);
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found: " + machineId));

        if (tool.getCondition() == Tool.ToolCondition.BROKEN) {
            throw new ValidationException("Cannot use a broken tool: " + tool.getToolCode());
        }

        ToolUsage usage = ToolUsage.builder()
                .tool(tool)
                .machine(machine)
                .usageStart(LocalDateTime.now())
                .wearBefore(tool.getWearPercentage())
                .build();

        if (jobId != null) {
            // lazy set job reference — just use the id field for simplicity
        }

        return toolUsageRepository.save(usage);
    }

    @Transactional
    public ToolUsage completeToolUsage(Long usageId, Double avgSpindleSpeed,
                                        Double avgFeedRate, Double avgCuttingForce,
                                        Integer partsMachined) {
        ToolUsage usage = toolUsageRepository.findById(usageId)
                .orElseThrow(() -> new ResourceNotFoundException("ToolUsage not found: " + usageId));

        usage.setUsageEnd(LocalDateTime.now());
        long minutes = java.time.Duration.between(usage.getUsageStart(), usage.getUsageEnd()).toMinutes();
        usage.setDurationMinutes((double) minutes);
        usage.setAvgSpindleSpeed(avgSpindleSpeed);
        usage.setAvgFeedRate(avgFeedRate);
        usage.setAvgCuttingForce(avgCuttingForce);
        usage.setPartsMachined(partsMachined);

        // Update tool wear using ML prediction
        Tool tool = usage.getTool();
        double newWear = calculateUpdatedWear(tool, usage);
        usage.setWearAfter(newWear);

        // Get ML-predicted remaining life
        Map<String, Object> prediction = mlIntegrationService
                .predictToolRemainingLife(tool, usage);
        Double remainingLife = (Double) prediction.getOrDefault("remaining_life_minutes", 0.0);
        usage.setPredictedRemainingLife(remainingLife);

        toolUsageRepository.save(usage);

        // Update tool itself
        updateToolWear(tool, newWear, minutes);

        return usage;
    }

    @Transactional
    public Tool replaceTool(Long toolId) {
        Tool tool = getToolById(toolId);
        tool.setWearPercentage(0.0);
        tool.setUsedLifeMinutes(0.0);
        tool.setCondition(Tool.ToolCondition.NEW);
        tool.setLastReplacedAt(LocalDateTime.now());

        // Resolve any open TOOL_WEAR alerts for this machine
        if (tool.getCurrentMachine() != null) {
            alertRepository.findOpenAlertsByMachineAndType(
                    tool.getCurrentMachine().getId(), Alert.AlertType.TOOL_WEAR)
                    .forEach(a -> {
                        a.setStatus(Alert.AlertStatus.RESOLVED);
                        a.setResolvedAt(LocalDateTime.now());
                        a.setResolutionNote("Tool " + tool.getToolCode() + " replaced");
                        alertRepository.save(a);
                    });
        }

        log.info("Tool {} replaced. Wear and life counters reset.", tool.getToolCode());
        return toolRepository.save(tool);
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private double calculateUpdatedWear(Tool tool, ToolUsage usage) {
        // Simple Taylor's tool life model approximation:
        // wear_increase proportional to time, cutting speed, and force
        double baseWearRate = 0.05; // % per minute at normal conditions
        double speedFactor  = usage.getAvgSpindleSpeed() != null
                ? usage.getAvgSpindleSpeed() / 1000.0 : 1.0;
        double forceFactor  = usage.getAvgCuttingForce() != null
                ? usage.getAvgCuttingForce() / 100.0 : 1.0;
        double wearIncrease = baseWearRate * usage.getDurationMinutes() * speedFactor * forceFactor;

        return Math.min(100.0, tool.getWearPercentage() + wearIncrease);
    }

    private void updateToolWear(Tool tool, double newWear, long additionalMinutes) {
        tool.setWearPercentage(newWear);
        tool.setUsedLifeMinutes(tool.getUsedLifeMinutes() + additionalMinutes);

        if (newWear >= 100.0) {
            tool.setCondition(Tool.ToolCondition.BROKEN);
        } else if (newWear >= tool.getReplacementThreshold()) {
            tool.setCondition(Tool.ToolCondition.CRITICAL);
            raiseToolWearAlert(tool);
        } else if (newWear >= tool.getReplacementThreshold() * 0.75) {
            tool.setCondition(Tool.ToolCondition.WORN);
        } else {
            tool.setCondition(Tool.ToolCondition.GOOD);
        }

        toolRepository.save(tool);
    }

    private void raiseToolWearAlert(Tool tool) {
        if (tool.getCurrentMachine() == null) return;

        List<Alert> existing = alertRepository.findOpenAlertsByMachineAndType(
                tool.getCurrentMachine().getId(), Alert.AlertType.TOOL_WEAR);
        if (!existing.isEmpty()) return;

        Alert alert = Alert.builder()
                .machine(tool.getCurrentMachine())
                .alertType(Alert.AlertType.TOOL_WEAR)
                .severity(tool.getWearPercentage() >= 95 ? Alert.AlertSeverity.CRITICAL : Alert.AlertSeverity.WARNING)
                .status(Alert.AlertStatus.OPEN)
                .title(String.format("Tool Wear Critical: %s", tool.getToolCode()))
                .message(String.format("Tool %s (%s) wear at %.1f%% — replacement threshold is %.1f%%",
                        tool.getToolCode(), tool.getName(), tool.getWearPercentage(), tool.getReplacementThreshold()))
                .metricName("wear_percentage")
                .metricValue(tool.getWearPercentage())
                .thresholdValue(tool.getReplacementThreshold())
                .build();

        alertRepository.save(alert);
        log.warn("Tool wear alert raised for tool {}", tool.getToolCode());
    }
}
