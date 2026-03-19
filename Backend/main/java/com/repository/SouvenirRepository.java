package com.repository;

import com.model.Souvenir;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SouvenirRepository extends JpaRepository<Souvenir, Integer> {

    List<Souvenir> findByDestination_DestinationIdAndIsActiveTrue(Integer destinationId);

    List<Souvenir> findByDestination_DestinationIdOrderByNameAsc(Integer destinationId);
}
