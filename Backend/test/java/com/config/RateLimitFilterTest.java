package com.config;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RateLimitFilter — no Spring context required.
 */
class RateLimitFilterTest {

    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
    }

    @Test
    void shouldNotFilter_nonLoginPath_returnsTrue() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/destinations");
        assertTrue(filter.shouldNotFilter(req));
    }

    @Test
    void shouldNotFilter_loginPath_returnsFalse() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setServletPath("/api/auth/login");
        assertFalse(filter.shouldNotFilter(req));
    }

    @Test
    void shouldNotFilter_adminLoginPath_returnsFalse() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/admin/login");
        req.setServletPath("/api/auth/admin/login");
        assertFalse(filter.shouldNotFilter(req));
    }

    @Test
    void firstFiveAttempts_shouldPassThrough() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest  req  = buildLoginRequest("192.168.1.100");
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilterInternal(req, resp, chain);
            assertEquals(200, resp.getStatus(), "Attempt " + (i + 1) + " should pass");
        }
        verify(chain, times(5)).doFilter(any(), any());
    }

    @Test
    void sixthAttempt_shouldReturn429() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        String ip = "10.0.0.42";

        // Exhaust limit
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(buildLoginRequest(ip), new MockHttpServletResponse(), chain);
        }

        // 6th attempt should be blocked
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilterInternal(buildLoginRequest(ip), blocked, chain);

        assertEquals(429, blocked.getStatus());
        assertTrue(blocked.getContentAsString().contains("Too many login attempts"));
        verify(chain, times(5)).doFilter(any(), any()); // chain NOT called on 6th
    }

    @Test
    void differentIps_shouldBeTrackedIndependently() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        // Exhaust limit for IP A
        for (int i = 0; i < 5; i++) {
            filter.doFilterInternal(buildLoginRequest("1.1.1.1"), new MockHttpServletResponse(), chain);
        }

        // IP B should still be allowed
        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilterInternal(buildLoginRequest("2.2.2.2"), resp, chain);

        assertEquals(200, resp.getStatus());
    }

    // ── Helpers ─────────────────────────────────────────────────

    private MockHttpServletRequest buildLoginRequest(String remoteAddr) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setServletPath("/api/auth/login");
        req.setRemoteAddr(remoteAddr);
        return req;
    }
}
