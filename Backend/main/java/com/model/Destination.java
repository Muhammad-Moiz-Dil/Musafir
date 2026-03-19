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

    @Column(name = "country")
    private String country;

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

    @Column(name = "altitude", length = 50)
    private String altitude;

    @Column(name = "best_time", length = 100)
    private String bestTime;

    @Column(name = "budget_level", length = 50)
    private String budgetLevel;

    public Integer    getDestinationId() { return destinationId; }
    public Double     getLatitude()      { return latitude; }
    public Double     getLongitude()     { return longitude; }
    public String     getName()          { return name; }
    public String     getCountry()       { return country; }
    public String     getCity()          { return city; }
    public String     getDescription()   { return description; }
    public String     getImageUrl()      { return imageUrl; }
    public BigDecimal getAverageRating() { return averageRating; }
    public Integer    getTotalReviews()  { return totalReviews; }
    public Boolean    getIsActive()      { return isActive; }
    public String     getSearchKeywords(){ return searchKeywords; }
    public String     getAltitude()      { return altitude; }
    public String     getBestTime()      { return bestTime; }
    public String     getBudgetLevel()   { return budgetLevel; }

    public void setName(String name)                             { this.name = name; }
    public void setCountry(String country)                       { this.country = country; }
    public void setCity(String city)                             { this.city = city; }
    public void setDescription(String description)               { this.description = description; }
    public void setImageUrl(String imageUrl)                     { this.imageUrl = imageUrl; }
    public void setLatitude(Double latitude)                     { this.latitude = latitude; }
    public void setLongitude(Double longitude)                   { this.longitude = longitude; }
    public void setIsActive(Boolean isActive)                    { this.isActive = isActive; }
    public void setSearchKeywords(String searchKeywords)         { this.searchKeywords = searchKeywords; }
    public void setAverageRating(BigDecimal averageRating)       { this.averageRating = averageRating; }
    public void setTotalReviews(Integer totalReviews)            { this.totalReviews = totalReviews; }
    public void setAltitude(String altitude)                     { this.altitude = altitude; }
    public void setBestTime(String bestTime)                     { this.bestTime = bestTime; }
    public void setBudgetLevel(String budgetLevel)               { this.budgetLevel = budgetLevel; }
}
