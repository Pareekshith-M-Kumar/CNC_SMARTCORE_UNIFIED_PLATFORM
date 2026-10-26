package com.cncsmartcore.security;

import java.io.Serializable;
import java.security.Principal;
import java.util.UUID;

public record CurrentUser(
    UUID id,
    String email,
    String fullName,
    String role,
    boolean isActive
) implements Principal, Serializable {

    @Override
    public String getName() {
        return email != null ? email : id.toString();
    }
}
