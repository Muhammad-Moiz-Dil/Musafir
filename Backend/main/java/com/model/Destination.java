package com.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "Destinations")
public class Destination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "destination_id")
    private Integer destinationId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "city")
    private String city;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "average_rating")
    private BigDecimal averageRating;

    @Column(name = "total_reviews")
    private Integer totalReviews;

    @Column(name = "is_active")
    private Boolean isActive;

    public Integer getDestinationId() { return destinationId; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public BigDecimal getAverageRating() { return averageRating; }
    public Integer getTotalReviews() { return totalReviews; }
    public Boolean getIsActive() { return isActive; }

    public void setAverageRating(BigDecimal averageRating) { this.averageRating = averageRating; }
    public void setTotalReviews(Integer totalReviews)      { this.totalReviews  = totalReviews;  }
}
