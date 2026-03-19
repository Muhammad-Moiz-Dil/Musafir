package com.service;

import com.model.ActivityLog;
import com.repository.ActivityLogRepository;
import com.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

/**
 * Shared helper for writing to ActivityLogs.
 * All logging is fire-and-forget — exceptions are swallowed so they
 * never break the parent request.
 */
@Service
public class ActivityLogService {

    private final ActivityLogRepository logRepo;
    private final UserRepository        userRepo;

    public ActivityLogService(ActivityLogRepository logRepo, UserRepository userRepo) {
        this.logRepo  = logRepo;
        this.userRepo = userRepo;
    }

    /** Log with a known userId. */
    public void log(Integer userId, String action, HttpServletRequest req) {
        try {
            ActivityLog entry = new ActivityLog();
            entry.setUserId(userId);
            entry.setAction(action);
            String forwarded = req.getHeader("X-Forwarded-For");
            entry.setIpAddress(forwarded != null ? forwarded.split(",")[0].trim() : req.getRemoteAddr());
            entry.setUserAgent(req.getHeader("User-Agent"));
            logRepo.save(entry);
        } catch (Exception ignored) {}
    }

    /** Log by email (looked up to userId automatically). */
    public void log(String email, String action, HttpServletRequest req) {
        try {
            userRepo.findByEmail(email).ifPresent(u -> log(u.getUserId(), action, req));
        } catch (Exception ignored) {}
    }
}
