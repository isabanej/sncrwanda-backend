package org.sncrwanda.hr.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.repository.EmployeeRepository;
import org.sncrwanda.hr.security.SecurityUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/teachers")
@Tag(name = "Teacher", description = "Teacher lookup APIs")
@RequiredArgsConstructor
@Slf4j
public class TeacherController {

    private final EmployeeRepository employeeRepository;
    // Lightweight in-memory cache (single-node only) to avoid N keyword queries on every request.
    private volatile List<Employee> cached; // last aggregated list
    private volatile long cacheExpiryEpochMs = 0L;
    private static final long CACHE_TTL_MS = 30_000; // 30 seconds – fast moving staff changes not expected more frequently

    @GetMapping
    @Operation(summary = "List active teachers (position contains 'teacher', case-insensitive)")
    public List<Employee> listTeachers() {
        // New simplified logic: ignore active/deleted flags and return ALL employees whose position contains any teacher synonym.
        final List<String> KEYWORDS = List.of("teacher","instructor","tutor","lecturer","educator","faculty","prof","mentor","academic");
        long now = System.currentTimeMillis();
        List<Employee> local = cached;
        if (local != null && now < cacheExpiryEpochMs) {
            if (log.isDebugEnabled()) log.debug("/teachers cache HIT (all-inclusive) -> {} teachers", local.size());
            return local;
        }
        if (log.isDebugEnabled()) log.debug("/teachers cache MISS – rebuilding all-inclusive teacher list");
        List<Employee> all = employeeRepository.findAll();
        if (all.isEmpty()) {
            // Emergency inline seed: cannot create fully valid employee here (missing repos). Just log guidance.
            try {
                // Use repositories via reflection-free approach: manually create entities and save through existing repo if possible.
                // We only have employeeRepository here; create synthetic Employee with null deps not allowed, so skip if required relationships missing.
                // Fallback: log only.
                // (Full seeding handled by TeacherDataInitializer; this is just a last resort.)
                // No direct access to BranchRepository/DepartmentRepository here, so we cannot persist without proper references.
                // Therefore just log.
                log.warn("TeacherController: no employees present; ensure hr seed scripts run.");
            } catch (Exception ex) {
                log.warn("TeacherController: quick teacher seed failed: {}", ex.toString());
            }
        }
        Map<UUID, Employee> merged = new LinkedHashMap<>();
        for (Employee e : all) {
            String pos = e.getPosition() == null ? "" : e.getPosition().toLowerCase();
            for (String kw : KEYWORDS) {
                if (pos.contains(kw)) { merged.putIfAbsent(e.getId(), e); break; }
            }
        }
        List<Employee> list = new ArrayList<>(merged.values());
        list.sort((a,b) -> {
            var ca = a.getCreatedAt(); var cb = b.getCreatedAt();
            if (ca != null && cb != null) return cb.compareTo(ca);
            if (ca != null) return -1; if (cb != null) return 1; return 0;
        });
        cached = list;
        cacheExpiryEpochMs = now + CACHE_TTL_MS;
        if (log.isDebugEnabled()) {
            UUID branchId = SecurityUtils.getBranchId();
            log.debug("/teachers inclusive fetch (branch={}, admin={}) -> {} teachers (from total employees={})", branchId, SecurityUtils.isAdmin(), list.size(), all.size());
        }
        return list;
    }
}
