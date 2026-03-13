package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Maps to the Favorites table.
 * Each row = one Tourist saving one Destination to their wishlist.
 * Unique constraint on (user_id, destination_id) prevents duplicates.
 */
@Entity
@Table(name = "Favorites")
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "favorite_id")
    private Integer favoriteId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "destination_id", nullable = false)
    private Integer destinationId;

    @Column(name = "added_at")
    private LocalDateTime addedAt;

    @PrePersist
    public void prePersist() {
        if (addedAt == null) addedAt = LocalDateTime.now();
    }

    // ── Getters ─────────────────────────────────────────────
    public Integer getFavoriteId()    { return favoriteId; }
    public Integer getUserId()        { return userId; }
    public Integer getDestinationId() { return destinationId; }
    public LocalDateTime getAddedAt() { return addedAt; }

    // ── Setters ─────────────────────────────────────────────
    public void setUserId(Integer userId)               { this.userId = userId; }
    public void setDestinationId(Integer destinationId) { this.destinationId = destinationId; }
}
