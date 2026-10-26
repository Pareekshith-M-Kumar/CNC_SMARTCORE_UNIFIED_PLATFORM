package com.cncsmartcore.profile;

import java.time.Instant;
import java.util.UUID;

public record ProfileResponse(
    UUID id,
    String email,
    String fullName,
    String role,
    boolean isActive,
    Instant createdAt
) {
    public static ProfileResponse from(Profile profile) {
        return new ProfileResponse(
            profile.getId(),
            profile.getEmail(),
            profile.getFullName(),
            profile.getRole(),
            profile.isActive(),
            profile.getCreatedAt()
        );
    }
}
