package com.cncsmartcore.cam;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CamJobRepository extends JpaRepository<CamJob, UUID> {
    List<CamJob> findAllByCadVersionIdOrderByCreatedAtDesc(UUID cadVersionId);
    List<CamJob> findAllByCreatedByOrderByCreatedAtDesc(UUID createdBy);
    List<CamJob> findAllByOrderByCreatedAtDesc();
}
