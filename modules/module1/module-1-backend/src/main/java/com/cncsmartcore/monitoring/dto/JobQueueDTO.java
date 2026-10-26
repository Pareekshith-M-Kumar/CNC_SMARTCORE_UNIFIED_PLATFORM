package com.cncsmartcore.monitoring.dto;

import com.cncsmartcore.monitoring.model.JobQueue;
import com.cncsmartcore.monitoring.model.ProductionJob;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobQueueDTO {

    private Long id;
    private Long machineId;
    private String machineCode;
    private String machineName;
    private Long jobId;
    private String jobNumber;
    private String partName;
    private String partNumber;
    private String material;
    private Integer queuePosition;
    private ProductionJob.JobStatus jobStatus;
    private Integer priority;
    private Integer quantityRequired;
    private Integer quantityCompleted;
    private Double estimatedCycleTime;
    private LocalDateTime estimatedStart;
    private LocalDateTime estimatedEnd;
    private LocalDateTime dueDate;
    private Double makespan;
    private Double tardiness;
    private JobQueue.SchedulingAlgorithm schedulingAlgorithm;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateJobRequest {
        @NotBlank
        private String jobNumber;
        @NotBlank
        private String partName;
        private String partNumber;
        private String material;
        @NotNull
        @Min(1)
        private Integer quantityRequired;
        private Double estimatedCycleTime;
        private Double estimatedSetupTime;
        @Min(1)
        private Integer priority;
        private LocalDateTime dueDate;
        private String ncProgramPath;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleRequest {
        @NotNull
        private Long machineId;
        @NotNull
        private Long jobId;
        private JobQueue.SchedulingAlgorithm algorithm;
    }
}
