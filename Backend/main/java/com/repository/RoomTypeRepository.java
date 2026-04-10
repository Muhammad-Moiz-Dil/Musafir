package com.repository;

import com.model.RoomType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, Integer> {

    List<RoomType> findByHotelIdAndIsActiveTrueOrderByPricePerNightAsc(Integer hotelId);

    List<RoomType> findByHotelIdInAndIsActiveTrue(List<Integer> hotelIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RoomType r WHERE r.roomTypeId = :id")
    Optional<RoomType> findByIdForUpdate(Integer id);
}
