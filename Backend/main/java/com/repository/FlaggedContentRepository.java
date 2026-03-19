package com.repository;

import com.model.FlaggedContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FlaggedContentRepository extends JpaRepository<FlaggedContent, Integer> {

    boolean existsByContentTypeAndContentId(String contentType, Integer contentId);

    List<FlaggedContent> findByStatusOrderByCreatedAtDesc(FlaggedContent.FlagStatus status);

    long countByStatus(FlaggedContent.FlagStatus status);
}
