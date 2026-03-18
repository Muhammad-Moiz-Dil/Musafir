package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "HotelReviews")
public class HotelReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hotel_review_id")
    private Integer hotelReviewId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "hotel_id", nullable = false)
    private Integer hotelId;

    @Column(name = "booking_id")
    private Integer bookingId;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_flagged")
    private Boolean isFlagged = false;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }

    // ── Getters ──────────────────────────────────────────────
    public Integer      getHotelReviewId() { return hotelReviewId; }
    public Integer      getUserId()        { return userId; }
    public Integer      getHotelId()       { return hotelId; }
    public Integer      getBookingId()     { return bookingId; }
    public Integer      getRating()        { return rating; }
    public String       getComment()       { return comment; }
    public Boolean      getIsFlagged()     { return isFlagged; }
    public LocalDateTime getCreatedAt()    { return createdAt; }

    // ── Setters ──────────────────────────────────────────────
    public void setUserId(Integer userId)       { this.userId     = userId; }
    public void setHotelId(Integer hotelId)     { this.hotelId    = hotelId; }
    public void setBookingId(Integer bookingId) { this.bookingId  = bookingId; }
    public void setRating(Integer rating)       { this.rating     = rating; }
    public void setComment(String comment)      { this.comment    = comment; }
    public void setIsFlagged(Boolean isFlagged) { this.isFlagged  = isFlagged; }
}
