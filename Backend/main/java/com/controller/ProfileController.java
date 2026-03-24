package com.controller;

import com.config.UploadUtils;
import com.model.Trip;
import com.model.User;
import com.model.UserPreferences;
import com.repository.BookingRepository;
import com.repository.FavoriteRepository;
import com.repository.TripDestinationRepository;
import com.repository.TripRepository;
import com.service.ActivityLogService;
import com.service.ProfileService;
import com.service.RecommendationService;
import com.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class ProfileController {

    private final ProfileService        profileService;
    private final RecommendationService recommendationService;
    private final TripRepository        tripRepo;
    private final TripDestinationRepository tripDestRepo;
    private final FavoriteRepository    favoriteRepo;
    private final BookingRepository     bookingRepo;
    private final ActivityLogService    logService;

    // Avatar storage directory (relative to where the JAR runs, i.e., Backend/ folder)
    private static final String AVATAR_DIR = "uploads/avatars/";
    private static final String AVATAR_URL_PREFIX = "/uploads/avatars/";

    public ProfileController(ProfileService profileService,
                             RecommendationService recommendationService,
                             TripRepository tripRepo,
                             TripDestinationRepository tripDestRepo,
                             FavoriteRepository favoriteRepo,
                             BookingRepository bookingRepo,
                             ActivityLogService logService) {
        this.profileService        = profileService;
        this.recommendationService = recommendationService;
        this.tripRepo              = tripRepo;
        this.tripDestRepo          = tripDestRepo;
        this.favoriteRepo          = favoriteRepo;
        this.bookingRepo           = bookingRepo;
        this.logService            = logService;
    }

    private String currentEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    /** GET /api/users/profile */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        User u = profileService.getProfile(currentEmail());
        return ResponseEntity.ok(buildProfileMap(u));
    }

    /** PUT /api/users/profile */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody ProfileService.UpdateProfileRequest req,
                                           HttpServletRequest request) {
        try {
            String oldEmail = currentEmail();
            User u = profileService.updateProfile(oldEmail, req);
            logService.log(u.getUserId(), "PROFILE_UPDATED", request);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("message", "Profile updated successfully.");
            resp.put("user", buildProfileMap(u));

            // If email changed, issue a new JWT so the session stays valid
            if (!u.getEmail().equalsIgnoreCase(oldEmail)) {
                resp.put("newToken", profileService.generateToken(u));
                resp.put("newEmail", u.getEmail());
            }

            return ResponseEntity.ok(resp);
        } catch (UserService.FieldValidationException ex) {
            return ResponseEntity.status(422).body(Map.of(
                "message", "Validation failed.",
                "errors", ex.getErrors()
            ));
        }
    }

    /** POST /api/users/profile/avatar */
    @PostMapping("/profile/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file,
                                          HttpServletRequest request) {
        String email = currentEmail();
        User u = profileService.getProfile(email);

        // Validate type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            return ResponseEntity.status(400).body(Map.of("message", "Only JPG and PNG images are allowed."));
        }

        // Validate size (max 2MB)
        if (file.getSize() > 2 * 1024 * 1024) {
            return ResponseEntity.status(400).body(Map.of("message", "Image must be smaller than 2MB."));
        }

        try {
            // Ensure directory exists (always resolves to Backend/uploads/avatars/)
            Path dir = UploadUtils.resolve("avatars");
            Files.createDirectories(dir);

            // Save file as userId_uuid.jpg/png
            String ext = contentType.equals("image/png") ? ".png" : ".jpg";
            String filename = u.getUserId() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path dest = dir.resolve(filename);

            // Delete old avatar if exists
            if (u.getProfilePicture() != null && !u.getProfilePicture().isBlank()) {
                try {
                    String oldFilename = u.getProfilePicture().replace(AVATAR_URL_PREFIX, "");
                    Files.deleteIfExists(UploadUtils.resolve("avatars").resolve(oldFilename));
                } catch (Exception ignored) {}
            }

            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
            String avatarUrl = AVATAR_URL_PREFIX + filename;
            profileService.saveAvatarPath(u.getUserId(), avatarUrl);
            logService.log(u.getUserId(), "AVATAR_UPDATED", request);

            return ResponseEntity.ok(Map.of(
                "message", "Avatar uploaded successfully.",
                "avatarUrl", avatarUrl
            ));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to save image. Please try again."));
        }
    }

    /** PUT /api/users/password */
    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req,
                                            HttpServletRequest request) {
        // Frontend validations
        java.util.Map<String, String> frontErrors = new java.util.HashMap<>();
        if (req.getCurrentPassword() == null || req.getCurrentPassword().isBlank())
            frontErrors.put("currentPassword", "Current password is required.");
        if (req.getNewPassword() == null || req.getNewPassword().length() < 8)
            frontErrors.put("newPassword", "New password must be at least 8 characters.");
        if (req.getConfirmPassword() == null || !req.getConfirmPassword().equals(req.getNewPassword()))
            frontErrors.put("confirmPassword", "Passwords do not match.");
        if (!frontErrors.isEmpty())
            return ResponseEntity.status(422).body(Map.of("message","Validation failed.","errors",frontErrors));

        try {
            profileService.changePassword(currentEmail(), req.getCurrentPassword(), req.getNewPassword());
            logService.log(currentEmail(), "PASSWORD_CHANGED", request);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
        } catch (UserService.FieldValidationException ex) {
            return ResponseEntity.status(422).body(Map.of("message", "Validation failed.", "errors", ex.getErrors()));
        }
    }

    /** GET /api/users/preferences */
    @GetMapping("/preferences")
    public ResponseEntity<?> getPreferences() {
        User u = profileService.getProfile(currentEmail());
        UserPreferences p = profileService.getPreferences(u.getUserId());
        return ResponseEntity.ok(Map.of(
            "ageGroup", p.getAgeGroup() != null ? p.getAgeGroup() : "18-25",
            "travelPreferences", p.getTravelPreferences() != null ? p.getTravelPreferences() : "[]"
        ));
    }

    /** DELETE /api/users/account */
    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(@RequestBody DeleteAccountRequest req) {
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            return ResponseEntity.status(422).body(Map.of(
                "message", "Validation failed.",
                "errors", Map.of("password", "Password is required.")
            ));
        }
        try {
            profileService.deleteAccount(currentEmail(), req.getPassword());
            return ResponseEntity.ok(Map.of("message", "Your account has been permanently deleted."));
        } catch (UserService.FieldValidationException ex) {
            return ResponseEntity.status(422).body(Map.of("message", "Validation failed.", "errors", ex.getErrors()));
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            return ResponseEntity.status(409).body(Map.of("message", "Cannot delete account: it has active reservations or data linked to it. Please contact support."));
        }
    }

    /** PUT /api/users/preferences */
    @PutMapping("/preferences")
    public ResponseEntity<?> savePreferences(@RequestBody SavePreferencesRequest req,
                                             HttpServletRequest request) {
        User u = profileService.getProfile(currentEmail());
        profileService.savePreferences(u.getUserId(), req.getAgeGroup(), req.getTravelPreferences());
        logService.log(u.getUserId(), "PREFERENCES_UPDATED", request);
        return ResponseEntity.ok(Map.of("message", "Preferences saved successfully."));
    }

    /**
     * GET /api/users/recommendations?limit=5
     * Returns personalized destination recommendations based on the user's
     * saved age group and travel preferences.
     */
    @GetMapping("/recommendations")
    public ResponseEntity<?> getRecommendations(
            @RequestParam(value = "limit", defaultValue = "5") int limit) {
        if (limit < 1 || limit > 20) limit = 5;
        User u = profileService.getProfile(currentEmail());
        UserPreferences prefs = profileService.getPreferences(u.getUserId());
        Map<String, Object> result = recommendationService.getRecommendations(prefs, limit);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/users/stats
     * Returns dashboard stat counts for the current user.
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        User user = profileService.getProfile(currentEmail());
        int userId = user.getUserId();

        List<Trip> trips = tripRepo.findByUserIdOrderByCreatedAtDesc(userId);
        int tripsPlanned = trips.size();

        int wishlistItems = favoriteRepo.findDestinationIdsByUserId(userId).size();

        Set<Integer> visitedDestIds = new HashSet<>();
        trips.stream()
                .filter(t -> t.getStatus() == Trip.TripStatus.COMPLETED)
                .forEach(t -> tripDestRepo.findByTripIdOrderByVisitOrder(t.getTripId())
                        .forEach(td -> visitedDestIds.add(td.getDestinationId())));

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("tripsPlanned", tripsPlanned);
        stats.put("wishlistItems", wishlistItems);
        stats.put("hotelsBooked", bookingRepo.countByUserId(userId));
        stats.put("destinationsVisited", visitedDestIds.size());
        return ResponseEntity.ok(stats);
    }

    // ── Helpers ───────────────────────────────────────────────

    private Map<String, Object> buildProfileMap(User u) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMMM yyyy");
        return Map.of(
            "id",             u.getUserId(),
            "email",          u.getEmail(),
            "fullName",       u.getFullName(),
            "userType",       u.getUserType().name(),
            "phoneNumber",    u.getPhoneNumber()     != null ? u.getPhoneNumber()     : "",
            "cnic",           u.getCnic()            != null ? u.getCnic()            : "",
            "address",        u.getAddress()         != null ? u.getAddress()         : "",
            "profilePicture", u.getProfilePicture()  != null ? u.getProfilePicture()  : "",
            "memberSince",    u.getCreatedAt()       != null ? u.getCreatedAt().format(fmt) : "January 2026"
        );
    }

    // ── DTOs ──────────────────────────────────────────────────

    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;
        private String confirmPassword;
        public String getCurrentPassword()  { return currentPassword; }
        public void setCurrentPassword(String p) { this.currentPassword = p; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String p) { this.newPassword = p; }
        public String getConfirmPassword() { return confirmPassword; }
        public void setConfirmPassword(String p) { this.confirmPassword = p; }
    }

    public static class SavePreferencesRequest {
        private String ageGroup;
        private String travelPreferences; // JSON array string
        public String getAgeGroup() { return ageGroup; }
        public void setAgeGroup(String a) { this.ageGroup = a; }
        public String getTravelPreferences() { return travelPreferences; }
        public void setTravelPreferences(String t) { this.travelPreferences = t; }
    }

    public static class DeleteAccountRequest {
        private String password;
        public String getPassword() { return password; }
        public void setPassword(String p) { this.password = p; }
    }
}
