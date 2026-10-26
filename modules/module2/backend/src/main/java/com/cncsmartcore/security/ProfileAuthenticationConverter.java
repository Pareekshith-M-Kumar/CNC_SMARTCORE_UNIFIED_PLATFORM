package com.cncsmartcore.security;

import com.cncsmartcore.profile.Profile;
import com.cncsmartcore.profile.ProfileRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
public class ProfileAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final ProfileRepository profileRepository;

    public ProfileAuthenticationConverter(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String subject = jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new BadCredentialsException("JWT subject claim (sub) is missing");
        }

        UUID userId;
        try {
            userId = UUID.fromString(subject);
        } catch (IllegalArgumentException ex) {
            throw new BadCredentialsException("JWT subject claim is not a valid UUID: " + subject);
        }

        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> {
                    // Fallback auto-provision if user exists in auth.users but trigger hasn't fired yet
                    String email = jwt.getClaimAsString("email");
                    if (email != null && !email.isBlank()) {
                        Profile newProfile = new Profile(userId, email, "", "designer", true);
                        return profileRepository.save(newProfile);
                    }
                    throw new BadCredentialsException("User profile not found for sub: " + userId);
                });

        if (!profile.isActive()) {
            throw new DisabledException("User profile is inactive: " + userId);
        }

        String role = profile.getRole().toUpperCase();
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + role)
        );

        CurrentUser currentUser = new CurrentUser(
                profile.getId(),
                profile.getEmail(),
                profile.getFullName(),
                profile.getRole(),
                profile.isActive()
        );

        return new UserAuthenticationToken(currentUser, jwt, authorities);
    }
}
