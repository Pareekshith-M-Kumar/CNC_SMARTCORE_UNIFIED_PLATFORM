package com.cncsmartcore.cad;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CadAssetRepository extends JpaRepository<CadAsset, UUID> {
    List<CadAsset> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);
    List<CadAsset> findAllByOrderByCreatedAtDesc();
    Optional<CadAsset> findByIdAndOwnerId(UUID id, UUID ownerId);
}
