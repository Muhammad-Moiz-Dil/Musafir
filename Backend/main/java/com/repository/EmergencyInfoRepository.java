package com.repository;

import com.model.EmergencyInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmergencyInfoRepository extends JpaRepository<EmergencyInfo, Integer> {
    Optional<EmergencyInfo> findByDestination_DestinationId(Integer destinationId);
}
