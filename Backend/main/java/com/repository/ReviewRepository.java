package com.repository;

import com.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer> {
    Optional<Review> findByUserIdAndDestinationId(Integer userId, Integer destinationId);
    boolean existsByUserIdAndDestinationId(Integer userId, Integer destinationId);
    List<Review> findByUserIdOrderByCreatedAtDesc(Integer userId);
    List<Review> findByDestinationId(Integer destinationId);
}
