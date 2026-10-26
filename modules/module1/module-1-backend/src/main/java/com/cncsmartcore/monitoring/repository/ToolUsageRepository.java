package com.cncsmartcore.monitoring.repository;

import com.cncsmartcore.monitoring.model.ToolUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ToolUsageRepository extends JpaRepository<ToolUsage, Long> {

    List<ToolUsage> findByToolIdOrderByUsageStartDesc(Long toolId);

    List<ToolUsage> findByMachineIdAndUsageStartBetween(Long machineId,
                                                          LocalDateTime from,
                                                          LocalDateTime to);

    @Query("""
        SELECT SUM(tu.durationMinutes)
        FROM ToolUsage tu
        WHERE tu.tool.id = :toolId
    """)
    Double findTotalUsageMinutesByToolId(@Param("toolId") Long toolId);

    @Query("""
        SELECT tu FROM ToolUsage tu
        WHERE tu.tool.id = :toolId
          AND tu.usageStart >= :since
        ORDER BY tu.usageStart DESC
    """)
    List<ToolUsage> findRecentUsageByToolId(@Param("toolId") Long toolId,
                                             @Param("since") LocalDateTime since);

    @Query("""
        SELECT tu.tool.id, SUM(tu.durationMinutes), AVG(tu.avgCuttingForce)
        FROM ToolUsage tu
        WHERE tu.machine.id = :machineId
          AND tu.usageStart BETWEEN :from AND :to
        GROUP BY tu.tool.id
    """)
    List<Object[]> findToolUsageSummaryForMachine(@Param("machineId") Long machineId,
                                                   @Param("from") LocalDateTime from,
                                                   @Param("to") LocalDateTime to);
}
