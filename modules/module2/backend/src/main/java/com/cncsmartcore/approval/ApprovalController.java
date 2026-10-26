package com.cncsmartcore.approval;

import com.cncsmartcore.approval.dto.ApprovalDecisionRequest;
import com.cncsmartcore.approval.dto.ApprovalResponse;
import com.cncsmartcore.approval.dto.SubmitPlanRequest;
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
@RequestMapping("/api/v1")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @PostMapping("/cam-jobs/{id}/submit")
    @PreAuthorize("hasAnyRole('CAM_ENGINEER', 'ADMIN')")
    public ResponseEntity<ApprovalResponse> submitPlan(
            @PathVariable UUID id,
            @RequestBody(required = false) SubmitPlanRequest request,
            @AuthenticationPrincipal CurrentUser currentUser) {
        ApprovalResponse response = approvalService.submitPlan(id, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/approvals")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ApprovalResponse>> listApprovals(
            @RequestParam(value = "status", required = false) String status,
            @AuthenticationPrincipal CurrentUser currentUser) {
        List<ApprovalResponse> response = approvalService.listApprovals(status, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/approvals/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApprovalResponse> getApprovalById(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser) {
        ApprovalResponse response = approvalService.getApprovalById(id, currentUser);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/approvals/{id}/decision")
    @PreAuthorize("hasAnyRole('APPROVER', 'ADMIN')")
    public ResponseEntity<ApprovalResponse> decideApproval(
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalDecisionRequest request,
            @AuthenticationPrincipal CurrentUser currentUser) {
        ApprovalResponse response = approvalService.decideApproval(id, request, currentUser);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/approvals/{id}/plan", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> getPlanSnapshot(
            @PathVariable UUID id,
            @AuthenticationPrincipal CurrentUser currentUser) {
        String snapshot = approvalService.getPlanSnapshot(id, currentUser);
        return ResponseEntity.ok(snapshot);
    }
}
