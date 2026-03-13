package com.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "SeasonalData")
public class SeasonalData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "seasonal_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "avg_temperature", precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(name = "avg_rainfall", precision = 5, scale = 2)
    private BigDecimal rainfall;

    @Column(name = "avg_hotel_cost", precision = 10, scale = 2)
    private BigDecimal averagePrice;

    // ── Constructors ──────────────────────────────────────────

    public SeasonalData() {}

    // ── Getters & Setters ─────────────────────────────────────

    public Integer getId()               { return id; }
    public void setId(Integer id)        { this.id = id; }

    public Destination getDestination()                  { return destination; }
    public void setDestination(Destination destination)  { this.destination = destination; }

    public Integer getMonth()            { return month; }
    public void setMonth(Integer month)  { this.month = month; }

    public BigDecimal getTemperature()                   { return temperature; }
    public void setTemperature(BigDecimal temperature)   { this.temperature = temperature; }

    public BigDecimal getRainfall()                  { return rainfall; }
    public void setRainfall(BigDecimal rainfall)     { this.rainfall = rainfall; }

    public BigDecimal getAveragePrice()                      { return averagePrice; }
    public void setAveragePrice(BigDecimal averagePrice)     { this.averagePrice = averagePrice; }
}
