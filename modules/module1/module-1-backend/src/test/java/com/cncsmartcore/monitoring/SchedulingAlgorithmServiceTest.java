package com.cncsmartcore.monitoring;

import com.cncsmartcore.monitoring.model.JobQueue;
import com.cncsmartcore.monitoring.model.ProductionJob;
import com.cncsmartcore.monitoring.service.SchedulingAlgorithmService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DisplayName("SchedulingAlgorithmService Tests")
class SchedulingAlgorithmServiceTest {

    private SchedulingAlgorithmService service;
    private List<ProductionJob> jobs;

    @BeforeEach
    void setUp() {
        service = new SchedulingAlgorithmService();

        ProductionJob j1 = ProductionJob.builder().id(1L).jobNumber("J001")
                .estimatedCycleTime(600.0).estimatedSetupTime(30.0).quantityRequired(5)
                .priority(3).dueDate(LocalDateTime.now().plusDays(5)).build();
        ProductionJob j2 = ProductionJob.builder().id(2L).jobNumber("J002")
                .estimatedCycleTime(200.0).estimatedSetupTime(15.0).quantityRequired(10)
                .priority(1).dueDate(LocalDateTime.now().plusDays(2)).build();
        ProductionJob j3 = ProductionJob.builder().id(3L).jobNumber("J003")
                .estimatedCycleTime(400.0).estimatedSetupTime(20.0).quantityRequired(8)
                .priority(2).dueDate(LocalDateTime.now().plusDays(3)).build();

        jobs = List.of(j1, j2, j3);
    }

    @Test
    @DisplayName("SPT: shortest total processing time comes first")
    void spt_ordersByTotalProcessingTime() {
        List<ProductionJob> result = service.spt(jobs);
        // J002: 200*10=2000s, J003: 400*8=3200s, J001: 600*5=3000s
        // SPT order: J002 → J001 → J003? No: 2000, 3000, 3200 → J002, J001, J003
        assertThat(result.get(0).getJobNumber()).isEqualTo("J002");
    }

    @Test
    @DisplayName("EDD: earliest due date comes first")
    void edd_ordersByDueDate() {
        List<ProductionJob> result = service.edd(jobs);
        assertThat(result.get(0).getJobNumber()).isEqualTo("J002"); // +2 days = earliest
    }

    @Test
    @DisplayName("LPT: longest processing time comes first")
    void lpt_longestFirst() {
        List<ProductionJob> result = service.lpt(jobs);
        assertThat(result.get(0).getJobNumber()).isEqualTo("J003"); // 400*8=3200
    }

    @Test
    @DisplayName("Priority: highest priority (lowest number) comes first")
    void priority_highestPriorityFirst() {
        List<ProductionJob> result = service.priorityBased(jobs);
        assertThat(result.get(0).getJobNumber()).isEqualTo("J002"); // priority=1
        assertThat(result.get(1).getJobNumber()).isEqualTo("J003"); // priority=2
        assertThat(result.get(2).getJobNumber()).isEqualTo("J001"); // priority=3
    }

    @Test
    @DisplayName("Genetic: returns all jobs with no duplicates")
    void genetic_returnsAllJobsUnique() {
        List<ProductionJob> result = service.geneticAlgorithm(jobs);
        assertThat(result).hasSize(3);
        assertThat(result.stream().map(ProductionJob::getId).distinct().count()).isEqualTo(3);
    }

    @Test
    @DisplayName("dispatch: GENETIC algorithm routes correctly")
    void dispatch_genetic() {
        List<ProductionJob> result = service.schedule(jobs, JobQueue.SchedulingAlgorithm.GENETIC);
        assertThat(result).hasSize(3);
    }

    @Test
    @DisplayName("computeTotalMakespan: sums setup + run time correctly")
    void computeMakespan() {
        // J002: 15 + (200*10/60) = 15 + 33.33 = 48.33 min
        // J003: 20 + (400*8/60)  = 20 + 53.33 = 73.33 min
        // J001: 30 + (600*5/60)  = 30 + 50    = 80 min
        // total ≈ 201.67 min
        double makespan = service.computeTotalMakespan(jobs);
        assertThat(makespan).isGreaterThan(150).isLessThan(250);
    }

    @Test
    @DisplayName("computeScheduleTimes: returns a start/end for each job")
    void computeScheduleTimes() {
        var times = service.computeScheduleTimes(jobs, LocalDateTime.now());
        assertThat(times).hasSize(3);
        times.forEach((id, window) -> {
            assertThat(window).hasSize(2);
            assertThat(window[0]).isBefore(window[1]);
        });
    }

    @Test
    @DisplayName("Empty job list returns empty result for all algorithms")
    void emptyJobList_returnsEmpty() {
        for (JobQueue.SchedulingAlgorithm algo : JobQueue.SchedulingAlgorithm.values()) {
            assertThat(service.schedule(List.of(), algo)).isEmpty();
        }
    }
}
