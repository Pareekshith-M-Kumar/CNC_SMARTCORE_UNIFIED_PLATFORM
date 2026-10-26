package com.cncsmartcore.material;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "material_recommendations")
public class MaterialRecommendation {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "cad_version_id", nullable = false)
    private UUID cadVersionId;

    @Column(name = "requested_by", nullable = false)
    private UUID requestedBy;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String inputs;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String results;

    @Column(name = "algorithm_version", nullable = false)
    private String algorithmVersion = "rb-1.0";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public MaterialRecommendation() {}

    public MaterialRecommendation(UUID cadVersionId, UUID requestedBy, String inputs, String results) {
        this.cadVersionId = cadVersionId;
        this.requestedBy = requestedBy;
        this.inputs = inputs;
        this.results = results;
        this.algorithmVersion = "rb-1.0";
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCadVersionId() {
        return cadVersionId;
    }

    public void setCadVersionId(UUID cadVersionId) {
        this.cadVersionId = cadVersionId;
    }

    public UUID getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(UUID requestedBy) {
        this.requestedBy = requestedBy;
    }

    public String getInputs() {
        return inputs;
    }

    public void setInputs(String inputs) {
        this.inputs = inputs;
    }

    public String getResults() {
        return results;
    }

    public void setResults(String results) {
        this.results = results;
    }

    public String getAlgorithmVersion() {
        return algorithmVersion;
    }

    public void setAlgorithmVersion(String algorithmVersion) {
        this.algorithmVersion = algorithmVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
