package com.cncsmartcore.material;

import com.cncsmartcore.cad.CadAsset;
import com.cncsmartcore.cad.CadAssetRepository;
import com.cncsmartcore.cad.CadVersion;
import com.cncsmartcore.cad.CadVersionRepository;
import com.cncsmartcore.material.dto.MaterialRecommendationRequest;
import com.cncsmartcore.material.dto.MaterialSelectionRequest;
import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
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

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MaterialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private CadAssetRepository cadAssetRepository;

    @Autowired
    private CadVersionRepository cadVersionRepository;

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private UUID designerId;
    private CadVersion testVersion;
    private Material sampleMaterial;

    @BeforeEach
    void setUp() {
        cadVersionRepository.deleteAll();
        cadAssetRepository.deleteAll();
        profileRepository.deleteAll();

        designerId = UUID.randomUUID();
        Profile designer = new Profile(designerId, "designer@example.com", "Main Designer", "designer", true);
        profileRepository.save(designer);

        CadAsset asset = new CadAsset(designerId, "Test Bracket", "CAD part for material testing");
        asset = cadAssetRepository.save(asset);

        testVersion = new CadVersion(
                asset, 1, "bracket.stl", "STL", 1024L,
                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "cad-originals", "test/bracket.stl", designerId
        );
        testVersion = cadVersionRepository.save(testVersion);

        sampleMaterial = materialRepository.findByCode("AL6061-T6")
                .orElseGet(() -> materialRepository.save(new Material(
                        UUID.randomUUID(), "AL6061-T6", "Aluminium 6061-T6", "ALUMINIUM",
                        2700, 700, 200, 300, 0.003,
                        3, 4, 4, 5, 2, 350.00,
                        "structural_bracket,housing", "Aerospace aluminum", true
                )));
    }

    @Test
    @DisplayName("GET /api/v1/materials returns 200 OK and active catalog materials")
    void listMaterials_returnsCatalog() throws Exception {
        mockMvc.perform(get("/api/v1/materials")
                        .with(jwt().jwt(j -> j.subject(designerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].code").exists())
                .andExpect(jsonPath("$[0].densityKgM3").isNumber());
    }

    @Test
    @DisplayName("POST /api/v1/cad-versions/{id}/material-recommendations returns rule-based ranked recommendations")
    void recommendMaterials_returnsRankedResults() throws Exception {
        MaterialRecommendationRequest request = new MaterialRecommendationRequest(
                "WEIGHT", "INDOOR", "STRUCTURAL", 500.0
        );

        mockMvc.perform(post("/api/v1/cad-versions/" + testVersion.getId() + "/material-recommendations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(jwt().jwt(j -> j.subject(designerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.label").value("Rule-based recommendation"))
                .andExpect(jsonPath("$.algorithmVersion").value("rb-1.0"))
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results[0].rank").value(1))
                .andExpect(jsonPath("$.results[0].reasons").isArray());
    }

    @Test
    @DisplayName("PUT /api/v1/cad-versions/{id}/material-selection updates selectedMaterialId on version")
    void selectMaterial_updatesVersionAndReturnsOk() throws Exception {
        MaterialSelectionRequest request = new MaterialSelectionRequest(sampleMaterial.getId());

        mockMvc.perform(put("/api/v1/cad-versions/" + testVersion.getId() + "/material-selection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(jwt().jwt(j -> j.subject(designerId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testVersion.getId().toString()))
                .andExpect(jsonPath("$.selectedMaterialId").value(sampleMaterial.getId().toString()));
    }
}
