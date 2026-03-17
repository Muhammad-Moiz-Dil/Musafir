package com.controller;

import com.model.Notification;
import com.model.User;
import com.repository.UserRepository;
import com.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepo;

    public NotificationController(NotificationService notificationService,
                                  UserRepository userRepo) {
        this.notificationService = notificationService;
        this.userRepo = userRepo;
    }

    /** GET /api/notifications — last 20 notifications + unread count for the logged-in user */
    @GetMapping
    public ResponseEntity<?> getNotifications(Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();

        List<Notification> notifications = notificationService.getNotificationsForUser(userId);
        long unreadCount = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of(
                "notifications", notifications,
                "unreadCount", unreadCount
        ));
    }

    /** GET /api/notifications/unread-count — badge count only */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    /** PUT /api/notifications/{id}/read — mark a single notification as read */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Integer id, Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        notificationService.markRead(id, userId);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    /** PUT /api/notifications/read-all — mark all notifications as read */
    @PutMapping("/read-all")
    public ResponseEntity<?> markAllRead(Authentication auth) {
        Integer userId = resolveUserId(auth);
        if (userId == null) return ResponseEntity.status(401).build();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    private Integer resolveUserId(Authentication auth) {
        if (auth == null) return null;
        return userRepo.findByEmail(auth.getName())
                       .map(User::getUserId)
                       .orElse(null);
    }
}
