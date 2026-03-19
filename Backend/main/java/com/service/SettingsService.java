package com.service;

import com.repository.SystemSettingsRepository;
import org.springframework.stereotype.Service;

/**
 * Thin wrapper around SystemSettingsRepository that provides
 * convenient feature-flag checks for use across controllers/services.
 */
@Service
public class SettingsService {

    private final SystemSettingsRepository settingsRepo;

    public SettingsService(SystemSettingsRepository settingsRepo) {
        this.settingsRepo = settingsRepo;
    }

    /**
     * Returns true if the given setting key is "true" (case-insensitive).
     * Defaults to true if the key does not exist in the DB (fail-open).
     */
    public boolean isEnabled(String key) {
        return settingsRepo.findBySettingKey(key)
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElse(true);
    }
}
