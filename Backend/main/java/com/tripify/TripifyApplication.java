package com.tripify;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = "com")
@EntityScan(basePackages = "com.model")
@EnableJpaRepositories(basePackages = "com.repository")
@EnableScheduling
@EnableAsync
public class TripifyApplication {
    public static void main(String[] args) {
        SpringApplication.run(TripifyApplication.class, args);
    }
}
