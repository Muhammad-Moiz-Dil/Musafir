package com.repository;

import com.model.TravelGuideline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TravelGuidelineRepository extends JpaRepository<TravelGuideline, Integer> {
    List<TravelGuideline> findByDestination_DestinationId(Integer destinationId);
    List<TravelGuideline> findByDestination_DestinationIdAndCategory(Integer destinationId, String category);
}
