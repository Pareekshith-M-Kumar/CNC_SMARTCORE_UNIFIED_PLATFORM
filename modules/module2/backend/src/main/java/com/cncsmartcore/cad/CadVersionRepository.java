package com.cncsmartcore.cad;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CadVersionRepository extends JpaRepository<CadVersion, UUID> {
    List<CadVersion> findByAssetIdOrderByVersionNumberDesc(UUID assetId);
    Optional<CadVersion> findFirstByAssetIdOrderByVersionNumberDesc(UUID assetId);
    Optional<CadVersion> findByAssetIdAndVersionNumber(UUID assetId, int versionNumber);
    Optional<CadVersion> findBySha256(String sha256);
}
