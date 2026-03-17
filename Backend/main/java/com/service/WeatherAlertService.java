package com.service;

import com.model.Destination;
import com.model.Favorite;
import com.model.Notification;
import com.repository.DestinationRepository;
import com.repository.FavoriteRepository;
import com.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class WeatherAlertService {

    private final FavoriteRepository favoriteRepo;
    private final DestinationRepository destinationRepo;
    private final NotificationRepository notificationRepo;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${weather.api-key}")
    private String weatherApiKey;

    private static final double TEMP_EXTREME_HOT  = 40.0;
    private static final double TEMP_EXTREME_COLD = 0.0;
    private static final double WIND_STRONG       = 15.0; // m/s

    public WeatherAlertService(FavoriteRepository favoriteRepo,
                               DestinationRepository destinationRepo,
                               NotificationRepository notificationRepo) {
        this.favoriteRepo    = favoriteRepo;
        this.destinationRepo = destinationRepo;
        this.notificationRepo = notificationRepo;
    }

    // ── Scheduled check every hour ─────────────────────────────────────────────
    @Scheduled(fixedRate = 3_600_000, initialDelay = 120_000)
    @Transactional
    public void scheduledWeatherCheck() {
        List<Favorite> allFavs = favoriteRepo.findAll();

        // Group destination → list of user IDs so we fetch OWM once per destination
        Map<Integer, List<Integer>> destToUsers = new LinkedHashMap<>();
        for (Favorite f : allFavs) {
            destToUsers.computeIfAbsent(f.getDestinationId(), k -> new ArrayList<>())
                       .add(f.getUserId());
        }

        for (Map.Entry<Integer, List<Integer>> entry : destToUsers.entrySet()) {
            Optional<Destination> destOpt = destinationRepo.findById(entry.getKey());
            if (destOpt.isEmpty()) continue;
            Destination dest = destOpt.get();
            try {
                Map<String, Object> owm = fetchWeather(dest);
                if (owm == null) continue;
                List<AlertInfo> alerts = detectAlerts(owm, dest.getName());
                for (Integer userId : entry.getValue()) {
                    for (AlertInfo alert : alerts) {
                        saveAlertIfNew(userId, dest.getDestinationId(), alert);
                    }
                }
            } catch (Exception ignored) {
                // Skip this destination if OWM call fails; don't crash the scheduler
            }
        }
    }

    // ── Called by controller: live weather + stored notifications for one user ─
    @Transactional
    public Map<String, Object> getAlertsForUser(Integer userId) {
        List<Integer> destIds = favoriteRepo.findDestinationIdsByUserId(userId);
        List<Map<String, Object>> liveWeather = new ArrayList<>();

        for (Integer destId : destIds) {
            Optional<Destination> destOpt = destinationRepo.findById(destId);
            if (destOpt.isEmpty()) continue;
            Destination dest = destOpt.get();
            try {
                Map<String, Object> owm = fetchWeather(dest);
                if (owm == null) {
                    liveWeather.add(errorCard(dest));
                    continue;
                }
                liveWeather.add(buildWeatherCard(dest, owm));
                // Opportunistically generate new alerts
                for (AlertInfo alert : detectAlerts(owm, dest.getName())) {
                    saveAlertIfNew(userId, destId, alert);
                }
            } catch (Exception ignored) {
                liveWeather.add(errorCard(dest));
            }
        }

        List<Notification> notifications = notificationRepo
                .findByUserIdAndTypeOrderByCreatedAtDesc(userId, "WEATHER_ALERT");
        long unreadCount = notificationRepo
                .countByUserIdAndTypeAndIsReadFalse(userId, "WEATHER_ALERT");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("liveWeather", liveWeather);
        result.put("notifications", notifications);
        result.put("unreadCount", unreadCount);
        return result;
    }

    public long getUnreadCount(Integer userId) {
        return notificationRepo.countByUserIdAndTypeAndIsReadFalse(userId, "WEATHER_ALERT");
    }

    @Transactional
    public void markRead(Integer notificationId, Integer userId) {
        notificationRepo.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(userId)) {
                n.setIsRead(true);
                notificationRepo.save(n);
            }
        });
    }

    @Transactional
    public void markAllRead(Integer userId) {
        notificationRepo.markAllWeatherAlertsRead(userId);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchWeather(Destination dest) {
        Double lat = dest.getLatitude();
        Double lon = dest.getLongitude();
        String query = (lat != null && lon != null)
                ? "lat=" + lat + "&lon=" + lon
                : "q=" + dest.getName().replace(" ", "+") + ",PK";
        String url = "https://api.openweathermap.org/data/2.5/weather?"
                + query + "&appid=" + weatherApiKey + "&units=metric";
        try {
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildWeatherCard(Destination dest, Map<String, Object> owm) {
        Map<String, Object> main   = (Map<String, Object>) owm.getOrDefault("main", new HashMap<>());
        Map<String, Object> wind   = (Map<String, Object>) owm.getOrDefault("wind", new HashMap<>());
        List<Map<String, Object>> wList = (List<Map<String, Object>>) owm.get("weather");
        Map<String, Object> w = (wList != null && !wList.isEmpty()) ? wList.get(0) : new HashMap<>();

        double temp      = ((Number) main.getOrDefault("temp",       0)).doubleValue();
        double feelsLike = ((Number) main.getOrDefault("feels_like", 0)).doubleValue();
        int    humidity  = ((Number) main.getOrDefault("humidity",   0)).intValue();
        double windSpeed = ((Number) wind.getOrDefault("speed",      0)).doubleValue();
        int    condId    = ((Number) w.getOrDefault("id",          800)).intValue();
        String condition = (String) w.getOrDefault("main",        "Unknown");
        String desc      = (String) w.getOrDefault("description",       "");
        String icon      = (String) w.getOrDefault("icon",           "01d");

        Map<String, Object> card = new LinkedHashMap<>();
        card.put("destinationId",   dest.getDestinationId());
        card.put("destinationName", dest.getName());
        card.put("city",            dest.getCity());
        card.put("temp",            round1(temp));
        card.put("feelsLike",       round1(feelsLike));
        card.put("humidity",        humidity);
        card.put("windSpeed",       round1(windSpeed));
        card.put("condition",       condition);
        card.put("description",     desc);
        card.put("icon",            icon);
        card.put("iconUrl",         "https://openweathermap.org/img/wn/" + icon + "@2x.png");
        card.put("isAlert",         isSignificantCondition(condId, temp, windSpeed));
        card.put("error",           false);
        return card;
    }

    private Map<String, Object> errorCard(Destination dest) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("destinationId",   dest.getDestinationId());
        card.put("destinationName", dest.getName());
        card.put("city",            dest.getCity());
        card.put("error",           true);
        return card;
    }

    private boolean isSignificantCondition(int condId, double temp, double windSpeed) {
        return condId < 700 || temp >= TEMP_EXTREME_HOT || temp < TEMP_EXTREME_COLD || windSpeed >= WIND_STRONG;
    }

    @SuppressWarnings("unchecked")
    private List<AlertInfo> detectAlerts(Map<String, Object> owm, String destName) {
        List<AlertInfo> alerts = new ArrayList<>();
        Map<String, Object> main   = (Map<String, Object>) owm.getOrDefault("main", new HashMap<>());
        Map<String, Object> wind   = (Map<String, Object>) owm.getOrDefault("wind", new HashMap<>());
        List<Map<String, Object>> wList = (List<Map<String, Object>>) owm.get("weather");
        Map<String, Object> w = (wList != null && !wList.isEmpty()) ? wList.get(0) : new HashMap<>();

        double temp      = ((Number) main.getOrDefault("temp",  0)).doubleValue();
        double windSpeed = ((Number) wind.getOrDefault("speed", 0)).doubleValue();
        int    condId    = ((Number) w.getOrDefault("id",     800)).intValue();
        String desc      = (String) w.getOrDefault("description", "");

        if (temp >= TEMP_EXTREME_HOT) {
            alerts.add(new AlertInfo(
                "🌡️ Extreme Heat — " + destName,
                "Temperature is " + Math.round(temp) + "°C in " + destName
                    + ". Avoid outdoor activity between 11am–4pm and stay hydrated."
            ));
        }
        if (temp < TEMP_EXTREME_COLD) {
            alerts.add(new AlertInfo(
                "🥶 Freezing Temperature — " + destName,
                "Temperature has dropped to " + Math.round(temp) + "°C in " + destName
                    + ". Risk of ice on mountain roads and trekking trails."
            ));
        }
        if (condId >= 200 && condId < 300) {
            alerts.add(new AlertInfo(
                "⛈️ Thunderstorm — " + destName,
                "Thunderstorm (" + desc + ") detected in " + destName
                    + ". Avoid open areas and exposed ridgelines."
            ));
        } else if (condId >= 500 && condId < 600) {
            alerts.add(new AlertInfo(
                "🌧️ Heavy Rain — " + destName,
                "Rainfall (" + desc + ") in " + destName
                    + ". Roads may be slippery; risk of flash floods in mountain areas."
            ));
        } else if (condId >= 600 && condId < 700) {
            alerts.add(new AlertInfo(
                "❄️ Snowfall — " + destName,
                "Snow (" + desc + ") reported in " + destName
                    + ". High passes and roads may close. Check NHMP road alerts."
            ));
        } else if (condId == 781) {
            alerts.add(new AlertInfo(
                "🌪️ Tornado Warning — " + destName,
                "Tornado conditions reported near " + destName + ". Seek shelter immediately."
            ));
        } else if (condId >= 761 && condId < 800) {
            alerts.add(new AlertInfo(
                "🌫️ Dust Storm — " + destName,
                "Poor visibility due to " + desc + " in " + destName + ". Avoid driving."
            ));
        }
        if (windSpeed >= WIND_STRONG) {
            alerts.add(new AlertInfo(
                "💨 Strong Winds — " + destName,
                "Wind speed of " + Math.round(windSpeed) + " m/s recorded in " + destName
                    + ". Dangerous for trekking at high altitude."
            ));
        }
        return alerts;
    }

    private void saveAlertIfNew(Integer userId, Integer destId, AlertInfo alert) {
        LocalDateTime sixHoursAgo = LocalDateTime.now().minusHours(6);
        boolean exists = notificationRepo.existsByUserIdAndReferenceIdAndTitleAndCreatedAtAfter(
                userId, destId, alert.title, sixHoursAgo);
        if (!exists) {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setType("WEATHER_ALERT");
            n.setTitle(alert.title);
            n.setMessage(alert.message);
            n.setReferenceId(destId);
            n.setReferenceType("DESTINATION");
            n.setIsRead(false);
            notificationRepo.save(n);
        }
    }

    private static double round1(double v) { return Math.round(v * 10.0) / 10.0; }

    private static class AlertInfo {
        final String title;
        final String message;
        AlertInfo(String title, String message) { this.title = title; this.message = message; }
    }
}
