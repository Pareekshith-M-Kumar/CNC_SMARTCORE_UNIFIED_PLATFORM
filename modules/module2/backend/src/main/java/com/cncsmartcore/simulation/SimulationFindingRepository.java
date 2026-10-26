package com.cncsmartcore.simulation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SimulationFindingRepository extends JpaRepository<SimulationFinding, UUID> {
    List<SimulationFinding> findBySimulationIdOrderByMoveIndexAsc(UUID simulationId);
}
