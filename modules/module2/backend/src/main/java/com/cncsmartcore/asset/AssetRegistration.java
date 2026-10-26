package com.cncsmartcore.asset;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "asset_registrations")
public class AssetRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_id", nullable = false)
    private UUID assetId;

    @Column(name = "registered_by", nullable = false)
    private UUID registeredBy;

    @Column(name = "integrity_ok", nullable = false)
    private Boolean integrityOk = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public AssetRegistration() {}

    public AssetRegistration(UUID assetId, UUID registeredBy, Boolean integrityOk) {
        this.assetId = assetId;
        this.registeredBy = registeredBy;
        this.integrityOk = integrityOk != null ? integrityOk : true;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public UUID getAssetId() { return assetId; }
    public void setAssetId(UUID assetId) { this.assetId = assetId; }

    public UUID getRegisteredBy() { return registeredBy; }
    public void setRegisteredBy(UUID registeredBy) { this.registeredBy = registeredBy; }

    public Boolean getIntegrityOk() { return integrityOk; }
    public void setIntegrityOk(Boolean integrityOk) { this.integrityOk = integrityOk; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
