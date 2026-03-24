package com.controller;

import com.config.UploadUtils;
import com.model.Hotel;
import com.model.RoomType;
import com.model.User;
import com.repository.DestinationRepository;
import com.repository.HotelRepository;
import com.repository.HotelReviewRepository;
import com.repository.RoomTypeRepository;
import com.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/hotels")
public class HotelController {

    private static final String HOTEL_IMG_PREFIX = "/uploads/hotels/";

    private final HotelRepository        hotelRepo;
    private final DestinationRepository  destRepo;
    private final RoomTypeRepository     roomTypeRepo;
    private final UserRepository         userRepo;
    private final HotelReviewRepository  hotelReviewRepo;

    public HotelController(HotelRepository hotelRepo,
                           DestinationRepository destRepo,
                           RoomTypeRepository roomTypeRepo,
                           UserRepository userRepo,
                           HotelReviewRepository hotelReviewRepo) {
        this.hotelRepo       = hotelRepo;
        this.destRepo        = destRepo;
        this.roomTypeRepo    = roomTypeRepo;
        this.userRepo        = userRepo;
        this.hotelReviewRepo = hotelReviewRepo;
    }

    /** GET /api/hotels/search?q=&destinationId= — authenticated: search hotels by name, optionally filtered by destination */
    @GetMapping("/search")
    public ResponseEntity<?> searchHotels(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) Integer destinationId) {

        List<Hotel> hotels;
        if (destinationId != null) {
            // Destination selected: filter by it; q is optional
            String trimmed = q.trim();
            if (trimmed.length() >= 2) {
                hotels = hotelRepo.findByHotelNameContainingIgnoreCaseAndIsActiveTrueAndDestinationId(trimmed, destinationId);
            } else {
                hotels = hotelRepo.findByIsActiveTrueAndDestinationId(destinationId);
            }
        } else {
            // No destination: require at least 2 chars
            if (q.trim().length() < 2) return ResponseEntity.ok(List.of());
            hotels = hotelRepo.findByHotelNameContainingIgnoreCaseAndIsActiveTrue(q.trim());
        }

        List<Map<String, Object>> result = hotels.stream().map(h -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              h.getHotelId());
            m.put("name",            h.getHotelName());
            m.put("stars",           h.getStarRating());
            m.put("pricePerNight",   h.getPricePerNight());
            m.put("availableRooms",  h.getAvailableRooms());
            String destName = destRepo.findById(h.getDestinationId())
                .map(d -> d.getName()).orElse("Unknown");
            m.put("destinationName", destName);
            return m;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /** GET /api/hotels/managers — Admin only: list all HotelManager users for dropdown */
    @GetMapping("/managers")
    public ResponseEntity<?> getHotelManagers(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        if (admin == null || admin.getUserType() != User.UserType.Admin)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        List<User> managers = userRepo.findByUserType(User.UserType.HotelManager);
        List<Map<String, Object>> result = managers.stream().map(m -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id",       m.getUserId());
            r.put("fullName", m.getFullName());
            r.put("email",    m.getEmail());
            return r;
        }).toList();
        return ResponseEntity.ok(result);
    }

    /** POST /api/hotels — Admin only: create a new hotel listing */
    @PostMapping
    public ResponseEntity<?> createHotel(@RequestBody Map<String, Object> body, Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        if (admin == null || admin.getUserType() != User.UserType.Admin)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        // Required field validation
        String name = (body.getOrDefault("hotelName", "")).toString().trim();
        if (name.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Hotel name is required"));
        if (hotelRepo.existsByHotelNameIgnoreCase(name))
            return ResponseEntity.badRequest().body(Map.of("message", "A hotel with this name already exists"));

        Object destIdObj = body.get("destinationId");
        if (destIdObj == null || destIdObj.toString().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Destination is required"));

        Object mgrIdObj = body.get("managerId");
        if (mgrIdObj == null || mgrIdObj.toString().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Hotel manager is required"));

        Object priceObj = body.get("pricePerNight");
        if (priceObj == null || priceObj.toString().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Price per night is required"));

        Object totalObj = body.get("totalRooms");
        if (totalObj == null || totalObj.toString().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Total rooms is required"));

        Object availObj = body.get("availableRooms");
        if (availObj == null || availObj.toString().isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Available rooms is required"));

        try {
            int destinationId = Integer.parseInt(destIdObj.toString());
            int managerId     = Integer.parseInt(mgrIdObj.toString());

            if (!destRepo.existsById(destinationId))
                return ResponseEntity.badRequest().body(Map.of("message", "Destination not found"));

            User manager = userRepo.findById(managerId).orElse(null);
            if (manager == null || manager.getUserType() != User.UserType.HotelManager)
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid hotel manager selected"));

            Hotel hotel = new Hotel();
            hotel.setHotelName(name);
            hotel.setDestinationId(destinationId);
            hotel.setManagerId(managerId);
            hotel.setPricePerNight(new BigDecimal(priceObj.toString()));
            hotel.setTotalRooms(Integer.parseInt(totalObj.toString()));
            hotel.setAvailableRooms(Integer.parseInt(availObj.toString()));

            if (body.containsKey("starRating") && body.get("starRating") != null
                    && !body.get("starRating").toString().isBlank()) {
                int starRating = Integer.parseInt(body.get("starRating").toString());
                hotel.setStarRating(starRating > 0 ? starRating : null);
            }
            hotel.setAverageRating(BigDecimal.ZERO);
            hotel.setTotalReviews(0);
            if (body.containsKey("address") && body.get("address") != null)
                hotel.setAddress(body.get("address").toString().trim());
            Object contactObj = body.get("contactNumber");
            if (contactObj == null || contactObj.toString().isBlank())
                return ResponseEntity.badRequest().body(Map.of("message", "Contact number is required"));
            String contactNumber = contactObj.toString().trim();
            if (hotelRepo.existsByContactNumber(contactNumber))
                return ResponseEntity.badRequest().body(Map.of("message", "A hotel with this phone number already exists"));
            hotel.setContactNumber(contactNumber);
            if (body.containsKey("email") && body.get("email") != null)
                hotel.setEmail(body.get("email").toString().trim());
            if (body.containsKey("description") && body.get("description") != null)
                hotel.setDescription(body.get("description").toString().trim());
            if (body.containsKey("amenities") && body.get("amenities") != null)
                hotel.setAmenities(body.get("amenities").toString().trim());

            hotelRepo.save(hotel);
            return ResponseEntity.status(201).body(Map.of("message", "Hotel added successfully"));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid numeric value provided"));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause().getMessage();
            if (msg != null && msg.toLowerCase().contains("hotel_name"))
                return ResponseEntity.badRequest().body(Map.of("message", "A hotel with this name already exists"));
            return ResponseEntity.badRequest().body(Map.of("message", "Data integrity error: " + e.getMostSpecificCause().getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to add hotel: " + e.getMessage()));
        }
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
            putLiveRating(m, h.getHotelId());
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
            m.put("contactNumber",   h.getContactNumber());
            putLiveRating(m, h.getHotelId());
            result.add(m);
        }

        return ResponseEntity.ok(result);
    }

    /** GET /api/hotels/admin/all — Admin only: all hotels including inactive */
    @GetMapping("/admin/all")
    public ResponseEntity<?> getAllHotelsAdmin(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        if (admin == null || admin.getUserType() != User.UserType.Admin)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        List<Hotel> hotels = hotelRepo.findAll();
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
            putLiveRating(m, h.getHotelId());
            m.put("isActive",       h.getIsActive());
            String managerName = "Unassigned";
            if (h.getManagerId() != null) {
                managerName = userRepo.findById(h.getManagerId())
                    .map(u -> u.getFullName()).orElse("Unknown");
            }
            m.put("managerName", managerName);
            result.add(m);
        }
        result.sort((a, b) -> ((Integer) b.get("id")).compareTo((Integer) a.get("id")));
        return ResponseEntity.ok(result);
    }

    /** PUT /api/hotels/{id} — Admin only: update hotel listing */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateHotel(@PathVariable Integer id,
                                         @RequestBody Map<String, Object> body,
                                         Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User admin = userRepo.findByEmail(auth.getName()).orElse(null);
        if (admin == null || admin.getUserType() != User.UserType.Admin)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null)
            return ResponseEntity.status(404).body(Map.of("message", "Hotel listing not found"));

        if (body.containsKey("name")) {
            String name = body.get("name").toString().trim();
            if (name.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Hotel name is required"));
            if (hotelRepo.existsByHotelNameIgnoreCaseAndHotelIdNot(name, id))
                return ResponseEntity.badRequest().body(Map.of("message", "A hotel with this name already exists"));
            hotel.setHotelName(name);
        }
        if (body.containsKey("pricePerNight")) {
            try { hotel.setPricePerNight(new BigDecimal(body.get("pricePerNight").toString())); }
            catch (NumberFormatException e) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid price")); }
        }
        if (body.containsKey("totalRooms")) {
            try { hotel.setTotalRooms(Integer.parseInt(body.get("totalRooms").toString())); }
            catch (NumberFormatException e) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid total rooms")); }
        }
        if (body.containsKey("availableRooms")) {
            try { hotel.setAvailableRooms(Integer.parseInt(body.get("availableRooms").toString())); }
            catch (NumberFormatException e) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid available rooms")); }
        }
        if (body.containsKey("starRating")) {
            try {
                int sr = Integer.parseInt(body.get("starRating").toString());
                hotel.setStarRating(sr > 0 ? sr : null);
            } catch (NumberFormatException e) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid star rating")); }
        }
        if (body.containsKey("isActive")) {
            hotel.setIsActive(Boolean.parseBoolean(body.get("isActive").toString()));
        }
        if (body.containsKey("description")) {
            hotel.setDescription(body.get("description") != null ? body.get("description").toString().trim() : null);
        }

        try {
            hotelRepo.save(hotel);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause().getMessage();
            if (msg != null && msg.toLowerCase().contains("hotel_name"))
                return ResponseEntity.badRequest().body(Map.of("message", "A hotel with this name already exists"));
            if (msg != null && msg.toLowerCase().contains("hotel_phone"))
                return ResponseEntity.badRequest().body(Map.of("message", "A hotel with this phone number already exists"));
            return ResponseEntity.badRequest().body(Map.of("message", "Data integrity error: " + e.getMostSpecificCause().getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to update hotel: " + e.getMessage()));
        }
        return ResponseEntity.ok(Map.of("message", "Hotel listing updated successfully"));
    }

    /** POST /api/hotels/{id}/image — HotelManager: upload cover photo for their hotel */
    @PostMapping("/{id}/image")
    public ResponseEntity<?> uploadHotelImage(@PathVariable Integer id,
                                              @RequestParam("image") MultipartFile file,
                                              Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User manager = userRepo.findByEmail(auth.getName()).orElse(null);
        if (manager == null || manager.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null)
            return ResponseEntity.status(404).body(Map.of("message", "Hotel not found"));
        if (!manager.getUserId().equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        if (file.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "No file uploaded"));
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/"))
            return ResponseEntity.badRequest().body(Map.of("message", "File must be an image"));
        if (file.getSize() > 5 * 1024 * 1024)
            return ResponseEntity.badRequest().body(Map.of("message", "Image must be under 5 MB"));

        try {
            Path dir = UploadUtils.resolve("hotels");
            Files.createDirectories(dir);

            String orig = file.getOriginalFilename();
            String ext  = (orig != null && orig.contains(".")) ? orig.substring(orig.lastIndexOf(".")) : ".jpg";
            String filename = "hotel_" + id + "_" + System.currentTimeMillis() + ext;
            Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

            hotel.setImageUrl(HOTEL_IMG_PREFIX + filename);
            hotelRepo.save(hotel);
            return ResponseEntity.ok(Map.of("imageUrl", HOTEL_IMG_PREFIX + filename, "message", "Hotel image updated"));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to save image"));
        }
    }

    /** PUT /api/hotels/{id}/description — HotelManager: update description of their hotel */
    @PutMapping("/{id}/description")
    public ResponseEntity<?> updateHotelDescription(@PathVariable Integer id,
                                                    @RequestBody Map<String, Object> body,
                                                    Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User manager = userRepo.findByEmail(auth.getName()).orElse(null);
        if (manager == null || manager.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.status(404).body(Map.of("message", "Hotel not found"));
        if (!manager.getUserId().equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        String desc = body.get("description") != null ? body.get("description").toString().trim() : "";
        hotel.setDescription(desc.isEmpty() ? null : desc);
        hotelRepo.save(hotel);
        return ResponseEntity.ok(Map.of("message", "Description updated successfully"));
    }

    /** PUT /api/hotels/{id}/info — HotelManager: update address, contact number, price per night */
    @PutMapping("/{id}/info")
    public ResponseEntity<?> updateHotelInfo(@PathVariable Integer id,
                                             @RequestBody Map<String, Object> body,
                                             Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User manager = userRepo.findByEmail(auth.getName()).orElse(null);
        if (manager == null || manager.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.status(404).body(Map.of("message", "Hotel not found"));
        if (!manager.getUserId().equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        Map<String, String> errors = new LinkedHashMap<>();

        // Address
        String address = body.get("address") != null ? body.get("address").toString().trim() : "";
        if (address.isEmpty()) errors.put("address", "Address is required");

        // Contact number
        String contact = body.get("contactNumber") != null ? body.get("contactNumber").toString().trim() : "";
        if (contact.isEmpty()) {
            errors.put("contactNumber", "Contact number is required");
        } else if (!contact.matches("^03\\d{2}-\\d{7}$")) {
            errors.put("contactNumber", "Format must be 03XX-XXXXXXX");
        } else if (hotelRepo.existsByContactNumberAndHotelIdNot(contact, id)) {
            errors.put("contactNumber", "This phone number is already used by another hotel");
        }

        // Email (optional)
        String email = body.get("email") != null ? body.get("email").toString().trim() : "";
        if (!email.isEmpty() && !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            errors.put("email", "Enter a valid email address");
        }

        // Price per night
        BigDecimal price = null;
        Object priceObj = body.get("pricePerNight");
        if (priceObj == null || priceObj.toString().isBlank()) {
            errors.put("pricePerNight", "Base rate is required");
        } else {
            try {
                price = new BigDecimal(priceObj.toString());
                if (price.compareTo(BigDecimal.ONE) < 0) errors.put("pricePerNight", "Base rate must be at least 1");
            } catch (NumberFormatException e) {
                errors.put("pricePerNight", "Enter a valid price");
            }
        }

        if (!errors.isEmpty())
            return ResponseEntity.status(422).body(Map.of("message", "Validation failed", "errors", errors));

        hotel.setAddress(address);
        hotel.setContactNumber(contact);
        hotel.setEmail(email.isEmpty() ? null : email);
        hotel.setPricePerNight(price);
        hotelRepo.save(hotel);
        return ResponseEntity.ok(Map.of("message", "Hotel info updated successfully"));
    }

    /** PUT /api/hotels/{id}/amenities — HotelManager: update amenities of their hotel */
    @PutMapping("/{id}/amenities")
    public ResponseEntity<?> updateHotelAmenities(@PathVariable Integer id,
                                                  @RequestBody Map<String, Object> body,
                                                  Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User manager = userRepo.findByEmail(auth.getName()).orElse(null);
        if (manager == null || manager.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.status(404).body(Map.of("message", "Hotel not found"));
        if (!manager.getUserId().equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        String amenities = body.get("amenities") != null ? body.get("amenities").toString().trim() : "";
        hotel.setAmenities(amenities.isEmpty() ? null : amenities);
        hotelRepo.save(hotel);
        return ResponseEntity.ok(Map.of("message", "Amenities updated successfully"));
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
        putLiveRating(m, h.getHotelId());

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

    /** Calculates averageRating and totalReviews live from HotelReviews table. */
    private void putLiveRating(Map<String, Object> m, Integer hotelId) {
        Double avg   = hotelReviewRepo.avgRatingByHotelId(hotelId);
        long   total = hotelReviewRepo.countByHotelId(hotelId);
        m.put("averageRating", avg != null
                ? BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP)
                : null);
        m.put("totalReviews", (int) total);
    }
}
