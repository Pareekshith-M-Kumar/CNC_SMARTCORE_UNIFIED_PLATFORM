package com.cncsmartcore.monitoring.repository;

import com.cncsmartcore.monitoring.model.ProductionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionJobRepository extends JpaRepository<ProductionJob, Long> {

    Optional<ProductionJob> findByJobNumber(String jobNumber);

    List<ProductionJob> findByStatus(ProductionJob.JobStatus status);

    List<ProductionJob> findByMachineId(Long machineId);

    List<ProductionJob> findByMachineIdAndStatus(Long machineId, ProductionJob.JobStatus status);

    @Query("SELECT j FROM ProductionJob j WHERE j.status IN ('PENDING', 'QUEUED') ORDER BY j.priority ASC, j.dueDate ASC")
    List<ProductionJob> findUnscheduledJobsByPriority();

    @Query("SELECT j FROM ProductionJob j WHERE j.dueDate < :now AND j.status NOT IN ('COMPLETED', 'CANCELLED')")
    List<ProductionJob> findOverdueJobs(@Param("now") LocalDateTime now);

    @Query("""
        SELECT j FROM ProductionJob j
        WHERE j.machine.id = :machineId
          AND j.scheduledStart >= :from
          AND j.scheduledEnd <= :to
        ORDER BY j.scheduledStart ASC
    """)
    List<ProductionJob> findScheduledJobsForMachineInRange(@Param("machineId") Long machineId,
                                                            @Param("from") LocalDateTime from,
                                                            @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(j) FROM ProductionJob j WHERE j.status = :status")
    Long countByStatus(@Param("status") ProductionJob.JobStatus status);

    @Query("""
        SELECT j.machine.id, COUNT(j), AVG(j.actualCycleTime)
        FROM ProductionJob j
        WHERE j.status = 'COMPLETED'
          AND j.actualEnd BETWEEN :from AND :to
        GROUP BY j.machine.id
    """)
    List<Object[]> findCompletionStatsByMachine(@Param("from") LocalDateTime from,
                                                 @Param("to") LocalDateTime to);

    boolean existsByJobNumber(String jobNumber);
}
