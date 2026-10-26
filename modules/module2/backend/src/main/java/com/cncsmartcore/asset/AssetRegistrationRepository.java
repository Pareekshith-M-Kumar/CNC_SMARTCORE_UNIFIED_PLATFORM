package com.cncsmartcore.asset;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssetRegistrationRepository extends JpaRepository<AssetRegistration, Long> {
    List<AssetRegistration> findByAssetIdOrderByCreatedAtDesc(UUID assetId);
    Optional<AssetRegistration> findFirstByAssetIdOrderByCreatedAtDesc(UUID assetId);
}
