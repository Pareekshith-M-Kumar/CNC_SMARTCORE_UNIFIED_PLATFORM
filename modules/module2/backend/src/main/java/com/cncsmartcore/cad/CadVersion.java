package com.cncsmartcore.cad;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cad_versions", uniqueConstraints = {
    @UniqueConstraint(name = "uq_cad_versions_asset_version", columnNames = {"asset_id", "version_number"})
})
public class CadVersion {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnore
    private CadAsset asset;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "file_format", nullable = false)
    private String fileFormat;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(name = "storage_bucket", nullable = false)
    private String storageBucket = "cad-originals";

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Column(nullable = false)
    private String units = "mm";

    @Column(name = "preview_status", nullable = false)
    private String previewStatus = "PENDING";

    @Column(name = "preview_path")
    private String previewPath;

    @Column(name = "preview_error")
    private String previewError;

    @Column(name = "processing_attempts", nullable = false)
    private int processingAttempts = 0;

    @Column(name = "bbox_x_mm")
    private Double bboxXMm;

    @Column(name = "bbox_y_mm")
    private Double bboxYMm;

    @Column(name = "bbox_z_mm")
    private Double bboxZMm;

    @Column(name = "volume_mm3")
    private Double volumeMm3;

    @Column(name = "surface_area_mm2")
    private Double surfaceAreaMm2;

    @Column(name = "triangle_count")
    private Integer triangleCount;

    @Column(name = "is_watertight")
    private Boolean isWatertight;

    @Column(name = "selected_material_id")
    private UUID selectedMaterialId;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public CadVersion() {}

    public CadVersion(CadAsset asset, int versionNumber, String originalFilename, String fileFormat,
                      long fileSizeBytes, String sha256, String storageBucket, String storagePath,
                      UUID uploadedBy) {
        this.asset = asset;
        this.versionNumber = versionNumber;
        this.originalFilename = originalFilename;
        this.fileFormat = fileFormat;
        this.fileSizeBytes = fileSizeBytes;
        this.sha256 = sha256;
        this.storageBucket = storageBucket;
        this.storagePath = storagePath;
        this.uploadedBy = uploadedBy;
        this.previewStatus = "PENDING";
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public CadAsset getAsset() {
        return asset;
    }

    public void setAsset(CadAsset asset) {
        this.asset = asset;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getFileFormat() {
        return fileFormat;
    }

    public void setFileFormat(String fileFormat) {
        this.fileFormat = fileFormat;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public String getSha256() {
        return sha256;
    }

    public void setSha256(String sha256) {
        this.sha256 = sha256;
    }

    public String getStorageBucket() {
        return storageBucket;
    }

    public void setStorageBucket(String storageBucket) {
        this.storageBucket = storageBucket;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public String getUnits() {
        return units;
    }

    public void setUnits(String units) {
        this.units = units;
    }

    public String getPreviewStatus() {
        return previewStatus;
    }

    public void setPreviewStatus(String previewStatus) {
        this.previewStatus = previewStatus;
    }

    public String getPreviewPath() {
        return previewPath;
    }

    public void setPreviewPath(String previewPath) {
        this.previewPath = previewPath;
    }

    public String getPreviewError() {
        return previewError;
    }

    public void setPreviewError(String previewError) {
        this.previewError = previewError;
    }

    public int getProcessingAttempts() {
        return processingAttempts;
    }

    public void setProcessingAttempts(int processingAttempts) {
        this.processingAttempts = processingAttempts;
    }

    public Double getBboxXMm() {
        return bboxXMm;
    }

    public void setBboxXMm(Double bboxXMm) {
        this.bboxXMm = bboxXMm;
    }

    public Double getBboxYMm() {
        return bboxYMm;
    }

    public void setBboxYMm(Double bboxYMm) {
        this.bboxYMm = bboxYMm;
    }

    public Double getBboxZMm() {
        return bboxZMm;
    }

    public void setBboxZMm(Double bboxZMm) {
        this.bboxZMm = bboxZMm;
    }

    public Double getVolumeMm3() {
        return volumeMm3;
    }

    public void setVolumeMm3(Double volumeMm3) {
        this.volumeMm3 = volumeMm3;
    }

    public Double getSurfaceAreaMm2() {
        return surfaceAreaMm2;
    }

    public void setSurfaceAreaMm2(Double surfaceAreaMm2) {
        this.surfaceAreaMm2 = surfaceAreaMm2;
    }

    public Integer getTriangleCount() {
        return triangleCount;
    }

    public void setTriangleCount(Integer triangleCount) {
        this.triangleCount = triangleCount;
    }

    public Boolean getIsWatertight() {
        return isWatertight;
    }

    public void setIsWatertight(Boolean isWatertight) {
        this.isWatertight = isWatertight;
    }

    public UUID getSelectedMaterialId() {
        return selectedMaterialId;
    }

    public void setSelectedMaterialId(UUID selectedMaterialId) {
        this.selectedMaterialId = selectedMaterialId;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(UUID uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
