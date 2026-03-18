package com.repository;

import com.model.RoomType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, Integer> {

    List<RoomType> findByHotelIdAndIsActiveTrueOrderByPricePerNightAsc(Integer hotelId);

    List<RoomType> findByHotelIdInAndIsActiveTrue(List<Integer> hotelIds);
}
