package org.sncrwanda.student.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
// Student reports removed
import org.sncrwanda.student.dto.StudentResponse;
import org.sncrwanda.student.security.SecurityUtils;
import org.sncrwanda.student.service.GuardianPortalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/guardians/me")
@Tag(name = "Guardian Portal", description = "Read-only access for guardians to view their students and reports")
public class GuardianPortalController {

    private final GuardianPortalService service;

    public GuardianPortalController(GuardianPortalService service) {
        this.service = service;
    }

    private boolean allowed() {
        return SecurityUtils.getGuardianId() != null || SecurityUtils.isAdmin() || SecurityUtils.hasRole("GUARDIAN");
    }

    @GetMapping("/students")
    @Operation(summary = "List my students (guardian-only)")
    public ResponseEntity<List<StudentResponse>> myStudents(@RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "20") int size) {
        if (!allowed()) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(service.listMyStudents(page, size));
    }

    @GetMapping("/reports")
    @Operation(summary = "List my students' performance reports (guardian-only)")
    public ResponseEntity<List<?>> myReports(@RequestParam(defaultValue = "0") int page,
                                                                 @RequestParam(defaultValue = "20") int size) {
        if (!allowed()) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(service.listMyReports(page, size));
    }
}
