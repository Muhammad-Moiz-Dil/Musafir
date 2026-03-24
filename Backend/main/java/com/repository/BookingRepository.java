package com.repository;

import com.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Integer> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(Integer userId);

    List<Booking> findAllByOrderByCreatedAtDesc();

    List<Booking> findByHotelIdInOrderByCreatedAtDesc(List<Integer> hotelIds);

    List<Booking> findByUserIdAndHotelIdAndBookingStatusIn(Integer userId, Integer hotelId,
                                                           List<Booking.BookingStatus> statuses);

    List<Booking> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    int countByUserId(Integer userId);
}
