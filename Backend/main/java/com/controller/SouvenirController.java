package com.controller;

import com.model.Souvenir;
import com.service.SouvenirService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/souvenirs")
@CrossOrigin(origins = "*")
public class SouvenirController {

    private final SouvenirService souvenirService;

    public SouvenirController(SouvenirService souvenirService) {
        this.souvenirService = souvenirService;
    }

    /** GET /api/souvenirs — return all active souvenirs */
    @GetMapping
    public ResponseEntity<?> getAllSouvenirs() {
        List<Souvenir> souvenirs = souvenirService.getAllSouvenirs();

        if (souvenirs.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "message", "No souvenirs available at the moment."
            ));
        }

        return ResponseEntity.ok(toResponseList(souvenirs));
    }

    /** GET /api/souvenirs/{destinationId} — return souvenirs for a destination */
    @GetMapping("/{destinationId}")
    public ResponseEntity<?> getSouvenirsByDestination(@PathVariable Integer destinationId) {
        List<Souvenir> souvenirs = souvenirService.getSouvenirsByDestination(destinationId);

        if (souvenirs.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "message", "No local souvenirs listed for this area yet."
            ));
        }

        return ResponseEntity.ok(toResponseList(souvenirs));
    }

    // ── Helpers ───────────────────────────────────────────────

    private List<Map<String, Object>> toResponseList(List<Souvenir> souvenirs) {
        return souvenirs.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              s.getSouvenirId());
            m.put("name",            s.getName()        != null ? s.getName()        : "");
            m.put("description",     s.getDescription() != null ? s.getDescription() : "");
            m.put("price",           s.getPrice()       != null ? s.getPrice()       : 0.0);
            m.put("imageUrl",        s.getImageUrl()    != null ? s.getImageUrl()    : "");
            m.put("vendorName",      s.getVendorName()  != null ? s.getVendorName()  : "");
            m.put("destinationId",   s.getDestination().getDestinationId());
            m.put("destinationName", s.getDestination().getName() != null ? s.getDestination().getName() : "");
            return m;
        }).collect(Collectors.toList());
    }
}
