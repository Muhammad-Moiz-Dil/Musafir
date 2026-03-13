package com.model;

import jakarta.persistence.*;

@Entity
@Table(name = "TripDestinations")
public class TripDestination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trip_destination_id")
    private Integer tripDestinationId;

    @Column(name = "trip_id", nullable = false)
    private Integer tripId;

    @Column(name = "destination_id", nullable = false)
    private Integer destinationId;

    @Column(name = "visit_order")
    private Integer visitOrder;

    // ── Getters ──────────────────────────────────────────────
    public Integer getTripDestinationId() { return tripDestinationId; }
    public Integer getTripId()            { return tripId; }
    public Integer getDestinationId()     { return destinationId; }
    public Integer getVisitOrder()        { return visitOrder; }

    // ── Setters ──────────────────────────────────────────────
    public void setTripId(Integer tripId)               { this.tripId        = tripId;       }
    public void setDestinationId(Integer destinationId) { this.destinationId = destinationId; }
    public void setVisitOrder(Integer visitOrder)       { this.visitOrder    = visitOrder;   }
}
