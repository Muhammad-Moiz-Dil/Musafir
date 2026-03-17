package com.controller;

import com.model.User;
import com.repository.UserRepository;
import com.service.WeatherAlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/weather")
public class WeatherAlertController {

    private final WeatherAlertService weatherAlertService;
    private final UserRepository userRepo;

    public WeatherAlertController(WeatherAlertService weatherAlertService,
                                  UserRepository userRepo) {
        this.weatherAlertService = weatherAlertService;
        this.userRepo            = userRepo;
    }

    /** Live weather + stored notifications for the authenticated user */
    @GetMapping("/alerts")
    public ResponseEntity<?> getAlerts(Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(weatherAlertService.getAlertsForUser(userId));
    }

    /** Unread weather-alert count (used for the notification badge) */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(Map.of("count", weatherAlertService.getUnreadCount(userId)));
    }

    /** Mark a single notification as read */
    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Integer id, Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        weatherAlertService.markRead(id, userId);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    /** Mark all weather notifications as read */
    @PutMapping("/notifications/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        weatherAlertService.markAllRead(userId);
        return ResponseEntity.ok(Map.of("message", "All marked as read"));
    }

    private Integer resolveUserId(Authentication auth) {
        if (auth == null) return null;
        return userRepo.findByEmail(auth.getName())
                       .map(User::getUserId)
                       .orElse(null);
    }
}
