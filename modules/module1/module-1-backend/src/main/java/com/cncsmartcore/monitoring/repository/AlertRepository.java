package com.cncsmartcore.monitoring.repository;

import com.cncsmartcore.monitoring.model.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    Page<Alert> findByMachineIdOrderByCreatedAtDesc(Long machineId, Pageable pageable);

    List<Alert> findByMachineIdAndStatus(Long machineId, Alert.AlertStatus status);

    List<Alert> findByStatusOrderByCreatedAtDesc(Alert.AlertStatus status);

    List<Alert> findBySeverityAndStatusOrderByCreatedAtDesc(Alert.AlertSeverity severity,
                                                             Alert.AlertStatus status);

    @Query("""
        SELECT a FROM Alert a
        WHERE a.status = 'OPEN'
          AND a.severity IN ('CRITICAL', 'EMERGENCY')
        ORDER BY a.severity DESC, a.createdAt DESC
    """)
    List<Alert> findCriticalOpenAlerts();

    @Query("""
        SELECT a.alertType, COUNT(a)
        FROM Alert a
        WHERE a.machine.id = :machineId
          AND a.createdAt >= :since
        GROUP BY a.alertType
        ORDER BY COUNT(a) DESC
    """)
    List<Object[]> findAlertFrequencyByType(@Param("machineId") Long machineId,
                                             @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(a) FROM Alert a WHERE a.status = 'OPEN'")
    Long countOpenAlerts();

    @Query("SELECT COUNT(a) FROM Alert a WHERE a.machine.id = :machineId AND a.status = 'OPEN'")
    Long countOpenAlertsForMachine(@Param("machineId") Long machineId);

    @Query("""
        SELECT a FROM Alert a
        WHERE a.machine.id = :machineId
          AND a.alertType = :type
          AND a.status = 'OPEN'
        ORDER BY a.createdAt DESC
    """)
    List<Alert> findOpenAlertsByMachineAndType(@Param("machineId") Long machineId,
                                                @Param("type") Alert.AlertType type);

    List<Alert> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
