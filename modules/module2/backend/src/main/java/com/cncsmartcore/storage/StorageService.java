package com.cncsmartcore.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    @Value("${app.storage.bucket-originals:cad-originals}")
    private String bucketOriginals;

    @Value("${app.storage.bucket-previews:cad-previews}")
    private String bucketPreviews;

    @Value("${app.storage.signed-url-ttl-seconds:300}")
    private int signedUrlTtlSeconds;

    private final Path localStorePath;

    public StorageService(@Value("${app.storage.local-dir:./storage-data}") String localDir) {
        this.localStorePath = Paths.get(localDir).toAbsolutePath();
        try {
            Files.createDirectories(localStorePath);
        } catch (IOException e) {
            log.warn("Could not create local storage directory {}: {}", localStorePath, e.getMessage());
        }
    }

    private Path resolveSafePath(String bucket, String relativePath) {
        Path bucketRoot = localStorePath.resolve(bucket).normalize();
        Path targetFile = bucketRoot.resolve(relativePath).normalize();
        if (!targetFile.startsWith(bucketRoot)) {
            log.error("Path traversal attempt detected in bucket {}: {}", bucket, relativePath);
            throw new SecurityException("Path traversal attempt detected: invalid path sequence");
        }
        return targetFile;
    }

    public String storeFile(String bucket, String relativePath, byte[] data, String contentType) {
        try {
            Path targetFile = resolveSafePath(bucket, relativePath);
            Files.createDirectories(targetFile.getParent());
            Files.write(targetFile, data);
            log.info("Stored file in bucket '{}' at path '{}' ({} bytes)", bucket, relativePath, data.length);
            return relativePath;
        } catch (IOException e) {
            log.error("Failed to store file in bucket {}: {}", bucket, e.getMessage());
            throw new RuntimeException("Storage failure: " + e.getMessage(), e);
        }
    }

    public byte[] loadFile(String bucket, String relativePath) {
        try {
            Path targetFile = resolveSafePath(bucket, relativePath);
            if (!Files.exists(targetFile)) {
                return null;
            }
            return Files.readAllBytes(targetFile);
        } catch (IOException e) {
            log.error("Failed to read file from bucket {}: {}", bucket, e.getMessage());
            return null;
        }
    }

    public String generateSignedDownloadUrl(String bucket, String relativePath, int ttlSeconds) {
        // Generates internal/direct URL pointing to our backend streaming endpoint
        // e.g. /api/v1/storage/{bucket}/{relativePath}?token=...
        return "/api/v1/storage/" + bucket + "/" + relativePath;
    }

    public String buildOriginalPath(UUID assetId, UUID versionId, String sanitizedFilename) {
        return assetId.toString() + "/" + versionId.toString() + "/" + sanitizedFilename;
    }

    public String buildPreviewPath(UUID versionId) {
        return versionId.toString() + "/preview.glb";
    }
}
