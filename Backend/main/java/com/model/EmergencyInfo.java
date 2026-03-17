package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "EmergencyInfo")
public class EmergencyInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "emergency_id")
    private Integer emergencyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    @Column(name = "police_number", length = 20)
    private String policeNumber;

    @Column(name = "ambulance_number", length = 20)
    private String ambulanceNumber;

    @Column(name = "fire_service_number", length = 20)
    private String fireServiceNumber;

    @Column(name = "tourist_helpline", length = 20)
    private String touristHelpline;

    @Column(name = "nearest_hospital", length = 255)
    private String nearestHospital;

    @Column(name = "embassy_contact", length = 255)
    private String embassyContact;

    @Column(name = "covid_rules", columnDefinition = "TEXT")
    private String covidRules;

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

    public EmergencyInfo() {}

    public Integer getEmergencyId()                          { return emergencyId; }
    public void setEmergencyId(Integer emergencyId)          { this.emergencyId = emergencyId; }

    public Destination getDestination()                      { return destination; }
    public void setDestination(Destination destination)      { this.destination = destination; }

    public String getPoliceNumber()                          { return policeNumber; }
    public void setPoliceNumber(String policeNumber)         { this.policeNumber = policeNumber; }

    public String getAmbulanceNumber()                       { return ambulanceNumber; }
    public void setAmbulanceNumber(String ambulanceNumber)   { this.ambulanceNumber = ambulanceNumber; }

    public String getFireServiceNumber()                     { return fireServiceNumber; }
    public void setFireServiceNumber(String v)               { this.fireServiceNumber = v; }

    public String getTouristHelpline()                       { return touristHelpline; }
    public void setTouristHelpline(String touristHelpline)   { this.touristHelpline = touristHelpline; }

    public String getNearestHospital()                       { return nearestHospital; }
    public void setNearestHospital(String nearestHospital)   { this.nearestHospital = nearestHospital; }

    public String getEmbassyContact()                        { return embassyContact; }
    public void setEmbassyContact(String embassyContact)     { this.embassyContact = embassyContact; }

    public String getCovidRules()                            { return covidRules; }
    public void setCovidRules(String covidRules)             { this.covidRules = covidRules; }

    public LocalDateTime getCreatedAt()                      { return createdAt; }
    public LocalDateTime getUpdatedAt()                      { return updatedAt; }
}
