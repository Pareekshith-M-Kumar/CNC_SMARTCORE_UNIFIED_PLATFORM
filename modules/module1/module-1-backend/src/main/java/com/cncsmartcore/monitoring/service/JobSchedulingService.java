package com.cncsmartcore.monitoring.service;

import com.cncsmartcore.monitoring.dto.JobQueueDTO;
import com.cncsmartcore.monitoring.exception.ResourceNotFoundException;
import com.cncsmartcore.monitoring.exception.ValidationException;
import com.cncsmartcore.monitoring.model.*;
import com.cncsmartcore.monitoring.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobSchedulingService {

    private final ProductionJobRepository jobRepository;
    private final JobQueueRepository     queueRepository;
    private final MachineRepository      machineRepository;
    private final SchedulingAlgorithmService algorithmService;

    // ─── Job Management ───────────────────────────────────────────────────────

    @Transactional
    public ProductionJob createJob(JobQueueDTO.CreateJobRequest req) {
        if (jobRepository.existsByJobNumber(req.getJobNumber())) {
            throw new ValidationException("Job number already exists: " + req.getJobNumber());
        }
        ProductionJob job = ProductionJob.builder()
                .jobNumber(req.getJobNumber())
                .partName(req.getPartName())
                .partNumber(req.getPartNumber())
                .material(req.getMaterial())
                .quantityRequired(req.getQuantityRequired())
                .estimatedCycleTime(req.getEstimatedCycleTime())
                .estimatedSetupTime(req.getEstimatedSetupTime())
                .priority(req.getPriority() != null ? req.getPriority() : 5)
                .dueDate(req.getDueDate())
                .ncProgramPath(req.getNcProgramPath())
                .notes(req.getNotes())
                .status(ProductionJob.JobStatus.PENDING)
                .build();
        return jobRepository.save(job);
    }

    public ProductionJob getJobById(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + id));
    }

    public List<ProductionJob> getAllJobs() {
        return jobRepository.findAll();
    }

    public List<ProductionJob> getPendingJobs() {
        return jobRepository.findUnscheduledJobsByPriority();
    }

    public List<ProductionJob> getOverdueJobs() {
        return jobRepository.findOverdueJobs(LocalDateTime.now());
    }

    @Transactional
    public ProductionJob updateJobStatus(Long jobId, ProductionJob.JobStatus newStatus) {
        ProductionJob job = getJobById(jobId);
        job.setStatus(newStatus);

        if (newStatus == ProductionJob.JobStatus.IN_PROGRESS && job.getActualStart() == null) {
            job.setActualStart(LocalDateTime.now());
        }
        if (newStatus == ProductionJob.JobStatus.COMPLETED) {
            job.setActualEnd(LocalDateTime.now());
            queueRepository.deactivateByJobId(jobId);
        }
        if (newStatus == ProductionJob.JobStatus.CANCELLED) {
            queueRepository.deactivateByJobId(jobId);
        }

        return jobRepository.save(job);
    }

    // ─── Queue Management ─────────────────────────────────────────────────────

    @Transactional
    public JobQueue enqueueJob(Long machineId, Long jobId,
                                JobQueue.SchedulingAlgorithm algorithm) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new ResourceNotFoundException("Machine not found: " + machineId));
        ProductionJob job = getJobById(jobId);

        if (queueRepository.findByMachineIdAndJobId(machineId, jobId).isPresent()) {
            throw new ValidationException("Job " + jobId + " already queued on machine " + machineId);
        }

        int position = queueRepository.findMaxPositionByMachineId(machineId).orElse(0) + 1;

        JobQueue entry = JobQueue.builder()
                .machine(machine)
                .job(job)
                .queuePosition(position)
                .schedulingAlgorithm(algorithm != null ? algorithm : JobQueue.SchedulingAlgorithm.PRIORITY)
                .isActive(true)
                .build();

        job.setStatus(ProductionJob.JobStatus.QUEUED);
        jobRepository.save(job);

        JobQueue saved = queueRepository.save(entry);
        log.info("Job {} enqueued on machine {} at position {}", job.getJobNumber(),
                machine.getMachineCode(), position);

        // Re-optimise queue after addition
        optimizeMachineQueue(machineId, algorithm);
        return saved;
    }

    @Transactional
    public void dequeueJob(Long machineId, Long jobId) {
        JobQueue entry = queueRepository.findByMachineIdAndJobId(machineId, jobId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Queue entry not found for machine " + machineId + " / job " + jobId));

        int position = entry.getQueuePosition();
        entry.setIsActive(false);
        queueRepository.save(entry);
        queueRepository.shiftPositionsAfterRemoval(machineId, position);

        getJobById(jobId).setStatus(ProductionJob.JobStatus.PENDING);
        log.info("Job {} removed from machine {} queue", jobId, machineId);
    }

    /**
     * Re-sequences the active queue for a machine using the given algorithm and
     * recomputes estimated start/end times.
     */
    @Transactional
    public List<JobQueue> optimizeMachineQueue(Long machineId,
                                                JobQueue.SchedulingAlgorithm algorithm) {
        List<JobQueue> activeEntries = queueRepository
                .findByMachineIdAndIsActiveTrueOrderByQueuePositionAsc(machineId);
        if (activeEntries.isEmpty()) return activeEntries;

        List<ProductionJob> jobs = activeEntries.stream()
                .map(JobQueue::getJob)
                .filter(j -> j.getStatus() != ProductionJob.JobStatus.COMPLETED
                          && j.getStatus() != ProductionJob.JobStatus.CANCELLED)
                .collect(Collectors.toList());

        JobQueue.SchedulingAlgorithm algo = algorithm != null
                ? algorithm : activeEntries.get(0).getSchedulingAlgorithm();

        List<ProductionJob> ordered = algorithmService.schedule(jobs, algo);

        // Recompute schedule times
        Map<Long, LocalDateTime[]> times = algorithmService
                .computeScheduleTimes(ordered, LocalDateTime.now());

        // Rewrite positions and time estimates
        for (int i = 0; i < ordered.size(); i++) {
            ProductionJob job = ordered.get(i);
            JobQueue entry = activeEntries.stream()
                    .filter(e -> e.getJob().getId().equals(job.getId()))
                    .findFirst().orElseThrow();

            entry.setQueuePosition(i + 1);
            entry.setSchedulingAlgorithm(algo);

            LocalDateTime[] t = times.get(job.getId());
            if (t != null) {
                entry.setEstimatedStart(t[0]);
                entry.setEstimatedEnd(t[1]);

                job.setScheduledStart(t[0]);
                job.setScheduledEnd(t[1]);

                if (job.getDueDate() != null) {
                    long tardiness = java.time.Duration.between(job.getDueDate(), t[1]).toMinutes();
                    entry.setTardiness((double) Math.max(0L, tardiness));
                }
            }
            queueRepository.save(entry);
            jobRepository.save(job);
        }

        log.info("Machine {} queue optimised using {} — {} jobs sequenced",
                machineId, algo, ordered.size());

        return queueRepository.findByMachineIdAndIsActiveTrueOrderByQueuePositionAsc(machineId);
    }

    public List<JobQueue> getMachineQueue(Long machineId) {
        return queueRepository.findByMachineIdAndIsActiveTrueOrderByQueuePositionAsc(machineId);
    }

    public List<JobQueue> getFullQueue() {
        return queueRepository.findAllActiveQueueEntries();
    }

    public Double computeMakespan(Long machineId) {
        List<JobQueue> entries = getMachineQueue(machineId);
        List<ProductionJob> jobs = entries.stream().map(JobQueue::getJob).collect(Collectors.toList());
        return algorithmService.computeTotalMakespan(jobs);
    }
}
