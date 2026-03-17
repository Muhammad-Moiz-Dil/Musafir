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

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "average_rating")
    private BigDecimal averageRating;

    @Column(name = "total_reviews")
    private Integer totalReviews;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "search_keywords", columnDefinition = "TEXT")
    private String searchKeywords;

    public Integer getDestinationId() { return destinationId; }
    public Double  getLatitude()      { return latitude; }
    public Double  getLongitude()     { return longitude; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public BigDecimal getAverageRating() { return averageRating; }
    public Integer getTotalReviews() { return totalReviews; }
    public Boolean getIsActive() { return isActive; }

    public String  getSearchKeywords()                           { return searchKeywords; }
    public void setSearchKeywords(String searchKeywords)         { this.searchKeywords = searchKeywords; }
    public void setAverageRating(BigDecimal averageRating)       { this.averageRating  = averageRating; }
    public void setTotalReviews(Integer totalReviews)        { this.totalReviews  = totalReviews;  }
}
