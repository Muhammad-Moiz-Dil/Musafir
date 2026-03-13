package com.repository;

import com.model.TripDestination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripDestinationRepository extends JpaRepository<TripDestination, Integer> {
    List<TripDestination> findByTripIdOrderByVisitOrder(Integer tripId);
    boolean existsByTripIdAndDestinationId(Integer tripId, Integer destinationId);
    void deleteByTripIdAndDestinationId(Integer tripId, Integer destinationId);
    void deleteByTripId(Integer tripId);
}
