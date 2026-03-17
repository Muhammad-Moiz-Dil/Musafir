package com.service;

import com.model.Notification;
import com.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepo;

    public NotificationService(NotificationRepository notificationRepo) {
        this.notificationRepo = notificationRepo;
    }

    /** Last 20 notifications for a user, all types, newest first. */
    public List<Notification> getNotificationsForUser(Integer userId) {
        return notificationRepo.findTop20ByUserIdOrderByCreatedAtDesc(userId);
    }

    /** Total unread count across all notification types. */
    public long getUnreadCount(Integer userId) {
        return notificationRepo.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markRead(Integer notificationId, Integer userId) {
        notificationRepo.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(userId)) {
                n.setIsRead(true);
                notificationRepo.save(n);
            }
        });
    }

    @Transactional
    public void markAllRead(Integer userId) {
        notificationRepo.markAllReadForUser(userId);
    }

    @Transactional
    public Notification createNotification(Integer userId, String type, String title,
                                           String message, Integer referenceId, String referenceType) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setReferenceId(referenceId);
        n.setReferenceType(referenceType);
        n.setIsRead(false);
        return notificationRepo.save(n);
    }
}
