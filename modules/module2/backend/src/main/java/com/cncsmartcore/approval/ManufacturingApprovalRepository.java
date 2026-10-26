package com.cncsmartcore.approval;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ManufacturingApprovalRepository extends JpaRepository<ManufacturingApproval, UUID> {

    List<ManufacturingApproval> findByCamJobIdOrderByCreatedAtDesc(UUID camJobId);

    List<ManufacturingApproval> findByStatusOrderBySubmittedAtDesc(String status);

    List<ManufacturingApproval> findAllByOrderBySubmittedAtDesc();

    Optional<ManufacturingApproval> findFirstByCamJobIdAndStatus(UUID camJobId, String status);

    Optional<ManufacturingApproval> findFirstByCamJobIdOrderByCreatedAtDesc(UUID camJobId);
}
