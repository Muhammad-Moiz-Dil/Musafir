package com.controller;

import com.model.Hotel;
import com.model.RoomType;
import com.model.User;
import com.repository.DestinationRepository;
import com.repository.HotelRepository;
import com.repository.RoomTypeRepository;
import com.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/hotels")
public class HotelController {

    private final HotelRepository    hotelRepo;
    private final DestinationRepository destRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final UserRepository     userRepo;

    public HotelController(HotelRepository hotelRepo,
                           DestinationRepository destRepo,
                           RoomTypeRepository roomTypeRepo,
                           UserRepository userRepo) {
        this.hotelRepo    = hotelRepo;
        this.destRepo     = destRepo;
        this.roomTypeRepo = roomTypeRepo;
        this.userRepo     = userRepo;
    }

    /** GET /api/hotels/my — HotelManager: list only their assigned hotels */
    @GetMapping("/my")
    public ResponseEntity<?> getMyHotels(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User manager = userRepo.findByEmail(auth.getName()).orElse(null);
        if (manager == null || manager.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        List<Hotel> hotels = hotelRepo.findByManagerId(manager.getUserId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Hotel h : hotels) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",             h.getHotelId());
            m.put("name",           h.getHotelName());
            m.put("destinationId",  h.getDestinationId());
            String destName = destRepo.findById(h.getDestinationId())
                .map(d -> d.getName()).orElse("Unknown");
            m.put("destinationName", destName);
            m.put("address",        h.getAddress());
            m.put("contactNumber",  h.getContactNumber());
            m.put("email",          h.getEmail());
            m.put("stars",          h.getStarRating());
            m.put("pricePerNight",  h.getPricePerNight());
            m.put("totalRooms",     h.getTotalRooms());
            m.put("availableRooms", h.getAvailableRooms());
            m.put("amenities",      h.getAmenities());
            m.put("imageUrl",       h.getImageUrl());
            m.put("description",    h.getDescription());
            m.put("averageRating",  h.getAverageRating());
            m.put("totalReviews",   h.getTotalReviews() != null ? h.getTotalReviews() : 0);
            m.put("isActive",       h.getIsActive());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /** GET /api/hotels — list all active hotels */
    @GetMapping
    public ResponseEntity<?> getAllHotels() {
        List<Hotel> hotels = hotelRepo.findByIsActiveTrueOrderByStarRatingDesc();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Hotel h : hotels) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              h.getHotelId());
            m.put("name",            h.getHotelName());
            m.put("destinationId",   h.getDestinationId());
            String destName = destRepo.findById(h.getDestinationId())
                .map(d -> d.getName()).orElse("Unknown");
            m.put("destinationName", destName);
            m.put("stars",           h.getStarRating());
            m.put("pricePerNight",   h.getPricePerNight());
            m.put("availableRooms",  h.getAvailableRooms());
            m.put("totalRooms",      h.getTotalRooms());
            m.put("amenities",       h.getAmenities());
            m.put("imageUrl",        h.getImageUrl());
            m.put("description",     h.getDescription());
            m.put("averageRating",   h.getAverageRating());
            m.put("totalReviews",    h.getTotalReviews() != null ? h.getTotalReviews() : 0);
            result.add(m);
        }

        return ResponseEntity.ok(result);
    }

    /** GET /api/hotels/{id} — hotel detail with room types */
    @GetMapping("/{id}")
    public ResponseEntity<?> getHotel(@PathVariable Integer id) {
        Hotel h = hotelRepo.findByHotelIdAndIsActiveTrue(id).orElse(null);
        if (h == null) return ResponseEntity.notFound().build();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            h.getHotelId());
        m.put("name",          h.getHotelName());
        m.put("destinationId", h.getDestinationId());
        String destName = destRepo.findById(h.getDestinationId())
            .map(d -> d.getName()).orElse("Unknown");
        m.put("destinationName", destName);
        m.put("address",       h.getAddress());
        m.put("contactNumber", h.getContactNumber());
        m.put("email",         h.getEmail());
        m.put("stars",         h.getStarRating());
        m.put("pricePerNight", h.getPricePerNight());
        m.put("availableRooms",h.getAvailableRooms());
        m.put("totalRooms",    h.getTotalRooms());
        m.put("amenities",     h.getAmenities());
        m.put("imageUrl",      h.getImageUrl());
        m.put("description",   h.getDescription());
        m.put("averageRating", h.getAverageRating());
        m.put("totalReviews",  h.getTotalReviews() != null ? h.getTotalReviews() : 0);

        List<RoomType> roomTypes = roomTypeRepo.findByHotelIdAndIsActiveTrueOrderByPricePerNightAsc(h.getHotelId());
        List<Map<String, Object>> rooms = roomTypes.stream().map(rt -> {
            Map<String, Object> rm = new LinkedHashMap<>();
            rm.put("roomTypeId",    rt.getRoomTypeId());
            rm.put("typeName",      rt.getTypeName());
            rm.put("capacity",      rt.getCapacity());
            rm.put("pricePerNight", rt.getPricePerNight());
            rm.put("totalRooms",    rt.getTotalRooms());
            rm.put("availableRooms",rt.getAvailableRooms());
            rm.put("amenities",     rt.getAmenities());
            rm.put("description",   rt.getDescription());
            rm.put("imageUrl",      rt.getImageUrl());
            return rm;
        }).toList();
        m.put("roomTypes", rooms);

        return ResponseEntity.ok(m);
    }
}
