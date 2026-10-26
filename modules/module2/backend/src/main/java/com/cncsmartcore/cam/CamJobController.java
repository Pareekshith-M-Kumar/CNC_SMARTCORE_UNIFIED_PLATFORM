package com.cncsmartcore.cam;

import com.cncsmartcore.cam.dto.*;
import com.cncsmartcore.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cam-jobs")
public class CamJobController {

    private final CamJobService camJobService;

    public CamJobController(CamJobService camJobService) {
        this.camJobService = camJobService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CAM_ENGINEER', 'ADMIN')")
    public ResponseEntity<CamJobResponse> createJob(
            @Valid @RequestBody CreateCamJobRequest request,
            @AuthenticationPrincipal CurrentUser currentUser) {
        CamJobResponse response = camJobService.createJob(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<CamJobResponse> listJobs(
            @RequestParam(value = "cadVersionId", required = false) UUID cadVersionId,
            @AuthenticationPrincipal CurrentUser currentUser) {
        return camJobService.listJobs(cadVersionId, currentUser);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public CamJobResponse getJob(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser) {
        return camJobService.getJob(id, currentUser);
    }

    @PutMapping("/{id}/configuration")
    @PreAuthorize("hasAnyRole('CAM_ENGINEER', 'ADMIN')")
    public CamJobResponse configureJob(
            @PathVariable UUID id,
            @Valid @RequestBody ConfigureCamJobRequest request,
            @AuthenticationPrincipal CurrentUser currentUser) {
        return camJobService.configureJob(id, request, currentUser);
    }

    @PostMapping("/{id}/calculate")
    @PreAuthorize("hasAnyRole('CAM_ENGINEER', 'ADMIN')")
    public CamEstimatesResponse calculateSandbox(
            @PathVariable UUID id,
            @Valid @RequestBody ConfigureCamJobRequest request) {
        return camJobService.calculateSandbox(id, request);
    }

    @PostMapping("/{id}/toolpaths/generate")
    @PreAuthorize("hasAnyRole('CAM_ENGINEER', 'ADMIN')")
    public CamJobResponse generateToolpaths(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser) {
        return camJobService.generateToolpathAndGCode(id, currentUser);
    }

    @GetMapping("/{id}/toolpath")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> getToolpath(@PathVariable UUID id) {
        byte[] data = camJobService.getToolpathData(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(data);
    }

    @GetMapping("/{id}/gcode")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> getGCode(
            @PathVariable UUID id,
            @RequestParam(value = "download", defaultValue = "false") boolean download) {
        String gcode = camJobService.getGCode(id);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        if (download) {
            headers.setContentDisposition(org.springframework.http.ContentDisposition.attachment().filename("program.nc").build());
        }
        return new ResponseEntity<>(gcode, headers, HttpStatus.OK);
    }
}
