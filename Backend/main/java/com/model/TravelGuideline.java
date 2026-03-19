package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Maps to the TravelGuidelines table.
 * Each row is one guideline (e.g. Visa, Safety, Culture) for a destination.
 */
@Entity
@Table(name = "TravelGuidelines")
public class TravelGuideline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "guideline_id")
    private Integer guidelineId;

    @Column(name = "destination_id")
    private Integer destinationId;

    @Column(name = "title")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** Category tag — e.g. "Visa", "Safety", "Culture", "Health", "Transport" */
    @Column(name = "category")
    private String category;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Getters ─────────────────────────────────────────────────────────────

    public Integer getGuidelineId()   { return guidelineId; }
    public Integer getDestinationId() { return destinationId; }
    public String  getTitle()         { return title; }
    public String  getContent()       { return content; }
    public String  getCategory()      { return category; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setDestinationId(Integer destinationId) { this.destinationId = destinationId; }
    public void setTitle(String title)                   { this.title = title; }
    public void setContent(String content)               { this.content = content; }
    public void setCategory(String category)             { this.category = category; }
    public void setCreatedAt(LocalDateTime createdAt)    { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt)    { this.updatedAt = updatedAt; }
}
