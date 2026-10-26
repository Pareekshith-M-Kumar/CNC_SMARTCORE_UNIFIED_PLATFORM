package com.cncsmartcore.monitoring.controller;

import com.cncsmartcore.monitoring.dto.MachineStatusDTO;
import com.cncsmartcore.monitoring.model.Machine;
import com.cncsmartcore.monitoring.model.MachineMetrics;
import com.cncsmartcore.monitoring.service.MachineMonitoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/machines")
@RequiredArgsConstructor
public class MachineMonitoringController {

    private final MachineMonitoringService monitoringService;

    // ─── Machine CRUD ─────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<Machine> createMachine(@Valid @RequestBody Machine machine) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(monitoringService.createMachine(machine));
    }

    @GetMapping
    public ResponseEntity<List<Machine>> getAllMachines() {
        return ResponseEntity.ok(monitoringService.getAllActiveMachines());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Machine> getMachine(@PathVariable Long id) {
        return ResponseEntity.ok(monitoringService.getMachineById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Machine> updateMachine(@PathVariable Long id,
                                                  @Valid @RequestBody Machine machine) {
        machine.setId(id);
        return ResponseEntity.ok(monitoringService.updateMachine(machine));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Machine> updateStatus(@PathVariable Long id,
                                                 @RequestBody Map<String, String> body) {
        Machine.MachineStatus status = Machine.MachineStatus.valueOf(body.get("status").toUpperCase());
        return ResponseEntity.ok(monitoringService.updateMachineStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateMachine(@PathVariable Long id) {
        monitoringService.deactivateMachine(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Real-time Status / Dashboard ─────────────────────────────────────────

    @GetMapping("/dashboard")
    public ResponseEntity<List<MachineStatusDTO>> getDashboard() {
        return ResponseEntity.ok(monitoringService.getDashboardStatus());
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<MachineStatusDTO> getMachineStatus(@PathVariable Long id) {
        return ResponseEntity.ok(monitoringService.getMachineStatus(id));
    }

    @GetMapping("/maintenance-due")
    public ResponseEntity<List<Machine>> getMachinesDueForMaintenance() {
        return ResponseEntity.ok(monitoringService.getMachinesDueForMaintenance());
    }

    // ─── Metrics Ingestion & History ──────────────────────────────────────────

    @PostMapping("/{machineId}/metrics")
    public ResponseEntity<MachineMetrics> ingestMetrics(@PathVariable Long machineId,
                                                         @RequestBody MachineMetrics metrics) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(monitoringService.ingestMetrics(machineId, metrics));
    }

    @GetMapping("/{machineId}/metrics/latest")
    public ResponseEntity<MachineMetrics> getLatestMetrics(@PathVariable Long machineId) {
        return ResponseEntity.ok(monitoringService.getLatestMetrics(machineId));
    }

    @GetMapping("/{machineId}/metrics/history")
    public ResponseEntity<List<MachineMetrics>> getMetricsHistory(
            @PathVariable Long machineId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(monitoringService.getMetricsHistory(machineId, from, to));
    }
}
