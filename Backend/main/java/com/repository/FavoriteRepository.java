package com.repository;

import com.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Integer> {

    /** All favorites for a user, newest first */
    List<Favorite> findByUserIdOrderByAddedAtDesc(Integer userId);

    /** Just the destination IDs a user has saved */
    @Query("SELECT f.destinationId FROM Favorite f WHERE f.userId = :userId")
    List<Integer> findDestinationIdsByUserId(@Param("userId") Integer userId);

    /** Check if a specific favorite exists */
    Optional<Favorite> findByUserIdAndDestinationId(Integer userId, Integer destinationId);

    /** Delete a specific favorite */
    void deleteByUserIdAndDestinationId(Integer userId, Integer destinationId);

    /** Check existence without fetching */
    boolean existsByUserIdAndDestinationId(Integer userId, Integer destinationId);
}
