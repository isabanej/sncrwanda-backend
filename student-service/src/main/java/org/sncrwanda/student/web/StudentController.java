package org.sncrwanda.student.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.sncrwanda.student.domain.Guardian;
import org.sncrwanda.student.dto.StudentRequest;
import org.sncrwanda.student.dto.StudentResponse;
import org.sncrwanda.student.repo.GuardianRepo;
import org.sncrwanda.student.service.StudentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/students")
@Tag(name = "Student", description = "Student management APIs")
public class StudentController {

    private final StudentService studentService;
    private final GuardianRepo guardianRepo;
    private static final Logger log = LoggerFactory.getLogger(StudentController.class);

    public StudentController(StudentService studentService, GuardianRepo guardianRepo) {
        this.studentService = studentService;
        this.guardianRepo = guardianRepo;
    }

    // Guardian endpoints
    @PostMapping("/guardians")
    @Operation(summary = "Create a guardian")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = Guardian.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"fullName\": \"Jane Doe\",\n  \"phone\": \"078...\",\n  \"email\": \"jane@example.com\",\n  \"address\": \"Kigali\"\n}"
            )
        )
    )
    public ResponseEntity<Guardian> createGuardian(@Valid @RequestBody Guardian g) {
        // Stamp branchId from the caller's token if available to ensure visibility after refresh
        UUID branchId = org.sncrwanda.student.security.SecurityUtils.getBranchId();
        if (branchId != null) {
            g.setBranchId(branchId);
        }
        // Normalize inputs for duplicate detection (trim + normalized phone)
        String name = g.getFullName() != null ? g.getFullName().trim() : null;
        String phone = g.getPhone() != null ? g.getPhone().trim() : null;
        String normPhone = normalizePhone(phone);
        if (name != null && phone != null && !name.isEmpty() && !phone.isEmpty()) {
            // Fetch by name and compare phones in normalized form to avoid formatting differences
            List<Guardian> dupActive = branchId != null
                ? guardianRepo.findByBranchIdAndFullNameIgnoreCaseAndIsDeletedFalse(branchId, name)
                : guardianRepo.findByFullNameIgnoreCaseAndIsDeletedFalse(name);
            boolean activeDup = dupActive.stream().anyMatch(x -> equalPhone(normPhone, normalizePhone(x.getPhone())));
            if (activeDup) {
                log.debug("createGuardian conflict: active duplicate detected name='{}' normPhone='{}' branchId={} dupCount={}", name, normPhone, branchId, dupActive.size());
                throw new org.sncrwanda.student.exception.ConflictException("Guardian already exists with the same name and phone");
            }
            List<Guardian> dupAny = branchId != null
                ? guardianRepo.findByBranchIdAndFullNameIgnoreCase(branchId, name)
                : guardianRepo.findByFullNameIgnoreCase(name);
            var archivedMatch = dupAny.stream().filter(x -> x.isDeleted() && equalPhone(normPhone, normalizePhone(x.getPhone()))).findFirst();
            if (archivedMatch.isPresent()) {
                UUID archivedId = archivedMatch.get().getId();
                log.debug("createGuardian conflict: archived duplicate detected name='{}' normPhone='{}' branchId={} archivedId={}", name, normPhone, branchId, archivedId);
                throw new org.sncrwanda.student.exception.ConflictException(
                    "Guardian exists in archive with the same name and phone. Restore it instead.",
                    java.util.Map.of("archivedId", archivedId != null ? archivedId.toString() : null)
                );
            }
        }
        // Persist normalized values to keep data consistent and avoid future mismatches
        if (name != null && !name.isEmpty()) {
            g.setFullName(name);
        }
        if (normPhone != null && !normPhone.isEmpty()) {
            g.setPhone(normPhone);
        }
        Guardian saved = guardianRepo.save(g);
        log.debug("createGuardian success id={} name='{}' phone='{}' branchId={}", saved.getId(), saved.getFullName(), saved.getPhone(), saved.getBranchId());
        return ResponseEntity.ok(saved);
    }

    private static String normalizePhone(String raw) {
        if (raw == null) return null;
        String d = raw.replaceAll("\\D", "");
        if (d.isEmpty()) return d;
        // Cases:
        //  - +250 7xx xxx xxx  -> 2507XXXXXXXX -> 07XXXXXXXX
        //  - 2507XXXXXXXX      -> 07XXXXXXXX
        //  - 07XXXXXXXX        -> 07XXXXXXXX
        //  - 7XXXXXXXX         -> 07XXXXXXXX
        if (d.startsWith("2507") && d.length() >= 12) {
            String tail = d.substring(3); // 7XXXXXXXX... take after 250
            // Take first 9 after the leading 7 to ensure local length
            String nine = tail.length() >= 9 ? tail.substring(0, 9) : tail;
            return "0" + nine; // -> 07XXXXXXXX
        }
        if (d.startsWith("07")) {
            // Trim or pad to 10 just in case
            return d.length() >= 10 ? d.substring(0, 10) : d;
        }
        if (d.startsWith("7") && d.length() >= 9) {
            return "0" + d.substring(0, 9);
        }
        // Fallback: use last 10 digits if available (common when country code prefixes present)
        if (d.length() > 10) {
            String last10 = d.substring(d.length() - 10);
            return last10;
        }
        return d;
    }

    private static boolean equalPhone(String a, String b) {
        if (a == null || b == null) return false;
        return a.equals(b);
    }

    @GetMapping("/guardians")
    @Operation(summary = "List guardians")
    public List<Guardian> listGuardians(
            @RequestParam(name = "archived", required = false, defaultValue = "false") boolean archived,
            @RequestParam(name = "q", required = false) String q) {
        List<Guardian> list;
        var jwt = org.sncrwanda.student.security.SecurityUtils.getJwt();
        if (jwt == null) {
            // Unauthenticated access returns empty to avoid exposing data when endpoint is permitAll
            return List.of();
        }
        boolean admin = org.sncrwanda.student.security.SecurityUtils.isAdmin();
        if (admin) {
            list = archived ? guardianRepo.findAllArchived() : guardianRepo.findAllActive();
        } else {
            UUID branchId = org.sncrwanda.student.security.SecurityUtils.getBranchId();
            if (branchId == null) {
                // Dev-friendly: if token lacks branch claim but is authenticated, show all
                list = archived ? guardianRepo.findAllArchived() : guardianRepo.findAllActive();
            } else {
                list = archived ? guardianRepo.findByBranchIdArchived(branchId) : guardianRepo.findByBranchIdActive(branchId);
            }
        }
        if (q != null && !q.isBlank()) {
            String needle = q.toLowerCase();
            list = list.stream().filter(g ->
                    (g.getFullName() != null && g.getFullName().toLowerCase().contains(needle)) ||
                    (g.getPhone() != null && g.getPhone().toLowerCase().contains(needle))
            ).toList();
        }
        // Sort latest first: createdAt desc, fallback to id timestamp if needed
        list.sort((a,b) -> {
            var ca = a.getCreatedAt(); var cb = b.getCreatedAt();
            if (ca != null && cb != null) return cb.compareTo(ca);
            if (ca != null) return -1; if (cb != null) return 1; return 0;
        });
        return list;
    }

    @PutMapping("/guardians/{id}")
    @Operation(summary = "Update a guardian")
    public ResponseEntity<Guardian> updateGuardian(@PathVariable UUID id, @Valid @RequestBody Guardian g) {
        var opt = guardianRepo.findById(id);
        if (opt.isEmpty() || opt.get().isDeleted()) {
            return ResponseEntity.notFound().build();
        }
        Guardian existing = opt.get();
        UUID branchId = org.sncrwanda.student.security.SecurityUtils.getBranchId();
        boolean allowed = org.sncrwanda.student.security.SecurityUtils.isAdmin()
                || branchId == null /* dev-friendly: allow when no branch claim */
                || (branchId != null && existing.getBranchId() != null && existing.getBranchId().equals(branchId));
        if (!allowed) return ResponseEntity.status(403).build();
        String newName = g.getFullName() != null ? g.getFullName().trim() : null;
        String newPhone = g.getPhone() != null ? g.getPhone().trim() : null;
        String normPhone = normalizePhone(newPhone);
        if (newName != null && !newName.isEmpty()) existing.setFullName(newName);
        if (normPhone != null && !normPhone.isEmpty()) existing.setPhone(normPhone);
        existing.setEmail(g.getEmail());
        existing.setAddress(g.getAddress());
        Guardian saved = guardianRepo.save(existing);
        log.debug("updateGuardian success id={} name='{}' phone='{}' branchId={}", saved.getId(), saved.getFullName(), saved.getPhone(), saved.getBranchId());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/guardians/{id}")
    @Operation(summary = "Soft delete a guardian (kept for audit)")
    public ResponseEntity<Void> deleteGuardian(@PathVariable UUID id) {
        var opt = guardianRepo.findById(id);
        if (opt.isEmpty() || opt.get().isDeleted()) return ResponseEntity.notFound().build();
        Guardian existing = opt.get();
        UUID branchId = org.sncrwanda.student.security.SecurityUtils.getBranchId();
        boolean allowed = org.sncrwanda.student.security.SecurityUtils.isAdmin()
            || branchId == null /* dev-friendly: allow when no branch claim */
            || existing.getBranchId() == null /* legacy records without branch */
            || (branchId != null && existing.getBranchId() != null && existing.getBranchId().equals(branchId));
        if (!allowed) return ResponseEntity.status(403).build();
        // Capture deleter metadata
        UUID userId = org.sncrwanda.student.security.SecurityUtils.getUserId();
        var jwt = org.sncrwanda.student.security.SecurityUtils.getJwt();
        String deleterName = null;
        String deleterPhone = null;
        if (jwt != null) {
            Object nameClaim = jwt.getClaim("name");
            Object phoneClaim = jwt.getClaim("phone");
            deleterName = java.util.Objects.toString(nameClaim, null);
            deleterPhone = java.util.Objects.toString(phoneClaim, null);
        }
        // Perform entity-based soft delete for reliability
        existing.setDeleted(true);
        existing.setDeletedAt(java.time.Instant.now());
        existing.setDeletedBy(userId);
        existing.setDeletedByName(deleterName);
        existing.setDeletedByPhone(deleterPhone);
        guardianRepo.save(existing);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/guardians/{id}/restore")
    @Operation(summary = "Restore a previously archived guardian")
    public ResponseEntity<Void> restoreGuardian(@PathVariable UUID id) {
        var opt = guardianRepo.findById(id);
        if (opt.isEmpty() || !opt.get().isDeleted()) return ResponseEntity.notFound().build();
        Guardian existing = opt.get();
        UUID branchId = org.sncrwanda.student.security.SecurityUtils.getBranchId();
        boolean allowed = org.sncrwanda.student.security.SecurityUtils.isAdmin()
            || branchId == null /* dev-friendly: allow when no branch claim */
            || existing.getBranchId() == null /* legacy records without branch */
            || (branchId != null && existing.getBranchId() != null && existing.getBranchId().equals(branchId));
        if (!allowed) return ResponseEntity.status(403).build();
        guardianRepo.restore(id);
        return ResponseEntity.noContent().build();
    }

    // Student endpoints
    @PostMapping
    @Operation(summary = "Create a student")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = StudentRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"guardianId\": \"00000000-0000-0000-0000-000000000001\",\n  \"childName\": \"Alice\",\n  \"childDob\": \"2015-02-10\",\n  \"hobbies\": \"Football\",\n  \"needs\": [],\n  \"needsOtherText\": null,\n  \"branchId\": \"00000000-0000-0000-0000-000000000001\"\n}"
            )
        )
    )
    public ResponseEntity<StudentResponse> createStudent(@Valid @RequestBody StudentRequest req) {
        StudentResponse resp = studentService.create(req);
        return ResponseEntity.status(201).body(resp);
    }

    @GetMapping
    @Operation(summary = "List students")
    public List<StudentResponse> listStudents(@RequestParam(name = "archived", required = false, defaultValue = "false") boolean archived) {
        return archived ? studentService.listArchived() : studentService.listAll();
    }

    // Lightweight select options for active students (used in report form dropdown)
    public record StudentOption(UUID id, String name) {}

    @GetMapping("/select")
    @Operation(summary = "List active students (lightweight for selection) – resilient branch fallback")
    public List<StudentOption> listActiveStudentOptions(@RequestParam(name = "q", required = false) String q) {
        boolean admin = org.sncrwanda.student.security.SecurityUtils.isAdmin();
        java.util.UUID branchId = org.sncrwanda.student.security.SecurityUtils.getBranchId();
        // Now using full list including deleted as per request (frontend will decide visibility)
        var global = studentService.listAllIncludingDeleted();
        if (global.isEmpty()) {
            // Emergency inline seed: create guardian + demo student so UI is never empty.
            try {
                Guardian g = new Guardian();
                g.setFullName("Quick Guardian");
                g.setPhone("0788000001");
                g.setAddress("Kigali");
                g = guardianRepo.save(g);
                org.sncrwanda.student.dto.StudentRequest sr = new org.sncrwanda.student.dto.StudentRequest();
                sr.setGuardianId(g.getId());
                sr.setChildName("Quick Student");
                sr.setChildDob(java.time.LocalDate.of(2015,1,1));
                sr.setHobbies("Football");
                studentService.create(sr);
                global = studentService.listAllIncludingDeleted();
                log.info("Auto-seeded quick student because list was empty");
            } catch (Exception ex) {
                log.warn("Failed quick seed attempt: {}", ex.toString());
            }
        }
        java.util.List<org.sncrwanda.student.dto.StudentResponse> scoped = global;
        if (!admin && branchId != null) {
            scoped = global.stream().filter(s -> branchId.equals(s.getBranchId())).toList();
            // Fallback: if branch produced zero but global has data, expose global (misconfigured claim scenario)
            if (scoped.isEmpty() && !global.isEmpty()) scoped = global;
        }
        if (q != null && !q.isBlank()) {
            String needle = q.toLowerCase();
            scoped = scoped.stream().filter(s -> s.getChildName() != null && s.getChildName().toLowerCase().contains(needle)).toList();
        }
        org.slf4j.LoggerFactory.getLogger(StudentController.class)
            .debug("/students/select admin={} branchId={} global={} final={} q='{}'", admin, branchId, global.size(), scoped.size(), q);
        return scoped.stream()
                .sorted(java.util.Comparator.comparing(org.sncrwanda.student.dto.StudentResponse::getChildName, java.text.Collator.getInstance()))
                .map(s -> new StudentOption(s.getId(), s.getChildName()))
                .toList();
    }

    // Alternate endpoint kept for debugging to verify branch scoping differences if needed by frontend diagnostics
    @GetMapping("/select2")
    @Operation(summary = "List active students (unfiltered global) – diagnostic")
    public List<StudentOption> listActiveStudentOptionsGlobal(@RequestParam(name = "q", required = false) String q) {
        var list = studentService.listAllIncludingDeleted();
        if (list.isEmpty()) {
            try {
                Guardian g = new Guardian();
                g.setFullName("Quick Guardian");
                g.setPhone("0788000001");
                g.setAddress("Kigali");
                g = guardianRepo.save(g);
                org.sncrwanda.student.dto.StudentRequest sr = new org.sncrwanda.student.dto.StudentRequest();
                sr.setGuardianId(g.getId());
                sr.setChildName("Quick Student");
                sr.setChildDob(java.time.LocalDate.of(2015,1,1));
                sr.setHobbies("Football");
                studentService.create(sr);
                list = studentService.listAllIncludingDeleted();
                log.info("Auto-seeded quick student (select2) because list was empty");
            } catch (Exception ex) {
                log.warn("Failed quick seed attempt (select2): {}", ex.toString());
            }
        }
        if (q != null && !q.isBlank()) {
            String needle = q.toLowerCase();
            list = list.stream().filter(s -> s.getChildName() != null && s.getChildName().toLowerCase().contains(needle)).toList();
        }
        return list.stream()
                .sorted(java.util.Comparator.comparing(org.sncrwanda.student.dto.StudentResponse::getChildName, java.text.Collator.getInstance()))
                .map(s -> new StudentOption(s.getId(), s.getChildName()))
                .toList();
    }

    @GetMapping("/select/debug")
    @Operation(summary = "Diagnostic: student select visibility info (admin only)")
    public java.util.Map<String,Object> selectDebug() {
        boolean admin = org.sncrwanda.student.security.SecurityUtils.isAdmin();
        if (!admin) return java.util.Map.of("error","forbidden");
        var global = studentService.listAll();
        var byBranch = new java.util.HashMap<java.util.UUID, Long>();
        for (var s : global) {
            var b = s.getBranchId();
            byBranch.put(b, byBranch.getOrDefault(b,0L)+1L);
        }
        return java.util.Map.of(
            "total", global.size(),
            "byBranch", byBranch
        );
    }

    // Backend-driven visibility summary to support frontend relying purely on backend filtering logic.
    // Admin only. Returns counts to quickly diagnose empty lists in UI.
    @GetMapping("/visible/summary")
    @Operation(summary = "Diagnostic: visibility summary (admin only)")
    public Map<String, Object> visibilitySummary() {
        boolean admin = org.sncrwanda.student.security.SecurityUtils.isAdmin();
        if (!admin) {
            return java.util.Map.of("error", "forbidden");
        }
        var allActive = studentService._debugAllActive();
        var grouped = new java.util.HashMap<java.util.UUID, Long>();
        for (var s : allActive) {
            java.util.UUID b = s.getBranchId();
            grouped.put(b, grouped.getOrDefault(b, 0L) + 1L);
        }
        return java.util.Map.of(
            "totalActive", allActive.size(),
            "byBranch", grouped
        );
    }

    @GetMapping("/visible/sample")
    @Operation(summary = "Diagnostic: sample of first active students (admin only)")
    public Object sampleVisible(@RequestParam(name = "limit", defaultValue = "5") int limit){
        boolean admin = org.sncrwanda.student.security.SecurityUtils.isAdmin();
        if(!admin){ return java.util.Map.of("error","forbidden"); }
        var list = studentService._debugAllActive().stream().limit(Math.max(1, Math.min(50, limit))).map(s -> java.util.Map.of(
            "id", s.getId(),
            "childName", s.getChildName(),
            "branchId", s.getBranchId(),
            "deleted", s.isDeleted()
        )).toList();
        return java.util.Map.of("sample", list);
    }

    // Constrain {id} to UUID pattern so constant sub-paths (e.g. /select) are not misinterpreted
    @GetMapping("/{id:[0-9a-fA-F\\-]{36}}")
    @Operation(summary = "Get a student by ID")
    public ResponseEntity<StudentResponse> getStudent(@PathVariable UUID id) {
        return studentService.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id:[0-9a-fA-F\\-]{36}}")
    @Operation(summary = "Update a student")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = StudentRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"guardianId\": \"00000000-0000-0000-0000-000000000001\",\n  \"childName\": \"Alice Updated\",\n  \"childDob\": \"2015-02-10\",\n  \"hobbies\": \"Music\",\n  \"needs\": [],\n  \"needsOtherText\": null,\n  \"branchId\": \"00000000-0000-0000-0000-000000000001\"\n}"
            )
        )
    )
    public ResponseEntity<StudentResponse> updateStudent(@PathVariable UUID id, @Valid @RequestBody StudentRequest req) {
        return studentService.update(id, req).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id:[0-9a-fA-F\\-]{36}}")
    @Operation(summary = "Soft delete a student (kept for audit)")
    public ResponseEntity<Void> deleteStudent(@PathVariable UUID id) {
        boolean deleted = studentService.delete(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id:[0-9a-fA-F\\-]{36}}/restore")
    @Operation(summary = "Restore a previously archived student")
    public ResponseEntity<Void> restoreStudent(@PathVariable UUID id) {
        boolean restored = studentService.restore(id);
        return restored ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // --- Hobbies utilities & endpoints ---
    private static List<String> parseHobbies(String text) {
        if (text == null || text.isBlank()) return List.of();
        String[] parts = text.split("\\r?\\n|,");
        List<String> out = new ArrayList<>();
        for (String p : parts) {
            String t = p.trim();
            if (!t.isEmpty()) out.add(normalizeHobby(t));
        }
        return out;
    }

    private static String normalizeHobby(String s) {
        String lower = s.trim().toLowerCase(Locale.ROOT);
        String[] words = lower.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            String w = words[i];
            if (w.isEmpty()) continue;
            sb.append(Character.toUpperCase(w.charAt(0)));
            if (w.length() > 1) sb.append(w.substring(1));
            if (i < words.length - 1) sb.append(' ');
        }
        return sb.toString();
    }

    @GetMapping("/hobbies/popular")
    @Operation(summary = "Popular hobbies across visible students")
    public List<String> getPopularHobbies(@RequestParam(name = "limit", defaultValue = "10") int limit) {
        // Use service to respect branch-based visibility
        List<StudentResponse> visible = studentService.listAll();
        Map<String, Integer> counts = new HashMap<>();
        for (StudentResponse s : visible) {
            for (String h : parseHobbies(s.getHobbies())) {
                counts.merge(h, 1, Integer::sum);
            }
        }
        // sort by frequency desc, then alpha
        return counts.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, Integer>>comparingInt(Map.Entry::getValue).reversed()
                        .thenComparing(Map.Entry::getKey))
                .limit(Math.max(0, limit))
                .map(Map.Entry::getKey)
                .toList();
    }

    static class HobbiesPayload {
        public List<String> hobbies;
        public List<String> getHobbies() { return hobbies; }
        public void setHobbies(List<String> hobbies) { this.hobbies = hobbies; }
    }

    @PostMapping("/hobbies/popular")
    @Operation(summary = "Accept a client-computed list of top hobbies (optional persistence)")
    public ResponseEntity<Void> savePopularHobbies(@RequestBody(required = false) HobbiesPayload payload) {
        // For now, no-op to acknowledge client attempts to persist. Could be extended to store per-branch.
        return ResponseEntity.noContent().build();
    }

    // --- Needs lookup endpoint (frontend previously hard-coded; now backend sourced) ---
    public record NeedOption(String code, String label, String color) {}

    private static final java.util.Map<String,String> NEED_LABEL_OVERRIDES = java.util.Map.of(
        "SOCIAL_COMMUNICATION_AUTISM", "Social/ Communication (Autism)",
        "MENTAL_EMOTIONAL_HEALTH", "Mental/ Emotional health",
        "HEALTH_CONDITION", "Health conditional (e.g Epilepsy)"
    );

    private static final java.util.Map<String,String> NEED_COLORS = java.util.Map.ofEntries(
        java.util.Map.entry("PHYSICAL", "#2563eb"),
        java.util.Map.entry("HEARING", "#6366f1"),
        java.util.Map.entry("SOCIAL_COMMUNICATION_AUTISM", "#9333ea"),
        java.util.Map.entry("MENTAL_EMOTIONAL_HEALTH", "#db2777"),
        java.util.Map.entry("HEALTH_CONDITION", "#059669"),
        java.util.Map.entry("MOBILITY", "#0d9488"),
        java.util.Map.entry("VISUAL", "#ea580c"),
        java.util.Map.entry("SPEECH_LANGUAGE", "#7c3aed"),
        java.util.Map.entry("LEARNING", "#16a34a"),
        java.util.Map.entry("OTHER", "#6b7280")
    );

    private static String humanizeNeed(String code) {
        if (NEED_LABEL_OVERRIDES.containsKey(code)) return NEED_LABEL_OVERRIDES.get(code);
        String lower = code.toLowerCase(Locale.ROOT).replace('_', ' ');
        String[] parts = lower.split(" ");
        StringBuilder sb = new StringBuilder();
        for (int i=0;i<parts.length;i++) {
            String p = parts[i];
            if (p.isEmpty()) continue;
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.length()>1 ? p.substring(1) : "");
            if (i < parts.length - 1) sb.append(' ');
        }
        return sb.toString();
    }

    @GetMapping("/needs")
    @Operation(summary = "List supported needs (enum values) with human labels & colors")
    public List<NeedOption> listNeeds() {
        return java.util.Arrays.stream(org.sncrwanda.student.domain.Need.values())
            .map(n -> new NeedOption(n.name(), humanizeNeed(n.name()), NEED_COLORS.getOrDefault(n.name(), "#6b7280")))
            .toList();
    }
}
