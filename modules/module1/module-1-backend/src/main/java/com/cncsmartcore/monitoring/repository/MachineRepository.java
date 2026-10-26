package com.cncsmartcore.monitoring.repository;

import com.cncsmartcore.monitoring.model.Machine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MachineRepository extends JpaRepository<Machine, Long> {

    Optional<Machine> findByMachineCode(String machineCode);

    List<Machine> findByStatus(Machine.MachineStatus status);

    List<Machine> findByIsActiveTrue();

    List<Machine> findByLocation(String location);

    @Query("SELECT m FROM Machine m WHERE m.isActive = true AND m.status = :status")
    List<Machine> findActiveByStatus(@Param("status") Machine.MachineStatus status);

    @Query("SELECT m FROM Machine m WHERE m.nextMaintenanceDate <= :date AND m.isActive = true")
    List<Machine> findMachinesDueForMaintenance(@Param("date") LocalDateTime date);

    @Query("SELECT m FROM Machine m WHERE m.status = 'ERROR' OR m.status = 'OFFLINE'")
    List<Machine> findFaultedMachines();

    @Query("SELECT COUNT(m) FROM Machine m WHERE m.status = :status AND m.isActive = true")
    Long countByStatus(@Param("status") Machine.MachineStatus status);

    @Query("""
        SELECT m FROM Machine m
        WHERE m.isActive = true
        AND m.id NOT IN (
            SELECT DISTINCT jq.machine.id FROM JobQueue jq WHERE jq.isActive = true
        )
        AND m.status = 'IDLE'
    """)
    List<Machine> findAvailableMachines();

    boolean existsByMachineCode(String machineCode);
}
