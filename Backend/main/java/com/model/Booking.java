package com.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "Bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id")
    private Integer bookingId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "hotel_id", nullable = false)
    private Integer hotelId;

    @Column(name = "room_type_id")
    private Integer roomTypeId;

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;

    @Column(name = "number_of_guests", nullable = false)
    private Integer numberOfGuests;

    @Column(name = "total_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalCost;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_status")
    private BookingStatus bookingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum BookingStatus { Pending, Confirmed, Cancelled, Completed }
    public enum PaymentStatus { Unpaid, Paid, Refunded }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (bookingStatus == null) bookingStatus = BookingStatus.Pending;
        if (paymentStatus  == null) paymentStatus  = PaymentStatus.Unpaid;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Integer       getBookingId()                          { return bookingId; }
    public void          setBookingId(Integer bookingId)         { this.bookingId = bookingId; }

    public Integer       getUserId()                             { return userId; }
    public void          setUserId(Integer userId)               { this.userId = userId; }

    public Integer       getHotelId()                            { return hotelId; }
    public void          setHotelId(Integer hotelId)             { this.hotelId = hotelId; }

    public Integer       getRoomTypeId()                         { return roomTypeId; }
    public void          setRoomTypeId(Integer roomTypeId)       { this.roomTypeId = roomTypeId; }

    public LocalDate     getCheckInDate()                        { return checkInDate; }
    public void          setCheckInDate(LocalDate checkInDate)   { this.checkInDate = checkInDate; }

    public LocalDate     getCheckOutDate()                       { return checkOutDate; }
    public void          setCheckOutDate(LocalDate checkOutDate) { this.checkOutDate = checkOutDate; }

    public Integer       getNumberOfGuests()                             { return numberOfGuests; }
    public void          setNumberOfGuests(Integer numberOfGuests)       { this.numberOfGuests = numberOfGuests; }

    public BigDecimal    getTotalCost()                          { return totalCost; }
    public void          setTotalCost(BigDecimal totalCost)      { this.totalCost = totalCost; }

    public BookingStatus getBookingStatus()                              { return bookingStatus; }
    public void          setBookingStatus(BookingStatus bookingStatus)   { this.bookingStatus = bookingStatus; }

    public PaymentStatus getPaymentStatus()                              { return paymentStatus; }
    public void          setPaymentStatus(PaymentStatus paymentStatus)   { this.paymentStatus = paymentStatus; }

    public String        getPaymentMethod()                              { return paymentMethod; }
    public void          setPaymentMethod(String paymentMethod)          { this.paymentMethod = paymentMethod; }

    public String        getPaymentReference()                           { return paymentReference; }
    public void          setPaymentReference(String paymentReference)    { this.paymentReference = paymentReference; }

    public LocalDateTime getCreatedAt()                          { return createdAt; }
    public void          setCreatedAt(LocalDateTime createdAt)   { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt()                          { return updatedAt; }
    public void          setUpdatedAt(LocalDateTime updatedAt)   { this.updatedAt = updatedAt; }
}
