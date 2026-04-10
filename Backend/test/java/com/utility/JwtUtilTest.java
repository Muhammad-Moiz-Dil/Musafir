package com.utility;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for JwtUtil — no Spring context required.
 */
class JwtUtilTest {

    private static final String SECRET =
        "TestOnlyJwtSecretKeyThatIsAtLeast64CharactersLongForHmacSha512Algo";
    private static final long EXPIRATION_MS = 86_400_000L; // 24 hours

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",       SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", EXPIRATION_MS);
    }

    @Test
    void generateToken_shouldReturnNonBlankString() {
        String token = jwtUtil.generateToken("user@example.com", "Tourist");
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractEmail_shouldReturnOriginalEmail() {
        String email = "tourist@tripify.com";
        String token = jwtUtil.generateToken(email, "Tourist");
        assertEquals(email, jwtUtil.extractEmail(token));
    }

    @Test
    void extractUserType_shouldReturnOriginalUserType() {
        String token = jwtUtil.generateToken("hm@tripify.com", "HotelManager");
        assertEquals("HotelManager", jwtUtil.extractUserType(token));
    }

    @Test
    void isTokenValid_shouldReturnTrueForFreshToken() {
        String token = jwtUtil.generateToken("admin@tripify.com", "Admin");
        assertTrue(jwtUtil.isTokenValid(token));
    }

    @Test
    void isTokenValid_shouldReturnFalseForTamperedToken() {
        String token = jwtUtil.generateToken("user@example.com", "Tourist");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";
        assertFalse(jwtUtil.isTokenValid(tampered));
    }

    @Test
    void isTokenValid_shouldReturnFalseForExpiredToken() throws Exception {
        // Set expiration to 1 ms so the token expires immediately
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", 1L);
        String token = jwtUtil.generateToken("user@example.com", "Tourist");
        Thread.sleep(10);
        assertFalse(jwtUtil.isTokenValid(token));
    }

    @Test
    void isTokenValid_shouldReturnFalseForEmptyString() {
        assertFalse(jwtUtil.isTokenValid(""));
    }

    @Test
    void isTokenValid_shouldReturnFalseForGarbage() {
        assertFalse(jwtUtil.isTokenValid("not.a.jwt"));
    }
}
