package com.cncsmartcore.approval;

import com.cncsmartcore.approval.dto.ApprovalDecisionRequest;
import com.cncsmartcore.approval.dto.SubmitPlanRequest;
import com.cncsmartcore.cad.CadAsset;
import com.cncsmartcore.cad.CadAssetRepository;
import com.cncsmartcore.cad.CadVersion;
import com.cncsmartcore.cad.CadVersionRepository;
import com.cncsmartcore.cam.CamJob;
import com.cncsmartcore.cam.CamJobRepository;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.simulation.Simulation;
import com.cncsmartcore.simulation.SimulationRepository;
import com.cncsmartcore.storage.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApprovalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private CadAssetRepository cadAssetRepository;

    @Autowired
    private CadVersionRepository cadVersionRepository;

    @Autowired
    private CamJobRepository camJobRepository;

    @Autowired
    private SimulationRepository simulationRepository;

    @Autowired
    private ManufacturingApprovalRepository approvalRepository;

    @Autowired
    private StorageService storageService;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID camEngineerId;
    private UUID approverId;
    private CadVersion testVersion;
    private CamJob testJob;
    private Simulation testSim;
    private byte[] sampleCadBytes;
    private String sampleCadHash;

    @BeforeEach
    void setUp() throws Exception {
        approvalRepository.deleteAll();
        simulationRepository.deleteAll();
        camJobRepository.deleteAll();
        cadVersionRepository.deleteAll();
        cadAssetRepository.deleteAll();
        profileRepository.deleteAll();

        camEngineerId = UUID.randomUUID();
        Profile camEng = new Profile(camEngineerId, "cam@example.com", "Cam Engineer", "cam_engineer", true);
        profileRepository.save(camEng);

        approverId = UUID.randomUUID();
        Profile approver = new Profile(approverId, "approver@example.com", "Manufacturing Supervisor", "approver", true);
        profileRepository.save(approver);

        CadAsset asset = new CadAsset(camEngineerId, "Approved Bracket", "A test bracket");
        asset = cadAssetRepository.save(asset);

        sampleCadBytes = "solid test\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 10 0 0\nvertex 0 10 0\nendloop\nendfacet\nendsolid".getBytes(StandardCharsets.UTF_8);
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(sampleCadBytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) sb.append(String.format("%02x", b));
        sampleCadHash = sb.toString();

        testVersion = new CadVersion(asset, 1, "test.stl", "STL", (long) sampleCadBytes.length, sampleCadHash, "cad-originals", "test.stl", camEngineerId);
        testVersion = cadVersionRepository.save(testVersion);

        // Store original CAD in storage
        storageService.storeFile("cad-originals", testVersion.getStoragePath(), sampleCadBytes, "application/sla");

        testJob = new CamJob(testVersion.getId(), null, null, camEngineerId, "Bracket Milling Job");
        testJob.setStatus("SIMULATED");
        testJob.setConfigHash("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
        testJob = camJobRepository.save(testJob);

        // Store G-code
        storageService.storeFile("toolpaths", testJob.getId().toString() + "/program.nc",
                "(PROTOTYPE G-CODE)\nG0 Z5\nM30".getBytes(StandardCharsets.UTF_8), "text/plain");

        testSim = new Simulation(testJob.getId(), camEngineerId, "PASS", "{\"totalMoves\":50}", "sim-1.0");
        testSim = simulationRepository.save(testSim);
    }

    @Test
    @DisplayName("Submit plan succeeds and creates PENDING approval")
    void testSubmitPlan_Success() throws Exception {
        SubmitPlanRequest req = new SubmitPlanRequest("Ready for supervisor review");

        mockMvc.perform(post("/api/v1/cam-jobs/" + testJob.getId() + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.camJobId").value(testJob.getId().toString()))
                .andExpect(jsonPath("$.simulationResult").value("PASS"))
                .andExpect(jsonPath("$.submitNote").value("Ready for supervisor review"));

        CamJob updated = camJobRepository.findById(testJob.getId()).orElseThrow();
        assertEquals("SUBMITTED", updated.getStatus());
    }

    @Test
    @DisplayName("Submit plan is blocked when simulation has FAIL (AC-31)")
    void testSubmitPlan_FailSimulation_Blocked() throws Exception {
        // Create new simulation with FAIL
        Simulation failSim = new Simulation(testJob.getId(), camEngineerId, "FAIL", "{\"totalMoves\":50}", "sim-1.0");
        simulationRepository.save(failSim);

        SubmitPlanRequest req = new SubmitPlanRequest("Attempt with failed sim");

        mockMvc.perform(post("/api/v1/cam-jobs/" + testJob.getId() + "/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Approve plan re-verifies CAD integrity and creates canonical SHA-256 plan hash")
    void testDecideApproval_Approve_Success() throws Exception {
        ManufacturingApproval approval = new ManufacturingApproval(
                testJob.getId(), testVersion.getId(), testSim.getId(), camEngineerId, "Initial submission"
        );
        approval = approvalRepository.save(approval);

        ApprovalDecisionRequest req = new ApprovalDecisionRequest("APPROVED", "Toolpath, parameters, and stock margins thoroughly verified.");

        mockMvc.perform(post("/api/v1/approvals/" + approval.getId() + "/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.integrityVerified").value(true))
                .andExpect(jsonPath("$.planHash").isNotEmpty())
                .andExpect(jsonPath("$.hasPlanSnapshot").value(true));

        ManufacturingApproval updated = approvalRepository.findById(approval.getId()).orElseThrow();
        assertEquals("APPROVED", updated.getStatus());
        assertTrue(updated.getIntegrityVerified());
        assertNotNull(updated.getPlanHash());
        assertEquals(64, updated.getPlanHash().length());

        CamJob updatedJob = camJobRepository.findById(testJob.getId()).orElseThrow();
        assertEquals("APPROVED", updatedJob.getStatus());
    }

    @Test
    @DisplayName("Separation of Duties (FR-P3): Submitter cannot approve their own plan (403 Forbidden)")
    void testDecideApproval_SelfApproval_Forbidden() throws Exception {
        ManufacturingApproval approval = new ManufacturingApproval(
                testJob.getId(), testVersion.getId(), testSim.getId(), camEngineerId, "Initial submission"
        );
        approval = approvalRepository.save(approval);

        // camEngineerId attempts to approve
        ApprovalDecisionRequest req = new ApprovalDecisionRequest("APPROVED", "Self-approving my own CAM plan.");

        mockMvc.perform(post("/api/v1/approvals/" + approval.getId() + "/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Integrity check failure blocks approval when stored CAD is modified (FR-P5)")
    void testDecideApproval_IntegrityMismatch_Conflict() throws Exception {
        ManufacturingApproval approval = new ManufacturingApproval(
                testJob.getId(), testVersion.getId(), testSim.getId(), camEngineerId, "Initial submission"
        );
        approval = approvalRepository.save(approval);

        // Tamper with the stored file
        byte[] tamperedBytes = "TAMPERED DATA".getBytes(StandardCharsets.UTF_8);
        storageService.storeFile("cad-originals", testVersion.getStoragePath(), tamperedBytes, "application/sla");

        ApprovalDecisionRequest req = new ApprovalDecisionRequest("APPROVED", "Attempting approval with tampered object.");

        mockMvc.perform(post("/api/v1/approvals/" + approval.getId() + "/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER"))))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Reject plan updates status to REJECTED")
    void testDecideApproval_Reject_Success() throws Exception {
        ManufacturingApproval approval = new ManufacturingApproval(
                testJob.getId(), testVersion.getId(), testSim.getId(), camEngineerId, "Initial submission"
        );
        approval = approvalRepository.save(approval);

        ApprovalDecisionRequest req = new ApprovalDecisionRequest("REJECTED", "Spindle power margin is too close to limit. Please reconfigure.");

        mockMvc.perform(post("/api/v1/approvals/" + approval.getId() + "/decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        CamJob updatedJob = camJobRepository.findById(testJob.getId()).orElseThrow();
        assertEquals("REJECTED", updatedJob.getStatus());
    }

    @Test
    @DisplayName("Get plan snapshot returns plan JSON for approved plan")
    void testGetPlanSnapshot_Success() throws Exception {
        ManufacturingApproval approval = new ManufacturingApproval(
                testJob.getId(), testVersion.getId(), testSim.getId(), camEngineerId, "Initial submission"
        );
        approval.setStatus("APPROVED");
        approval.setPlanSnapshot("{\"plan\":\"canonical-snapshot-data\"}");
        approval.setPlanHash("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
        approval = approvalRepository.save(approval);

        mockMvc.perform(get("/api/v1/approvals/" + approval.getId() + "/plan")
                        .with(jwt().jwt(j -> j.subject(approverId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_APPROVER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("canonical-snapshot-data"));
    }
}
