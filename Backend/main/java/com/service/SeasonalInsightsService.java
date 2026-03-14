package com.service;

import com.model.SeasonalData;
import com.repository.SeasonalDataRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SeasonalInsightsService {

    private final SeasonalDataRepository seasonalDataRepo;

    public SeasonalInsightsService(SeasonalDataRepository seasonalDataRepo) {
        this.seasonalDataRepo = seasonalDataRepo;
    }

    /**
     * Returns all seasonal data records for a given destination name,
     * ordered by month (1–12). Returns an empty list if none found.
     */
    public List<SeasonalData> getSeasonalData(String destination) {
        if (destination == null || destination.isBlank()) {
            return List.of();
        }
        return seasonalDataRepo.findByDestination(destination.trim());
    }
}
