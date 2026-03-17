package com.repository;

import com.model.Destination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DestinationRepository extends JpaRepository<Destination, Integer> {

    List<Destination> findByIsActiveTrueOrderByNameAsc();

    // pattern should be passed as "%term%" from the caller
    @Query("SELECT d FROM Destination d WHERE d.isActive = true AND " +
           "(d.name LIKE :pattern OR d.city LIKE :pattern OR d.description LIKE :pattern " +
           " OR d.searchKeywords LIKE :pattern) " +
           "ORDER BY d.name ASC")
    List<Destination> searchByQuery(@Param("pattern") String pattern);
}
