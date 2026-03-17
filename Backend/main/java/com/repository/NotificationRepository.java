package com.repository;

import com.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    // Used by WeatherAlertService — filtered by type
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Integer userId, String type);
    long countByUserIdAndTypeAndIsReadFalse(Integer userId, String type);
    boolean existsByUserIdAndReferenceIdAndTitleAndCreatedAtAfter(
            Integer userId, Integer referenceId, String title, LocalDateTime after);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId AND n.type = 'WEATHER_ALERT'")
    void markAllWeatherAlertsRead(@Param("userId") Integer userId);

    // Used by NotificationService — all types
    List<Notification> findTop20ByUserIdOrderByCreatedAtDesc(Integer userId);
    long countByUserIdAndIsReadFalse(Integer userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId")
    void markAllReadForUser(@Param("userId") Integer userId);
}
