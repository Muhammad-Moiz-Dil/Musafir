package com.repository;

import com.model.SeasonalData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonalDataRepository extends JpaRepository<SeasonalData, Integer> {

    @Query("SELECT s FROM SeasonalData s WHERE s.destination.name = :destination ORDER BY s.month ASC")
    List<SeasonalData> findByDestination(@Param("destination") String destination);
}
