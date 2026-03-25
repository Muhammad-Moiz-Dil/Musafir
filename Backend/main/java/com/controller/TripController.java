package com.controller;

import com.model.*;
import com.repository.*;
import com.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Trip management — Tourist only
 *
 * GET    /api/trips                                  — list user's trips (with destinations + review status)
 * POST   /api/trips                                  — create a trip {title}
 * PATCH  /api/trips/{tripId}/complete                — mark trip as COMPLETED
 * DELETE /api/trips/{tripId}                         — delete trip + its destinations
 * POST   /api/trips/{tripId}/destinations/{destId}   — add destination to a PLANNED trip
 * DELETE /api/trips/{tripId}/destinations/{destId}   — remove destination from a PLANNED trip
 */
@RestController
@RequestMapping("/api/trips")
@CrossOrigin(origins = "*")
public class TripController {

    private final TripRepository            tripRepo;
    private final TripDestinationRepository tripDestRepo;
    private final DestinationRepository     destRepo;
    private final ReviewRepository          reviewRepo;
    private final UserRepository            userRepo;
    private final ActivityLogService        logService;

    public TripController(TripRepository tripRepo,
                          TripDestinationRepository tripDestRepo,
                          DestinationRepository destRepo,
                          ReviewRepository reviewRepo,
                          UserRepository userRepo,
                          ActivityLogService logService) {
        this.tripRepo     = tripRepo;
        this.tripDestRepo = tripDestRepo;
        this.destRepo     = destRepo;
        this.reviewRepo   = reviewRepo;
        this.userRepo     = userRepo;
        this.logService   = logService;
    }

