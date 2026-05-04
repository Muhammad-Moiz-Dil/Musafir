package com.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory rate limiter for login endpoints.
 * Allows a maximum of MAX_ATTEMPTS per WINDOW_MS per IP address.
 * After exceeding the limit the IP is blocked for BLOCK_MS.(15  minutes).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final int  MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS    = 60_000L;   // 1 minute sliding window
    private static final long BLOCK_MS     = 900_000L;  // 15-minute block

    private static class Window {
        int  count;
        long windowStart;
        long blockedUntil;

        Window(long now) {
            this.count       = 1;
            this.windowStart = now;
            this.blockedUntil = 0;
        }
    }

    private final ConcurrentHashMap<String, Window> ipMap = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) 
    {
        String path = request.getServletPath();
        return !path.equals("/api/auth/login") && !path.equals("/api/auth/admin/login");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String ip  = resolveClientIp(request);
        long   now = System.currentTimeMillis();

        Window w = ipMap.computeIfAbsent(ip, k -> new Window(now));

        synchronized (w) {
            // Unblock if the block period has expired
            if (w.blockedUntil > 0 && now >= w.blockedUntil) {
                w.count        = 0;
                w.blockedUntil = 0;
                w.windowStart  = now;
            }

            // Still blocked
            if (w.blockedUntil > now) {
                long remainingSec = (w.blockedUntil - now) / 1000;
                log.warn("Rate limit active for IP {} — {} second(s) remaining", ip, remainingSec);
                sendTooManyRequests(response, remainingSec);
                return;
            }

            // Reset window if it has expired
            if (now - w.windowStart > WINDOW_MS) {
                w.count       = 0;
                w.windowStart = now;
            }

            w.count++;

            if (w.count > MAX_ATTEMPTS) {
                w.blockedUntil = now + BLOCK_MS;
                log.warn("IP {} exceeded {} login attempts — blocked for 15 minutes", ip, MAX_ATTEMPTS);
                sendTooManyRequests(response, BLOCK_MS / 1000);
                return;
            }
        }

        chain.doFilter(request, response);
    }

    private void sendTooManyRequests(HttpServletResponse response, long remainingSec)
            throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(remainingSec));
        response.getWriter().write(
            "{\"message\":\"Too many login attempts. Please try again in " + remainingSec + " seconds.\"}"
        );
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
