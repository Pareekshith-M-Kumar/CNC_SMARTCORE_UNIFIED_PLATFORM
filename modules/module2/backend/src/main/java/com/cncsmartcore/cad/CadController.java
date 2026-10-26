package com.cncsmartcore.cad;

import com.cncsmartcore.cad.dto.CadAssetResponse;
import com.cncsmartcore.cad.dto.CadVersionResponse;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.storage.StorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CadController {

    private final CadAssetService cadAssetService;
    private final StorageService storageService;

    public CadController(CadAssetService cadAssetService, StorageService storageService) {
        this.cadAssetService = cadAssetService;
        this.storageService = storageService;
    }

    @PostMapping(value = "/cad-assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('DESIGNER', 'CAM_ENGINEER', 'ADMIN')")
    public ResponseEntity<CadAssetResponse> uploadAsset(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "description", required = false) String description,
            @AuthenticationPrincipal CurrentUser currentUser) {

        CadAssetResponse response = cadAssetService.createAsset(file, name, description, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(value = "/cad-assets/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('DESIGNER', 'CAM_ENGINEER', 'ADMIN')")
    public ResponseEntity<CadVersionResponse> uploadNewVersion(
            @PathVariable("id") UUID assetId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CurrentUser currentUser) {

        CadVersionResponse response = cadAssetService.createNewVersion(assetId, file, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/cad-assets")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CadAssetResponse>> listAssets(@AuthenticationPrincipal CurrentUser currentUser) {
        List<CadAssetResponse> assets = cadAssetService.listAssets(currentUser);
        return ResponseEntity.ok(assets);
    }

    @GetMapping("/cad-assets/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CadAssetResponse> getAsset(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal CurrentUser currentUser) {

        CadAssetResponse asset = cadAssetService.getAsset(id, currentUser);
        return ResponseEntity.ok(asset);
    }

    @GetMapping("/cad-versions/{versionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CadVersionResponse> getVersion(
            @PathVariable("versionId") UUID versionId,
            @AuthenticationPrincipal CurrentUser currentUser) {

        CadVersionResponse version = cadAssetService.getVersion(versionId, currentUser);
        return ResponseEntity.ok(version);
    }

    @GetMapping("/cad-versions/{versionId}/download-url")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @PathVariable("versionId") UUID versionId,
            @AuthenticationPrincipal CurrentUser currentUser) {

        String url = cadAssetService.getDownloadUrl(versionId, currentUser);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/cad-versions/{versionId}/preview-url")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> getPreviewUrl(
            @PathVariable("versionId") UUID versionId,
            @AuthenticationPrincipal CurrentUser currentUser) {

        String url = cadAssetService.getPreviewUrl(versionId, currentUser);
        if (url == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Preview not ready or unsupported"));
        }
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/storage/{bucket}/**")
    public ResponseEntity<Resource> streamStorageFile(
            @PathVariable("bucket") String bucket,
            HttpServletRequest request) {

        String fullPath = request.getRequestURI();
        String prefix = "/api/v1/storage/" + bucket + "/";
        int idx = fullPath.indexOf(prefix);
        if (idx == -1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        String relativePath = fullPath.substring(idx + prefix.length());

        byte[] data = storageService.loadFile(bucket, relativePath);
        if (data == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found in bucket " + bucket);
        }

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (relativePath.endsWith(".glb")) {
            mediaType = MediaType.parseMediaType("model/gltf-binary");
        } else if (relativePath.endsWith(".stl")) {
            mediaType = MediaType.parseMediaType("model/stl");
        } else if (relativePath.endsWith(".json")) {
            mediaType = MediaType.APPLICATION_JSON;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + relativePath.substring(relativePath.lastIndexOf('/') + 1) + "\"")
                .body(new ByteArrayResource(data));
    }
}
