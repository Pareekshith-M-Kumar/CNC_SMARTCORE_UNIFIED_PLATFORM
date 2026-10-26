package com.cncsmartcore.monitoring.controller;

import com.cncsmartcore.monitoring.model.Machine;
import com.cncsmartcore.monitoring.service.PredictiveMaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/maintenance")
@RequiredArgsConstructor
public class PredictiveMaintenanceController {

    private final PredictiveMaintenanceService maintenanceService;

    @GetMapping("/predict/{machineId}")
    public ResponseEntity<Map<String, Object>> getPrediction(@PathVariable Long machineId) {
        return ResponseEntity.ok(maintenanceService.getPredictionForMachine(machineId));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<Map<String, Object>>> getMaintenanceRecommendations() {
        return ResponseEntity.ok(maintenanceService.getMaintenanceRecommendations());
    }

    @PostMapping("/{machineId}/complete")
    public ResponseEntity<Machine> recordCompletion(
            @PathVariable Long machineId,
            @RequestParam(required = false) String notes,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime nextScheduled) {
        return ResponseEntity.ok(
                maintenanceService.recordMaintenanceCompletion(machineId, notes, nextScheduled));
    }

    @PostMapping("/run-analysis")
    public ResponseEntity<Map<String, String>> triggerAnalysis() {
        maintenanceService.runPredictiveMaintenance();
        return ResponseEntity.ok(Map.of("status", "Analysis triggered successfully"));
    }
}
