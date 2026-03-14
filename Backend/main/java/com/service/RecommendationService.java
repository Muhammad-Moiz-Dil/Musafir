package com.service;

import com.model.Destination;
import com.model.UserPreferences;
import com.repository.DestinationRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private final DestinationRepository destinationRepo;

    // Travel preference → keywords matched against destination name + city + description
    private static final Map<String, List<String>> PREF_KEYWORDS = new LinkedHashMap<>();

    static {
        PREF_KEYWORDS.put("Mountains",
            Arrays.asList("mountain", "peak", "altitude", "himalaya", "karakoram",
                          "gilgit", "baltistan", "hill", "range", "hunza", "nanga parbat", "pass"));

        PREF_KEYWORDS.put("Lakes & Rivers",
            Arrays.asList("lake", "river", "water", "stream", "kaghan", "saiful",
                          "naltar", "sheosar", "attabad", "lulusar"));

        PREF_KEYWORDS.put("Adventure",
            Arrays.asList("adventure", "k2", "expedition", "climbing", "extreme",
                          "challenging", "rafting", "thrilling", "base camp", "skardu"));

        PREF_KEYWORDS.put("Family Trips",
            Arrays.asList("family", "murree", "hill station", "resort", "comfortable",
                          "peaceful", "picnic", "children", "safe", "popular", "getaway",
                          "weekend", "retreat", "summer", "cool", "pine"));

        PREF_KEYWORDS.put("History & Culture",
            Arrays.asList("history", "historical", "fort", "culture", "heritage",
                          "archaeological", "museum", "ancient", "monument",
                          "civilization", "buddhist", "silk road", "ruins"));

        PREF_KEYWORDS.put("Photography",
            Arrays.asList("scenic", "beautiful", "landscape", "photography", "vista",
                          "panorama", "picturesque", "breathtaking", "stunning", "view",
                          "sunrise", "sunset", "colourful", "colorful"));

        PREF_KEYWORDS.put("Trekking",
            Arrays.asList("trek", "trekking", "hiking", "trail", "base camp",
                          "concordia", "nanga parbat", "fairy meadows", "k2",
                          "walk", "hike", "climb", "pass", "glacier"));

        PREF_KEYWORDS.put("Local Food",
            Arrays.asList("food", "cuisine", "local", "traditional", "bazaar",
                          "market", "restaurant", "taste", "delicacy", "dish", "flavour"));

        PREF_KEYWORDS.put("Scenic",
            Arrays.asList("scenic", "valley", "view", "landscape", "beautiful",
                          "lush", "green", "waterfall", "meadow", "cherry blossom",
                          "flowers", "swat", "hunza", "serene", "pristine"));
    }

    // Age-group default preferences — used ONLY when user has chosen no preferences
    private static final Map<String, List<String>> AGE_DEFAULTS = new HashMap<>();

    static {
        AGE_DEFAULTS.put("Under 18", Arrays.asList("Family Trips", "Scenic"));
        AGE_DEFAULTS.put("18-25",    Arrays.asList("Adventure", "Trekking"));
        AGE_DEFAULTS.put("26-35",    Arrays.asList("Scenic", "Photography", "Adventure"));
        AGE_DEFAULTS.put("36-50",    Arrays.asList("History & Culture", "Scenic", "Family Trips"));
        AGE_DEFAULTS.put("50+",      Arrays.asList("History & Culture", "Scenic", "Photography"));
    }

    public RecommendationService(DestinationRepository destinationRepo) {
        this.destinationRepo = destinationRepo;
    }

    /**
     * Returns:
     *   { "noMatches": boolean, "destinations": [...] }
     *
     * Logic:
     *   - User HAS preferences  → score by preferences only (age is ignored)
     *   - User has NO preferences → score by age-group defaults
     *   - No destination matched the active preferences → noMatches = true,
     *     destinations = top-rated (popular) list
     */
    public Map<String, Object> getRecommendations(UserPreferences prefs, int limit) {
        List<Destination> all = destinationRepo.findByIsActiveTrueOrderByNameAsc();
        if (all.isEmpty()) return result(false, Collections.emptyList());

        List<String> userPrefs = parseJsonArray(prefs != null ? prefs.getTravelPreferences() : null);
        String ageGroup = (prefs != null && prefs.getAgeGroup() != null) ? prefs.getAgeGroup() : "18-25";

        // Decide which preference list to score against
        List<String> activePrefs;
        if (!userPrefs.isEmpty()) {
            // User has set preferences — use them exclusively
            activePrefs = userPrefs;
        } else {
            // No preferences set — fall back to age-group defaults
            activePrefs = AGE_DEFAULTS.getOrDefault(ageGroup, Collections.emptyList());
        }

        // If no active prefs at all, return top-rated
        if (activePrefs.isEmpty()) {
            return result(false, topRated(all, limit));
        }

        // Score every destination — only matched destinations are returned
        List<Map<String, Object>> scored = score(all, activePrefs, limit);

        // Empty list means no destination matched any preference keyword
        if (scored.isEmpty()) {
            return result(true, topRated(all, limit));
        }

        return result(false, scored);
    }

    // ── Private helpers ───────────────────────────────────────

    private List<Map<String, Object>> score(List<Destination> all,
                                             List<String> activePrefs,
                                             int limit) {
        List<Map<String, Object>> list = all.stream().map(d -> {
            String text = (
                (d.getName()        != null ? d.getName()        : "") + " " +
                (d.getCity()        != null ? d.getCity()        : "") + " " +
                (d.getDescription() != null ? d.getDescription() : "")
            ).toLowerCase();

            int prefScore = 0;
            List<String> matched = new ArrayList<>();

            for (String pref : activePrefs) {
                List<String> keywords = PREF_KEYWORDS.getOrDefault(pref, Collections.emptyList());
                long hits = keywords.stream().filter(text::contains).count();
                if (hits > 0) {
                    prefScore += 8 + (int)(hits * 4); // 8 base + 4 per keyword hit
                    matched.add(pref);
                }
            }

            // Destination did not match any preference — exclude it
            if (prefScore == 0) return null;

            // Rating as tiebreaker only (max +10)
            double rating = d.getAverageRating() != null ? d.getAverageRating().doubleValue() : 0.0;
            int total = prefScore + (int)(rating * 2);

            String reason = String.join(", ", matched.subList(0, Math.min(2, matched.size())));

            return buildDestMap(d, total, reason);
        }).filter(Objects::nonNull).collect(Collectors.toList());

        list.sort((a, b) -> {
            int cmp = Integer.compare((Integer) b.get("score"), (Integer) a.get("score"));
            if (cmp != 0) return cmp;
            return Double.compare((Double) b.get("averageRating"), (Double) a.get("averageRating"));
        });

        return list.stream().limit(limit).collect(Collectors.toList());
    }

    private List<Map<String, Object>> topRated(List<Destination> all, int limit) {
        return all.stream()
            .sorted(Comparator.comparingDouble(d ->
                -(d.getAverageRating() != null ? d.getAverageRating().doubleValue() : 0.0)))
            .limit(limit)
            .map(d -> buildDestMap(d, 0, "Popular"))
            .collect(Collectors.toList());
    }

    private Map<String, Object> result(boolean noMatches, List<Map<String, Object>> destinations) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("noMatches",    noMatches);
        r.put("destinations", destinations);
        return r;
    }

    private Map<String, Object> buildDestMap(Destination d, int score, String matchReason) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            d.getDestinationId());
        m.put("name",          d.getName());
        m.put("city",          d.getCity()          != null ? d.getCity()          : "");
        m.put("description",   d.getDescription()   != null ? d.getDescription()   : "");
        m.put("imageUrl",      d.getImageUrl()       != null ? d.getImageUrl()      : "");
        m.put("averageRating", d.getAverageRating()  != null ? d.getAverageRating().doubleValue() : 0.0);
        m.put("totalReviews",  d.getTotalReviews()   != null ? d.getTotalReviews()  : 0);
        m.put("score",         score);
        m.put("matchReason",   matchReason);
        return m;
    }

    /** Parses a JSON array string like ["Mountains","Adventure"] into a List<String>. */
    private List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return Collections.emptyList();
        String inner = json.trim();
        if (inner.startsWith("[")) inner = inner.substring(1);
        if (inner.endsWith("]"))   inner = inner.substring(0, inner.length() - 1);
        return Arrays.stream(inner.split(","))
            .map(s -> s.trim().replaceAll("^\"|\"$", ""))
            .filter(s -> !s.isBlank())
            .collect(Collectors.toList());
    }
}
