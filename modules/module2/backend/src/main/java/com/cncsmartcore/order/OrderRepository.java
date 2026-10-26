package com.cncsmartcore.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<ManufacturingOrder, UUID> {
    Optional<ManufacturingOrder> findByOrderNo(String orderNo);
    Optional<ManufacturingOrder> findByApprovalId(UUID approvalId);
    List<ManufacturingOrder> findAllByOrderByCreatedAtDesc();
    List<ManufacturingOrder> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId);
    List<ManufacturingOrder> findByCreatedByOrderByCreatedAtDesc(UUID createdBy);
    long count();
}
