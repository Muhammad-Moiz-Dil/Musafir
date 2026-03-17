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

        // Prevent duplicate review
        if (reviewRepo.existsByUserIdAndDestinationId(user.getUserId(), destinationId)) {
            return ResponseEntity.status(409).body(
                    Map.of("message", "You have already reviewed this destination"));
        }

        // Check if verified: destination must be in a COMPLETED trip of this user
        List<Integer> completedTripIds = tripRepo
                .findByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .filter(t -> t.getStatus() == Trip.TripStatus.COMPLETED)
                .map(Trip::getTripId)
                .collect(Collectors.toList());

        boolean isVerified = !completedTripIds.isEmpty() && completedTripIds.stream()
                .anyMatch(tid -> tripDestRepo.existsByTripIdAndDestinationId(tid, destinationId));

        // Save review
        Review review = new Review();
        review.setUserId(user.getUserId());
        review.setDestinationId(destinationId);
        review.setRating(rating);
        review.setReviewText(reviewText);
        review.setVerified(isVerified);
        reviewRepo.save(review);

        // Recalculate destination average rating
        updateDestinationRating(dest);

        String label = isVerified ? "Verified review submitted!" : "General feedback submitted!";
        return ResponseEntity.status(201).body(Map.of("message", label, "verified", isVerified));
    }

    // ── GET /api/reviews/destination/{destId} ───────────────
    @GetMapping("/destination/{destId}")
    public ResponseEntity<?> getByDestination(@PathVariable Integer destId) {
        Destination dest = destRepo.findById(destId).orElse(null);
        if (dest == null || !Boolean.TRUE.equals(dest.getIsActive())) {
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));
        }

        List<Review> reviews = reviewRepo.findByDestinationId(destId);
        reviews.sort(Comparator.comparing(Review::getCreatedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));

        List<Map<String, Object>> result = reviews.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("reviewId",   r.getReviewId());
            m.put("rating",     r.getRating());
            m.put("reviewText", r.getReviewText() != null ? r.getReviewText() : "");
            m.put("verified",   Boolean.TRUE.equals(r.getVerified()));
            m.put("createdAt",  r.getCreatedAt());
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

    // ── Recalculate weighted average rating on Destination ────
    // Verified reviews have full weight (1.0), unverified have half weight (0.5)
    private void updateDestinationRating(Destination dest) {
        List<Review> allReviews = reviewRepo.findByDestinationId(dest.getDestinationId());
        if (allReviews.isEmpty()) return;

        double weightedSum  = 0.0;
        double totalWeight  = 0.0;
        for (Review r : allReviews) {
            double w = Boolean.TRUE.equals(r.getVerified()) ? 1.0 : 0.5;
            weightedSum += r.getRating() * w;
            totalWeight += w;
        }
        double avg = totalWeight > 0 ? weightedSum / totalWeight : 0.0;
        dest.setAverageRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        dest.setTotalReviews(allReviews.size());
        destRepo.save(dest);
    }
}
