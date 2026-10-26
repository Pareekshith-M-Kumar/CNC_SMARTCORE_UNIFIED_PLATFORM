package com.cncsmartcore.shipment;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shipments")
public class Shipment {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "shipment_no", unique = true, nullable = false)
    private String shipmentNo;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShipmentStatus status = ShipmentStatus.PREPARING;

    @Column(name = "carrier_label", nullable = false)
    private String carrierLabel = "DEMO-CARRIER";

    @Column(name = "tracking_no")
    private String trackingNo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Shipment() {}

    public Shipment(UUID id, String shipmentNo, UUID orderId, ShipmentStatus status, String carrierLabel, String trackingNo) {
        this.id = id != null ? id : UUID.randomUUID();
        this.shipmentNo = shipmentNo;
        this.orderId = orderId;
        this.status = status != null ? status : ShipmentStatus.PREPARING;
        this.carrierLabel = carrierLabel != null ? carrierLabel : "DEMO-CARRIER";
        this.trackingNo = trackingNo;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getShipmentNo() { return shipmentNo; }
    public void setShipmentNo(String shipmentNo) { this.shipmentNo = shipmentNo; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public ShipmentStatus getStatus() { return status; }
    public void setStatus(ShipmentStatus status) { this.status = status; }

    public String getCarrierLabel() { return carrierLabel; }
    public void setCarrierLabel(String carrierLabel) { this.carrierLabel = carrierLabel; }

    public String getTrackingNo() { return trackingNo; }
    public void setTrackingNo(String trackingNo) { this.trackingNo = trackingNo; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
