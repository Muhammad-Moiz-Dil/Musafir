package com.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Serve uploaded files at /uploads/**
     * Always resolved to Backend/uploads/ via UploadUtils.
     */
    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Path.toUri() produces a proper file:/// URI (forward slashes, encoded spaces)
        // that Spring's resource handler resolves correctly on both Windows and Linux.
        String uploadsUri = UploadUtils.UPLOADS_BASE.toUri().toString();
        if (!uploadsUri.endsWith("/")) uploadsUri += "/";
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsUri);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
