package com.config;

import com.repository.SystemSettingsRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Intercepts every request and returns 503 when FEATURE_MAINTENANCE_MODE = true,
 * except for admin auth and admin API endpoints so admins can still log in.
 */
@Component
public class MaintenanceFilter extends OncePerRequestFilter {

    private final SystemSettingsRepository settingsRepo;

    public MaintenanceFilter(SystemSettingsRepository settingsRepo) {
        this.settingsRepo = settingsRepo;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        boolean maintenance = settingsRepo.findBySettingKey("FEATURE_MAINTENANCE_MODE")
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElse(false);

        if (maintenance) {
            String path = request.getRequestURI();
            // Let admin login and all /api/admin/** through so the admin can still manage the site
            if (!path.startsWith("/api/auth/admin") && !path.startsWith("/api/admin")) {
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                    "{\"message\":\"Tripify is currently under maintenance. Please check back later.\",\"maintenance\":true}"
                );
                return;
            }
        }

        chain.doFilter(request, response);
    }
}
