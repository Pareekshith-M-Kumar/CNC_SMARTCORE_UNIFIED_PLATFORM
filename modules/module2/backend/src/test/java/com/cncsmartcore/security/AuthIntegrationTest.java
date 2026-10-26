package com.cncsmartcore.security;

import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProfileRepository profileRepository;

    private UUID designerId;
    private UUID approverId;
    private UUID inactiveUserId;

    @BeforeEach
    void setUp() {
        profileRepository.deleteAll();

        designerId = UUID.randomUUID();
        Profile designer = new Profile(designerId, "designer@cncsmartcore.io", "Alice Designer", "designer", true);
        profileRepository.save(designer);

        approverId = UUID.randomUUID();
        Profile approver = new Profile(approverId, "approver@cncsmartcore.io", "Bob Approver", "approver", true);
        profileRepository.save(approver);

        inactiveUserId = UUID.randomUUID();
        Profile inactive = new Profile(inactiveUserId, "inactive@cncsmartcore.io", "Inactive User", "designer", false);
        profileRepository.save(inactive);
    }

    @Test
    @DisplayName("Unauthenticated request to protected endpoint returns 401")
    void unauthenticatedRequestReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Invalid or forged bearer token returns 401")
    void invalidTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .header("Authorization", "Bearer invalid-forged-token-xyz")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Valid JWT maps subject to DB profile and grants ROLE_DESIGNER")
    void validJwtMapsToDesignerRole() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .with(jwt().jwt(builder -> builder
                        .subject(designerId.toString())
                        .claim("email", "designer@cncsmartcore.io")
                        .audience(java.util.List.of("authenticated"))
                ))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(designerId.toString()))
                .andExpect(jsonPath("$.email").value("designer@cncsmartcore.io"))
                .andExpect(jsonPath("$.fullName").value("Alice Designer"))
                .andExpect(jsonPath("$.role").value("designer"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    @DisplayName("Valid JWT maps subject to DB profile and grants ROLE_APPROVER")
    void validJwtMapsToApproverRole() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .with(jwt().jwt(builder -> builder
                        .subject(approverId.toString())
                        .claim("email", "approver@cncsmartcore.io")
                        .audience(java.util.List.of("authenticated"))
                ))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(approverId.toString()))
                .andExpect(jsonPath("$.email").value("approver@cncsmartcore.io"))
                .andExpect(jsonPath("$.fullName").value("Bob Approver"))
                .andExpect(jsonPath("$.role").value("approver"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    @DisplayName("Inactive profile is rejected with 401")
    void inactiveProfileIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .with(jwt().jwt(builder -> builder
                        .subject(inactiveUserId.toString())
                        .claim("email", "inactive@cncsmartcore.io")
                        .audience(java.util.List.of("authenticated"))
                ))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("JWT with missing subject claim is rejected with 401")
    void missingSubjectClaimReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .with(jwt().jwt(builder -> builder
                        .claim("email", "nosubject@cncsmartcore.io")
                        .audience(java.util.List.of("authenticated"))
                ))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("JWT with malformed non-UUID subject is rejected with 401")
    void malformedSubjectClaimReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                .with(jwt().jwt(builder -> builder
                        .subject("not-a-valid-uuid-12345")
                        .claim("email", "baduuid@cncsmartcore.io")
                        .audience(java.util.List.of("authenticated"))
                ))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Expired or malformed Bearer token is rejected with 401")
    void expiredOrMalformedBearerTokenReturns401() throws Exception {
        String expiredJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4-fake-sig";
        mockMvc.perform(get("/api/v1/me")
                .header("Authorization", "Bearer " + expiredJwt)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
