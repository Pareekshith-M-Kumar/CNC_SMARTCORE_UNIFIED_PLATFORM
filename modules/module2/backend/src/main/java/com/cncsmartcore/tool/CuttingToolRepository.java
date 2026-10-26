package com.cncsmartcore.tool;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CuttingToolRepository extends JpaRepository<CuttingTool, UUID> {
    List<CuttingTool> findAllByIsActiveTrue();
    Optional<CuttingTool> findByName(String name);
}
