package com.cncsmartcore.security;

import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * In local dev mode or when X-Dev-Role header is provided, this filter provisions
 * a default developer session if no Supabase JWT Authorization header is present.
 */
@Component
public class DevAuthenticationFilter extends OncePerRequestFilter {

    private final ProfileRepository profileRepository;
    private final boolean isLocalProfile;

    public DevAuthenticationFilter(ProfileRepository profileRepository, Environment env) {
        this.profileRepository = profileRepository;
        List<String> activeProfiles = Arrays.asList(env.getActiveProfiles());
        this.isLocalProfile = activeProfiles.contains("local")
                || activeProfiles.isEmpty()
                || Arrays.asList(env.getDefaultProfiles()).contains("local");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String devRoleHeader = request.getHeader("X-Dev-Role");

        // Only inject fallback dev credentials if X-Dev-Role header is explicitly provided
        if ((authHeader == null || authHeader.isBlank()) && devRoleHeader != null && !devRoleHeader.isBlank()) {
            UUID devUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
            String role = devRoleHeader.trim().toLowerCase();

            Profile devProfile = null;
            try {
                devProfile = profileRepository.findById(devUserId).orElseGet(() -> {
                    Profile p = new Profile(devUserId, "engineer@cncsmartcore.local", "Dev CNC Engineer", role, true);
                    Profile saved = profileRepository.save(p);
                    return saved != null ? saved : p;
                });
            } catch (Exception ignored) {}

            if (devProfile == null) {
                devProfile = new Profile(devUserId, "engineer@cncsmartcore.local", "Dev CNC Engineer", role, true);
            }

            CurrentUser currentUser = new CurrentUser(
                    devProfile.getId(),
                    devProfile.getEmail(),
                    devProfile.getFullName(),
                    role,
                    devProfile.isActive()
            );

            // Grant role strictly matching requested dev role (e.g. ROLE_CUSTOMER, ROLE_OPERATOR, ROLE_ADMIN)
            List<SimpleGrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + role.toUpperCase())
            );

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(currentUser, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