    // ── Helper ───────────────────────────────────────────────
    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── GET /api/trips ───────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getTrips() {
        User user = currentUser();
        List<Trip> trips = tripRepo.findByUserIdOrderByCreatedAtDesc(user.getUserId());

        List<Map<String, Object>> result = trips.stream().map(trip -> {
            Map<String, Object> tripMap = new LinkedHashMap<>();
            tripMap.put("tripId",    trip.getTripId());
            tripMap.put("title",     trip.getTitle());
            tripMap.put("status",    trip.getStatus().name());
            tripMap.put("startDate", trip.getStartDate());
            tripMap.put("endDate",   trip.getEndDate());
            tripMap.put("createdAt", trip.getCreatedAt());

            List<TripDestination> tripDests = tripDestRepo.findByTripIdOrderByVisitOrder(trip.getTripId());

            List<Map<String, Object>> destList = tripDests.stream().map(td -> {
                Map<String, Object> dm = new LinkedHashMap<>();
                dm.put("destinationId", td.getDestinationId());

                destRepo.findById(td.getDestinationId()).ifPresent(d -> {
                    dm.put("name",     d.getName());
                    dm.put("city",     d.getCity()     != null ? d.getCity()     : "");
                    dm.put("imageUrl", d.getImageUrl() != null ? d.getImageUrl() : "");
                });

                Optional<Review> review = reviewRepo.findByUserIdAndDestinationId(
                        user.getUserId(), td.getDestinationId());
                dm.put("reviewed", review.isPresent());
                review.ifPresent(r -> {
                    dm.put("userRating",     r.getRating());
                    dm.put("userReviewText", r.getReviewText() != null ? r.getReviewText() : "");
                });
                return dm;
            }).collect(Collectors.toList());

            tripMap.put("destinations", destList);
            return tripMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── POST /api/trips ──────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createTrip(@RequestBody Map<String, String> body,
                                        HttpServletRequest request) {
        User user = currentUser();

        String title = body.get("title");
        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Trip name is required"));
        }
        if (title.trim().length() > 255) {
            return ResponseEntity.badRequest().body(Map.of("message", "Trip name must be under 255 characters"));
        }

        Trip trip = new Trip();
        trip.setUserId(user.getUserId());
        trip.setTitle(title.trim());

        String startStr = body.get("startDate");
        String endStr   = body.get("endDate");
        try {
            if (startStr != null && !startStr.isBlank()) trip.setStartDate(LocalDate.parse(startStr));
            if (endStr   != null && !endStr.isBlank())   trip.setEndDate(LocalDate.parse(endStr));
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid date format. Use YYYY-MM-DD"));
        }
        if (trip.getStartDate() != null && trip.getEndDate() != null
                && trip.getEndDate().isBefore(trip.getStartDate())) {
            return ResponseEntity.badRequest().body(Map.of("message", "End date cannot be before start date"));
        }

        trip = tripRepo.save(trip);
        logService.log(user.getUserId(), "TRIP_CREATED", request);

        return ResponseEntity.status(201).body(Map.of(
                "message", "Trip created",
                "tripId",  trip.getTripId()
        ));
    }

    // ── PATCH /api/trips/{tripId}/complete ───────────────────
    @PatchMapping("/{tripId}/complete")
    public ResponseEntity<?> markComplete(@PathVariable Integer tripId,
                                          HttpServletRequest request) {
        User user = currentUser();

        Trip trip = tripRepo.findById(tripId).orElse(null);
        if (trip == null || !trip.getUserId().equals(user.getUserId())) {
            return ResponseEntity.status(404).body(Map.of("message", "Trip not found"));
        }
        if (trip.getStatus() == Trip.TripStatus.COMPLETED) {
            return ResponseEntity.status(409).body(Map.of("message", "Trip is already completed"));
        }
        List<TripDestination> dests = tripDestRepo.findByTripIdOrderByVisitOrder(tripId);
        if (dests.isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Add at least one destination before completing the trip"));
        }

        trip.setStatus(Trip.TripStatus.COMPLETED);
        tripRepo.save(trip);
        logService.log(user.getUserId(), "TRIP_COMPLETED", request);
        return ResponseEntity.ok(Map.of("message", "Trip marked as completed"));
    }

    // ── DELETE /api/trips/{tripId} ───────────────────────────
    @DeleteMapping("/{tripId}")
    @Transactional
    public ResponseEntity<?> deleteTrip(@PathVariable Integer tripId) {
        User user = currentUser();

        Trip trip = tripRepo.findById(tripId).orElse(null);
        if (trip == null || !trip.getUserId().equals(user.getUserId())) {
            return ResponseEntity.status(404).body(Map.of("message", "Trip not found"));
        }

        tripDestRepo.deleteByTripId(tripId);
        tripRepo.deleteById(tripId);
        return ResponseEntity.ok(Map.of("message", "Trip deleted"));
    }

    // ── POST /api/trips/{tripId}/destinations/{destId} ───────
    @PostMapping("/{tripId}/destinations/{destId}")
    public ResponseEntity<?> addDestination(@PathVariable Integer tripId,
                                            @PathVariable Integer destId) {
        User user = currentUser();

        Trip trip = tripRepo.findById(tripId).orElse(null);
        if (trip == null || !trip.getUserId().equals(user.getUserId())) {
            return ResponseEntity.status(404).body(Map.of("message", "Trip not found"));
        }
        if (trip.getStatus() == Trip.TripStatus.COMPLETED) {
            return ResponseEntity.status(409).body(Map.of("message", "Cannot modify a completed trip"));
        }

        Destination dest = destRepo.findById(destId).orElse(null);
        if (dest == null || !Boolean.TRUE.equals(dest.getIsActive())) {
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));
        }
        if (tripDestRepo.existsByTripIdAndDestinationId(tripId, destId)) {
            return ResponseEntity.status(409).body(Map.of("message", "Destination already in this trip"));
        }

        List<TripDestination> existing = tripDestRepo.findByTripIdOrderByVisitOrder(tripId);
        TripDestination td = new TripDestination();
        td.setTripId(tripId);
        td.setDestinationId(destId);
        td.setVisitOrder(existing.size() + 1);
        tripDestRepo.save(td);

        return ResponseEntity.status(201).body(Map.of("message", "Destination added to trip"));
    }

    // ── DELETE /api/trips/{tripId}/destinations/{destId} ─────
    @DeleteMapping("/{tripId}/destinations/{destId}")
    @Transactional
    public ResponseEntity<?> removeDestination(@PathVariable Integer tripId,
                                               @PathVariable Integer destId) {
        User user = currentUser();

        Trip trip = tripRepo.findById(tripId).orElse(null);
        if (trip == null || !trip.getUserId().equals(user.getUserId())) {
            return ResponseEntity.status(404).body(Map.of("message", "Trip not found"));
        }
        if (trip.getStatus() == Trip.TripStatus.COMPLETED) {
            return ResponseEntity.status(409).body(Map.of("message", "Cannot modify a completed trip"));
        }
        if (!tripDestRepo.existsByTripIdAndDestinationId(tripId, destId)) {
            return ResponseEntity.status(404).body(Map.of("message", "Destination not in this trip"));
        }

        tripDestRepo.deleteByTripIdAndDestinationId(tripId, destId);
        return ResponseEntity.ok(Map.of("message", "Destination removed"));
    }
}
