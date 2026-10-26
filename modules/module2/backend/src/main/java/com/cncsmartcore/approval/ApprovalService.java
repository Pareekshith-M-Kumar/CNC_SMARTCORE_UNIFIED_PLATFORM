package com.cncsmartcore.approval;

import com.cncsmartcore.approval.dto.ApprovalDecisionRequest;
import com.cncsmartcore.approval.dto.ApprovalResponse;
import com.cncsmartcore.approval.dto.SubmitPlanRequest;
import com.cncsmartcore.audit.AuditService;
import com.cncsmartcore.cad.CadAsset;
import com.cncsmartcore.cad.CadVersion;
import com.cncsmartcore.cad.CadVersionRepository;
import com.cncsmartcore.cam.CamJob;
import com.cncsmartcore.cam.CamJobRepository;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.simulation.Simulation;
import com.cncsmartcore.simulation.SimulationRepository;
import com.cncsmartcore.storage.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class ApprovalService {

    private static final Logger log = LoggerFactory.getLogger(ApprovalService.class);

    private final ManufacturingApprovalRepository approvalRepository;
    private final CamJobRepository camJobRepository;
    private final CadVersionRepository cadVersionRepository;
    private final SimulationRepository simulationRepository;
    private final ProfileRepository profileRepository;
    private final StorageService storageService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ApprovalService(
            ManufacturingApprovalRepository approvalRepository,
            CamJobRepository camJobRepository,
            CadVersionRepository cadVersionRepository,
            SimulationRepository simulationRepository,
            ProfileRepository profileRepository,
            StorageService storageService,
            AuditService auditService,
            ObjectMapper objectMapper
    ) {
        this.approvalRepository = approvalRepository;
        this.camJobRepository = camJobRepository;
        this.cadVersionRepository = cadVersionRepository;
        this.simulationRepository = simulationRepository;
        this.profileRepository = profileRepository;
        this.storageService = storageService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ApprovalResponse submitPlan(UUID camJobId, SubmitPlanRequest request, CurrentUser currentUser) {
        CamJob job = camJobRepository.findById(camJobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM Job not found: " + camJobId));

        // 1. Simulation Precondition: Job must have simulation and latest simulation cannot be FAIL
        Simulation latestSim = simulationRepository.findFirstByCamJobIdOrderByCreatedAtDesc(camJobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Precondition Failed: CAM job must be simulated before submission for approval."));

        if ("FAIL".equalsIgnoreCase(latestSim.getOverallResult())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "AC-31 Gate: Cannot submit manufacturing plan with failed simulation findings (FAIL).");
        }

        // 2. G-Code Precondition: G-code must be generated and valid
        byte[] gcodeBytes = storageService.loadFile("toolpaths", job.getId().toString() + "/program.nc");
        if (gcodeBytes == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Precondition Failed: G-code must be validated and stored before submission.");
        }

        // 3. Cad Version Precondition: Must be the latest version for its asset
        CadVersion currentVersion = cadVersionRepository.findById(job.getCadVersionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD Version not found: " + job.getCadVersionId()));

        Optional<CadVersion> latestVersionOpt = cadVersionRepository.findFirstByAssetIdOrderByVersionNumberDesc(currentVersion.getAsset().getId());
        if (latestVersionOpt.isPresent() && latestVersionOpt.get().getVersionNumber() > currentVersion.getVersionNumber()) {
            job.setStatus("STALE");
            camJobRepository.save(job);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Precondition Failed: CAD version is superseded by v" + latestVersionOpt.get().getVersionNumber() + ". CAM job is STALE.");
        }

        // 4. Duplicate Pending Check
        Optional<ManufacturingApproval> existingPending = approvalRepository.findFirstByCamJobIdAndStatus(camJobId, "PENDING");
        if (existingPending.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A pending manufacturing approval already exists for this CAM job.");
        }

        UUID submitterId = currentUser != null ? currentUser.id() : job.getCreatedBy();
        String submitterRole = currentUser != null ? currentUser.role() : "cam_engineer";

        // Update Job Status
        job.setStatus("SUBMITTED");
        job.setUpdatedAt(Instant.now());
        camJobRepository.save(job);

        // Create Approval record
        String note = (request != null) ? request.note() : null;
        ManufacturingApproval approval = new ManufacturingApproval(
                job.getId(),
                currentVersion.getId(),
                latestSim.getId(),
                submitterId,
                note
        );
        approval = approvalRepository.save(approval);

        // Audit Event
        auditService.logEvent(
                submitterId,
                submitterRole,
                "PLAN_SUBMITTED",
                "MANUFACTURING_APPROVAL",
                approval.getId(),
                Map.of(
                        "camJobId", job.getId(),
                        "cadVersionId", currentVersion.getId(),
                        "simulationResult", latestSim.getOverallResult()
                ),
                null
        );

        return toResponse(approval);
    }

    @Transactional(readOnly = true)
    public List<ApprovalResponse> listApprovals(String status, CurrentUser currentUser) {
        List<ManufacturingApproval> approvals;
        if (status != null && !status.isBlank()) {
            approvals = approvalRepository.findByStatusOrderBySubmittedAtDesc(status.trim().toUpperCase());
        } else {
            approvals = approvalRepository.findAllByOrderBySubmittedAtDesc();
        }
        return approvals.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ApprovalResponse getApprovalById(UUID id, CurrentUser currentUser) {
        ManufacturingApproval approval = approvalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manufacturing approval not found: " + id));
        return toResponse(approval);
    }

    @Transactional
    public ApprovalResponse decideApproval(UUID id, ApprovalDecisionRequest request, CurrentUser currentUser) {
        ManufacturingApproval approval = approvalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manufacturing approval not found: " + id));

        if (!"PENDING".equalsIgnoreCase(approval.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Approval has already been decided with status: " + approval.getStatus());
        }

        UUID deciderId = currentUser != null ? currentUser.id() : UUID.randomUUID();
        String deciderRole = currentUser != null ? currentUser.role() : "approver";

        // SEPARATION OF DUTIES (FR-P3 / AC-41): The approver cannot be the submitter
        if (deciderId.equals(approval.getSubmittedBy())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Separation of duties violation: Approver cannot approve or reject a plan they submitted themselves.");
        }

        String decision = request.decision().trim().toUpperCase();
        if (!decision.equals("APPROVED") && !decision.equals("REJECTED")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decision must be either APPROVED or REJECTED.");
        }

        final UUID camJobId = approval.getCamJobId();
        CamJob job = camJobRepository.findById(camJobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAM Job not found: " + camJobId));

        final UUID cadVersionId = approval.getCadVersionId();
        CadVersion version = cadVersionRepository.findById(cadVersionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CAD Version not found: " + cadVersionId));

        final UUID simId = approval.getSimulationId();
        Simulation sim = simulationRepository.findById(simId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Simulation not found: " + simId));

        if ("APPROVED".equals(decision)) {
            // 1. INTEGRITY RE-CHECK (FR-P5): Re-verify stored CAD original SHA-256 against recorded hash
            byte[] storedCadBytes = storageService.loadFile(version.getStorageBucket(), version.getStoragePath());
            if (storedCadBytes == null) {
                approval.setIntegrityVerified(false);
                approval.setIntegrityCheckedAt(Instant.now());
                approvalRepository.save(approval);
                auditService.logEvent(deciderId, deciderRole, "INTEGRITY_FAILED", "CAD_VERSION", version.getId(),
                        Map.of("reason", "File missing in storage"), null);
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Stored CAD original file is missing in storage bucket.");
            }

            String computedSha256 = computeSha256Hex(storedCadBytes);
            if (!computedSha256.equalsIgnoreCase(version.getSha256())) {
                approval.setIntegrityVerified(false);
                approval.setIntegrityCheckedAt(Instant.now());
                approvalRepository.save(approval);
                auditService.logEvent(deciderId, deciderRole, "INTEGRITY_FAILED", "CAD_VERSION", version.getId(),
                        Map.of("expected", version.getSha256(), "actual", computedSha256), null);
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Stored CAD file integrity check failed: hash mismatch detected.");
            }

            approval.setIntegrityVerified(true);
            approval.setIntegrityCheckedAt(Instant.now());
            auditService.logEvent(deciderId, deciderRole, "INTEGRITY_VERIFIED", "CAD_VERSION", version.getId(),
                    Map.of("sha256", computedSha256), null);

            // 2. PLAN SNAPSHOT BUILDER & PLAN HASH (FR-P4)
            Map<String, Object> snapshotMap = new LinkedHashMap<>();
            snapshotMap.put("approvalId", approval.getId().toString());
            snapshotMap.put("cadVersionId", version.getId().toString());
            snapshotMap.put("cadSha256", version.getSha256());
            snapshotMap.put("cadFilename", version.getOriginalFilename());
            snapshotMap.put("camJobId", job.getId().toString());
            snapshotMap.put("camJobName", job.getName());
            snapshotMap.put("camConfigHash", job.getConfigHash());
            snapshotMap.put("simulationId", sim.getId().toString());
            snapshotMap.put("simulationResult", sim.getOverallResult());
            snapshotMap.put("submittedBy", approval.getSubmittedBy().toString());
            snapshotMap.put("submittedAt", approval.getSubmittedAt().toString());
            snapshotMap.put("decidedBy", deciderId.toString());
            snapshotMap.put("decidedAt", Instant.now().toString());
            snapshotMap.put("decision", "APPROVED");
            snapshotMap.put("decisionComment", request.comment());

            String snapshotJson;
            try {
                snapshotJson = objectMapper.writeValueAsString(snapshotMap);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize plan snapshot: " + e.getMessage());
            }

            String planHash = computeSha256Hex(snapshotJson.getBytes(StandardCharsets.UTF_8));

            approval.setPlanSnapshot(snapshotJson);
            approval.setPlanHash(planHash);
            approval.setStatus("APPROVED");
            job.setStatus("APPROVED");

            // Persist report in storage reports bucket
            storageService.storeFile("reports", approval.getId().toString() + "/plan.json",
                    snapshotJson.getBytes(StandardCharsets.UTF_8), "application/json");

            auditService.logEvent(deciderId, deciderRole, "PLAN_APPROVED", "MANUFACTURING_APPROVAL", approval.getId(),
                    Map.of("planHash", planHash, "camJobId", job.getId()), null);

        } else {
            // REJECTED
            approval.setStatus("REJECTED");
            job.setStatus("REJECTED");
            auditService.logEvent(deciderId, deciderRole, "PLAN_REJECTED", "MANUFACTURING_APPROVAL", approval.getId(),
                    Map.of("comment", request.comment(), "camJobId", job.getId()), null);
        }

        approval.setDecidedBy(deciderId);
        approval.setDecidedAt(Instant.now());
        approval.setDecisionComment(request.comment());
        approval.setUpdatedAt(Instant.now());

        job.setUpdatedAt(Instant.now());
        camJobRepository.save(job);
        approval = approvalRepository.save(approval);

        return toResponse(approval);
    }

    @Transactional(readOnly = true)
    public String getPlanSnapshot(UUID id, CurrentUser currentUser) {
        ManufacturingApproval approval = approvalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manufacturing approval not found: " + id));

        if (!"APPROVED".equalsIgnoreCase(approval.getStatus()) || approval.getPlanSnapshot() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Plan snapshot is only accessible for APPROVED manufacturing plans.");
        }

        return approval.getPlanSnapshot();
    }

    private ApprovalResponse toResponse(ManufacturingApproval a) {
        String jobName = "CAM Job";
        Optional<CamJob> jobOpt = camJobRepository.findById(a.getCamJobId());
        if (jobOpt.isPresent()) {
            jobName = jobOpt.get().getName();
        }

        Integer versionNumber = 1;
        String filename = "part.stl";
        String cadHash = "";
        Optional<CadVersion> versionOpt = cadVersionRepository.findById(a.getCadVersionId());
        if (versionOpt.isPresent()) {
            versionNumber = versionOpt.get().getVersionNumber();
            filename = versionOpt.get().getOriginalFilename();
            cadHash = versionOpt.get().getSha256();
        }

        String simResult = "PASS";
        Optional<Simulation> simOpt = simulationRepository.findById(a.getSimulationId());
        if (simOpt.isPresent()) {
            simResult = simOpt.get().getOverallResult();
        }

        String submitterName = "Submitter";
        Optional<Profile> submitterOpt = profileRepository.findById(a.getSubmittedBy());
        if (submitterOpt.isPresent()) {
            submitterName = submitterOpt.get().getFullName() != null ? submitterOpt.get().getFullName() : submitterOpt.get().getEmail();
        }

        String deciderName = null;
        if (a.getDecidedBy() != null) {
            deciderName = "Approver";
            Optional<Profile> deciderOpt = profileRepository.findById(a.getDecidedBy());
            if (deciderOpt.isPresent()) {
                deciderName = deciderOpt.get().getFullName() != null ? deciderOpt.get().getFullName() : deciderOpt.get().getEmail();
            }
        }

        return new ApprovalResponse(
                a.getId(),
                a.getCamJobId(),
                jobName,
                a.getCadVersionId(),
                versionNumber,
                filename,
                cadHash,
                a.getSimulationId(),
                simResult,
                a.getStatus(),
                a.getSubmittedBy(),
                submitterName,
                a.getSubmittedAt(),
                a.getSubmitNote(),
                a.getDecidedBy(),
                deciderName,
                a.getDecidedAt(),
                a.getDecisionComment(),
                a.getIntegrityVerified(),
                a.getIntegrityCheckedAt(),
                a.getPlanHash(),
                a.getPlanSnapshot() != null,
                a.getRowVersion()
        );
    }

    private static String computeSha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new RuntimeException("SHA-256 computation failed: " + ex.getMessage(), ex);
        }
    }
}
