package com.controller;

import com.model.Destination;
import com.model.Favorite;
import com.model.User;
import com.repository.DestinationRepository;
import com.repository.FavoriteRepository;
import com.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Wishlist / Favorites — Tourist only
 *
 * GET    /api/favorites          — all saved destinations (full objects) for current user
 * GET    /api/favorites/ids      — just the destination IDs saved by current user
 * POST   /api/favorites/{destId} — add destination to wishlist
 * DELETE /api/favorites/{destId} — remove destination from wishlist
 */
@RestController
@RequestMapping("/api/favorites")
@CrossOrigin(origins = "*")
public class FavoriteController {

    private final FavoriteRepository    favoriteRepo;
    private final DestinationRepository destinationRepo;
    private final UserRepository        userRepo;

    public FavoriteController(FavoriteRepository favoriteRepo,
                              DestinationRepository destinationRepo,
                              UserRepository userRepo) {
        this.favoriteRepo    = favoriteRepo;
        this.destinationRepo = destinationRepo;
        this.userRepo        = userRepo;
    }

    // ── Helper: resolve current user ────────────────────────────────────────
    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ── Map a Destination to a clean response map ───────────────────────────
    private Map<String, Object> destMap(Destination d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            d.getDestinationId());
        m.put("name",          d.getName());
        m.put("city",          d.getCity() != null ? d.getCity() : "");
        m.put("description",   d.getDescription() != null ? d.getDescription() : "");
        m.put("imageUrl",      d.getImageUrl() != null ? d.getImageUrl() : "");
        m.put("averageRating", d.getAverageRating() != null ? d.getAverageRating() : 0);
        m.put("totalReviews",  d.getTotalReviews() != null ? d.getTotalReviews() : 0);
        return m;
    }

    /**
     * GET /api/favorites
     * Returns full destination objects for the wishlist page.
     * Ordered by most recently added first.
     */
    @GetMapping
    public ResponseEntity<?> getWishlist() {
        User user = currentUser();

        List<Favorite> favorites = favoriteRepo.findByUserIdOrderByAddedAtDesc(user.getUserId());

        if (favorites.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        // Fetch destinations in favorite order
        List<Map<String, Object>> data = favorites.stream()
                .map(f -> destinationRepo.findById(f.getDestinationId()).orElse(null))
                .filter(d -> d != null && Boolean.TRUE.equals(d.getIsActive()))
                .map(this::destMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }

    /**
     * GET /api/favorites/ids
     * Returns just the list of saved destination IDs.
     * Used by destinations & detail pages to know which hearts to fill on load.
     */
    @GetMapping("/ids")
    public ResponseEntity<?> getIds() {
        User user = currentUser();
        List<Integer> ids = favoriteRepo.findDestinationIdsByUserId(user.getUserId());
        return ResponseEntity.ok(ids);
    }

    /**
     * POST /api/favorites/{destinationId}
     * Add a destination to the current user's wishlist.
     * 409 if already saved.
     */
    @PostMapping("/{destinationId}")
    public ResponseEntity<?> add(@PathVariable Integer destinationId) {
        User user = currentUser();

        // Destination must exist and be active
        Destination dest = destinationRepo.findById(destinationId).orElse(null);
        if (dest == null || !Boolean.TRUE.equals(dest.getIsActive())) {
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));
        }

        // Duplicate check
        if (favoriteRepo.existsByUserIdAndDestinationId(user.getUserId(), destinationId)) {
            return ResponseEntity.status(409).body(Map.of("message", "Already in wishlist"));
        }

        Favorite fav = new Favorite();
        fav.setUserId(user.getUserId());
        fav.setDestinationId(destinationId);
        favoriteRepo.save(fav);

        return ResponseEntity.status(201).body(Map.of("message", "Added to wishlist"));
    }

    /**
     * DELETE /api/favorites/{destinationId}
     * Remove a destination from the current user's wishlist.
     * 404 if not in wishlist.
     */
    @DeleteMapping("/{destinationId}")
    @Transactional
    public ResponseEntity<?> remove(@PathVariable Integer destinationId) {
        User user = currentUser();

        if (!favoriteRepo.existsByUserIdAndDestinationId(user.getUserId(), destinationId)) {
            return ResponseEntity.status(404).body(Map.of("message", "Not in wishlist"));
        }

        favoriteRepo.deleteByUserIdAndDestinationId(user.getUserId(), destinationId);
        return ResponseEntity.ok(Map.of("message", "Removed from wishlist"));
    }
}
