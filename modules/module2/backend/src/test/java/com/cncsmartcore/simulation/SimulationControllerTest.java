package com.cncsmartcore.simulation;

import com.cncsmartcore.cad.CadAsset;
import com.cncsmartcore.cad.CadAssetRepository;
import com.cncsmartcore.cad.CadVersion;
import com.cncsmartcore.cad.CadVersionRepository;
import com.cncsmartcore.cad.GeometryClient;
import com.cncsmartcore.cam.CamJob;
import com.cncsmartcore.cam.CamJobRepository;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.storage.StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SimulationControllerTest {

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
    private SimulationFindingRepository findingRepository;

    @Autowired
    private StorageService storageService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GeometryClient geometryClient;

    private UUID camEngineerId;
    private CamJob testJob;

    @BeforeEach
    void setUp() {
        findingRepository.deleteAll();
        simulationRepository.deleteAll();
        camJobRepository.deleteAll();
        cadVersionRepository.deleteAll();
        cadAssetRepository.deleteAll();
        profileRepository.deleteAll();

        camEngineerId = UUID.randomUUID();
        Profile p = new Profile(camEngineerId, "cam@example.com", "Cam Engineer", "cam_engineer", true);
        profileRepository.save(p);

        CadAsset asset = new CadAsset(camEngineerId, "Test Part", "A test part");
        asset = cadAssetRepository.save(asset);

        CadVersion version = new CadVersion(asset, 1, "test.stl", "STL", 1024L, "hash123", "cad-originals", "test.stl", camEngineerId);
        version = cadVersionRepository.save(version);

        testJob = new CamJob(version.getId(), null, null, camEngineerId, "Test Simulation Job");
        testJob.setStatus("TOOLPATH_READY");
        testJob.setStockXMm(100.0);
        testJob.setStockYMm(100.0);
        testJob.setStockZMm(25.0);
        testJob = camJobRepository.save(testJob);
    }

    @Test
    @DisplayName("Run simulation returns PASS and marks job SIMULATED")
    void testRunSimulation_Pass() throws Exception {
        // Prepare mock toolpath file in storage
        Map<String, Object> fakeToolpath = Map.of(
                "camJobId", testJob.getId().toString(),
                "totalCycleTimeS", 120.0,
                "operations", List.of()
        );
        storageService.storeFile("toolpaths", testJob.getId().toString() + "/toolpath.json",
                objectMapper.writeValueAsBytes(fakeToolpath), "application/json");

        // Mock geometryClient simulation response
        Map<String, Object> mockSimResponse = Map.of(
                "camJobId", testJob.getId().toString(),
                "status", "COMPLETED",
                "overallResult", "PASS",
                "rulesetVersion", "sim-1.0",
                "stats", Map.of("totalCycleTimeS", 120.0, "totalMoves", 24, "maxPowerKw", 4.2),
                "findings", List.of()
        );
        when(geometryClient.analyzeSimulation(any())).thenReturn(mockSimResponse);

        mockMvc.perform(post("/api/v1/cam-jobs/" + testJob.getId() + "/simulations")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.overallResult").value("PASS"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.rulesetVersion").value("sim-1.0"))
                .andExpect(jsonPath("$.findings").isArray())
                .andExpect(jsonPath("$.findings.length()").value(0));

        CamJob updatedJob = camJobRepository.findById(testJob.getId()).orElseThrow();
        assertEquals("SIMULATED", updatedJob.getStatus());
        assertNull(updatedJob.getLastError());
    }

    @Test
    @DisplayName("Run simulation with FAIL findings blocks submission and sets lastError (AC-31 Gate)")
    void testRunSimulation_Fail_AC31() throws Exception {
        // Prepare mock toolpath file in storage
        Map<String, Object> fakeToolpath = Map.of(
                "camJobId", testJob.getId().toString(),
                "totalCycleTimeS", 120.0,
                "operations", List.of()
        );
        storageService.storeFile("toolpaths", testJob.getId().toString() + "/toolpath.json",
                objectMapper.writeValueAsBytes(fakeToolpath), "application/json");

        // Mock geometryClient simulation response with RAPID_INTO_STOCK FAIL finding
        Map<String, Object> findingFail = Map.of(
                "ruleCode", "RAPID_INTO_STOCK",
                "severity", "FAIL",
                "message", "Rapid move penetrates raw stock at Z=-2.0 mm",
                "moveIndex", 14,
                "xMm", 25.0,
                "yMm", 30.0,
                "zMm", -2.0
        );
        Map<String, Object> mockSimResponse = Map.of(
                "camJobId", testJob.getId().toString(),
                "status", "COMPLETED",
                "overallResult", "FAIL",
                "rulesetVersion", "sim-1.0",
                "stats", Map.of("totalCycleTimeS", 120.0, "findingCounts", Map.of("FAIL", 1)),
                "findings", List.of(findingFail)
        );
        when(geometryClient.analyzeSimulation(any())).thenReturn(mockSimResponse);

        mockMvc.perform(post("/api/v1/cam-jobs/" + testJob.getId() + "/simulations")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.overallResult").value("FAIL"))
                .andExpect(jsonPath("$.findings.length()").value(1))
                .andExpect(jsonPath("$.findings[0].ruleCode").value("RAPID_INTO_STOCK"))
                .andExpect(jsonPath("$.findings[0].severity").value("FAIL"));

        CamJob updatedJob = camJobRepository.findById(testJob.getId()).orElseThrow();
        assertNotEquals("SIMULATED", updatedJob.getStatus());
        assertNotNull(updatedJob.getLastError());
        assertTrue(updatedJob.getLastError().contains("FAIL"));
    }

    @Test
    @DisplayName("Run simulation without toolpath returns 400 Bad Request")
    void testRunSimulation_MissingToolpath() throws Exception {
        mockMvc.perform(post("/api/v1/cam-jobs/" + testJob.getId() + "/simulations")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Get latest simulation returns simulation details and findings")
    void testGetLatestSimulation() throws Exception {
        Simulation sim = new Simulation(testJob.getId(), camEngineerId, "PASS", "{\"totalMoves\":10}", "sim-1.0");
        SimulationFinding finding = new SimulationFinding(sim, "TINY_SEGMENT", "INFO", "Micro-segment detected", 5, 10.0, 10.0, 0.0);
        sim.addFinding(finding);
        sim = simulationRepository.save(sim);

        mockMvc.perform(get("/api/v1/cam-jobs/" + testJob.getId() + "/simulations/latest")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sim.getId().toString()))
                .andExpect(jsonPath("$.overallResult").value("PASS"))
                .andExpect(jsonPath("$.findings.length()").value(1))
                .andExpect(jsonPath("$.findings[0].ruleCode").value("TINY_SEGMENT"));
    }
}
