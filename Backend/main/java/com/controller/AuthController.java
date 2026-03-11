package com.controller;

import com.model.User;
import com.service.UserService;
import com.service.UserService.FieldValidationException;
import com.service.UserService.RegisterRequest;
import com.service.UserService.LoginResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * POST /api/auth/register
     * Registers a new Tourist or HotelManager account.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequestBody body) {

        RegisterRequest req = new RegisterRequest();
        req.setFullName(body.getFullName());
        req.setEmail(body.getEmail());
        req.setPassword(body.getPassword());
        req.setUserType(body.getUserType());
        req.setPhoneNumber(body.getPhoneNumber());
        req.setCnic(body.getCnic());
        req.setAddress(body.getAddress());

        try {
            User created = userService.register(req);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Account created successfully.",
                    "user", Map.of(
                            "id",       created.getUserId(),
                            "email",    created.getEmail(),
                            "fullName", created.getFullName(),
                            "userType", created.getUserType().name()
                    )
            ));

        } catch (FieldValidationException ex) {
            boolean isConflict = ex.getErrors().containsKey("email");
            int status = isConflict ? 409 : 422;

            return ResponseEntity.status(status).body(Map.of(
                    "message", "Validation failed.",
                    "errors",  ex.getErrors()
            ));
        }
    }

    /**
     * POST /api/auth/login
     * Authenticates Tourist or HotelManager. Returns JWT token.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequestBody body) {
        try {
            LoginResult result = userService.login(body.getEmail(), body.getPassword());
            return buildLoginResponse(result);
        } catch (UserService.AuthException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", ex.getMessage()));
        } catch (UserService.AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    /**
     * POST /api/auth/admin/login
     * Authenticates Admin accounts only. Returns JWT token.
     */
    @PostMapping("/admin/login")
    public ResponseEntity<?> adminLogin(@Valid @RequestBody LoginRequestBody body) {
        try {
            LoginResult result = userService.adminLogin(body.getEmail(), body.getPassword());
            return buildLoginResponse(result);
        } catch (UserService.AuthException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", ex.getMessage()));
        } catch (UserService.AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    private ResponseEntity<?> buildLoginResponse(LoginResult result) {
        User u = result.getUser();
        return ResponseEntity.ok(Map.of(
                "token", result.getToken(),
                "user",  Map.of(
                        "id",        u.getUserId(),
                        "email",     u.getEmail(),
                        "fullName",  u.getFullName(),
                        "userType",  u.getUserType().name()
                )
        ));
    }

    // ── Login Request Body ────────────────────────────────────

    public static class LoginRequestBody {

        @NotBlank(message = "Email is required.")
        @Email(message = "Please provide a valid email address.")
        private String email;

        @NotBlank(message = "Password is required.")
        private String password;

        public String getEmail()                 { return email; }
        public void setEmail(String email)       { this.email = email; }
        public String getPassword()              { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    // ── Register Request Body DTO ─────────────────────────────

    public static class RegisterRequestBody {

        @NotBlank(message = "Full name is required.")
        @Size(min = 3, max = 255, message = "Full name must be between 3 and 255 characters.")
        @Pattern(regexp = "^[a-zA-Z\\s.\\-']+$", message = "Name cannot contain numbers or special characters.")
        private String fullName;

        @NotBlank(message = "Email is required.")
        @Email(message = "Please provide a valid email address.")
        private String email;

        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 128, message = "Password must be at least 8 characters.")
        private String password;

        @NotBlank(message = "User type is required.")
        @Pattern(regexp = "Tourist|HotelManager", message = "User type must be Tourist or HotelManager.")
        private String userType;

        @Pattern(regexp = "^(\\+92|0092|0)?3[0-9]{9}$|^$",
                 message = "Enter a valid Pakistani phone number.")
        private String phoneNumber;

        @Pattern(regexp = "^\\d{5}-\\d{7}-\\d$|^$",
                 message = "CNIC must be in format XXXXX-XXXXXXX-X.")
        private String cnic;

        private String address;

        public String getFullName()                { return fullName; }
        public void setFullName(String fullName)   { this.fullName = fullName; }

        public String getEmail()                 { return email; }
        public void setEmail(String email)       { this.email = email; }

        public String getPassword()                  { return password; }
        public void setPassword(String password)     { this.password = password; }

        public String getUserType()                  { return userType; }
        public void setUserType(String userType)     { this.userType = userType; }

        public String getPhoneNumber()                   { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber)   { this.phoneNumber = phoneNumber; }

        public String getCnic()              { return cnic; }
        public void setCnic(String cnic)     { this.cnic = cnic; }

        public String getAddress()               { return address; }
        public void setAddress(String address)   { this.address = address; }
    }
}
