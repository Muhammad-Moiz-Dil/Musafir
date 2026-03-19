package com.repository;

import com.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByCnic(String cnic);

    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<User> findByUserType(User.UserType userType);
}
