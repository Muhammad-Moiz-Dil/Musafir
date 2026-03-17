package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Integer notificationId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "type")
    private String type;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "reference_id")
    private Integer referenceId;

    @Column(name = "reference_type")
    private String referenceType;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isRead == null) isRead = false;
    }

    public Integer getNotificationId() { return notificationId; }
    public Integer getUserId()         { return userId; }
    public String  getType()           { return type; }
    public String  getTitle()          { return title; }
    public String  getMessage()        { return message; }
    public Integer getReferenceId()    { return referenceId; }
    public String  getReferenceType()  { return referenceType; }
    public Boolean getIsRead()         { return isRead; }
    public LocalDateTime getCreatedAt(){ return createdAt; }

    public void setUserId(Integer userId)             { this.userId = userId; }
    public void setType(String type)                  { this.type = type; }
    public void setTitle(String title)                { this.title = title; }
    public void setMessage(String message)            { this.message = message; }
    public void setReferenceId(Integer referenceId)   { this.referenceId = referenceId; }
    public void setReferenceType(String referenceType){ this.referenceType = referenceType; }
    public void setIsRead(Boolean isRead)             { this.isRead = isRead; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
