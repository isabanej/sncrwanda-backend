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
        // Unscoped: aggregate across multiple teacher synonyms for resilience.
        final List<String> KEYWORDS = List.of("teacher","instructor","tutor","lecturer","educator","faculty","prof","mentor","academic");
        long now = System.currentTimeMillis();
        List<Employee> local = cached;
        if (local != null && now < cacheExpiryEpochMs) {
            if (log.isDebugEnabled()) log.debug("/teachers cache HIT -> {} teachers (expires in {} ms)", local.size(), (cacheExpiryEpochMs - now));
            return local;
        }
        if (log.isDebugEnabled()) log.debug("/teachers cache MISS – rebuilding list");
        Map<UUID, Employee> merged = new LinkedHashMap<>();
        for (String kw : KEYWORDS) {
            try {
                List<Employee> partial = employeeRepository.findActiveTeachers(kw);
                for (Employee e : partial) {
                    if (!merged.containsKey(e.getId())) merged.put(e.getId(), e);
                }
            } catch (Exception ex) {
                if (log.isDebugEnabled()) log.debug("/teachers keyword '{}' query failed: {}", kw, ex.getMessage());
            }
        }
        List<Employee> list = new ArrayList<>(merged.values());
        // Sort newest first (createdAt desc) consistent with repository query ordering
        list.sort((a,b) -> {
            var ca = a.getCreatedAt(); var cb = b.getCreatedAt();
            if (ca != null && cb != null) return cb.compareTo(ca);
            if (ca != null) return -1; if (cb != null) return 1; return 0;
        });
        cached = list;
        cacheExpiryEpochMs = now + CACHE_TTL_MS;
        if (log.isDebugEnabled()) {
            UUID branchId = SecurityUtils.getBranchId();
            log.debug("/teachers unscoped multi-keyword fetch (branch={}, admin={}) -> {} teachers (keywords={}, distinct={})", branchId, SecurityUtils.isAdmin(), list.size(), KEYWORDS.size(), merged.size());
        }
        return list;
    }
}
