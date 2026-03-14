package com.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${google.maps.api-key}")
    private String mapsApiKey;

    @GetMapping("/maps-key")
    public ResponseEntity<Map<String, String>> getMapsKey() {
        return ResponseEntity.ok(Map.of("key", mapsApiKey));
    }
}
