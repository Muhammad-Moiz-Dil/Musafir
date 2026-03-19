package com.controller;

import com.model.Hotel;
import com.model.RoomType;
import com.model.User;
import com.repository.HotelRepository;
import com.repository.RoomTypeRepository;
import com.repository.UserRepository;
import com.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomTypeController {

    private final RoomTypeRepository roomTypeRepo;
    private final HotelRepository    hotelRepo;
    private final UserRepository     userRepo;
    private final ActivityLogService logService;

    public RoomTypeController(RoomTypeRepository roomTypeRepo,
                              HotelRepository hotelRepo,
                              UserRepository userRepo,
                              ActivityLogService logService) {
        this.roomTypeRepo = roomTypeRepo;
        this.hotelRepo    = hotelRepo;
        this.userRepo     = userRepo;
        this.logService   = logService;
    }

    /** GET /api/rooms/hotel/{hotelId} — public (authenticated): room types for a hotel */
    @GetMapping("/hotel/{hotelId}")
    public ResponseEntity<?> getRoomTypesForHotel(@PathVariable Integer hotelId) {
        List<RoomType> rooms = roomTypeRepo.findByHotelIdAndIsActiveTrueOrderByPricePerNightAsc(hotelId);
        return ResponseEntity.ok(rooms.stream().map(this::toMap).toList());
    }

    /** GET /api/rooms/my — HM: all room types across managed hotels */
    @GetMapping("/my")
    public ResponseEntity<?> myRoomTypes(Authentication auth) {
        User manager = resolveManager(auth);
        if (manager == null) return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        List<Hotel> hotels = hotelRepo.findByManagerId(manager.getUserId());
        if (hotels.isEmpty()) return ResponseEntity.ok(List.of());

        List<Integer> hotelIds = hotels.stream().map(Hotel::getHotelId).toList();
        Map<Integer, String> hotelNames = new HashMap<>();
        hotels.forEach(h -> hotelNames.put(h.getHotelId(), h.getHotelName()));

        List<RoomType> rooms = roomTypeRepo.findByHotelIdInAndIsActiveTrue(hotelIds);
        List<Map<String, Object>> result = rooms.stream().map(rt -> {
            Map<String, Object> m = toMap(rt);
            m.put("hotelName", hotelNames.getOrDefault(rt.getHotelId(), "Unknown"));
            return m;
        }).toList();

        return ResponseEntity.ok(result);
    }

    /** POST /api/rooms — HM: add a room type to one of their hotels */
    @PostMapping
    public ResponseEntity<?> addRoomType(@RequestBody Map<String, Object> body,
                                         Authentication auth,
                                         HttpServletRequest request) {
        User manager = resolveManager(auth);
        if (manager == null) return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        Integer hotelId = (Integer) body.get("hotelId");
        if (hotelId == null) return ResponseEntity.badRequest().body(Map.of("message", "hotelId is required"));

        Hotel hotel = hotelRepo.findById(hotelId).orElse(null);
        if (hotel == null || !manager.getUserId().equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        String typeName = (String) body.get("typeName");
        if (typeName == null || typeName.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "typeName is required"));

        Object priceRaw = body.get("pricePerNight");
        if (priceRaw == null)
            return ResponseEntity.badRequest().body(Map.of("message", "pricePerNight is required"));

        RoomType rt = new RoomType();
        rt.setHotelId(hotelId);
        rt.setTypeName(typeName.trim());
        rt.setCapacity(body.get("capacity") instanceof Integer c ? c : 2);
        rt.setPricePerNight(new BigDecimal(priceRaw.toString()));
        int totalRooms = body.get("totalRooms") instanceof Integer t ? t : 1;
        rt.setTotalRooms(totalRooms);
        rt.setAvailableRooms(totalRooms);
        rt.setAmenities((String) body.get("amenities"));
        rt.setDescription((String) body.get("description"));
        rt.setImageUrl((String) body.get("imageUrl"));

        RoomType saved = roomTypeRepo.save(rt);
        logService.log(manager.getUserId(), "ROOM_ADDED", request);
        Map<String, Object> resp = toMap(saved);
        resp.put("hotelName", hotel.getHotelName());
        return ResponseEntity.ok(resp);
    }

    /** PUT /api/rooms/{id} — HM: update a room type */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoomType(@PathVariable Integer id,
                                            @RequestBody Map<String, Object> body,
                                            Authentication auth,
                                            HttpServletRequest request) {
        User manager = resolveManager(auth);
        if (manager == null) return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        RoomType rt = roomTypeRepo.findById(id).orElse(null);
        if (rt == null) return ResponseEntity.notFound().build();

        Hotel hotel = hotelRepo.findById(rt.getHotelId()).orElse(null);
        if (hotel == null || !manager.getUserId().equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        if (body.containsKey("typeName")  && body.get("typeName") != null)
            rt.setTypeName(body.get("typeName").toString().trim());
        if (body.containsKey("capacity")  && body.get("capacity") instanceof Integer c)
            rt.setCapacity(c);
        if (body.containsKey("pricePerNight") && body.get("pricePerNight") != null)
            rt.setPricePerNight(new BigDecimal(body.get("pricePerNight").toString()));
        if (body.containsKey("totalRooms") && body.get("totalRooms") instanceof Integer t)
            rt.setTotalRooms(t);
        if (body.containsKey("availableRooms") && body.get("availableRooms") instanceof Integer a)
            rt.setAvailableRooms(a);
        if (body.containsKey("amenities"))
            rt.setAmenities((String) body.get("amenities"));
        if (body.containsKey("description"))
            rt.setDescription((String) body.get("description"));
        if (body.containsKey("imageUrl"))
            rt.setImageUrl((String) body.get("imageUrl"));

        roomTypeRepo.save(rt);
        logService.log(manager.getUserId(), "ROOM_UPDATED", request);
        Map<String, Object> resp = toMap(rt);
        resp.put("hotelName", hotel.getHotelName());
        return ResponseEntity.ok(resp);
    }

    /** DELETE /api/rooms/{id} — HM: soft-delete a room type */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoomType(@PathVariable Integer id, Authentication auth,
                                            HttpServletRequest request) {
        User manager = resolveManager(auth);
        if (manager == null) return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        RoomType rt = roomTypeRepo.findById(id).orElse(null);
        if (rt == null) return ResponseEntity.notFound().build();

        Hotel hotel = hotelRepo.findById(rt.getHotelId()).orElse(null);
        if (hotel == null || !manager.getUserId().equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        rt.setIsActive(false);
        roomTypeRepo.save(rt);
        logService.log(manager.getUserId(), "ROOM_REMOVED", request);
        return ResponseEntity.ok(Map.of("message", "Room type removed"));
    }

    // ── Helpers ──────────────────────────────────────────────

    private User resolveManager(Authentication auth) {
        if (auth == null) return null;
        User u = userRepo.findByEmail(auth.getName()).orElse(null);
        if (u == null || u.getUserType() != User.UserType.HotelManager) return null;
        return u;
    }

    private Map<String, Object> toMap(RoomType rt) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("roomTypeId",    rt.getRoomTypeId());
        m.put("hotelId",       rt.getHotelId());
        m.put("typeName",      rt.getTypeName());
        m.put("capacity",      rt.getCapacity());
        m.put("pricePerNight", rt.getPricePerNight());
        m.put("totalRooms",    rt.getTotalRooms());
        m.put("availableRooms",rt.getAvailableRooms());
        m.put("amenities",     rt.getAmenities());
        m.put("description",   rt.getDescription());
        m.put("imageUrl",      rt.getImageUrl());
        m.put("isActive",      rt.getIsActive());
        return m;
    }
}
