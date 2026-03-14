package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "travel_guidelines")
public class TravelGuideline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "guideline_id")
    private Integer guidelineId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public TravelGuideline() {}

    public Integer getGuidelineId()                          { return guidelineId; }
    public void setGuidelineId(Integer guidelineId)          { this.guidelineId = guidelineId; }

    public Destination getDestination()                      { return destination; }
    public void setDestination(Destination destination)      { this.destination = destination; }

    public String getTitle()                                 { return title; }
    public void setTitle(String title)                       { this.title = title; }

    public String getContent()                               { return content; }
    public void setContent(String content)                   { this.content = content; }

    public String getCategory()                              { return category; }
    public void setCategory(String category)                 { this.category = category; }

    public LocalDateTime getCreatedAt()                      { return createdAt; }
    public LocalDateTime getUpdatedAt()                      { return updatedAt; }
}
