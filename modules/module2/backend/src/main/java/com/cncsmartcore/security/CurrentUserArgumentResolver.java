package com.cncsmartcore.security;

import com.cncsmartcore.profile.ProfileRepository;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.UUID;

@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private final ProfileRepository profileRepository;

    public CurrentUserArgumentResolver(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return CurrentUser.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        if (auth instanceof UserAuthenticationToken userAuth) {
            return userAuth.getPrincipal();
        }
        if (auth.getPrincipal() instanceof CurrentUser currentUser) {
            return currentUser;
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            try {
                UUID userId = UUID.fromString(jwt.getSubject());
                return profileRepository.findById(userId)
                        .map(p -> new CurrentUser(p.getId(), p.getEmail(), p.getFullName(), p.getRole(), p.isActive()))
                        .orElse(null);
            } catch (IllegalArgumentException ignored) {}
        }
        return null;
    }
}
