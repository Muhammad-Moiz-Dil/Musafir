package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Integer reviewId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "destination_id", nullable = false)
    private Integer destinationId;

    @Column(nullable = false)
    private Integer rating;

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText;

    @Column(name = "verified")
    private Boolean verified = false;

    @Column(name = "is_flagged")
    private Boolean isFlagged = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }

    // ── Getters ──────────────────────────────────────────────
    public Integer getReviewId()          { return reviewId; }
    public Integer getUserId()            { return userId; }
    public Integer getDestinationId()     { return destinationId; }
    public Integer getRating()            { return rating; }
    public String  getReviewText()        { return reviewText; }
    public Boolean getVerified()          { return verified; }
    public Boolean getIsFlagged()         { return isFlagged; }
    public LocalDateTime getCreatedAt()   { return createdAt; }

    // ── Setters ──────────────────────────────────────────────
    public void setUserId(Integer userId)               { this.userId        = userId;       }
    public void setDestinationId(Integer destinationId) { this.destinationId = destinationId; }
    public void setRating(Integer rating)               { this.rating        = rating;       }
    public void setReviewText(String reviewText)        { this.reviewText    = reviewText;   }
    public void setVerified(Boolean verified)           { this.verified      = verified;     }
    public void setIsFlagged(Boolean isFlagged)         { this.isFlagged     = isFlagged;    }
}
