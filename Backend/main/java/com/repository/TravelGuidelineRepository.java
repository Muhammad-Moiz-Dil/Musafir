package com.repository;

import com.model.TravelGuideline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TravelGuidelineRepository extends JpaRepository<TravelGuideline, Integer> {

    /**
     * Returns all guidelines for a destination, sorted by category then title
     * so the frontend can group them cleanly.
     */
    List<TravelGuideline> findByDestinationIdOrderByCategoryAscTitleAsc(Integer destinationId);

    /** Used by EmergencyInfoController to fetch safety-category guidelines only. */
    List<TravelGuideline> findByDestinationIdAndCategory(Integer destinationId, String category);

    /** Fallback: all guidelines for a destination when no safety-specific ones exist. */
    List<TravelGuideline> findByDestinationId(Integer destinationId);
}
