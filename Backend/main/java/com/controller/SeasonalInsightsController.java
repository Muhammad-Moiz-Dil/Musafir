package com.controller;

import com.model.Destination;
import com.model.SeasonalData;
import com.model.User;
import com.repository.DestinationRepository;
import com.repository.SeasonalDataRepository;
import com.repository.UserRepository;
import com.service.SeasonalInsightsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/seasonal-data")
@CrossOrigin(origins = "*")
public class SeasonalInsightsController {

    private static final String[] MONTH_NAMES = {
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };

    private final SeasonalInsightsService  seasonalInsightsService;
    private final SeasonalDataRepository   seasonalDataRepo;
    private final DestinationRepository    destRepo;
    private final UserRepository           userRepo;

    public SeasonalInsightsController(SeasonalInsightsService seasonalInsightsService,
                                      SeasonalDataRepository seasonalDataRepo,
                                      DestinationRepository destRepo,
                                      UserRepository userRepo) {
        this.seasonalInsightsService = seasonalInsightsService;
        this.seasonalDataRepo        = seasonalDataRepo;
        this.destRepo                = destRepo;
        this.userRepo                = userRepo;
    }

    /** GET /api/seasonal-data/{destination} */
    @GetMapping("/{destination}")
    public ResponseEntity<?> getSeasonalData(@PathVariable String destination) {
        List<SeasonalData> records = seasonalInsightsService.getSeasonalData(destination);

        if (records.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "message", "No seasonal insights available for this location yet."
            ));
        }

        List<Map<String, Object>> data = records.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month",       s.getMonth());
            m.put("monthName",   MONTH_NAMES[s.getMonth() - 1]);
            m.put("temperature", s.getTemperature());
            m.put("rainfall",    s.getRainfall());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("destination", destination);
        response.put("months",      data);

        return ResponseEntity.ok(response);
    }

    /** GET /api/seasonal-data/admin/{destinationId} — Admin: get all months for a destination by ID */
    @GetMapping("/admin/{destinationId}")
    public ResponseEntity<?> getSeasonalDataAdmin(@PathVariable Integer destinationId, Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        if (admin == null || admin.getUserType() != User.UserType.Admin)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        if (!destRepo.existsById(destinationId))
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        List<SeasonalData> records = seasonalDataRepo.findByDestinationDestinationIdOrderByMonthAsc(destinationId);

        List<Map<String, Object>> data = records.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("month",       s.getMonth());
            m.put("monthName",   MONTH_NAMES[s.getMonth() - 1]);
            m.put("temperature", s.getTemperature());
            m.put("rainfall",    s.getRainfall());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("months", data));
    }

    /** PUT /api/seasonal-data/admin/{destinationId} — Admin: upsert all 12 months for a destination */
    @PutMapping("/admin/{destinationId}")
    public ResponseEntity<?> saveSeasonalDataAdmin(@PathVariable Integer destinationId,
                                                   @RequestBody List<Map<String, Object>> months,
                                                   Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        if (admin == null || admin.getUserType() != User.UserType.Admin)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        Destination dest = destRepo.findById(destinationId).orElse(null);
        if (dest == null)
            return ResponseEntity.status(404).body(Map.of("message", "Destination not found"));

        for (Map<String, Object> row : months) {
            Object monthObj = row.get("month");
            if (monthObj == null) continue;
            int month;
            try { month = Integer.parseInt(monthObj.toString()); }
            catch (NumberFormatException e) { continue; }
            if (month < 1 || month > 12) continue;

            SeasonalData record = seasonalDataRepo
                .findByDestinationDestinationIdAndMonth(destinationId, month)
                .orElseGet(() -> {
                    SeasonalData s = new SeasonalData();
                    s.setDestination(dest);
                    s.setMonth(month);
                    return s;
                });

            try {
                Object tempObj = row.get("temperature");
                record.setTemperature(tempObj != null && !tempObj.toString().isBlank()
                    ? new BigDecimal(tempObj.toString()) : null);

                Object rainObj = row.get("rainfall");
                record.setRainfall(rainObj != null && !rainObj.toString().isBlank()
                    ? new BigDecimal(rainObj.toString()) : null);

                Object priceObj = row.get("averagePrice");
                record.setAveragePrice(priceObj != null && !priceObj.toString().isBlank()
                    ? new BigDecimal(priceObj.toString()) : null);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid numeric value for month " + month));
            }

            seasonalDataRepo.save(record);
        }

        return ResponseEntity.ok(Map.of("message", "Seasonal data saved successfully"));
    }
}
