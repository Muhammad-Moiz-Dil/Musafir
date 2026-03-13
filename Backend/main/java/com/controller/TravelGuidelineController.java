package com.controller;

import com.model.Destination;
import com.model.TravelGuideline;
import com.repository.DestinationRepository;
import com.repository.TravelGuidelineRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * UC-07 — Travel Guidelines
 *
 * GET /api/guidelines/destinations  — list all active destinations (for the dropdown)
 * GET /api/guidelines/{destId}      — fetch guidelines for a specific destination
 */
@RestController
@RequestMapping("/api/guidelines")
@CrossOrigin(origins = "*")
public class TravelGuidelineController {

    private final DestinationRepository    destinationRepo;
    private final TravelGuidelineRepository guidelineRepo;

    public TravelGuidelineController(DestinationRepository destinationRepo,
                                     TravelGuidelineRepository guidelineRepo) {
        this.destinationRepo = destinationRepo;
        this.guidelineRepo   = guidelineRepo;
    }

    /**
     * GET /api/guidelines/destinations
     * Returns all active destinations so the frontend can populate the dropdown.
     * Reuses DestinationRepository — no duplication of destination data.
     */
    @GetMapping("/destinations")
    public ResponseEntity<?> listDestinations() {
        List<Destination> destinations = destinationRepo.findByIsActiveTrueOrderByNameAsc();

        if (destinations.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "No destinations available"));
        }

        // Return only id + name — that is all the dropdown needs
        List<Map<String, Object>> data = destinations.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",   d.getDestinationId());
            m.put("name", d.getName());
            m.put("city", d.getCity() != null ? d.getCity() : "");
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }

    /**
     * GET /api/guidelines/{destinationId}
     *
     * Returns all travel guidelines for the requested destination.
     * Each guideline has: id, title, content, category.
     *
     * 404 is returned when:
     *  (a) the destination does not exist / is inactive, OR
     *  (b) the destination exists but has no guidelines yet
     *      → frontend shows the "being updated" alternate-flow message.
     */
    @GetMapping("/{destinationId}")
    public ResponseEntity<?> getByDestination(@PathVariable Integer destinationId) {

        // Verify the destination exists and is active
        boolean destExists = destinationRepo.findById(destinationId)
                .map(d -> Boolean.TRUE.equals(d.getIsActive()))
                .orElse(false);

        if (!destExists) {
            return ResponseEntity.status(404).body(
                Map.of("message", "Destination not found")
            );
        }

        List<TravelGuideline> guidelines =
                guidelineRepo.findByDestinationIdOrderByCategoryAscTitleAsc(destinationId);

        // Alternate flow: destination exists but no guidelines in DB yet
        if (guidelines.isEmpty()) {
            return ResponseEntity.status(404).body(
                Map.of("message", "no_guidelines")
            );
        }

        // Map each guideline row to a clean response object
        List<Map<String, Object>> data = guidelines.stream().map(g -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",       g.getGuidelineId());
            m.put("title",    g.getTitle()    != null ? g.getTitle()    : "");
            m.put("content",  g.getContent()  != null ? g.getContent()  : "");
            m.put("category", g.getCategory() != null ? g.getCategory() : "General");
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }
}
