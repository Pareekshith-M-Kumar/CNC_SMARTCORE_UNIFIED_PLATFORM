package com.cncsmartcore.machine;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MachineProfileRepository extends JpaRepository<MachineProfile, UUID> {
    List<MachineProfile> findAllByIsActiveTrue();
    Optional<MachineProfile> findByName(String name);
}
