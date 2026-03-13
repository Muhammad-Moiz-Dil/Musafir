package com.controller;

import com.model.Destination;
import com.repository.DestinationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/destinations")
@CrossOrigin(origins = "*")
public class DestinationController {

    private final DestinationRepository destinationRepo;

    public DestinationController(DestinationRepository destinationRepo) {
        this.destinationRepo = destinationRepo;
    }

    /** GET /api/destinations/search?q=... */
    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam(value = "q", defaultValue = "") String q) {

        String query = q.trim();

        // Validate: only letters, numbers, spaces allowed
        if (!query.isEmpty() && !query.matches("[a-zA-Z0-9 ]+")) {
            return ResponseEntity.status(400).body(Map.of(
                "message", "Please use letters and numbers only"
            ));
        }

        // Fetch results
        List<Destination> results = query.isEmpty()
            ? destinationRepo.findByIsActiveTrueOrderByNameAsc()
            : destinationRepo.searchByQuery("%" + query + "%");

        // No results
        if (results.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "message", "No destinations found for this search"
            ));
        }

        // Map to response
        List<Map<String, Object>> data = results.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",            d.getDestinationId());
            m.put("name",          d.getName());
            m.put("city",          d.getCity()          != null ? d.getCity()          : "");
            m.put("description",   d.getDescription()   != null ? d.getDescription()   : "");
            m.put("imageUrl",      d.getImageUrl()      != null ? d.getImageUrl()      : "");
            m.put("averageRating", d.getAverageRating() != null ? d.getAverageRating().doubleValue() : 0.0);
            m.put("totalReviews",  d.getTotalReviews()  != null ? d.getTotalReviews()  : 0);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(data);
    }
}
