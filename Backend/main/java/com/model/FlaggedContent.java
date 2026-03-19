package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "FlaggedContent")
public class FlaggedContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "flag_id")
    private Integer flagId;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;   // LOG | REVIEW | HOTEL_REVIEW

    @Column(name = "content_id", nullable = false)
    private Integer contentId;

    @Column(name = "reported_by", nullable = false)
    private Integer reportedBy;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    private FlagStatus status = FlagStatus.Pending;

    @Column(name = "reviewed_by")
    private Integer reviewedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }

    public enum FlagStatus { Pending, Reviewed, Resolved }

    // ── Getters ──────────────────────────────────────────────────
    public Integer      getFlagId()      { return flagId; }
    public String       getContentType() { return contentType; }
    public Integer      getContentId()   { return contentId; }
    public Integer      getReportedBy()  { return reportedBy; }
    public String       getReason()      { return reason; }
    public FlagStatus   getStatus()      { return status; }
    public Integer      getReviewedBy()  { return reviewedBy; }
    public LocalDateTime getCreatedAt()  { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }

    // ── Setters ──────────────────────────────────────────────────
    public void setContentType(String contentType) { this.contentType = contentType; }
    public void setContentId(Integer contentId)    { this.contentId   = contentId; }
    public void setReportedBy(Integer reportedBy)  { this.reportedBy  = reportedBy; }
    public void setReason(String reason)           { this.reason      = reason; }
    public void setStatus(FlagStatus status)       { this.status      = status; }
    public void setReviewedBy(Integer reviewedBy)  { this.reviewedBy  = reviewedBy; }
    public void setResolvedAt(LocalDateTime t)     { this.resolvedAt  = t; }
}
