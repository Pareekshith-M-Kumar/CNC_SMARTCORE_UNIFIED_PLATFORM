package com.cncsmartcore.order;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "manufacturing_orders")
public class ManufacturingOrder {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "order_no", unique = true, nullable = false)
    private String orderNo;

    @Column(name = "approval_id", nullable = false)
    private UUID approvalId;

    @Column(name = "plan_hash", length = 64, nullable = false)
    private String planHash;

    @Column(nullable = false)
    private int quantity = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.CREATED;

    @Column(name = "recipient_id")
    private UUID recipientId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public ManufacturingOrder() {}

    public ManufacturingOrder(UUID id, String orderNo, UUID approvalId, String planHash, int quantity,
                              OrderStatus status, UUID recipientId, UUID createdBy) {
        this.id = id != null ? id : UUID.randomUUID();
        this.orderNo = orderNo;
        this.approvalId = approvalId;
        this.planHash = planHash;
        this.quantity = quantity;
        this.status = status != null ? status : OrderStatus.CREATED;
        this.recipientId = recipientId;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public UUID getApprovalId() { return approvalId; }
    public void setApprovalId(UUID approvalId) { this.approvalId = approvalId; }

    public String getPlanHash() { return planHash; }
    public void setPlanHash(String planHash) { this.planHash = planHash; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public UUID getRecipientId() { return recipientId; }
    public void setRecipientId(UUID recipientId) { this.recipientId = recipientId; }

    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
