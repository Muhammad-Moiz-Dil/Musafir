package com.controller;

import com.model.Destination;
import com.model.EmergencyInfo;
import com.model.TravelGuideline;
import com.repository.DestinationRepository;
import com.repository.EmergencyInfoRepository;
import com.repository.TravelGuidelineRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/emergency")
@CrossOrigin(origins = "*")
public class EmergencyInfoController {

    private final EmergencyInfoRepository emergencyRepo;
    private final TravelGuidelineRepository guidelineRepo;
    private final DestinationRepository destinationRepo;

    public EmergencyInfoController(EmergencyInfoRepository emergencyRepo,
                                   TravelGuidelineRepository guidelineRepo,
                                   DestinationRepository destinationRepo) {
        this.emergencyRepo   = emergencyRepo;
        this.guidelineRepo   = guidelineRepo;
        this.destinationRepo = destinationRepo;
    }

    /**
     * GET /api/emergency/{destinationId}
     * Returns emergency contacts + safety guidelines for a destination.
     */
    @GetMapping("/{destinationId}")
    public ResponseEntity<?> getByDestination(@PathVariable Integer destinationId) {

        Optional<Destination> destOpt = destinationRepo.findById(destinationId);
        if (destOpt.isEmpty() || !Boolean.TRUE.equals(destOpt.get().getIsActive())) {
            return ResponseEntity.status(404).body(Map.of(
                "message", "Destination not found"
            ));
        }
        Destination dest = destOpt.get();

        // Emergency contacts
        Optional<EmergencyInfo> infoOpt = emergencyRepo.findByDestination_DestinationId(destinationId);
        Map<String, Object> contacts = new LinkedHashMap<>();
        if (infoOpt.isPresent()) {
            EmergencyInfo e = infoOpt.get();
            contacts.put("available",        true);
            contacts.put("policeNumber",      nvl(e.getPoliceNumber(),      "15"));
            contacts.put("ambulanceNumber",   nvl(e.getAmbulanceNumber(),   "1122"));
            contacts.put("fireService",       nvl(e.getFireServiceNumber(), "16"));
            contacts.put("touristHelpline",   nvl(e.getTouristHelpline(),   "1422"));
            contacts.put("nearestHospital",   nvl(e.getNearestHospital(),   "Contact PTDC"));
            contacts.put("embassyContact",    nvl(e.getEmbassyContact(),    "051-111-888-444"));
            contacts.put("covidRules",        e.getCovidRules() != null ? e.getCovidRules() : "");
        } else {
            contacts.put("available",        false);
            contacts.put("policeNumber",     "15");
            contacts.put("ambulanceNumber",  "1122");
            contacts.put("fireService",      "16");
            contacts.put("touristHelpline",  "1422");
            contacts.put("nearestHospital",  "Contact local PTDC office");
            contacts.put("embassyContact",   "051-111-888-444");
            contacts.put("covidRules",       "");
        }

        // Safety guidelines (category = 'Safety')
        List<TravelGuideline> safetyList =
            guidelineRepo.findByDestinationIdAndCategory(destinationId, "Safety");

        // If no safety-specific guidelines, fall back to all guidelines
        if (safetyList.isEmpty()) {
            safetyList = guidelineRepo.findByDestinationId(destinationId);
        }

        List<Map<String, String>> guidelines = safetyList.stream().map(g -> {
            Map<String, String> m = new LinkedHashMap<>();
            m.put("title",    g.getTitle());
            m.put("content",  g.getContent());
            m.put("category", nvl(g.getCategory(), "General"));
            return m;
        }).collect(Collectors.toList());

        // Build response
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("destinationId",   dest.getDestinationId());
        response.put("destinationName", dest.getName());
        response.put("city",            nvl(dest.getCity(), "Pakistan"));
        response.put("contacts",        contacts);
        response.put("guidelines",      guidelines);

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/emergency
     * Returns a summary list of all destinations with their emergency contacts.
     */
    @GetMapping
    public ResponseEntity<?> getAllSummary() {
        List<Destination> destinations = destinationRepo.findByIsActiveTrueOrderByNameAsc();

        List<Map<String, Object>> result = destinations.stream().map(dest -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("destinationId",   dest.getDestinationId());
            item.put("destinationName", dest.getName());
            item.put("city",            nvl(dest.getCity(), "Pakistan"));
            item.put("imageUrl",        nvl(dest.getImageUrl(), ""));

            Optional<EmergencyInfo> infoOpt =
                emergencyRepo.findByDestination_DestinationId(dest.getDestinationId());

            if (infoOpt.isPresent()) {
                EmergencyInfo e = infoOpt.get();
                item.put("available",      true);
                item.put("policeNumber",   nvl(e.getPoliceNumber(),    "15"));
                item.put("ambulanceNumber",nvl(e.getAmbulanceNumber(), "1122"));
                item.put("touristHelpline",nvl(e.getTouristHelpline(), "1422"));
                item.put("nearestHospital",nvl(e.getNearestHospital(), "Contact PTDC"));
            } else {
                item.put("available",      false);
                item.put("policeNumber",   "15");
                item.put("ambulanceNumber","1122");
                item.put("touristHelpline","1422");
                item.put("nearestHospital","Contact local PTDC office");
            }
            return item;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    private String nvl(String value, String fallback) {
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
