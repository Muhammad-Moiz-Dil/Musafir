package com.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Souvenirs")
public class Souvenir {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "souvenir_id")
    private Integer souvenirId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "price", precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "vendor_name", length = 255)
    private String vendorName;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
    }

    // ── Constructors ─────────────────────────────────────────

    public Souvenir() {}

    // ── Getters & Setters ────────────────────────────────────

    public Integer getSouvenirId()                   { return souvenirId; }
    public void setSouvenirId(Integer souvenirId)    { this.souvenirId = souvenirId; }

    public Destination getDestination()                  { return destination; }
    public void setDestination(Destination destination)  { this.destination = destination; }

    public String getName()              { return name; }
    public void setName(String name)     { this.name = name; }

    public String getDescription()                   { return description; }
    public void setDescription(String description)   { this.description = description; }

    public BigDecimal getPrice()             { return price; }
    public void setPrice(BigDecimal price)   { this.price = price; }

    public String getImageUrl()                  { return imageUrl; }
    public void setImageUrl(String imageUrl)     { this.imageUrl = imageUrl; }

    public String getVendorName()                    { return vendorName; }
    public void setVendorName(String vendorName)     { this.vendorName = vendorName; }

    public Boolean getIsActive()                 { return isActive; }
    public void setIsActive(Boolean isActive)    { this.isActive = isActive; }

    public LocalDateTime getCreatedAt()                  { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)    { this.createdAt = createdAt; }
}
