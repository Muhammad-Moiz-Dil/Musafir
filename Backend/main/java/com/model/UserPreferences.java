package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "UserPreferences")
public class UserPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "preference_id")
    private Integer preferenceId;

    @Column(name = "user_id", nullable = false, unique = true)
    private Integer userId;

    @Column(name = "age_group", length = 20)
    private String ageGroup = "18-25";

    @Column(name = "travel_preferences", columnDefinition = "JSON")
    private String travelPreferences; // stored as JSON array string e.g. ["Mountains","Adventure"]

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Integer getPreferenceId() { return preferenceId; }
    public void setPreferenceId(Integer preferenceId) { this.preferenceId = preferenceId; }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getAgeGroup() { return ageGroup; }
    public void setAgeGroup(String ageGroup) { this.ageGroup = ageGroup; }

    public String getTravelPreferences() { return travelPreferences; }
    public void setTravelPreferences(String travelPreferences) { this.travelPreferences = travelPreferences; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
