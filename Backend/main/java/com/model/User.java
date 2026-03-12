package com.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @JsonIgnore
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    private UserType userType;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(length = 20)
    private String cnic;

    @Column(name = "profile_picture", length = 500)
    private String profilePicture;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    public enum UserType {
        Tourist, Admin, HotelManager
    }

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

    // ── Constructors ─────────────────────────────────────────

    public User() {}

    public User(Integer userId, String email, String passwordHash, UserType userType,
                String fullName, String phoneNumber, String cnic,
                String profilePicture, String address, Boolean isActive) {
        this.userId = userId;
        this.email = email;
        this.passwordHash = passwordHash;
        this.userType = userType;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.cnic = cnic;
        this.profilePicture = profilePicture;
        this.address = address;
        this.isActive = isActive;
    }

    // ── Builder ──────────────────────────────────────────────

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String email;
        private String passwordHash;
        private UserType userType;
        private String fullName;
        private String phoneNumber;
        private String cnic;
        private String address;

        public Builder email(String email)               { this.email = email; return this; }
        public Builder passwordHash(String passwordHash) { this.passwordHash = passwordHash; return this; }
        public Builder userType(UserType userType)       { this.userType = userType; return this; }
        public Builder fullName(String fullName)         { this.fullName = fullName; return this; }
        public Builder phoneNumber(String phoneNumber)   { this.phoneNumber = phoneNumber; return this; }
        public Builder cnic(String cnic)                 { this.cnic = cnic; return this; }
        public Builder address(String address)           { this.address = address; return this; }

        public User build() {
            User u = new User();
            u.email = this.email;
            u.passwordHash = this.passwordHash;
            u.userType = this.userType;
            u.fullName = this.fullName;
            u.phoneNumber = this.phoneNumber;
            u.cnic = this.cnic;
            u.address = this.address;
            return u;
        }
    }

    // ── Getters & Setters ────────────────────────────────────

    public Integer getUserId()               { return userId; }
    public void setUserId(Integer userId)    { this.userId = userId; }

    public String getEmail()                 { return email; }
    public void setEmail(String email)       { this.email = email; }

    public String getPasswordHash()                    { return passwordHash; }
    public void setPasswordHash(String passwordHash)   { this.passwordHash = passwordHash; }

    public UserType getUserType()                { return userType; }
    public void setUserType(UserType userType)   { this.userType = userType; }

    public String getFullName()                { return fullName; }
    public void setFullName(String fullName)   { this.fullName = fullName; }

    public String getPhoneNumber()                   { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber)   { this.phoneNumber = phoneNumber; }

    public String getCnic()              { return cnic; }
    public void setCnic(String cnic)     { this.cnic = cnic; }

    public String getProfilePicture()                      { return profilePicture; }
    public void setProfilePicture(String profilePicture)   { this.profilePicture = profilePicture; }

    public String getAddress()               { return address; }
    public void setAddress(String address)   { this.address = address; }

    public LocalDateTime getCreatedAt()                  { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)    { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt()                  { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt)    { this.updatedAt = updatedAt; }

    public Boolean getIsActive()                 { return isActive; }
    public void setIsActive(Boolean isActive)    { this.isActive = isActive; }

    public LocalDateTime getLastLogin()                  { return lastLogin; }
    public void setLastLogin(LocalDateTime lastLogin)    { this.lastLogin = lastLogin; }
}
