package com.cncsmartcore.monitoring.repository;

import com.cncsmartcore.monitoring.model.JobQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobQueueRepository extends JpaRepository<JobQueue, Long> {

    List<JobQueue> findByMachineIdAndIsActiveTrueOrderByQueuePositionAsc(Long machineId);

    Optional<JobQueue> findByMachineIdAndJobId(Long machineId, Long jobId);

    @Query("SELECT MAX(jq.queuePosition) FROM JobQueue jq WHERE jq.machine.id = :machineId AND jq.isActive = true")
    Optional<Integer> findMaxPositionByMachineId(@Param("machineId") Long machineId);

    @Query("SELECT jq FROM JobQueue jq WHERE jq.isActive = true ORDER BY jq.machine.id, jq.queuePosition")
    List<JobQueue> findAllActiveQueueEntries();

    @Modifying
    @Query("UPDATE JobQueue jq SET jq.isActive = false WHERE jq.job.id = :jobId")
    void deactivateByJobId(@Param("jobId") Long jobId);

    @Modifying
    @Query("""
        UPDATE JobQueue jq
        SET jq.queuePosition = jq.queuePosition - 1
        WHERE jq.machine.id = :machineId
          AND jq.queuePosition > :position
          AND jq.isActive = true
    """)
    void shiftPositionsAfterRemoval(@Param("machineId") Long machineId,
                                     @Param("position") Integer position);

    @Query("SELECT COUNT(jq) FROM JobQueue jq WHERE jq.machine.id = :machineId AND jq.isActive = true")
    Long countActiveJobsForMachine(@Param("machineId") Long machineId);
}
