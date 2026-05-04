package com.config; // This class is responsible for intercepting incoming HTTP requests and checking for a valid JWT token in the Authorization header. If a valid token is found, it sets the authentication in the Spring Security context, allowing the request to proceed with the appropriate user permissions. If no token is found or if the token is invalid, the request proceeds without authentication, and Spring Security will handle it accordingly (e.g., returning 401 Unauthorized for protected endpoints).

// This filter runs once per request, ensuring that every incoming request is checked for a JWT token. It uses the JwtUtil class to validate the token and extract the user's email, and the UserDetailsServiceImpl to load the user's details from the database. If the token is valid and the user exists, it sets up the authentication context for the request.
import com.utility.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;



@Component
public class JwtFilter extends OncePerRequestFilter   //OncePerRequestFilter is a builti class.
{

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtFilter(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);       //extractinng the token from the header by removing the "Bearer " prefix.

        if (!jwtUtil.isTokenValid(token)) {
            chain.doFilter(request, response);
            return;
        }

        String email = jwtUtil.extractEmail(token);

        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null,
                        userDetails.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (UsernameNotFoundException e) {
                // Token is valid but user no longer exists in DB (e.g. account deleted).
                // Leave SecurityContext empty — Spring Security will return 401.
            }
        }

        chain.doFilter(request, response);
    }
}
