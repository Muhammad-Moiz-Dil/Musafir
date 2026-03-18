package com.repository;

import com.model.HotelReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HotelReviewRepository extends JpaRepository<HotelReview, Integer> {

    boolean existsByUserIdAndHotelId(Integer userId, Integer hotelId);

    List<HotelReview> findByHotelIdOrderByCreatedAtDesc(Integer hotelId);

    List<HotelReview> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
