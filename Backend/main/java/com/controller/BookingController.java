package com.controller;

import com.model.Booking;
import com.model.Hotel;
import com.model.RoomType;
import com.model.User;
import com.repository.BookingRepository;
import com.repository.HotelRepository;
import com.repository.RoomTypeRepository;
import com.repository.UserRepository;
import com.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingRepository  bookingRepo;
    private final HotelRepository    hotelRepo;
    private final UserRepository     userRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final NotificationService notificationService;

    public BookingController(BookingRepository bookingRepo,
                             HotelRepository hotelRepo,
                             UserRepository userRepo,
                             RoomTypeRepository roomTypeRepo,
                             NotificationService notificationService) {
        this.bookingRepo         = bookingRepo;
        this.hotelRepo           = hotelRepo;
        this.userRepo            = userRepo;
        this.roomTypeRepo        = roomTypeRepo;
        this.notificationService = notificationService;
    }

    // Tourist: create a booking
    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody Map<String, Object> body,
                                           Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Integer hotelId      = (Integer) body.get("hotelId");
        String  checkInStr   = (String)  body.get("checkInDate");
        String  checkOutStr  = (String)  body.get("checkOutDate");
        Integer guests       = body.get("numberOfGuests") instanceof Integer g ? g : 1;
        Integer roomTypeId   = body.get("roomTypeId") instanceof Integer r ? r : null;

        if (hotelId == null || checkInStr == null || checkOutStr == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "hotelId, checkInDate, checkOutDate are required"));
        }

        Hotel hotel = hotelRepo.findByHotelIdAndIsActiveTrue(hotelId).orElse(null);
        if (hotel == null)
            return ResponseEntity.status(404).body(Map.of("message", "Hotel not found"));

        LocalDate checkIn  = LocalDate.parse(checkInStr);
        LocalDate checkOut = LocalDate.parse(checkOutStr);
        if (!checkOut.isAfter(checkIn))
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Check-out date must be after check-in date"));

        // ── Room type validation ──────────────────────────────────
        RoomType roomType = null;
        if (roomTypeId != null) {
            roomType = roomTypeRepo.findById(roomTypeId).orElse(null);
            if (roomType == null || !roomType.getIsActive() || !roomType.getHotelId().equals(hotelId))
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Invalid room type for this hotel"));

            if (roomType.getAvailableRooms() <= 0)
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "No available rooms of this type. Please choose another."));

            if (guests > roomType.getCapacity())
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Number of guests exceeds room capacity of " + roomType.getCapacity()));
        }

        // ── Calculate cost ────────────────────────────────────────
        long      nights    = ChronoUnit.DAYS.between(checkIn, checkOut);
        BigDecimal unitPrice = (roomType != null) ? roomType.getPricePerNight() : hotel.getPricePerNight();
        BigDecimal total     = unitPrice.multiply(BigDecimal.valueOf(nights));

        // ── Create booking ────────────────────────────────────────
        Booking booking = new Booking();
        booking.setUserId(user.getUserId());
        booking.setHotelId(hotelId);
        booking.setRoomTypeId(roomTypeId);
        booking.setCheckInDate(checkIn);
        booking.setCheckOutDate(checkOut);
        booking.setNumberOfGuests(guests);
        booking.setTotalCost(total);

        Booking saved = bookingRepo.save(booking);

        // ── Decrement available rooms ─────────────────────────────
        if (roomType != null) {
            roomType.setAvailableRooms(roomType.getAvailableRooms() - 1);
            roomTypeRepo.save(roomType);
        }

        // ── Notify hotel manager ──────────────────────────────────
        if (hotel.getManagerId() != null) {
            String roomLabel = (roomType != null) ? roomType.getTypeName() : "a room";
            notificationService.createNotification(
                hotel.getManagerId(),
                "BOOKING_REQUEST",
                "New Booking Request",
                user.getFullName() + " has requested " + roomLabel + " at " + hotel.getHotelName()
                    + " (Check-in: " + checkIn + ", Check-out: " + checkOut + "). Booking #" + saved.getBookingId(),
                saved.getBookingId(),
                "Booking"
            );
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("bookingId",     saved.getBookingId());
        resp.put("hotelName",     hotel.getHotelName());
        resp.put("roomTypeName",  roomType != null ? roomType.getTypeName() : null);
        resp.put("checkInDate",   saved.getCheckInDate().toString());
        resp.put("checkOutDate",  saved.getCheckOutDate().toString());
        resp.put("nights",        nights);
        resp.put("totalCost",     saved.getTotalCost());
        resp.put("bookingStatus", saved.getBookingStatus());
        resp.put("message",       "Booking request submitted! Hotel will confirm within 24 hours.");
        return ResponseEntity.ok(resp);
    }

    // Tourist: view own bookings
    @GetMapping("/my")
    public ResponseEntity<?> myBookings(Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Booking> bookings = bookingRepo.findByUserIdOrderByCreatedAtDesc(user.getUserId());
        return ResponseEntity.ok(buildBookingList(bookings));
    }

    // HotelManager: view bookings for their assigned hotels only
    @GetMapping("/all")
    public ResponseEntity<?> allBookings(Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        if (user.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));

        List<Integer> hotelIds = hotelRepo.findByManagerId(user.getUserId())
                .stream().map(Hotel::getHotelId).toList();

        List<Booking> bookings = hotelIds.isEmpty()
                ? List.of()
                : bookingRepo.findByHotelIdInOrderByCreatedAtDesc(hotelIds);

        long pending = bookings.stream()
            .filter(b -> b.getBookingStatus() == Booking.BookingStatus.Pending)
            .count();

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("bookings",     buildBookingList(bookings));
        resp.put("totalCount",   bookings.size());
        resp.put("pendingCount", pending);
        return ResponseEntity.ok(resp);
    }

    // HotelManager: confirm a booking (must own the hotel)
    @PutMapping("/{id}/confirm")
    public ResponseEntity<?> confirmBooking(@PathVariable Integer id, Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null || user.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        return setStatus(id, Booking.BookingStatus.Confirmed, user.getUserId());
    }

    // HotelManager: cancel a booking (must own the hotel)
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable Integer id, Authentication auth) {
        User user = userRepo.findByEmail(auth.getName()).orElse(null);
        if (user == null || user.getUserType() != User.UserType.HotelManager)
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        return setStatus(id, Booking.BookingStatus.Cancelled, user.getUserId());
    }

    private ResponseEntity<?> setStatus(Integer bookingId, Booking.BookingStatus status, Integer managerId) {
        Booking booking = bookingRepo.findById(bookingId).orElse(null);
        if (booking == null) return ResponseEntity.notFound().build();

        Hotel hotel = hotelRepo.findById(booking.getHotelId()).orElse(null);
        if (hotel == null || !managerId.equals(hotel.getManagerId()))
            return ResponseEntity.status(403).body(Map.of("message", "You do not manage this hotel"));

        Booking.BookingStatus oldStatus = booking.getBookingStatus();
        booking.setBookingStatus(status);
        bookingRepo.save(booking);

        // ── If cancelled and had a room type, restore availability ─
        if (status == Booking.BookingStatus.Cancelled
                && booking.getRoomTypeId() != null
                && oldStatus != Booking.BookingStatus.Cancelled) {
            roomTypeRepo.findById(booking.getRoomTypeId()).ifPresent(rt -> {
                rt.setAvailableRooms(rt.getAvailableRooms() + 1);
                roomTypeRepo.save(rt);
            });
        }

        // ── Notify the tourist ────────────────────────────────────
        String hotelName   = hotel.getHotelName();
        String roomLabel   = "";
        if (booking.getRoomTypeId() != null) {
            roomLabel = roomTypeRepo.findById(booking.getRoomTypeId())
                .map(rt -> " (" + rt.getTypeName() + ")")
                .orElse("");
        }

        if (status == Booking.BookingStatus.Confirmed) {
            notificationService.createNotification(
                booking.getUserId(),
                "BOOKING_CONFIRMED",
                "Booking Confirmed!",
                "Great news! Your booking #" + bookingId + " at " + hotelName + roomLabel
                    + " has been confirmed. Check-in: " + booking.getCheckInDate() + ".",
                bookingId,
                "Booking"
            );
        } else if (status == Booking.BookingStatus.Cancelled) {
            notificationService.createNotification(
                booking.getUserId(),
                "BOOKING_CANCELLED",
                "Booking Cancelled",
                "Your booking #" + bookingId + " at " + hotelName + roomLabel
                    + " has been cancelled by the hotel.",
                bookingId,
                "Booking"
            );
        }

        return ResponseEntity.ok(Map.of("message", "Booking " + status.name().toLowerCase()));
    }

    private List<Map<String, Object>> buildBookingList(List<Booking> bookings) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Booking b : bookings) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bookingId",    b.getBookingId());
            m.put("hotelId",      b.getHotelId());
            m.put("userId",       b.getUserId());
            m.put("roomTypeId",   b.getRoomTypeId());

            hotelRepo.findById(b.getHotelId()).ifPresent(h -> {
                m.put("hotelName", h.getHotelName());
                m.put("imageUrl",  h.getImageUrl());
            });

            userRepo.findById(b.getUserId()).ifPresent(u -> {
                m.put("guestName",  u.getFullName());
                m.put("guestEmail", u.getEmail());
            });

            if (b.getRoomTypeId() != null) {
                roomTypeRepo.findById(b.getRoomTypeId()).ifPresent(rt ->
                    m.put("roomTypeName", rt.getTypeName())
                );
            }

            long nights = ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());
            m.put("checkInDate",    b.getCheckInDate().toString());
            m.put("checkOutDate",   b.getCheckOutDate().toString());
            m.put("nights",         nights);
            m.put("numberOfGuests", b.getNumberOfGuests());
            m.put("totalCost",      b.getTotalCost());
            m.put("bookingStatus",  b.getBookingStatus());
            m.put("paymentStatus",  b.getPaymentStatus());
            m.put("createdAt",      b.getCreatedAt() != null ? b.getCreatedAt().toString() : null);
            result.add(m);
        }
        return result;
    }
}
