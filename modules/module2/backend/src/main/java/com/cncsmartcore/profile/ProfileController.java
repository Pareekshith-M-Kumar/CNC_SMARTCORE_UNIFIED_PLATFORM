package com.cncsmartcore.profile;

import com.cncsmartcore.security.CurrentUser;
import com.cncsmartcore.security.UserAuthenticationToken;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProfileResponse> getMe(Authentication authentication) {
        UUID userId = extractUserId(authentication);
        ProfileResponse response = profileService.getProfileById(userId);
        return ResponseEntity.ok(response);
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication == null) {
            throw new BadCredentialsException("No authentication context found");
        }
        if (authentication instanceof UserAuthenticationToken userAuth) {
            return userAuth.getPrincipal().id();
        }
        if (authentication.getPrincipal() instanceof CurrentUser currentUser) {
            return currentUser.id();
        }
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            String sub = jwt.getSubject();
            if (sub == null || sub.isBlank()) {
                throw new BadCredentialsException("JWT subject claim is missing");
            }
            try {
                return UUID.fromString(sub);
            } catch (IllegalArgumentException e) {
                throw new BadCredentialsException("JWT subject claim is not a valid UUID: " + sub);
            }
        }
        if (authentication.getName() != null) {
            try {
                return UUID.fromString(authentication.getName());
            } catch (IllegalArgumentException e) {
                throw new BadCredentialsException("Authentication principal name is not a valid UUID");
            }
        }
        throw new BadCredentialsException("Unable to resolve user ID from authentication");
    }
}
