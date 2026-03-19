package com.controller;

import com.model.*;
import com.repository.*;
import com.service.ActivityLogService;
import com.service.SettingsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Hotel reviews
 *
 * POST /api/hotel-reviews              — tourist submits {hotelId, rating, comment?}
 * GET  /api/hotel-reviews/hotel/{id}   — all reviews for a hotel
 * GET  /api/hotel-reviews/mine         — current user's hotel reviews
 */
@RestController
@RequestMapping("/api/hotel-reviews")
@CrossOrigin(origins = "*")
public class HotelReviewController {

    private final HotelReviewRepository hotelReviewRepo;
    private final HotelRepository       hotelRepo;
    private final BookingRepository     bookingRepo;
    private final UserRepository        userRepo;
    private final ActivityLogService    logService;
    private final SettingsService       settingsService;

    public HotelReviewController(HotelReviewRepository hotelReviewRepo,
                                 HotelRepository hotelRepo,
                                 BookingRepository bookingRepo,
                                 UserRepository userRepo,
                                 ActivityLogService logService,
                                 SettingsService settingsService) {
        this.hotelReviewRepo  = hotelReviewRepo;
        this.hotelRepo        = hotelRepo;
        this.bookingRepo      = bookingRepo;
        this.userRepo         = userRepo;
        this.logService       = logService;
        this.settingsService  = settingsService;
    }

    // ── Helper ───────────────────────────────────────────────
    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── POST /api/hotel-reviews ──────────────────────────────
    @PostMapping
    @Transactional
    public ResponseEntity<?> submitReview(@RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        if (!settingsService.isEnabled("FEATURE_REVIEWS"))
            return ResponseEntity.status(503).body(Map.of("message", "Review system is currently disabled."));

        User user = currentUser();

        Object hotelIdObj = body.get("hotelId");
        if (hotelIdObj == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Hotel is required"));
        Integer hotelId;
        try { hotelId = Integer.valueOf(hotelIdObj.toString()); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid hotel"));
        }

        Object ratingObj = body.get("rating");
        if (ratingObj == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Rating is required"));
        Integer rating;
        try { rating = Integer.valueOf(ratingObj.toString()); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid rating"));
        }
        if (rating < 1 || rating > 5)
            return ResponseEntity.badRequest().body(Map.of("message", "Rating must be between 1 and 5"));

        String comment = null;
        Object commentObj = body.get("comment");
        if (commentObj != null && !commentObj.toString().isBlank()) {
            comment = commentObj.toString().trim();
            if (comment.length() > 1000)
                return ResponseEntity.badRequest().body(Map.of("message", "Comment must be under 1000 characters"));
        }

        Hotel hotel = hotelRepo.findById(hotelId).orElse(null);
        if (hotel == null || !Boolean.TRUE.equals(hotel.getIsActive()))
            return ResponseEntity.status(404).body(Map.of("message", "Hotel not found"));

        if (hotelReviewRepo.existsByUserIdAndHotelId(user.getUserId(), hotelId))
            return ResponseEntity.status(409).body(
                    Map.of("message", "You have already reviewed this hotel"));

        // Verified = has a Confirmed or Completed booking → store booking_id
        List<Booking> verifiedBookings = bookingRepo.findByUserIdAndHotelIdAndBookingStatusIn(
                user.getUserId(), hotelId,
                List.of(Booking.BookingStatus.Confirmed, Booking.BookingStatus.Completed));

        HotelReview review = new HotelReview();
        review.setUserId(user.getUserId());
        review.setHotelId(hotelId);
        review.setRating(rating);
        review.setComment(comment);
        if (!verifiedBookings.isEmpty()) {
            review.setBookingId(verifiedBookings.get(0).getBookingId());
        }
        hotelReviewRepo.save(review);
        logService.log(user.getUserId(), "HOTEL_REVIEW_SUBMITTED", request);

        updateHotelRating(hotel);

        boolean verified = !verifiedBookings.isEmpty();
        String label = verified ? "Verified review submitted!" : "Review submitted!";
        return ResponseEntity.status(201).body(Map.of("message", label, "verified", verified));
    }

    // ── GET /api/hotel-reviews/hotel/{hotelId} ───────────────
    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<?> getByHotel(@PathVariable Integer hotelId) {
        Hotel hotel = hotelRepo.findById(hotelId).orElse(null);
        if (hotel == null || !Boolean.TRUE.equals(hotel.getIsActive()))
            return ResponseEntity.status(404).body(Map.of("message", "Hotel not found"));

        List<HotelReview> reviews = hotelReviewRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);

        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("reviewId",  r.getHotelReviewId());
            m.put("rating",    r.getRating());
            m.put("comment",   r.getComment() != null ? r.getComment() : "");
            m.put("verified",  r.getBookingId() != null);
            m.put("createdAt", r.getCreatedAt());
            userRepo.findById(r.getUserId()).ifPresent(u -> {
                String name = u.getFullName();
                if (name != null && !name.isBlank()) {
                    String[] parts = name.trim().split("\\s+");
                    String display = parts[0];
                    if (parts.length > 1) display += " " + parts[parts.length - 1].charAt(0) + ".";
                    m.put("reviewerName", display);
                } else {
                    m.put("reviewerName", "Anonymous");
                }
            });
            if (!m.containsKey("reviewerName")) m.put("reviewerName", "Anonymous");
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── GET /api/hotel-reviews/mine ──────────────────────────
    @GetMapping("/mine")
    public ResponseEntity<?> getMyReviews() {
        User user = currentUser();
        List<HotelReview> reviews = hotelReviewRepo.findByUserIdOrderByCreatedAtDesc(user.getUserId());

        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("reviewId",  r.getHotelReviewId());
            m.put("hotelId",   r.getHotelId());
            m.put("rating",    r.getRating());
            m.put("comment",   r.getComment() != null ? r.getComment() : "");
            m.put("verified",  r.getBookingId() != null);
            m.put("createdAt", r.getCreatedAt());
            hotelRepo.findById(r.getHotelId()).ifPresent(h ->
                    m.put("hotelName", h.getHotelName()));
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── Recalculate hotel average rating ─────────────────────
    private void updateHotelRating(Hotel hotel) {
        List<HotelReview> all = hotelReviewRepo.findByHotelIdOrderByCreatedAtDesc(hotel.getHotelId());
        if (all.isEmpty()) {
            hotel.setAverageRating(null);
            hotel.setTotalReviews(0);
        } else {
            double avg = all.stream().mapToInt(HotelReview::getRating).average().orElse(0);
            hotel.setAverageRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            hotel.setTotalReviews(all.size());
        }
        hotelRepo.save(hotel);
    }
}
