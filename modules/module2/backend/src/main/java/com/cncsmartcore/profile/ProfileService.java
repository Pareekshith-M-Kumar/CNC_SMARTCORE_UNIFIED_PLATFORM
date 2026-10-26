package com.cncsmartcore.profile;

import com.cncsmartcore.security.CurrentUser;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;

    public ProfileService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getCurrentProfile(CurrentUser currentUser) {
        return getProfileById(currentUser.id());
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfileById(UUID id) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new BadCredentialsException("Profile not found for ID: " + id));
        if (!profile.isActive()) {
            throw new DisabledException("User profile is inactive: " + id);
        }
        return ProfileResponse.from(profile);
    }

    @Transactional
    public ProfileResponse updateProfile(UUID id, String fullName) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new BadCredentialsException("Profile not found for ID: " + id));
        if (!profile.isActive()) {
            throw new DisabledException("User profile is inactive: " + id);
        }
        profile.setFullName(fullName);
        profile.setUpdatedAt(Instant.now());
        return ProfileResponse.from(profileRepository.save(profile));
    }
}
