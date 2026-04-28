package com.service;

import com.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final UserRepository userRepo;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${tripify.mail.enabled:false}")
    private boolean mailEnabled;

    public EmailService(JavaMailSender mailSender, UserRepository userRepo) {
        this.mailSender = mailSender;
        this.userRepo   = userRepo;
    }

    /**
     * Sends an HTML notification email to the user asynchronously.
     * Fails silently — email errors must never affect the main request flow.
     */
    @Async
    public void sendNotificationEmail(Integer userId, String type, String title, String message) {
        if (!mailEnabled) { log.info("[Email] Disabled — skipping {} for userId {}", type, userId); return; }
        if (fromEmail.isBlank()) { log.warn("[Email] spring.mail.username is not set — skipping email"); return; }

        userRepo.findById(userId).ifPresent(user -> {
            try {
                MimeMessage mime = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
                helper.setFrom(fromEmail, "Tripify");
                helper.setTo(user.getEmail());
                helper.setSubject(subjectFor(type, title));
                helper.setText(buildHtml(user.getFullName(), title, message, type), true);
                mailSender.send(mime);
                log.info("[Email] Sent {} to {}", type, user.getEmail());
            } catch (Exception e) {
                log.error("[Email] Failed to send {} to userId {}: {}", type, userId, e.getMessage());
            }
        });
    }

    private String subjectFor(String type, String title) {
        return switch (type) {
            case "BOOKING_CONFIRMED"  -> "✅ Booking Confirmed — Tripify";
            case "BOOKING_CANCELLED"  -> "❌ Booking Cancelled — Tripify";
            case "BOOKING_REQUEST"    -> "📋 New Booking Request — Tripify";
            case "WEATHER_ALERT"      -> "⚠️ Weather Alert — Tripify";
            default                   -> title + " — Tripify";
        };
    }

    private String buildHtml(String name, String title, String message, String type) {
        String accentColor = switch (type) {
            case "BOOKING_CONFIRMED" -> "#22c55e";
            case "BOOKING_CANCELLED" -> "#ef4444";
            case "BOOKING_REQUEST"   -> "#3b82f6";
            case "WEATHER_ALERT"     -> "#f97316";
            default                  -> "#ffb830";
        };

        String icon = switch (type) {
            case "BOOKING_CONFIRMED" -> "✅";
            case "BOOKING_CANCELLED" -> "❌";
            case "BOOKING_REQUEST"   -> "📋";
            case "WEATHER_ALERT"     -> "⚠️";
            default                  -> "🔔";
        };

        String firstName = (name != null && !name.isBlank())
                ? name.split(" ")[0] : "there";

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
            <title>%s</title>
            </head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;">

            <!-- Wrapper -->
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
              <tr><td align="center">
                <table width="600" cellpadding="0" cellspacing="0"
                       style="max-width:600px;width:100%%;">

                  <!-- Header -->
                  <tr>
                    <td style="background:#0a1520;border-radius:16px 16px 0 0;
                               padding:28px 36px;text-align:center;">
                      <span style="font-size:22px;font-weight:800;color:#fff;
                                   font-family:Georgia,serif;letter-spacing:-0.5px;">
                        ✈ Tripify
                      </span>
                    </td>
                  </tr>

                  <!-- Accent bar -->
                  <tr>
                    <td style="background:%s;height:4px;"></td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="background:#ffffff;padding:40px 36px;">

                      <!-- Icon + Title -->
                      <div style="text-align:center;margin-bottom:28px;">
                        <div style="font-size:48px;margin-bottom:12px;">%s</div>
                        <h1 style="margin:0;font-size:22px;font-weight:700;
                                   color:#0a1520;line-height:1.3;">%s</h1>
                      </div>

                      <!-- Greeting -->
                      <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
                        Hi <strong>%s</strong>,
                      </p>

                      <!-- Message box -->
                      <div style="background:#f8fafc;border-left:4px solid %s;
                                  border-radius:0 8px 8px 0;padding:16px 20px;
                                  margin-bottom:24px;">
                        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">%s</p>
                      </div>

                      <!-- CTA -->
                      <div style="text-align:center;margin:28px 0;">
                        <a href="http://localhost:5500/src/html/pages/auth/login.html"
                           style="display:inline-block;background:%s;color:%s;
                                  font-size:14px;font-weight:700;padding:13px 32px;
                                  border-radius:10px;text-decoration:none;">
                          Open Tripify →
                        </a>
                      </div>

                      <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;
                                text-align:center;line-height:1.6;">
                        This email was sent by Tripify. If you didn't expect this,
                        you can safely ignore it.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#0a1520;border-radius:0 0 16px 16px;
                               padding:20px 36px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">
                        © 2026 Tripify — Pakistan's Smart Travel Platform
                      </p>
                    </td>
                  </tr>

                </table>
              </td></tr>
            </table>
            </body>
            </html>
            """.formatted(
                title,
                accentColor,
                icon,
                title,
                firstName,
                accentColor,
                message,
                accentColor,
                type.equals("BOOKING_CANCELLED") ? "#fff" : "#0a1520"
        );
    }
}
