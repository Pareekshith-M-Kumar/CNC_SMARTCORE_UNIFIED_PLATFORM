package com.cncsmartcore.material;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaterialRecommendationRepository extends JpaRepository<MaterialRecommendation, UUID> {
    Optional<MaterialRecommendation> findTopByCadVersionIdOrderByCreatedAtDesc(UUID cadVersionId);
}
