package com.service;

import com.model.User;
import com.model.UserPreferences;
import com.repository.UserPreferencesRepository;
import com.repository.UserRepository;
import com.utility.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class ProfileService {

    private final UserRepository userRepo;
    private final UserPreferencesRepository prefRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public ProfileService(UserRepository userRepo,
                          UserPreferencesRepository prefRepo,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.prefRepo = prefRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /** Get full profile for authenticated user */
    public User getProfile(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new UserService.AuthException("User not found."));
    }

    /** Generate a fresh JWT for the given user (used after email change). */
    public String generateToken(User user) {
        return jwtUtil.generateToken(user.getEmail(), user.getUserType().name());
    }

    /** Update profile fields: fullName, phoneNumber, cnic, address, email */
    public User updateProfile(String email, UpdateProfileRequest req) {
        User user = getProfile(email);
        Map<String, String> errors = new HashMap<>();

        // email validation
        if (req.getEmail() != null) {
            String newEmail = req.getEmail().trim().toLowerCase();
            if (!newEmail.isEmpty()) {
                if (!newEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                    errors.put("email", "Enter a valid email address.");
                } else if (!newEmail.equals(user.getEmail().toLowerCase())) {
                    if (userRepo.existsByEmail(newEmail)) {
                        errors.put("email", "This email is already registered to another account.");
                    } else {
                        user.setEmail(newEmail);
                    }
                }
            }
        }

        // fullName validation
        if (req.getFullName() != null) {
            String name = req.getFullName().trim();
            if (name.isEmpty()) {
                errors.put("fullName", "Full name cannot be empty.");
            } else if (name.length() < 3 || name.length() > 255) {
                errors.put("fullName", "Name must be between 3 and 255 characters.");
            } else if (!name.matches("^[a-zA-Z\\s.\\-']+$")) {
                errors.put("fullName", "Name can only contain letters, spaces, dots, and hyphens.");
            } else {
                user.setFullName(name);
            }
        }

        // phoneNumber — only update if non-empty; empty = keep existing value
        if (req.getPhoneNumber() != null) {
            String phone = req.getPhoneNumber().trim().replaceAll("[\\s\\-]", "");
            if (!phone.isEmpty()) {
                if (!phone.matches("^(03[0-9]{9}|923[0-9]{9})$")) {
                    errors.put("phoneNumber", "Phone number must be 11 digits starting with 03 (e.g. 03001234567).");
                } else {
                    user.setPhoneNumber(phone);
                }
            }
            // empty string → leave existing value unchanged
        }

        // CNIC — only update if non-empty; empty = keep existing value
        if (req.getCnic() != null) {
            String cnic = req.getCnic().trim();
            if (!cnic.isEmpty()) {
                if (!cnic.matches("^\\d{5}-\\d{7}-\\d$")) {
                    errors.put("cnic", "CNIC must be in format XXXXX-XXXXXXX-X.");
                } else if (!cnic.equals(user.getCnic())) {
                    if (userRepo.existsByCnic(cnic)) {
                        errors.put("cnic", "This CNIC is already registered to another account.");
                    } else {
                        user.setCnic(cnic);
                    }
                }
                // same value → no change needed
            }
            // empty string → leave existing value unchanged
        }

        // address — only update if non-empty; empty = keep existing value
        if (req.getAddress() != null) {
            String addr = req.getAddress().trim();
            if (!addr.isEmpty()) {
                user.setAddress(addr);
            }
            // empty string → leave existing value unchanged
        }

        if (!errors.isEmpty()) {
            throw new UserService.FieldValidationException(errors);
        }

        return userRepo.save(user);
    }

    /** Change password — verifies old, saves new BCrypt hash */
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = getProfile(email);
        Map<String, String> errors = new HashMap<>();

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            errors.put("currentPassword", "Current password is incorrect.");
            throw new UserService.FieldValidationException(errors);
        }

        if (newPassword == null || newPassword.length() < 8) {
            errors.put("newPassword", "New password must be at least 8 characters.");
            throw new UserService.FieldValidationException(errors);
        }

        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            errors.put("newPassword", "New password must be different from your current password.");
            throw new UserService.FieldValidationException(errors);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepo.save(user);
    }

    /** Get or create UserPreferences for a user */
    public UserPreferences getPreferences(Integer userId) {
        return prefRepo.findByUserId(userId)
                .orElseGet(() -> {
                    UserPreferences p = new UserPreferences();
                    p.setUserId(userId);
                    return prefRepo.save(p);
                });
    }

    /** Save age group and travel preferences */
    public UserPreferences savePreferences(Integer userId, String ageGroup, String travelPreferencesJson) {
        UserPreferences pref = getPreferences(userId);
        if (ageGroup != null && !ageGroup.isBlank()) {
            pref.setAgeGroup(ageGroup);
        }
        if (travelPreferencesJson != null) {
            pref.setTravelPreferences(travelPreferencesJson);
        }
        return prefRepo.save(pref);
    }

    /** Delete account — verifies password, then hard-deletes the user */
    public void deleteAccount(String email, String password) {
        User user = getProfile(email);
        Map<String, String> errors = new HashMap<>();

        if (password == null || password.isBlank()) {
            errors.put("password", "Password is required to delete your account.");
            throw new UserService.FieldValidationException(errors);
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            errors.put("password", "Incorrect password. Please try again.");
            throw new UserService.FieldValidationException(errors);
        }

        // Delete preferences first (FK constraint), then user
        prefRepo.findByUserId(user.getUserId()).ifPresent(prefRepo::delete);
        userRepo.delete(user);
    }

    /** Save uploaded avatar path */
    public void saveAvatarPath(Integer userId, String path) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new UserService.AuthException("User not found."));
        user.setProfilePicture(path);
        userRepo.save(user);
    }

    // ── DTOs ──────────────────────────────────────────────────

    public static class UpdateProfileRequest {
        private String email;
        private String fullName;
        private String phoneNumber;
        private String cnic;
        private String address;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
        public String getCnic() { return cnic; }
        public void setCnic(String cnic) { this.cnic = cnic; }
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
    }
}
