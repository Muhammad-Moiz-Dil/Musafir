package com.repository;

import com.model.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Integer> {

    List<ActivityLog> findTop100ByOrderByCreatedAtDesc();

    List<ActivityLog> findByUserIdOrderByCreatedAtDesc(Integer userId);

    List<ActivityLog> findByActionContainingIgnoreCaseOrderByCreatedAtDesc(String action);

    List<ActivityLog> findByUserIdAndActionContainingIgnoreCaseOrderByCreatedAtDesc(Integer userId, String action);

    @Modifying
    @Transactional
    @Query("DELETE FROM ActivityLog a WHERE a.createdAt < :before")
    int deleteByCreatedAtBefore(@Param("before") LocalDateTime before);
}
