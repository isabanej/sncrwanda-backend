package org.sncrwanda.auth.service;

import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@sncrwanda.local}")
    private String from;

    @Value("${app.url-base:http://localhost:5173}")
    private String appBaseUrl;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(String to, String token) {
        String resetUrl = appBaseUrl + "/reset-password?token=" + token;
        String subject = "Reset your password";
        String html = "<!doctype html>" +
                "<html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>" +
                "<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:24px;background:#f7f7f7;}" +
                ".card{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;}" +
                ".btn{display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px}"
                + ".muted{color:#6b7280;font-size:14px;margin-top:12px}" +
                "</style></head><body>" +
                "<div class='card'>" +
                "<h2 style='margin-top:0'>Reset your password</h2>" +
                "<p>We received a request to reset your password.</p>" +
                "<p><a class='btn' href='" + resetUrl + "' target='_blank' rel='noopener'>Reset password</a></p>" +
                "<p class='muted'>This link is valid for 15 minutes. If you didn't request this, you can ignore this email.</p>" +
                "</div></body></html>";

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(mime);
        } catch (Exception ex) {
            // Fallback to plain text if HTML send fails
            org.springframework.mail.SimpleMailMessage msg = new org.springframework.mail.SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText("Reset your password: " + resetUrl + "\n\nThis link is valid for 15 minutes.");
            mailSender.send(msg);
        }
    }
}
