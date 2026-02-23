package com.leozara.cashwise.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(String to, String token) {
        String resetLink = frontendUrl + "?reset_token=" + token;

        if (mailSender == null) {
            log.info("[DEV] Password reset requested for {}. Token prefix: {}...", to, token.substring(0, 8));
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("CashWise – Reset your password");
        message.setText(
            "You requested a password reset for your CashWise account.\n\n" +
            "Click the link below to set a new password:\n\n" +
            resetLink + "\n\n" +
            "This link expires in 30 minutes.\n\n" +
            "If you did not request this, you can safely ignore this email."
        );
        mailSender.send(message);
        log.info("Password reset email sent to {}", to);
    }

    public void sendHouseholdInvitationEmail(String to, String inviterName, String householdName) {
        if (mailSender == null) {
            log.info("[DEV] Household invitation sent to {} from {} for household '{}'",
                    to, inviterName, householdName);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("CashWise – You've been invited to join a household");
        message.setText(
            "You've been invited to join " + householdName + " on CashWise by " + inviterName + ".\n\n" +
            "Open the app and check your pending invitations to accept or decline.\n\n" +
            "This invitation expires in 7 days."
        );
        mailSender.send(message);
        log.info("Household invitation email sent to {}", to);
    }
}
