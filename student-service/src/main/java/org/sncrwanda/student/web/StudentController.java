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
                throw new org.sncrwanda.student.exception.ConflictException("Guardian already exists with the same name and phone");
            }
            List<Guardian> dupAny = branchId != null
                ? guardianRepo.findByBranchIdAndFullNameIgnoreCase(branchId, name)
                : guardianRepo.findByFullNameIgnoreCase(name);
            var archivedMatch = dupAny.stream().filter(x -> x.isDeleted() && equalPhone(normPhone, normalizePhone(x.getPhone()))).findFirst();
            if (archivedMatch.isPresent()) {
                UUID archivedId = archivedMatch.get().getId();
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
        existing.setFullName(g.getFullName());
        existing.setPhone(g.getPhone());
        existing.setEmail(g.getEmail());
        existing.setAddress(g.getAddress());
        Guardian saved = guardianRepo.save(existing);
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

    @GetMapping("/{id}")
    @Operation(summary = "Get a student by ID")
    public ResponseEntity<StudentResponse> getStudent(@PathVariable UUID id) {
        return studentService.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
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

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete a student (kept for audit)")
    public ResponseEntity<Void> deleteStudent(@PathVariable UUID id) {
        boolean deleted = studentService.delete(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/restore")
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
}
