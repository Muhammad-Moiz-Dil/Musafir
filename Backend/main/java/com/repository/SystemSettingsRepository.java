package com.repository;

import com.model.SystemSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemSettingsRepository extends JpaRepository<SystemSettings, Integer> {
    Optional<SystemSettings> findBySettingKey(String settingKey);
}
