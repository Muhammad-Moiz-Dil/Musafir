package com.repository;

import com.model.HotelReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HotelReviewRepository extends JpaRepository<HotelReview, Integer> {

    boolean existsByUserIdAndHotelId(Integer userId, Integer hotelId);

    List<HotelReview> findByHotelIdOrderByCreatedAtDesc(Integer hotelId);

    List<HotelReview> findByUserIdOrderByCreatedAtDesc(Integer userId);

    List<HotelReview> findAllByOrderByCreatedAtDesc();

    long countByHotelId(Integer hotelId);

    @Query("SELECT AVG(r.rating) FROM HotelReview r WHERE r.hotelId = :hotelId")
    Double avgRatingByHotelId(@Param("hotelId") Integer hotelId);
}
