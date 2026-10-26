package com.cncsmartcore.asset;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetRepository extends JpaRepository<Asset, UUID> {
    Optional<Asset> findByAssetTag(String assetTag);
    List<Asset> findByOrderId(UUID orderId);
    List<Asset> findByOwnerId(UUID ownerId);
    List<Asset> findAllByOrderByCreatedAtDesc();
    long count();
}
