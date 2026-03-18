package com.repository;

import com.model.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, Integer> {

    List<Hotel> findByIsActiveTrueOrderByStarRatingDesc();

    Optional<Hotel> findByHotelIdAndIsActiveTrue(Integer hotelId);

    List<Hotel> findByManagerId(Integer managerId);
}
