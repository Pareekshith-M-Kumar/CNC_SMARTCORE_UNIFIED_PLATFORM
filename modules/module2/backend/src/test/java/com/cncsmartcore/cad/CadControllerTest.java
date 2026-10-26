package com.cncsmartcore.cad;

import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private CadAssetRepository cadAssetRepository;

    @MockBean
    private GeometryClient geometryClient;

    private UUID designerId;
    private UUID otherDesignerId;

    @BeforeEach
    void setUp() {
        cadAssetRepository.deleteAll();
        profileRepository.deleteAll();

        designerId = UUID.randomUUID();
        Profile designer = new Profile(designerId, "designer@example.com", "Main Designer", "designer", true);
        profileRepository.save(designer);

        otherDesignerId = UUID.randomUUID();
        Profile otherDesigner = new Profile(otherDesignerId, "other@example.com", "Other Designer", "designer", true);
        profileRepository.save(otherDesigner);

        when(geometryClient.processCadFile(any(), any(), any(), any())).thenReturn(
                new com.cncsmartcore.cad.dto.CadProcessResult(
                        "hash", "READY", null, 10.0, 10.0, 10.0, 1000.0, 600.0, 12, true, null, java.util.List.of()
                )
        );
    }

    @Test
    @DisplayName("Upload valid ASCII STL creates asset and version with 201")
    void uploadValidStlSuccess() throws Exception {
        String stlContent = "solid test\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test\n";
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.stl",
                "model/stl",
                stlContent.getBytes()
        );

        mockMvc.perform(multipart("/api/v1/cad-assets")
                .file(file)
                .param("name", "Test Bracket")
                .param("description", "Prototype part")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))
                        .jwt(b -> b.subject(designerId.toString()).claim("email", "designer@example.com"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Bracket"))
                .andExpect(jsonPath("$.versions[0].versionNumber").value(1))
                .andExpect(jsonPath("$.versions[0].fileFormat").value("STL"))
                .andExpect(jsonPath("$.versions[0].sha256").exists());
    }

    @Test
    @DisplayName("Reject executable disguised as STL with 400 Bad Request")
    void rejectExecutableDisguisedAsStl() throws Exception {
        byte[] fakeExe = new byte[]{0x4D, 0x5A, 0x00, 0x00}; // 'MZ' Windows executable header
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "malicious.stl",
                "application/octet-stream",
                fakeExe
        );

        mockMvc.perform(multipart("/api/v1/cad-assets")
                .file(file)
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))
                        .jwt(b -> b.subject(designerId.toString()).claim("email", "designer@example.com"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Reject file with unsupported extension with 400 Bad Request")
    void rejectUnsupportedExtension() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "model.dwg",
                "application/octet-stream",
                "some content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/cad-assets")
                .file(file)
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))
                        .jwt(b -> b.subject(designerId.toString()).claim("email", "designer@example.com"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Designer cannot access another designer's asset (returns 404)")
    void designerCannotAccessOthersAsset() throws Exception {
        // Create asset owned by designerId
        CadAsset asset = new CadAsset(designerId, "Secret Part", "Confidential");
        asset = cadAssetRepository.save(asset);

        // otherDesignerId attempts to access it
        mockMvc.perform(get("/api/v1/cad-assets/" + asset.getId())
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DESIGNER"))
                        .jwt(b -> b.subject(otherDesignerId.toString()).claim("email", "other@example.com"))))
                .andExpect(status().isNotFound());
    }
}
