package com.cncsmartcore.monitoring.repository;

import com.cncsmartcore.monitoring.model.MachineMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MachineMetricsRepository extends JpaRepository<MachineMetrics, Long> {

  List<MachineMetrics> findByMachineIdOrderByRecordedAtDesc(Long machineId);

  List<MachineMetrics> findByMachineIdAndRecordedAtBetweenOrderByRecordedAtAsc(
          Long machineId,
          LocalDateTime from,
          LocalDateTime to);

  // Latest metrics record
  Optional<MachineMetrics> findTopByMachineIdOrderByRecordedAtDesc(Long machineId);

  @Query("""
            SELECT AVG(m.temperature),
                   AVG(m.spindleLoad),
                   AVG(m.vibrationX),
                   AVG(m.powerConsumption),
                   AVG(m.feedRate)
            FROM MachineMetrics m
            WHERE m.machine.id = :machineId
              AND m.recordedAt >= :since
            """)
  Object[] findAverageMetricsSince(
          @Param("machineId") Long machineId,
          @Param("since") LocalDateTime since);

  @Query("""
            SELECT m
            FROM MachineMetrics m
            WHERE m.machine.id = :machineId
              AND m.temperature > :threshold
              AND m.recordedAt >= :since
            ORDER BY m.recordedAt DESC
            """)
  List<MachineMetrics> findTemperatureExceedances(
          @Param("machineId") Long machineId,
          @Param("threshold") Double threshold,
          @Param("since") LocalDateTime since);

  @Query("""
            SELECT m
            FROM MachineMetrics m
            WHERE m.machine.id = :machineId
              AND (
                    m.vibrationX > :threshold
                 OR m.vibrationY > :threshold
                 OR m.vibrationZ > :threshold
              )
              AND m.recordedAt >= :since
            """)
  List<MachineMetrics> findVibrationAnomalies(
          @Param("machineId") Long machineId,
          @Param("threshold") Double threshold,
          @Param("since") LocalDateTime since);

  @Query("""
            SELECT SUM(m.cycleTime),
                   COUNT(m.partsProduced),
                   SUM(m.partsProduced)
            FROM MachineMetrics m
            WHERE m.machine.id = :machineId
              AND m.recordedAt BETWEEN :from AND :to
            """)
  Object[] findProductionSummary(
          @Param("machineId") Long machineId,
          @Param("from") LocalDateTime from,
          @Param("to") LocalDateTime to);

  void deleteByMachineIdAndRecordedAtBefore(
          Long machineId,
          LocalDateTime before);
}