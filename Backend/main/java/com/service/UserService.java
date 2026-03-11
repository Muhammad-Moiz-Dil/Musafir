package com.service;

import com.model.User;
import com.repository.UserRepository;
import com.utility.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Registers a new Tourist or HotelManager account.
     * Admin accounts are not created through this endpoint.
     */
    public User register(RegisterRequest request) {

        Map<String, String> errors = new HashMap<>();

        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            errors.put("email", "An account with this email already exists.");
        }

        if (request.getCnic() != null && !request.getCnic().isBlank()
                && userRepository.existsByCnic(request.getCnic())) {
            errors.put("cnic", "This CNIC is already registered.");
        }

        if (User.UserType.Admin.name().equalsIgnoreCase(request.getUserType())) {
            errors.put("userType", "Admin accounts cannot be self-registered.");
        }

        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .userType(User.UserType.valueOf(request.getUserType()))
                .fullName(request.getFullName().trim())
                .phoneNumber(request.getPhoneNumber())
                .cnic(request.getCnic())
                .address(request.getAddress())
                .build();

        return userRepository.save(user);
    }

    /**
     * Authenticates a Tourist or HotelManager and returns a JWT token.
     */
    public LoginResult login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new AuthException("Invalid email or password."));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new AuthException("Invalid email or password.");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new AuthException("Your account has been deactivated. Please contact support.");
        }

        if (user.getUserType() == User.UserType.Admin) {
            throw new AccessDeniedException("Use the Admin portal to sign in.");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getUserType().name());
        return new LoginResult(token, user);
    }

    /**
     * Authenticates an Admin account only.
     */
    public LoginResult adminLogin(String email, String rawPassword) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new AuthException("Invalid email or password."));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new AuthException("Invalid email or password.");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new AuthException("This account has been deactivated.");
        }

        if (user.getUserType() != User.UserType.Admin) {
            throw new AccessDeniedException("Access denied. This portal is for administrators only.");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getUserType().name());
        return new LoginResult(token, user);
    }

    // ── LoginResult ──────────────────────────────────────────

    public static class LoginResult {
        private final String token;
        private final User user;

        public LoginResult(String token, User user) {
            this.token = token;
            this.user = user;
        }

        public String getToken() { return token; }
        public User getUser()    { return user; }
    }

    // ── Exceptions ───────────────────────────────────────────

    public static class AuthException extends RuntimeException {
        public AuthException(String message) { super(message); }
    }

    public static class AccessDeniedException extends RuntimeException {
        public AccessDeniedException(String message) { super(message); }
    }

    // ── RegisterRequest DTO ──────────────────────────────────

    public static class RegisterRequest {
        private String fullName;
        private String email;
        private String password;
        private String userType;
        private String phoneNumber;
        private String cnic;
        private String address;

        public String getFullName()                { return fullName; }
        public void setFullName(String fullName)   { this.fullName = fullName; }

        public String getEmail()                 { return email; }
        public void setEmail(String email)       { this.email = email; }

        public String getPassword()                  { return password; }
        public void setPassword(String password)     { this.password = password; }

        public String getUserType()                  { return userType; }
        public void setUserType(String userType)     { this.userType = userType; }

        public String getPhoneNumber()                   { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber)   { this.phoneNumber = phoneNumber; }

        public String getCnic()              { return cnic; }
        public void setCnic(String cnic)     { this.cnic = cnic; }

        public String getAddress()               { return address; }
        public void setAddress(String address)   { this.address = address; }
    }

    // ── FieldValidationException ─────────────────────────────

    public static class FieldValidationException extends RuntimeException {
        private final Map<String, String> errors;

        public FieldValidationException(Map<String, String> errors) {
            super("Validation failed");
            this.errors = errors;
        }

        public Map<String, String> getErrors() { return errors; }
    }
}
