package com.controller;

import com.model.SeasonalData;
import com.service.SeasonalInsightsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    private final SeasonalInsightsService seasonalInsightsService;

    public SeasonalInsightsController(SeasonalInsightsService seasonalInsightsService) {
        this.seasonalInsightsService = seasonalInsightsService;
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
            m.put("month",        s.getMonth());
            m.put("monthName",    MONTH_NAMES[s.getMonth() - 1]);
            m.put("temperature",  s.getTemperature());
            m.put("rainfall",     s.getRainfall());
            m.put("averagePrice", s.getAveragePrice());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("destination", destination);
        response.put("months",      data);

        return ResponseEntity.ok(response);
    }
}
