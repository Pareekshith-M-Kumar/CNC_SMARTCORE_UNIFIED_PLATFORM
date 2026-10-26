package com.cncsmartcore.cam;

import com.cncsmartcore.cad.CadAsset;
import com.cncsmartcore.cad.CadAssetRepository;
import com.cncsmartcore.cad.CadVersion;
import com.cncsmartcore.cad.CadVersionRepository;
import com.cncsmartcore.cam.dto.ConfigureCamJobRequest;
import com.cncsmartcore.cam.dto.CreateCamJobRequest;
import com.cncsmartcore.cam.dto.OperationConfigRequest;
import com.cncsmartcore.machine.MachineProfile;
import com.cncsmartcore.machine.MachineProfileRepository;
import com.cncsmartcore.material.Material;
import com.cncsmartcore.material.MaterialRepository;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.tool.CuttingTool;
import com.cncsmartcore.tool.CuttingToolRepository;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CamJobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private CadAssetRepository cadAssetRepository;

    @Autowired
    private CadVersionRepository cadVersionRepository;

    @Autowired
    private MachineProfileRepository machineRepository;

    @Autowired
    private CuttingToolRepository toolRepository;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private CamJobRepository camJobRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.cncsmartcore.cad.GeometryClient geometryClient;

    private UUID camEngineerId;
    private UUID designerId;
    private CadVersion testVersion;
    private MachineProfile testMachine;
    private CuttingTool testTool;
    private Material testMaterial;

    @BeforeEach
    void setUp() {
        camJobRepository.deleteAll();
        cadVersionRepository.deleteAll();
        cadAssetRepository.deleteAll();
        profileRepository.deleteAll();

        camEngineerId = UUID.randomUUID();
        Profile camEng = new Profile(camEngineerId, "cam@example.com", "CAM Engineer", "cam_engineer", true);
        profileRepository.save(camEng);

        designerId = UUID.randomUUID();
        Profile designer = new Profile(designerId, "designer@example.com", "Part Designer", "designer", true);
        profileRepository.save(designer);

        testMachine = machineRepository.findByName("Haas VF-2 (3-Axis VMC)")
                .orElseGet(() -> machineRepository.save(new MachineProfile(
                        UUID.randomUUID(), "Haas VF-2 (3-Axis VMC)", "GENERIC_ISO",
                        762.0, 406.0, 508.0, 8100, 22.4, 0.85,
                        25400.0, 16500.0, 4.2, 850.0, 1.2, true, true
                )));

        testTool = toolRepository.findByName("10mm 3-Flute Carbide Flat End Mill")
                .orElseGet(() -> toolRepository.save(new CuttingTool(
                        UUID.randomUUID(), "10mm 3-Flute Carbide Flat End Mill", "FLAT_END_MILL",
                        10.0, 3, 25.0, 75.0, "CARBIDE", true, 1450.0, 120.0, true, true
                )));

        testMaterial = materialRepository.findByCode("AL6061-T6")
                .orElseGet(() -> materialRepository.save(new Material(
                        UUID.randomUUID(), "AL6061-T6", "Aluminium 6061-T6", "ALUMINIUM",
                        2700, 700, 200, 300, 0.003, 3, 4, 4, 5, 2, 350.0,
                        "structural_bracket", "Standard 6061 alloy", true
                )));

        CadAsset asset = new CadAsset(designerId, "Bracket Part", "Structural prototype");
        asset = cadAssetRepository.save(asset);

        testVersion = new CadVersion(
                asset, 1, "bracket.stl", "STL", 2048L,
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "cad-originals", "test/bracket.stl", designerId
        );
        testVersion.setBboxXMm(80.0);
        testVersion.setBboxYMm(60.0);
        testVersion.setBboxZMm(20.0);
        testVersion.setVolumeMm3(45000.0);
        testVersion.setSelectedMaterialId(testMaterial.getId());
        testVersion = cadVersionRepository.save(testVersion);
    }

    @Test
    @DisplayName("CAM Engineer can create a new CAM Job (returns 201 Created with initial operations)")
    void createCamJob_camEngineer_returnsCreated() throws Exception {
        CreateCamJobRequest request = new CreateCamJobRequest(
                testVersion.getId(),
                "Bracket Setup 1",
                testMaterial.getId(),
                testMachine.getId()
        );

        mockMvc.perform(post("/api/v1/cam-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.operations").isArray())
                .andExpect(jsonPath("$.estimates.label").value("Estimate"))
                .andExpect(jsonPath("$.estimates.time.totalMachiningMin").isNumber())
                .andExpect(jsonPath("$.estimates.cost.total").isNumber());
    }

    @Test
    @DisplayName("Designer role cannot create CAM Job (returns 403 Forbidden)")
    void createCamJob_designerRole_returnsForbidden() throws Exception {
        CreateCamJobRequest request = new CreateCamJobRequest(
                testVersion.getId(),
                "Unauthorized Job",
                testMaterial.getId(),
                testMachine.getId()
        );

        mockMvc.perform(post("/api/v1/cam-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(jwt().jwt(j -> j.subject(designerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Part larger than machine travel limit is blocked with 400 Bad Request")
    void createCamJob_partExceedsTravel_returnsBadRequest() throws Exception {
        // Machine with small travel: X=50 mm
        MachineProfile tinyMachine = machineRepository.save(new MachineProfile(
                UUID.randomUUID(), "Micro CNC", "GENERIC_ISO",
                50.0, 50.0, 50.0, 10000, 1.0, 0.8,
                1000.0, 500.0, 10.0, 200.0, 0.1, true, true
        ));

        // Part has X=80 mm + 2*2mm allowance = 84 mm > 50 mm
        CreateCamJobRequest request = new CreateCamJobRequest(
                testVersion.getId(),
                "Oversized Job",
                testMaterial.getId(),
                tinyMachine.getId()
        );

        mockMvc.perform(post("/api/v1/cam-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("exceeds machine travel limit")));
    }

    @Test
    @DisplayName("Configure CAM job updates operations and returns recalculated estimates (AC-20, AC-22)")
    void configureCamJob_updatesOperationsAndEstimates() throws Exception {
        // 1. Create initial job
        CamJob job = new CamJob(testVersion.getId(), testMaterial.getId(), testMachine.getId(), camEngineerId, "Test Job");
        job = camJobRepository.save(job);

        // 2. Configure with custom operations
        ConfigureCamJobRequest configReq = new ConfigureCamJobRequest(
                3.0, // stock allowance
                20.0, // setup time
                List.of(
                        new OperationConfigRequest(1, "FACE", testTool.getId(), 8000, 800.0, 240.0, 1.0, 7.0, 0.3, "EDITED"),
                        new OperationConfigRequest(2, "ROUGH_POCKET", testTool.getId(), 7500, 650.0, 195.0, 4.0, 4.0, 0.3, "EDITED")
                )
        );

        mockMvc.perform(put("/api/v1/cam-jobs/" + job.getId() + "/configuration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(configReq))
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIGURED"))
                .andExpect(jsonPath("$.stockAllowanceMm").value(3.0))
                .andExpect(jsonPath("$.operations.length()").value(2))
                .andExpect(jsonPath("$.estimates.label").value("Estimate"))
                .andExpect(jsonPath("$.estimates.time.setupMin").value(20.0))
                .andExpect(jsonPath("$.configHash").exists());
    }

    @Test
    @DisplayName("Generate toolpaths succeeds, stores geometry, validates G-code and allows download (Milestone 7 / AC-23, AC-24)")
    void generateToolpaths_success_allowsDownload() throws Exception {
        // Create initial job with default operations
        CamJob job = new CamJob(testVersion.getId(), testMaterial.getId(), testMachine.getId(), camEngineerId, "M7 Test Job");
        ToolpathOperation op1 = new ToolpathOperation(1, "FACE", testTool.getId(), 8000, 700.0, 200.0, 1.5, 6.0, 0.0, "CALCULATED");
        job.addOperation(op1);
        job = camJobRepository.save(job);

        // Mock GeometryClient response for toolpath calculation
        java.util.Map<String, Object> mockToolpathRes = new java.util.HashMap<>();
        mockToolpathRes.put("camJobId", job.getId().toString());
        mockToolpathRes.put("totalPathLengthMm", 350.5);
        mockToolpathRes.put("totalCuttingLengthMm", 280.0);
        mockToolpathRes.put("totalRapidLengthMm", 70.5);
        mockToolpathRes.put("totalMoves", 24);
        mockToolpathRes.put("totalCycleTimeS", 42.0);

        java.util.Map<String, Object> mockOpRes = new java.util.HashMap<>();
        mockOpRes.put("seq", 1);
        mockOpRes.put("pathLengthMm", 350.5);
        mockOpRes.put("cuttingLengthMm", 280.0);
        mockOpRes.put("rapidLengthMm", 70.5);
        mockOpRes.put("moveCount", 24);
        mockOpRes.put("estTimeS", 42.0);
        mockOpRes.put("points", List.of(
                java.util.Map.of("x", 0.0, "y", 0.0, "z", 5.0, "moveType", "RAPID", "f", 15000.0, "s", 8000.0),
                java.util.Map.of("x", 0.0, "y", 0.0, "z", 0.0, "moveType", "PLUNGE", "f", 200.0, "s", 8000.0),
                java.util.Map.of("x", 50.0, "y", 0.0, "z", 0.0, "moveType", "FEED", "f", 700.0, "s", 8000.0)
        ));
        mockToolpathRes.put("operations", List.of(mockOpRes));

        when(geometryClient.generateToolpath(any())).thenReturn(mockToolpathRes);

        // Mock GeometryClient response for G-code validation
        java.util.Map<String, Object> mockGCodeRes = new java.util.HashMap<>();
        mockGCodeRes.put("valid", true);
        mockGCodeRes.put("dialect", "HAAS");
        mockGCodeRes.put("linesValidated", 15);
        mockGCodeRes.put("errors", List.of());
        mockGCodeRes.put("warnings", List.of());
        mockGCodeRes.put("gcodeText", "%\nO0100 (M7 TEST JOB)\n(PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE)\nG90 G54 G17 G21\nM30\n%");

        when(geometryClient.validateGCode(any())).thenReturn(mockGCodeRes);

        // 1. Generate toolpaths
        mockMvc.perform(post("/api/v1/cam-jobs/" + job.getId() + "/toolpaths/generate")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TOOLPATH_READY"))
                .andExpect(jsonPath("$.operations[0].pathLengthMm").value(350.5))
                .andExpect(jsonPath("$.operations[0].moveCount").value(24));

        // 2. Fetch toolpath geometry JSON
        mockMvc.perform(get("/api/v1/cam-jobs/" + job.getId() + "/toolpath")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPathLengthMm").value(350.5))
                .andExpect(jsonPath("$.operations[0].points").isArray());

        // 3. Download G-code (passes because status is TOOLPATH_READY)
        mockMvc.perform(get("/api/v1/cam-jobs/" + job.getId() + "/gcode?download=true")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE")));
    }

    @Test
    @DisplayName("G-Code download is disabled if toolpath has not been validated (returns 409 Conflict per AC-23)")
    void getGCode_notValidated_returnsConflict() throws Exception {
        CamJob job = new CamJob(testVersion.getId(), testMaterial.getId(), testMachine.getId(), camEngineerId, "Draft Job");
        job.setStatus("DRAFT");
        job = camJobRepository.save(job);

        mockMvc.perform(get("/api/v1/cam-jobs/" + job.getId() + "/gcode")
                        .with(jwt().jwt(j -> j.subject(camEngineerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_CAM_ENGINEER"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("disabled until toolpath is generated")));
    }

    @Test
    @DisplayName("Designer role cannot generate toolpaths (returns 403 Forbidden)")
    void generateToolpaths_designerRole_returnsForbidden() throws Exception {
        CamJob job = new CamJob(testVersion.getId(), testMaterial.getId(), testMachine.getId(), camEngineerId, "Job");
        job = camJobRepository.save(job);

        mockMvc.perform(post("/api/v1/cam-jobs/" + job.getId() + "/toolpaths/generate")
                        .with(jwt().jwt(j -> j.subject(designerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))))
                .andExpect(status().isForbidden());
    }
}
