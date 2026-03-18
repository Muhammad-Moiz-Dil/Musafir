package com.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "RoomTypes")
public class RoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_type_id")
    private Integer roomTypeId;

    @Column(name = "hotel_id", nullable = false)
    private Integer hotelId;

    @Column(name = "type_name", nullable = false, length = 100)
    private String typeName;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "price_per_night", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerNight;

    @Column(name = "total_rooms", nullable = false)
    private Integer totalRooms;

    @Column(name = "available_rooms", nullable = false)
    private Integer availableRooms;

    @Column(columnDefinition = "TEXT")
    private String amenities;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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

    public Integer     getRoomTypeId()                          { return roomTypeId; }
    public void        setRoomTypeId(Integer id)                { this.roomTypeId = id; }

    public Integer     getHotelId()                             { return hotelId; }
    public void        setHotelId(Integer id)                   { this.hotelId = id; }

    public String      getTypeName()                            { return typeName; }
    public void        setTypeName(String n)                    { this.typeName = n; }

    public Integer     getCapacity()                            { return capacity; }
    public void        setCapacity(Integer c)                   { this.capacity = c; }

    public BigDecimal  getPricePerNight()                       { return pricePerNight; }
    public void        setPricePerNight(BigDecimal p)           { this.pricePerNight = p; }

    public Integer     getTotalRooms()                          { return totalRooms; }
    public void        setTotalRooms(Integer r)                 { this.totalRooms = r; }

    public Integer     getAvailableRooms()                      { return availableRooms; }
    public void        setAvailableRooms(Integer r)             { this.availableRooms = r; }

    public String      getAmenities()                           { return amenities; }
    public void        setAmenities(String a)                   { this.amenities = a; }

    public String      getDescription()                         { return description; }
    public void        setDescription(String d)                 { this.description = d; }

    public String      getImageUrl()                            { return imageUrl; }
    public void        setImageUrl(String u)                    { this.imageUrl = u; }

    public Boolean     getIsActive()                            { return isActive; }
    public void        setIsActive(Boolean b)                   { this.isActive = b; }

    public LocalDateTime getCreatedAt()                         { return createdAt; }
    public void          setCreatedAt(LocalDateTime t)          { this.createdAt = t; }

    public LocalDateTime getUpdatedAt()                         { return updatedAt; }
    public void          setUpdatedAt(LocalDateTime t)          { this.updatedAt = t; }
}
