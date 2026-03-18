package com.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Hotels")
public class Hotel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hotel_id")
    private Integer hotelId;

    @Column(name = "destination_id", nullable = false)
    private Integer destinationId;

    @Column(name = "manager_id")
    private Integer managerId;

    @Column(name = "hotel_name", nullable = false, length = 255)
    private String hotelName;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "contact_number", length = 20)
    private String contactNumber;

    @Column(length = 255)
    private String email;

    @Column(name = "star_rating")
    private Integer starRating;

    @Column(name = "price_per_night", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerNight;

    @Column(name = "total_rooms", nullable = false)
    private Integer totalRooms;

    @Column(name = "available_rooms", nullable = false)
    private Integer availableRooms;

    @Column(columnDefinition = "TEXT")
    private String amenities;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "average_rating", precision = 3, scale = 2)
    private BigDecimal averageRating;

    @Column(name = "total_reviews")
    private Integer totalReviews;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active")
    private Boolean isActive;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Integer getHotelId()                          { return hotelId; }
    public void    setHotelId(Integer hotelId)           { this.hotelId = hotelId; }

    public Integer getDestinationId()                            { return destinationId; }
    public void    setDestinationId(Integer destinationId)       { this.destinationId = destinationId; }

    public Integer getManagerId()                        { return managerId; }
    public void    setManagerId(Integer managerId)       { this.managerId = managerId; }

    public String  getHotelName()                        { return hotelName; }
    public void    setHotelName(String hotelName)        { this.hotelName = hotelName; }

    public String  getAddress()                          { return address; }
    public void    setAddress(String address)            { this.address = address; }

    public String  getContactNumber()                            { return contactNumber; }
    public void    setContactNumber(String contactNumber)        { this.contactNumber = contactNumber; }

    public String  getEmail()                            { return email; }
    public void    setEmail(String email)                { this.email = email; }

    public Integer getStarRating()                       { return starRating; }
    public void    setStarRating(Integer starRating)     { this.starRating = starRating; }

    public BigDecimal getPricePerNight()                             { return pricePerNight; }
    public void       setPricePerNight(BigDecimal pricePerNight)     { this.pricePerNight = pricePerNight; }

    public Integer getTotalRooms()                       { return totalRooms; }
    public void    setTotalRooms(Integer totalRooms)     { this.totalRooms = totalRooms; }

    public Integer getAvailableRooms()                           { return availableRooms; }
    public void    setAvailableRooms(Integer availableRooms)     { this.availableRooms = availableRooms; }

    public String  getAmenities()                        { return amenities; }
    public void    setAmenities(String amenities)        { this.amenities = amenities; }

    public String  getImageUrl()                         { return imageUrl; }
    public void    setImageUrl(String imageUrl)          { this.imageUrl = imageUrl; }

    public String  getDescription()                      { return description; }
    public void    setDescription(String description)    { this.description = description; }

    public BigDecimal getAverageRating()                             { return averageRating; }
    public void       setAverageRating(BigDecimal averageRating)     { this.averageRating = averageRating; }

    public Integer getTotalReviews()                     { return totalReviews; }
    public void    setTotalReviews(Integer totalReviews) { this.totalReviews = totalReviews; }

    public LocalDateTime getCreatedAt()                      { return createdAt; }
    public void          setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt()                      { return updatedAt; }
    public void          setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Boolean getIsActive()                     { return isActive; }
    public void    setIsActive(Boolean isActive)     { this.isActive = isActive; }
}
