package com.cncsmartcore.simulation;

import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.simulation.dto.SimulationResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class SimulationController {

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @PostMapping("/cam-jobs/{id}/simulations")
    @PreAuthorize("hasAnyRole('CAM_ENGINEER', 'APPROVER', 'ADMIN')")
    public ResponseEntity<SimulationResponse> runSimulation(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser) {
        SimulationResponse response = simulationService.runSimulation(id, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/cam-jobs/{id}/simulations/latest")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SimulationResponse> getLatestSimulation(@PathVariable UUID id) {
        SimulationResponse response = simulationService.getLatestSimulation(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/simulations/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SimulationResponse> getSimulationById(@PathVariable UUID id) {
        SimulationResponse response = simulationService.getSimulationById(id);
        return ResponseEntity.ok(response);
    }
}
