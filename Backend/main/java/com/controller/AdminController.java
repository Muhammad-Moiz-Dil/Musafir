package com.controller;

import com.config.UploadUtils;
import com.model.*;
import com.repository.NotificationRepository;
import com.repository.*;
import java.math.BigDecimal;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin-only REST endpoints.
 * All methods verify ROLE_Admin before proceeding.
 *
 * Destinations : GET/POST /api/admin/destinations
 *                PUT       /api/admin/destinations/{id}
 *                PUT       /api/admin/destinations/{id}/toggle
 * Guidelines   : GET       /api/admin/guidelines?destId={id}
 *                POST      /api/admin/guidelines
 *                PUT       /api/admin/guidelines/{id}
 *                DELETE    /api/admin/guidelines/{id}
 * Emergency    : GET       /api/admin/emergency/{destId}
 *                PUT       /api/admin/emergency/{destId}
 * Settings     : GET       /api/admin/settings
 *                PUT       /api/admin/settings
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final DestinationRepository      destRepo;
    private final TravelGuidelineRepository  guidelineRepo;
    private final EmergencyInfoRepository    emergencyRepo;
    private final SystemSettingsRepository   settingsRepo;
    private final SouvenirRepository         souvenirRepo;
    private final UserRepository             userRepo;
    private final BookingRepository          bookingRepo;
    private final HotelRepository            hotelRepo;
    private final ActivityLogRepository      logRepo;
    private final ReviewRepository           reviewRepo;
    private final HotelReviewRepository      hotelReviewRepo;
    private final FlaggedContentRepository   flagRepo;
    private final NotificationRepository     notificationRepo;

    public AdminController(DestinationRepository destRepo,
                           TravelGuidelineRepository guidelineRepo,
                           EmergencyInfoRepository emergencyRepo,
                           SystemSettingsRepository settingsRepo,
                           SouvenirRepository souvenirRepo,
                           UserRepository userRepo,
                           BookingRepository bookingRepo,
                           HotelRepository hotelRepo,
                           ActivityLogRepository logRepo,
                           ReviewRepository reviewRepo,
                           HotelReviewRepository hotelReviewRepo,
                           FlaggedContentRepository flagRepo,
                           NotificationRepository notificationRepo) {
        this.destRepo            = destRepo;
        this.guidelineRepo       = guidelineRepo;
        this.emergencyRepo       = emergencyRepo;
        this.settingsRepo        = settingsRepo;
        this.souvenirRepo        = souvenirRepo;
        this.userRepo            = userRepo;
        this.bookingRepo         = bookingRepo;
        this.hotelRepo           = hotelRepo;
        this.logRepo             = logRepo;
        this.reviewRepo          = reviewRepo;
        this.hotelReviewRepo     = hotelReviewRepo;
        this.flagRepo            = flagRepo;
        this.notificationRepo    = notificationRepo;
    }

    // ─── helper ────────────────────────────────────────────────────────────────

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_Admin"));
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(403).body(Map.of("message", "Forbidden: Admin only"));
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString().trim() : null;
    }

    private Double dbl(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) return null;
        try { return Double.parseDouble(v.toString()); } catch (NumberFormatException e) { return null; }
    }

    private Map<String, Object> destToMap(Destination d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            d.getDestinationId());
        m.put("name",          d.getName());
        m.put("country",       d.getCountry()       != null ? d.getCountry()       : "Pakistan");
        m.put("city",          d.getCity()           != null ? d.getCity()          : "");
        m.put("description",   d.getDescription()    != null ? d.getDescription()   : "");
        m.put("imageUrl",      d.getImageUrl()       != null ? d.getImageUrl()      : "");
        m.put("latitude",      d.getLatitude()       != null ? d.getLatitude()      : 0.0);
        m.put("longitude",     d.getLongitude()      != null ? d.getLongitude()     : 0.0);
        m.put("averageRating", d.getAverageRating()  != null ? d.getAverageRating().doubleValue() : 0.0);
        m.put("totalReviews",  d.getTotalReviews()   != null ? d.getTotalReviews()  : 0);
        m.put("searchKeywords",d.getSearchKeywords() != null ? d.getSearchKeywords(): "");
        m.put("altitude",      d.getAltitude()       != null ? d.getAltitude()      : "");
        m.put("bestTime",      d.getBestTime()        != null ? d.getBestTime()      : "");
        m.put("budgetLevel",   d.getBudgetLevel()    != null ? d.getBudgetLevel()   : "");
        m.put("isActive",      Boolean.TRUE.equals(d.getIsActive()));
        return m;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS  (UC-19)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/statistics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
     * Both params are optional; defaults to last 6 complete months.
     */
    @GetMapping("/statistics")
    public ResponseEntity<?> getStatistics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            Authentication auth) {

        if (!isAdmin(auth)) return forbidden();

        // ── Date range ───────────────────────────────────────────────────────
        LocalDateTime rangeEnd, rangeStart;
        try {
            rangeEnd   = (endDate   != null) ? LocalDate.parse(endDate).atTime(23, 59, 59)
                                             : LocalDateTime.now();
            rangeStart = (startDate != null) ? LocalDate.parse(startDate).atStartOfDay()
                                             : rangeEnd.minusMonths(6).toLocalDate()
                                                       .withDayOfMonth(1).atStartOfDay();
        } catch (Exception e) {
            return ResponseEntity.status(400)
                    .body(Map.of("message", "Invalid date format — use YYYY-MM-DD"));
        }

        // ── Fetch raw data ───────────────────────────────────────────────────
        List<Booking>     bookings = bookingRepo.findByCreatedAtBetween(rangeStart, rangeEnd);
        List<User>        newUsers = userRepo.findByCreatedAtBetween(rangeStart, rangeEnd);
        List<User>        allUsers = userRepo.findAll();
        List<Hotel>       hotels   = hotelRepo.findAll();
        List<Destination> allDests = destRepo.findAll();

        // ── Build lookup maps ────────────────────────────────────────────────
        Map<Integer, Integer> hotelToDestId = new HashMap<>();
        for (Hotel h : hotels) hotelToDestId.put(h.getHotelId(), h.getDestinationId());

        Map<Integer, String> destIdToName = new HashMap<>();
        for (Destination d : allDests) destIdToName.put(d.getDestinationId(), d.getName());

        // ── Aggregate bookings ───────────────────────────────────────────────
        BigDecimal totalRevenue = BigDecimal.ZERO;
        Map<Integer, Long> destBookingCount = new LinkedHashMap<>();
        for (Booking b : bookings) {
            totalRevenue = totalRevenue.add(b.getTotalCost() != null ? b.getTotalCost() : BigDecimal.ZERO);
            Integer destId = hotelToDestId.get(b.getHotelId());
            if (destId != null) destBookingCount.merge(destId, 1L, Long::sum);
        }

        // ── Top 5 destinations by booking count ─────────────────────────────
        long maxCount = destBookingCount.values().stream().mapToLong(Long::longValue).max().orElse(1L);
        List<Map<String, Object>> topDests = destBookingCount.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("destinationId", e.getKey());
                    m.put("name",  destIdToName.getOrDefault(e.getKey(), "Unknown"));
                    m.put("count", e.getValue());
                    m.put("pct",   (int) Math.round((e.getValue() * 100.0) / maxCount));
                    return m;
                })
                .collect(Collectors.toList());

        // ── Monthly breakdown (6 months ending at rangeEnd) ─────────────────
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");
        List<Map<String, Object>> monthly = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDateTime mStart = rangeEnd.minusMonths(i).toLocalDate()
                                           .withDayOfMonth(1).atStartOfDay();
            LocalDateTime mEnd   = mStart.plusMonths(1).minusSeconds(1);
            String label = mStart.format(fmt);

            long      bCount  = bookings.stream()
                    .filter(b -> !b.getCreatedAt().isBefore(mStart) && !b.getCreatedAt().isAfter(mEnd))
                    .count();
            BigDecimal mRev   = bookings.stream()
                    .filter(b -> !b.getCreatedAt().isBefore(mStart) && !b.getCreatedAt().isAfter(mEnd))
                    .map(b -> b.getTotalCost() != null ? b.getTotalCost() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long      uCount  = newUsers.stream()
                    .filter(u -> u.getCreatedAt() != null
                            && !u.getCreatedAt().isBefore(mStart) && !u.getCreatedAt().isAfter(mEnd))
                    .count();

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month",    label);
            m.put("bookings", bCount);
            m.put("revenue",  mRev.longValue());
            m.put("users",    uCount);
            monthly.add(m);
        }

        // ── User breakdown ───────────────────────────────────────────────────
        long totalTourists = allUsers.stream().filter(u -> u.getUserType() == User.UserType.Tourist).count();
        long totalHMs      = allUsers.stream().filter(u -> u.getUserType() == User.UserType.HotelManager).count();

        // ── Build response ───────────────────────────────────────────────────
        boolean hasData = !bookings.isEmpty() || !newUsers.isEmpty();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hasData",        hasData);
        result.put("totalUsers",     allUsers.size());
        result.put("totalTourists",  totalTourists);
        result.put("totalHMs",       totalHMs);
        result.put("totalBookings",  bookings.size());
        result.put("totalRevenue",   totalRevenue.longValue());
        result.put("newUsersInRange",newUsers.size());
        result.put("topDestinations",topDests);
        result.put("monthly",        monthly);
        return ResponseEntity.ok(result);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER LIST  (UC-20)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/users
     * Returns all non-Admin users, newest first, with summary counts.
     */
    @GetMapping("/users")
    public ResponseEntity<?> listUsers(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        List<User> all = userRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        LocalDateTime monthStart = LocalDateTime.now().toLocalDate().withDayOfMonth(1).atStartOfDay();
        long tourists    = 0, hms = 0, newThisMonth = 0;
        List<Map<String, Object>> users = new ArrayList<>();

        for (User u : all) {
            if (u.getUserType() == User.UserType.Admin) continue;
            if (u.getUserType() == User.UserType.Tourist)      tourists++;
            if (u.getUserType() == User.UserType.HotelManager) hms++;
            if (u.getCreatedAt() != null && !u.getCreatedAt().isBefore(monthStart)) newThisMonth++;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",          u.getUserId());
            m.put("fullName",    u.getFullName());
            m.put("email",       u.getEmail());
            m.put("userType",    u.getUserType().name());
            m.put("phoneNumber", u.getPhoneNumber() != null ? u.getPhoneNumber() : "—");
            m.put("isActive",    Boolean.TRUE.equals(u.getIsActive()));
            m.put("createdAt",   u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
            users.add(m);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("users",         users);
        result.put("total",         users.size());
        result.put("tourists",      tourists);
        result.put("hotelManagers", hms);
        result.put("newThisMonth",  newThisMonth);
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/admin/users/{id}
     * Permanently deletes a non-admin user account.
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Integer id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        Optional<User> opt = userRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        User target = opt.get();
        if (target.getUserType() == User.UserType.Admin)
            return ResponseEntity.status(403).body(Map.of("message", "Cannot delete an admin account"));
        userRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIVITY LOGS  (UC-20)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/logs?userId=&action=
     * userId and action are both optional substring/exact filters.
     * Returns up to 100 most-recent matching entries with resolved user names.
     */
    @GetMapping("/logs")
    public ResponseEntity<?> getLogs(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String  action,
            Authentication auth) {

        if (!isAdmin(auth)) return forbidden();

        List<ActivityLog> logs;
        boolean hasAction = action != null && !action.isBlank();

        if (userId != null && hasAction) {
            logs = logRepo.findByUserIdAndActionContainingIgnoreCaseOrderByCreatedAtDesc(userId, action.trim());
        } else if (userId != null) {
            logs = logRepo.findByUserIdOrderByCreatedAtDesc(userId);
        } else if (hasAction) {
            logs = logRepo.findByActionContainingIgnoreCaseOrderByCreatedAtDesc(action.trim());
        } else {
            logs = logRepo.findTop100ByOrderByCreatedAtDesc();
        }

        // Build userId → name lookup (only for ids present in result)
        Map<Integer, String> nameCache = new HashMap<>();
        for (ActivityLog lg : logs) {
            if (lg.getUserId() != null && !nameCache.containsKey(lg.getUserId())) {
                userRepo.findById(lg.getUserId())
                        .ifPresent(u -> nameCache.put(lg.getUserId(), u.getFullName()));
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (ActivityLog lg : logs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("logId",     lg.getLogId());
            m.put("userId",    lg.getUserId());
            m.put("userName",  lg.getUserId() != null
                               ? nameCache.getOrDefault(lg.getUserId(), "Unknown")
                               : "—");
            m.put("action",    lg.getAction());
            m.put("ipAddress", lg.getIpAddress() != null ? lg.getIpAddress() : "—");
            m.put("createdAt", lg.getCreatedAt() != null ? lg.getCreatedAt().toString() : null);
            rows.add(m);
        }

        return ResponseEntity.ok(Map.of("logs", rows, "total", rows.size()));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REVIEWS (admin view — all destination + hotel reviews)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/admin/reviews
     * Returns all destination and hotel reviews combined, newest first.
     * Each row indicates whether it has already been flagged.
     */
    @GetMapping("/reviews")
    public ResponseEntity<?> getAllReviews(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        List<Map<String, Object>> rows = new ArrayList<>();

        // ── Destination reviews ────────────────────────────────
        for (Review r : reviewRepo.findAllByOrderByCreatedAtDesc()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type",       "REVIEW");
            m.put("id",         r.getReviewId());
            m.put("userId",     r.getUserId());
            m.put("userName",   userRepo.findById(r.getUserId())
                                        .map(User::getFullName).orElse("Unknown"));
            m.put("targetName", destRepo.findById(r.getDestinationId())
                                        .map(Destination::getName).orElse("Unknown Destination"));
            m.put("rating",     r.getRating());
            m.put("text",       r.getReviewText() != null ? r.getReviewText() : "");
            m.put("createdAt",  r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
            m.put("flagged",    flagRepo.existsByContentTypeAndContentId("REVIEW", r.getReviewId()));
            rows.add(m);
        }

        // ── Hotel reviews ──────────────────────────────────────
        for (HotelReview r : hotelReviewRepo.findAllByOrderByCreatedAtDesc()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type",       "HOTEL_REVIEW");
            m.put("id",         r.getHotelReviewId());
            m.put("userId",     r.getUserId());
            m.put("userName",   userRepo.findById(r.getUserId())
                                        .map(User::getFullName).orElse("Unknown"));
            m.put("targetName", hotelRepo.findById(r.getHotelId())
                                         .map(Hotel::getHotelName).orElse("Unknown Hotel"));
            m.put("rating",     r.getRating());
            m.put("text",       r.getComment() != null ? r.getComment() : "");
            m.put("createdAt",  r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
            m.put("flagged",    flagRepo.existsByContentTypeAndContentId("HOTEL_REVIEW", r.getHotelReviewId()));
            rows.add(m);
        }

        // Sort combined list newest first
        rows.sort((a, b) -> {
            String ca = (String) a.get("createdAt");
            String cb = (String) b.get("createdAt");
            if (ca == null && cb == null) return 0;
            if (ca == null) return 1;
            if (cb == null) return -1;
            return cb.compareTo(ca);
        });

        return ResponseEntity.ok(Map.of("reviews", rows, "total", rows.size()));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FLAG CONTENT  (UC-21)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/admin/flag
     * Body: { contentType: "LOG"|"REVIEW"|"HOTEL_REVIEW", contentId: 123, reason?: "…" }
     * Admin flags a log entry or a review for moderation review.
     */
    @PostMapping("/flag")
    public ResponseEntity<?> flagContent(@RequestBody Map<String, Object> body,
                                         Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        String  contentType = str(body, "contentType");
        Object  cidObj      = body.get("contentId");

        if (contentType == null || cidObj == null)
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "contentType and contentId are required"));

        Integer contentId;
        try { contentId = Integer.valueOf(cidObj.toString()); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid contentId"));
        }

        if (flagRepo.existsByContentTypeAndContentId(contentType, contentId))
            return ResponseEntity.status(409).body(Map.of("message", "Already flagged"));

        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        if (admin == null) return forbidden();

        FlaggedContent flag = new FlaggedContent();
        flag.setContentType(contentType);
        flag.setContentId(contentId);
        flag.setReportedBy(admin.getUserId());
        flag.setReason(str(body, "reason"));
        flag.setStatus(FlaggedContent.FlagStatus.Pending);
        flagRepo.save(flag);

        return ResponseEntity.status(201).body(Map.of(
                "message", "Flagged successfully",
                "flagId",  flag.getFlagId()));
    }

    /**
     * GET /api/admin/flags/count
     * Returns the count of Pending flagged content for the sidebar badge.
     */
    @GetMapping("/flags/count")
    public ResponseEntity<?> getFlagsCount(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        long count = flagRepo.countByStatus(FlaggedContent.FlagStatus.Pending);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * GET /api/admin/flags
     * Returns all Pending flagged content entries with content previews.
     */
    @GetMapping("/flags")
    public ResponseEntity<?> getFlags(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        List<FlaggedContent> flags = flagRepo.findByStatusOrderByCreatedAtDesc(FlaggedContent.FlagStatus.Pending);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (FlaggedContent f : flags) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("flagId",      f.getFlagId());
            m.put("contentType", f.getContentType());
            m.put("contentId",   f.getContentId());
            m.put("reason",      f.getReason() != null ? f.getReason() : "");
            m.put("status",      f.getStatus().name());
            m.put("createdAt",   f.getCreatedAt() != null ? f.getCreatedAt().toString() : null);

            // Resolve reporter name
            userRepo.findById(f.getReportedBy())
                    .ifPresent(u -> m.put("reportedByName", u.getFullName()));
            m.putIfAbsent("reportedByName", "Admin");

            // Resolve content preview + target name
            switch (f.getContentType()) {
                case "REVIEW" -> reviewRepo.findById(f.getContentId()).ifPresent(r -> {
                    m.put("preview",    r.getReviewText() != null ? r.getReviewText() : "");
                    m.put("targetName", destRepo.findById(r.getDestinationId())
                                                .map(Destination::getName).orElse("Unknown"));
                    m.put("userId",     r.getUserId());
                    userRepo.findById(r.getUserId())
                            .ifPresent(u -> m.put("userName", u.getFullName()));
                });
                case "HOTEL_REVIEW" -> hotelReviewRepo.findById(f.getContentId()).ifPresent(r -> {
                    m.put("preview",    r.getComment() != null ? r.getComment() : "");
                    m.put("targetName", hotelRepo.findById(r.getHotelId())
                                                 .map(Hotel::getHotelName).orElse("Unknown"));
                    m.put("userId",     r.getUserId());
                    userRepo.findById(r.getUserId())
                            .ifPresent(u -> m.put("userName", u.getFullName()));
                });
                case "LOG" -> logRepo.findById(f.getContentId()).ifPresent(lg -> {
                    m.put("preview",    lg.getAction());
                    m.put("targetName", "Activity Log #" + lg.getLogId());
                    m.put("userId",     lg.getUserId());
                    if (lg.getUserId() != null)
                        userRepo.findById(lg.getUserId())
                                .ifPresent(u -> m.put("userName", u.getFullName()));
                });
            }
            m.putIfAbsent("preview",    "");
            m.putIfAbsent("targetName", "Unknown");
            m.putIfAbsent("userName",   "Unknown");
            rows.add(m);
        }

        return ResponseEntity.ok(Map.of("flags", rows, "total", rows.size()));
    }

    /**
     * PUT /api/admin/flags/{id}/dismiss
     * Marks the flag as Reviewed (content stays, flag dismissed).
     */
    @PutMapping("/flags/{id}/dismiss")
    public ResponseEntity<?> dismissFlag(@PathVariable Integer id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        FlaggedContent flag = flagRepo.findById(id).orElse(null);
        if (flag == null) return ResponseEntity.status(404).body(Map.of("message", "Flag not found"));

        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        flag.setStatus(FlaggedContent.FlagStatus.Reviewed);
        if (admin != null) flag.setReviewedBy(admin.getUserId());
        flag.setResolvedAt(java.time.LocalDateTime.now());
        flagRepo.save(flag);

        return ResponseEntity.ok(Map.of("message", "Flag dismissed"));
    }

    /**
     * PUT /api/admin/flags/{id}/resolve
     * Marks the flag as Resolved (content actioned — deleted if it's a review).
     */
    @PutMapping("/flags/{id}/resolve")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> resolveFlag(@PathVariable Integer id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        FlaggedContent flag = flagRepo.findById(id).orElse(null);
        if (flag == null) return ResponseEntity.status(404).body(Map.of("message", "Flag not found"));

        User admin = userRepo.findByEmail(auth.getName()).orElse(null);

        // Delete the actual content
        switch (flag.getContentType()) {
            case "REVIEW"       -> reviewRepo.deleteById(flag.getContentId());
            case "HOTEL_REVIEW" -> hotelReviewRepo.deleteById(flag.getContentId());
            // LOG entries are kept — just mark flag resolved
        }

        flag.setStatus(FlaggedContent.FlagStatus.Resolved);
        if (admin != null) flag.setReviewedBy(admin.getUserId());
        flag.setResolvedAt(java.time.LocalDateTime.now());
        flagRepo.save(flag);

        return ResponseEntity.ok(Map.of("message", "Content removed and flag resolved"));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DESTINATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /** GET /api/admin/destinations — all destinations including inactive */
    @GetMapping("/destinations")
    public ResponseEntity<?> getAllDestinations(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        List<Map<String, Object>> data = destRepo.findAllByOrderByNameAsc()
                .stream().map(this::destToMap).collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }

    /** POST /api/admin/destinations — create new destination */
    @PostMapping("/destinations")
    public ResponseEntity<?> createDestination(@RequestBody Map<String, Object> body,
                                               Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        String name = str(body, "name");
        if (name == null || name.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("message", "Destination name is required"));
        }

        Destination d = new Destination();
        d.setName(name);
        d.setCountry(str(body, "country") != null ? str(body, "country") : "Pakistan");
        d.setCity(str(body, "city"));
        d.setDescription(str(body, "description"));
        d.setImageUrl(str(body, "imageUrl"));
        d.setLatitude(dbl(body, "latitude"));
        d.setLongitude(dbl(body, "longitude"));
        d.setSearchKeywords(str(body, "searchKeywords"));
        d.setAltitude(str(body, "altitude"));
        d.setBestTime(str(body, "bestTime"));
        d.setBudgetLevel(str(body, "budgetLevel"));
        d.setIsActive(true);

        Destination saved = destRepo.save(d);
        return ResponseEntity.status(201).body(destToMap(saved));
    }

    /** PUT /api/admin/destinations/{id} — update destination details */
    @PutMapping("/destinations/{id}")
    public ResponseEntity<?> updateDestination(@PathVariable Integer id,
                                               @RequestBody Map<String, Object> body,
                                               Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Optional<Destination> opt = destRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        Destination d = opt.get();
        if (str(body, "name")          != null) d.setName(str(body, "name"));
        if (str(body, "country")       != null) d.setCountry(str(body, "country"));
        if (str(body, "city")          != null) d.setCity(str(body, "city"));
        if (str(body, "description")   != null) d.setDescription(str(body, "description"));
        if (str(body, "imageUrl")      != null) d.setImageUrl(str(body, "imageUrl"));
        if (dbl(body, "latitude")      != null) d.setLatitude(dbl(body, "latitude"));
        if (dbl(body, "longitude")     != null) d.setLongitude(dbl(body, "longitude"));
        if (str(body, "searchKeywords")!= null) d.setSearchKeywords(str(body, "searchKeywords"));
        if (body.containsKey("altitude"))    d.setAltitude(str(body, "altitude"));
        if (body.containsKey("bestTime"))    d.setBestTime(str(body, "bestTime"));
        if (body.containsKey("budgetLevel")) d.setBudgetLevel(str(body, "budgetLevel"));

        return ResponseEntity.ok(destToMap(destRepo.save(d)));
    }

    /** PUT /api/admin/destinations/{id}/toggle — flip is_active */
    @PutMapping("/destinations/{id}/toggle")
    public ResponseEntity<?> toggleDestination(@PathVariable Integer id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Optional<Destination> opt = destRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        Destination d = opt.get();
        d.setIsActive(!Boolean.TRUE.equals(d.getIsActive()));
        return ResponseEntity.ok(destToMap(destRepo.save(d)));
    }

    /** POST /api/admin/destinations/upload-image — upload destination image */
    @PostMapping("/destinations/upload-image")
    public ResponseEntity<?> uploadDestinationImage(@RequestParam("file") MultipartFile file,
                                                    Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        if (file.isEmpty()) return ResponseEntity.status(400).body(Map.of("message", "No file provided"));

        String original = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image");
        String ext      = original.contains(".") ? original.substring(original.lastIndexOf(".")) : ".jpg";
        String filename = "dest_" + System.currentTimeMillis() + ext;

        try {
            Path dir = UploadUtils.resolve("destinations");
            Files.createDirectories(dir);
            file.transferTo(dir.resolve(filename).toFile());
            return ResponseEntity.ok(Map.of("imageUrl", "/uploads/destinations/" + filename));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to save image"));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRAVEL GUIDELINES (Admin CRUD)
    // ═══════════════════════════════════════════════════════════════════════════

    /** GET /api/admin/guidelines?destId={id} */
    @GetMapping("/guidelines")
    public ResponseEntity<?> getGuidelines(@RequestParam Integer destId, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        if (destRepo.findById(destId).isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));
        }

        List<Map<String, Object>> data = guidelineRepo
                .findByDestinationIdOrderByCategoryAscTitleAsc(destId)
                .stream().map(g -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",       g.getGuidelineId());
                    m.put("destId",   g.getDestinationId());
                    m.put("title",    g.getTitle()    != null ? g.getTitle()    : "");
                    m.put("content",  g.getContent()  != null ? g.getContent()  : "");
                    m.put("category", g.getCategory() != null ? g.getCategory() : "General");
                    return m;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }

    /** POST /api/admin/guidelines — add a guideline */
    @PostMapping("/guidelines")
    public ResponseEntity<?> addGuideline(@RequestBody Map<String, Object> body, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Object destIdObj = body.get("destId");
        if (destIdObj == null) return ResponseEntity.status(400).body(Map.of("message", "destId is required"));
        Integer destId = Integer.parseInt(destIdObj.toString());

        if (destRepo.findById(destId).isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));
        }

        String title = str(body, "title");
        if (title == null || title.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("message", "title is required"));
        }

        TravelGuideline g = new TravelGuideline();
        g.setDestinationId(destId);
        g.setTitle(title);
        g.setContent(str(body, "content") != null ? str(body, "content") : "");
        g.setCategory(str(body, "category") != null ? str(body, "category") : "General");
        g.setCreatedAt(LocalDateTime.now());
        g.setUpdatedAt(LocalDateTime.now());

        TravelGuideline saved = guidelineRepo.save(g);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id",       saved.getGuidelineId());
        result.put("destId",   saved.getDestinationId());
        result.put("title",    saved.getTitle());
        result.put("content",  saved.getContent());
        result.put("category", saved.getCategory());
        return ResponseEntity.status(201).body(result);
    }

    /** PUT /api/admin/guidelines/{id} — update a guideline */
    @PutMapping("/guidelines/{id}")
    public ResponseEntity<?> updateGuideline(@PathVariable Integer id,
                                             @RequestBody Map<String, Object> body,
                                             Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Optional<TravelGuideline> opt = guidelineRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Guideline not found"));

        TravelGuideline g = opt.get();
        if (str(body, "title")    != null) g.setTitle(str(body, "title"));
        if (str(body, "content")  != null) g.setContent(str(body, "content"));
        if (str(body, "category") != null) g.setCategory(str(body, "category"));
        g.setUpdatedAt(LocalDateTime.now());

        TravelGuideline saved = guidelineRepo.save(g);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id",       saved.getGuidelineId());
        result.put("destId",   saved.getDestinationId());
        result.put("title",    saved.getTitle());
        result.put("content",  saved.getContent());
        result.put("category", saved.getCategory());
        return ResponseEntity.ok(result);
    }

    /** DELETE /api/admin/guidelines/{id} */
    @DeleteMapping("/guidelines/{id}")
    public ResponseEntity<?> deleteGuideline(@PathVariable Integer id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        if (guidelineRepo.findById(id).isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Guideline not found"));
        }
        guidelineRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Guideline deleted"));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EMERGENCY CONTACTS (Admin upsert)
    // ═══════════════════════════════════════════════════════════════════════════

    /** GET /api/admin/emergency/{destId} — get emergency info for a destination */
    @GetMapping("/emergency/{destId}")
    public ResponseEntity<?> getEmergency(@PathVariable Integer destId, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Optional<Destination> destOpt = destRepo.findById(destId);
        if (destOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("destinationId",   destOpt.get().getDestinationId());
        result.put("destinationName", destOpt.get().getName());

        Optional<EmergencyInfo> infoOpt = emergencyRepo.findByDestination_DestinationId(destId);
        if (infoOpt.isPresent()) {
            EmergencyInfo e = infoOpt.get();
            result.put("policeNumber",      e.getPoliceNumber()      != null ? e.getPoliceNumber()      : "");
            result.put("ambulanceNumber",   e.getAmbulanceNumber()   != null ? e.getAmbulanceNumber()   : "");
            result.put("fireServiceNumber", e.getFireServiceNumber() != null ? e.getFireServiceNumber() : "");
            result.put("touristHelpline",   e.getTouristHelpline()   != null ? e.getTouristHelpline()   : "");
            result.put("nearestHospital",   e.getNearestHospital()   != null ? e.getNearestHospital()   : "");
            result.put("embassyContact",    e.getEmbassyContact()    != null ? e.getEmbassyContact()    : "");
            result.put("covidRules",        e.getCovidRules()        != null ? e.getCovidRules()        : "");
        } else {
            result.put("policeNumber",      "");
            result.put("ambulanceNumber",   "");
            result.put("fireServiceNumber", "");
            result.put("touristHelpline",   "");
            result.put("nearestHospital",   "");
            result.put("embassyContact",    "");
            result.put("covidRules",        "");
        }
        return ResponseEntity.ok(result);
    }

    /** PUT /api/admin/emergency/{destId} — upsert emergency contacts */
    @PutMapping("/emergency/{destId}")
    public ResponseEntity<?> upsertEmergency(@PathVariable Integer destId,
                                             @RequestBody Map<String, Object> body,
                                             Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Optional<Destination> destOpt = destRepo.findById(destId);
        if (destOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        EmergencyInfo info = emergencyRepo.findByDestination_DestinationId(destId)
                .orElse(new EmergencyInfo());

        info.setDestination(destOpt.get());
        if (str(body, "policeNumber")      != null) info.setPoliceNumber(str(body, "policeNumber"));
        if (str(body, "ambulanceNumber")   != null) info.setAmbulanceNumber(str(body, "ambulanceNumber"));
        if (str(body, "fireServiceNumber") != null) info.setFireServiceNumber(str(body, "fireServiceNumber"));
        if (str(body, "touristHelpline")   != null) info.setTouristHelpline(str(body, "touristHelpline"));
        if (str(body, "nearestHospital")   != null) info.setNearestHospital(str(body, "nearestHospital"));
        if (str(body, "embassyContact")    != null) info.setEmbassyContact(str(body, "embassyContact"));
        if (str(body, "covidRules")        != null) info.setCovidRules(str(body, "covidRules"));

        EmergencyInfo saved = emergencyRepo.save(info);
        return ResponseEntity.ok(Map.of(
            "message",       "Emergency contacts updated",
            "destinationId", destId,
            "emergencyId",   saved.getEmergencyId()
        ));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SYSTEM SETTINGS
    // ═══════════════════════════════════════════════════════════════════════════

    /** GET /api/admin/settings — all settings */
    @GetMapping("/settings")
    public ResponseEntity<?> getSettings(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        List<Map<String, Object>> data = settingsRepo.findAll()
                .stream().map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",          s.getSettingId());
                    m.put("key",         s.getSettingKey());
                    m.put("value",       s.getSettingValue());
                    m.put("description", s.getDescription() != null ? s.getDescription() : "");
                    return m;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }

    /**
     * PUT /api/admin/settings
     * Body: [{"key":"BASE_TRAVEL_COST_PER_DAY","value":"6000"}, ...]
     * Updates each setting by key; skips unknown keys.
     */
    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody List<Map<String, Object>> updates,
                                            Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        if (updates == null || updates.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("message", "No settings provided"));
        }

        List<String> updated = new ArrayList<>();
        for (Map<String, Object> entry : updates) {
            String key   = str(entry, "key");
            String value = str(entry, "value");
            if (key == null || value == null) continue;

            Optional<SystemSettings> opt = settingsRepo.findBySettingKey(key);
            if (opt.isPresent()) {
                SystemSettings s = opt.get();
                s.setSettingValue(value);
                settingsRepo.save(s);
                updated.add(key);
            }
            // Silently ignore unknown keys — we don't create arbitrary settings from the frontend
        }

        return ResponseEntity.ok(Map.of(
            "message", "Settings updated",
            "updated", updated
        ));
    }

    // ─── Danger Zone ───────────────────────────────────────────────────────────

    /**
     * DELETE /api/admin/notifications/clear
     * Permanently deletes all notifications from the database.
     */
    @DeleteMapping("/notifications/clear")
    public ResponseEntity<?> clearAllNotifications(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        long count = notificationRepo.count();
        notificationRepo.deleteAll();
        return ResponseEntity.ok(Map.of("message", "All notifications cleared", "deleted", count));
    }

    /**
     * DELETE /api/admin/logs/purge
     * Deletes activity log entries older than 90 days.
     */
    @DeleteMapping("/logs/purge")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> purgeOldLogs(Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
        int deleted = logRepo.deleteByCreatedAtBefore(cutoff);
        return ResponseEntity.ok(Map.of("message", "Old logs purged", "deleted", deleted));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SOUVENIRS (Admin CRUD)
    // ═══════════════════════════════════════════════════════════════════════════

    private Map<String, Object> souvenirToMap(Souvenir s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          s.getSouvenirId());
        m.put("destId",      s.getDestination().getDestinationId());
        m.put("name",        s.getName()        != null ? s.getName()        : "");
        m.put("description", s.getDescription() != null ? s.getDescription() : "");
        m.put("price",       s.getPrice()       != null ? s.getPrice()       : BigDecimal.ZERO);
        m.put("imageUrl",    s.getImageUrl()    != null ? s.getImageUrl()    : "");
        m.put("vendorName",  s.getVendorName()  != null ? s.getVendorName()  : "");
        m.put("isActive",    Boolean.TRUE.equals(s.getIsActive()));
        return m;
    }

    /** POST /api/admin/souvenirs/upload-image — upload souvenir image */
    @PostMapping("/souvenirs/upload-image")
    public ResponseEntity<?> uploadSouvenirImage(@RequestParam("file") MultipartFile file,
                                                 Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        if (file.isEmpty()) return ResponseEntity.status(400).body(Map.of("message", "No file provided"));

        String original = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image");
        String ext      = original.contains(".") ? original.substring(original.lastIndexOf(".")) : ".jpg";
        String filename = "souv_" + System.currentTimeMillis() + ext;

        try {
            Path dir = UploadUtils.resolve("souvenirs");
            Files.createDirectories(dir);
            file.transferTo(dir.resolve(filename).toFile());
            return ResponseEntity.ok(Map.of("imageUrl", "/uploads/souvenirs/" + filename));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to save image"));
        }
    }

    /** GET /api/admin/souvenirs?destId={id} — all souvenirs (incl inactive) for a destination */
    @GetMapping("/souvenirs")
    public ResponseEntity<?> getSouvenirs(@RequestParam Integer destId, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        if (destRepo.findById(destId).isEmpty())
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        List<Map<String, Object>> data = souvenirRepo
                .findByDestination_DestinationIdOrderByNameAsc(destId)
                .stream().map(this::souvenirToMap).collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }

    /** POST /api/admin/souvenirs — create souvenir */
    @PostMapping("/souvenirs")
    public ResponseEntity<?> addSouvenir(@RequestBody Map<String, Object> body, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Object destIdObj = body.get("destId");
        if (destIdObj == null) return ResponseEntity.status(400).body(Map.of("message", "destId is required"));
        Integer destId = Integer.parseInt(destIdObj.toString());

        Optional<Destination> destOpt = destRepo.findById(destId);
        if (destOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        String name = str(body, "name");
        if (name == null || name.isEmpty())
            return ResponseEntity.status(400).body(Map.of("message", "name is required"));

        Souvenir s = new Souvenir();
        s.setDestination(destOpt.get());
        s.setName(name);
        s.setDescription(str(body, "description"));
        s.setVendorName(str(body, "vendorName"));
        s.setImageUrl(str(body, "imageUrl"));
        s.setIsActive(true);

        Object priceObj = body.get("price");
        if (priceObj != null && !priceObj.toString().isBlank()) {
            try { s.setPrice(new BigDecimal(priceObj.toString())); } catch (Exception ignored) {}
        }

        return ResponseEntity.status(201).body(souvenirToMap(souvenirRepo.save(s)));
    }

    /** PUT /api/admin/souvenirs/{id} — update souvenir */
    @PutMapping("/souvenirs/{id}")
    public ResponseEntity<?> updateSouvenir(@PathVariable Integer id,
                                            @RequestBody Map<String, Object> body,
                                            Authentication auth) {
        if (!isAdmin(auth)) return forbidden();

        Optional<Souvenir> opt = souvenirRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Souvenir not found"));

        Souvenir s = opt.get();
        if (str(body, "name")        != null) s.setName(str(body, "name"));
        if (str(body, "description") != null) s.setDescription(str(body, "description"));
        if (str(body, "vendorName")  != null) s.setVendorName(str(body, "vendorName"));
        if (str(body, "imageUrl")    != null) s.setImageUrl(str(body, "imageUrl"));

        Object priceObj = body.get("price");
        if (priceObj != null && !priceObj.toString().isBlank()) {
            try { s.setPrice(new BigDecimal(priceObj.toString())); } catch (Exception ignored) {}
        }

        Object activeObj = body.get("isActive");
        if (activeObj != null) s.setIsActive(Boolean.parseBoolean(activeObj.toString()));

        return ResponseEntity.ok(souvenirToMap(souvenirRepo.save(s)));
    }

    /** DELETE /api/admin/souvenirs/{id} — delete souvenir */
    @DeleteMapping("/souvenirs/{id}")
    public ResponseEntity<?> deleteSouvenir(@PathVariable Integer id, Authentication auth) {
        if (!isAdmin(auth)) return forbidden();
        if (souvenirRepo.findById(id).isEmpty())
            return ResponseEntity.status(404).body(Map.of("message", "Souvenir not found"));
        souvenirRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Souvenir deleted"));
    }
}
