package com.controller;

import com.model.*;
import com.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Destination reviews — Tourist only
 *
 * POST /api/reviews       — submit a review {destinationId, rating, reviewText?}
 * GET  /api/reviews/mine  — current user's submitted reviews
 */
@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    private final ReviewRepository          reviewRepo;
    private final TripRepository            tripRepo;
    private final TripDestinationRepository tripDestRepo;
    private final DestinationRepository     destRepo;
    private final UserRepository            userRepo;

    public ReviewController(ReviewRepository reviewRepo,
                            TripRepository tripRepo,
                            TripDestinationRepository tripDestRepo,
                            DestinationRepository destRepo,
                            UserRepository userRepo) {
        this.reviewRepo   = reviewRepo;
        this.tripRepo     = tripRepo;
        this.tripDestRepo = tripDestRepo;
        this.destRepo     = destRepo;
        this.userRepo     = userRepo;
    }

    // ── Helper ───────────────────────────────────────────────
    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── POST /api/reviews ────────────────────────────────────
    @PostMapping
    @Transactional
    public ResponseEntity<?> submitReview(@RequestBody Map<String, Object> body) {
        User user = currentUser();

        // Validate destinationId
        Object destIdObj = body.get("destinationId");
        if (destIdObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Destination is required"));
        }
        Integer destinationId;
        try { destinationId = Integer.valueOf(destIdObj.toString()); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid destination"));
        }

        // Validate rating
        Object ratingObj = body.get("rating");
        if (ratingObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rating is required"));
        }
        Integer rating;
        try { rating = Integer.valueOf(ratingObj.toString()); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid rating value"));
        }
        if (rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rating must be between 1 and 5"));
        }

        // Validate optional reviewText
        String reviewText = null;
        Object textObj = body.get("reviewText");
        if (textObj != null && !textObj.toString().isBlank()) {
            reviewText = textObj.toString().trim();
            if (reviewText.length() > 1000) {
                return ResponseEntity.badRequest().body(
                        Map.of("message", "Review text must be under 1000 characters"));
            }
        }

        // Destination must exist and be active
        Destination dest = destRepo.findById(destinationId).orElse(null);
        if (dest == null || !Boolean.TRUE.equals(dest.getIsActive())) {
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));
        }

        // Destination must be in at least one COMPLETED trip of this user
        List<Integer> completedTripIds = tripRepo
                .findByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .filter(t -> t.getStatus() == Trip.TripStatus.COMPLETED)
                .map(Trip::getTripId)
                .collect(Collectors.toList());

        if (completedTripIds.isEmpty()) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "You can only rate destinations from completed trips"));
        }

        boolean inCompletedTrip = completedTripIds.stream()
                .anyMatch(tid -> tripDestRepo.existsByTripIdAndDestinationId(tid, destinationId));

        if (!inCompletedTrip) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "You can only rate destinations from your completed trips"));
        }

        // Prevent duplicate review
        if (reviewRepo.existsByUserIdAndDestinationId(user.getUserId(), destinationId)) {
            return ResponseEntity.status(409).body(
                    Map.of("message", "You have already reviewed this destination"));
        }

        // Save review
        Review review = new Review();
        review.setUserId(user.getUserId());
        review.setDestinationId(destinationId);
        review.setRating(rating);
        review.setReviewText(reviewText);
        reviewRepo.save(review);

        // Recalculate destination average rating
        updateDestinationRating(dest);

        return ResponseEntity.status(201).body(Map.of("message", "Review submitted successfully"));
    }

    // ── GET /api/reviews/mine ────────────────────────────────
    @GetMapping("/mine")
    public ResponseEntity<?> getMyReviews() {
        User user = currentUser();
        List<Review> reviews = reviewRepo.findByUserIdOrderByCreatedAtDesc(user.getUserId());

        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("reviewId",      r.getReviewId());
            m.put("destinationId", r.getDestinationId());
            m.put("rating",        r.getRating());
            m.put("reviewText",    r.getReviewText() != null ? r.getReviewText() : "");
            m.put("createdAt",     r.getCreatedAt());
            destRepo.findById(r.getDestinationId()).ifPresent(d -> {
                m.put("destinationName", d.getName());
                m.put("destinationCity", d.getCity() != null ? d.getCity() : "");
            });
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── Recalculate average rating on Destination ─────────────
    private void updateDestinationRating(Destination dest) {
        List<Review> allReviews = reviewRepo.findByDestinationId(dest.getDestinationId());
        if (allReviews.isEmpty()) return;
        double avg = allReviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        dest.setAverageRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        dest.setTotalReviews(allReviews.size());
        destRepo.save(dest);
    }
}
