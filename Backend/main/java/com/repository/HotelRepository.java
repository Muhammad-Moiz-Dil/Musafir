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

    boolean existsByHotelNameIgnoreCase(String hotelName);

    boolean existsByHotelNameIgnoreCaseAndHotelIdNot(String hotelName, Integer hotelId);

    boolean existsByContactNumber(String contactNumber);

    boolean existsByContactNumberAndHotelIdNot(String contactNumber, Integer hotelId);

    List<Hotel> findByHotelNameContainingIgnoreCaseAndIsActiveTrue(String name);

    List<Hotel> findByHotelNameContainingIgnoreCaseAndIsActiveTrueAndDestinationId(String name, Integer destinationId);

    List<Hotel> findByIsActiveTrueAndDestinationId(Integer destinationId);
}
