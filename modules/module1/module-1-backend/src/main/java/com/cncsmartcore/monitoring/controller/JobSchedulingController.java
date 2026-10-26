package com.cncsmartcore.monitoring.controller;

import com.cncsmartcore.monitoring.dto.JobQueueDTO;
import com.cncsmartcore.monitoring.model.JobQueue;
import com.cncsmartcore.monitoring.model.ProductionJob;
import com.cncsmartcore.monitoring.service.JobSchedulingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/scheduling")
@RequiredArgsConstructor
public class JobSchedulingController {

    private final JobSchedulingService schedulingService;

    // ─── Jobs ─────────────────────────────────────────────────────────────────

    @PostMapping("/jobs")
    public ResponseEntity<ProductionJob> createJob(
            @Valid @RequestBody JobQueueDTO.CreateJobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(schedulingService.createJob(request));
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<ProductionJob>> getAllJobs() {
        return ResponseEntity.ok(schedulingService.getAllJobs());
    }

    @GetMapping("/jobs/{id}")
    public ResponseEntity<ProductionJob> getJob(@PathVariable Long id) {
        return ResponseEntity.ok(schedulingService.getJobById(id));
    }

    @GetMapping("/jobs/pending")
    public ResponseEntity<List<ProductionJob>> getPendingJobs() {
        return ResponseEntity.ok(schedulingService.getPendingJobs());
    }

    @GetMapping("/jobs/overdue")
    public ResponseEntity<List<ProductionJob>> getOverdueJobs() {
        return ResponseEntity.ok(schedulingService.getOverdueJobs());
    }

    @PatchMapping("/jobs/{id}/status")
    public ResponseEntity<ProductionJob> updateJobStatus(@PathVariable Long id,
                                                          @RequestBody Map<String, String> body) {
        ProductionJob.JobStatus status = ProductionJob.JobStatus.valueOf(
                body.get("status").toUpperCase());
        return ResponseEntity.ok(schedulingService.updateJobStatus(id, status));
    }

    // ─── Queue Operations ─────────────────────────────────────────────────────

    @PostMapping("/queue/enqueue")
    public ResponseEntity<JobQueue> enqueue(@RequestBody JobQueueDTO.ScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(schedulingService.enqueueJob(
                        request.getMachineId(),
                        request.getJobId(),
                        request.getAlgorithm()));
    }

    @DeleteMapping("/queue/dequeue")
    public ResponseEntity<Void> dequeue(@RequestParam Long machineId,
                                         @RequestParam Long jobId) {
        schedulingService.dequeueJob(machineId, jobId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/queue")
    public ResponseEntity<List<JobQueue>> getFullQueue() {
        return ResponseEntity.ok(schedulingService.getFullQueue());
    }

    @GetMapping("/queue/machine/{machineId}")
    public ResponseEntity<List<JobQueue>> getMachineQueue(@PathVariable Long machineId) {
        return ResponseEntity.ok(schedulingService.getMachineQueue(machineId));
    }

    @PostMapping("/queue/machine/{machineId}/optimize")
    public ResponseEntity<List<JobQueue>> optimizeQueue(
            @PathVariable Long machineId,
            @RequestParam(defaultValue = "PRIORITY") JobQueue.SchedulingAlgorithm algorithm) {
        return ResponseEntity.ok(schedulingService.optimizeMachineQueue(machineId, algorithm));
    }

    @GetMapping("/queue/machine/{machineId}/makespan")
    public ResponseEntity<Map<String, Double>> getMakespan(@PathVariable Long machineId) {
        return ResponseEntity.ok(Map.of("makespan_minutes", schedulingService.computeMakespan(machineId)));
    }
}
