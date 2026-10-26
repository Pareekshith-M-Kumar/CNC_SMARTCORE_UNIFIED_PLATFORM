package com.cncsmartcore.monitoring.repository;

import com.cncsmartcore.monitoring.model.Tool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ToolRepository extends JpaRepository<Tool, Long> {

    Optional<Tool> findByToolCode(String toolCode);

    List<Tool> findByCurrentMachineId(Long machineId);

    List<Tool> findByCondition(Tool.ToolCondition condition);

    List<Tool> findByToolTypeAndIsActiveTrue(Tool.ToolType toolType);

    @Query("SELECT t FROM Tool t WHERE t.wearPercentage >= t.replacementThreshold AND t.isActive = true")
    List<Tool> findToolsNeedingReplacement();

    @Query("""
        SELECT t FROM Tool t
        WHERE t.currentMachine.id = :machineId
          AND t.isActive = true
        ORDER BY t.wearPercentage DESC
    """)
    List<Tool> findToolsByMachineOrderByWear(@Param("machineId") Long machineId);

    @Query("""
    SELECT t FROM Tool t
    LEFT JOIN FETCH t.currentMachine
    WHERE t.wearPercentage >= :minWear
      AND t.isActive = true
    ORDER BY t.wearPercentage DESC
""")
    List<Tool> findHighWearTools(@Param("minWear") Double minWear);

    @Query("SELECT AVG(t.wearPercentage) FROM Tool t WHERE t.currentMachine.id = :machineId AND t.isActive = true")
    Optional<Double> findAverageWearByMachine(@Param("machineId") Long machineId);

    boolean existsByToolCode(String toolCode);
}
