package com.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "Trips")
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trip_id")
    private Integer tripId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripStatus status;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum TripStatus { PLANNED, COMPLETED }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = TripStatus.PLANNED;
    }

    // ── Getters ──────────────────────────────────────────────
    public Integer getTripId()          { return tripId; }
    public Integer getUserId()          { return userId; }
    public String getTitle()            { return title; }
    public TripStatus getStatus()       { return status; }
    public LocalDate getStartDate()     { return startDate; }
    public LocalDate getEndDate()       { return endDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    // ── Setters ──────────────────────────────────────────────
    public void setUserId(Integer userId)       { this.userId    = userId; }
    public void setTitle(String title)          { this.title     = title;  }
    public void setStatus(TripStatus status)    { this.status    = status; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDate endDate)     { this.endDate   = endDate; }
}
