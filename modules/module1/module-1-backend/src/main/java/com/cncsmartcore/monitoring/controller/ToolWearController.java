package com.cncsmartcore.monitoring.controller;

import com.cncsmartcore.monitoring.model.Tool;
import com.cncsmartcore.monitoring.model.ToolUsage;
import com.cncsmartcore.monitoring.service.ToolWearService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/tools")
@RequiredArgsConstructor
public class ToolWearController {

    private final ToolWearService toolWearService;

    @PostMapping
    public ResponseEntity<Tool> createTool(@Valid @RequestBody Tool tool) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toolWearService.createTool(tool));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tool> getTool(@PathVariable Long id) {
        return ResponseEntity.ok(toolWearService.getToolById(id));
    }

    @GetMapping("/machine/{machineId}")
    public ResponseEntity<List<Tool>> getToolsForMachine(@PathVariable Long machineId) {
        return ResponseEntity.ok(toolWearService.getToolsForMachine(machineId));
    }

    @GetMapping("/needs-replacement")
    public ResponseEntity<List<Tool>> getToolsNeedingReplacement() {
        return ResponseEntity.ok(toolWearService.getToolsNeedingReplacement());
    }

    @GetMapping("/high-wear")
    public ResponseEntity<List<Tool>> getHighWearTools(
            @RequestParam(defaultValue = "70.0") Double minWear) {
        return ResponseEntity.ok(toolWearService.getHighWearTools(minWear));
    }

    @PostMapping("/{toolId}/usage/start")
    public ResponseEntity<ToolUsage> startUsage(@PathVariable Long toolId,
                                                 @RequestParam Long machineId,
                                                 @RequestParam(required = false) Long jobId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toolWearService.startToolUsage(toolId, machineId, jobId));
    }

    @PostMapping("/usage/{usageId}/complete")
    public ResponseEntity<ToolUsage> completeUsage(
            @PathVariable Long usageId,
            @RequestBody Map<String, Object> body) {
        Double avgSpindleSpeed = body.containsKey("avgSpindleSpeed")
                ? ((Number) body.get("avgSpindleSpeed")).doubleValue() : null;
        Double avgFeedRate = body.containsKey("avgFeedRate")
                ? ((Number) body.get("avgFeedRate")).doubleValue() : null;
        Double avgCuttingForce = body.containsKey("avgCuttingForce")
                ? ((Number) body.get("avgCuttingForce")).doubleValue() : null;
        Integer partsMachined = body.containsKey("partsMachined")
                ? ((Number) body.get("partsMachined")).intValue() : null;

        return ResponseEntity.ok(toolWearService.completeToolUsage(
                usageId, avgSpindleSpeed, avgFeedRate, avgCuttingForce, partsMachined));
    }

    @PostMapping("/{toolId}/replace")
    public ResponseEntity<Tool> replaceTool(@PathVariable Long toolId) {
        return ResponseEntity.ok(toolWearService.replaceTool(toolId));
    }
}
