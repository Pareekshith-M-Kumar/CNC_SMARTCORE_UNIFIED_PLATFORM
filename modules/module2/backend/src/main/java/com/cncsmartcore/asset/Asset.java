package com.cncsmartcore.asset;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assets")
public class Asset {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "asset_tag", unique = true, nullable = false)
    private String assetTag;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "asset_kind", nullable = false)
    private String assetKind = "cnc_machine";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetStatus status = AssetStatus.MANUFACTURED;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "serial_no")
    private String serialNo;

    @Column(name = "machine_code", length = 50)
    private String machineCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Asset() {}

    public Asset(UUID id, String assetTag, UUID orderId, String assetKind, AssetStatus status, UUID ownerId, String serialNo) {
        this.id = id != null ? id : UUID.randomUUID();
        this.assetTag = assetTag;
        this.orderId = orderId;
        this.assetKind = assetKind != null ? assetKind : "cnc_machine";
        this.status = status != null ? status : AssetStatus.MANUFACTURED;
        this.ownerId = ownerId;
        this.serialNo = serialNo;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getAssetTag() { return assetTag; }
    public void setAssetTag(String assetTag) { this.assetTag = assetTag; }

    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID orderId) { this.orderId = orderId; }

    public String getAssetKind() { return assetKind; }
    public void setAssetKind(String assetKind) { this.assetKind = assetKind; }

    public AssetStatus getStatus() { return status; }
    public void setStatus(AssetStatus status) { this.status = status; }

    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }

    public String getSerialNo() { return serialNo; }
    public void setSerialNo(String serialNo) { this.serialNo = serialNo; }

    public String getMachineCode() { return machineCode; }
    public void setMachineCode(String machineCode) { this.machineCode = machineCode; }

    public void linkToMachine(String machineCode) {
        this.status = AssetStatus.VERIFIED;
        this.machineCode = machineCode;
        this.updatedAt = Instant.now();
    }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
