package com.leozara.cashwise.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // Standard auth endpoints: 10 requests per minute
    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000;

    // Password reset endpoints: 5 requests per hour (stricter)
    private static final int MAX_RESET_REQUESTS = 5;
    private static final long RESET_WINDOW_MS = 3_600_000;

    private final ConcurrentHashMap<String, RateWindow> clients = new ConcurrentHashMap<>();
    private volatile long lastCleanup = System.currentTimeMillis();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        boolean isPasswordReset = path.startsWith("/api/auth/forgot-password")
                || path.startsWith("/api/auth/reset-password");
        boolean isStandardAuth = path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/register");

        if (!isStandardAuth && !isPasswordReset) {
            filterChain.doFilter(request, response);
            return;
        }

        cleanup();

        String clientIp = request.getRemoteAddr();
        String key = clientIp + ":" + path;

        int limit = isPasswordReset ? MAX_RESET_REQUESTS : MAX_REQUESTS;
        long windowMs = isPasswordReset ? RESET_WINDOW_MS : WINDOW_MS;

        RateWindow window = clients.compute(key, (k, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.windowStart > windowMs) {
                return new RateWindow(now, new AtomicInteger(1), windowMs);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (window.count.get() > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        if (now - lastCleanup < WINDOW_MS) return;
        lastCleanup = now;

        Iterator<Map.Entry<String, RateWindow>> it = clients.entrySet().iterator();
        while (it.hasNext()) {
            RateWindow w = it.next().getValue();
            if (now - w.windowStart > w.windowMs) {
                it.remove();
            }
        }
    }

    private static class RateWindow {
        final long windowStart;
        final AtomicInteger count;
        final long windowMs;

        RateWindow(long windowStart, AtomicInteger count, long windowMs) {
            this.windowStart = windowStart;
            this.count = count;
            this.windowMs = windowMs;
        }
    }
}
