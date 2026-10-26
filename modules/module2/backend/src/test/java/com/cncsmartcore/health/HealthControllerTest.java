package com.cncsmartcore.health;

import com.cncsmartcore.common.RequestIdFilter;
import com.cncsmartcore.profile.ProfileRepository;
import com.cncsmartcore.security.ProfileAuthenticationConverter;
import com.cncsmartcore.security.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HealthController.class)
@Import({SecurityConfig.class, RequestIdFilter.class})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProfileAuthenticationConverter profileAuthenticationConverter;

    @MockBean
    private ProfileRepository profileRepository;

    @Test
    @DisplayName("GET /api/v1/health should return 200 UP and X-Request-Id header without authentication")
    void getHealth_shouldReturnOkAndRequestId() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("cnc-smartcore-backend"))
                .andExpect(header().exists("X-Request-Id"));
    }
}
