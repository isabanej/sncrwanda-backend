package config;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.lang.NonNull;

import java.io.InputStream;
import java.util.Properties;

@TestConfiguration
public class CountingMailSender {
    public static class FakeSender implements JavaMailSender {
        public int htmlCount = 0;
        public int textCount = 0;

        @Override
        public @NonNull MimeMessage createMimeMessage() {
            return new MimeMessage(Session.getInstance(new Properties()));
        }

        @Override
        public @NonNull MimeMessage createMimeMessage(@NonNull InputStream contentStream) {
            try {
                return new MimeMessage(Session.getInstance(new Properties()), contentStream);
            } catch (Exception e) {
                return new MimeMessage(Session.getInstance(new Properties()));
            }
        }

        @Override
        public void send(@NonNull MimeMessage mimeMessage) {
            htmlCount++;
        }

        @Override
        public void send(@NonNull MimeMessage... mimeMessages) {
            htmlCount += mimeMessages != null ? mimeMessages.length : 0;
        }

        @Override
        public void send(@NonNull SimpleMailMessage simpleMessage) {
            textCount++;
        }

        @Override
        public void send(@NonNull SimpleMailMessage... simpleMessages) {
            textCount += simpleMessages != null ? simpleMessages.length : 0;
        }
    }

    @Bean
    @Primary
    public JavaMailSender javaMailSender() {
        return new FakeSender();
    }
}
