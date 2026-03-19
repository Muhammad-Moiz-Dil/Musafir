package com.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ActivityLogs")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Integer logId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(nullable = false, length = 255)
    private String action;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Integer getLogId()                         { return logId; }
    public void    setLogId(Integer logId)            { this.logId = logId; }
    public Integer getUserId()                        { return userId; }
    public void    setUserId(Integer userId)          { this.userId = userId; }
    public String  getAction()                        { return action; }
    public void    setAction(String action)           { this.action = action; }
    public String  getIpAddress()                     { return ipAddress; }
    public void    setIpAddress(String ipAddress)     { this.ipAddress = ipAddress; }
    public String  getUserAgent()                     { return userAgent; }
    public void    setUserAgent(String userAgent)     { this.userAgent = userAgent; }
    public LocalDateTime getCreatedAt()               { return createdAt; }
    public void    setCreatedAt(LocalDateTime t)      { this.createdAt = t; }
}
