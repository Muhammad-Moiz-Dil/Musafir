package com.service;

import com.model.Souvenir;
import com.repository.DestinationRepository;
import com.repository.SouvenirRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class SouvenirService {

    private final SouvenirRepository souvenirRepo;
    private final DestinationRepository destinationRepo;

    public SouvenirService(SouvenirRepository souvenirRepo,
                           DestinationRepository destinationRepo) {
        this.souvenirRepo = souvenirRepo;
        this.destinationRepo = destinationRepo;
    }

    /** Returns all active souvenirs across every destination. */
    public List<Souvenir> getAllSouvenirs() {
        return souvenirRepo.findAll()
                .stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsActive()))
                .toList();
    }

    /**
     * Returns active souvenirs for a given destination ID.
     * Returns an empty list if the destination does not exist or has no souvenirs.
     */
    public List<Souvenir> getSouvenirsByDestination(Integer destinationId) {
        if (destinationId == null) {
            return Collections.emptyList();
        }

        boolean exists = destinationRepo.existsById(destinationId);
        if (!exists) {
            return Collections.emptyList();
        }

        return souvenirRepo.findByDestination_DestinationIdAndIsActiveTrue(destinationId);
    }
}
