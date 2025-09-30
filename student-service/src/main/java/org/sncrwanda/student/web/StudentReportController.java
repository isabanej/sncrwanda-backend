package org.sncrwanda.student.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.sncrwanda.student.dto.StudentReportRequest;
import org.sncrwanda.student.dto.StudentReportResponse;
import org.sncrwanda.student.service.StudentReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/student-reports")
@Tag(name = "Student Reports", description = "Track student performance reports by teachers")
public class StudentReportController {
    @Autowired
    private StudentReportService service;

    @PostMapping
    @Operation(summary = "Create a student report (ADMIN or TEACHER)")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = StudentReportRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"studentId\": \"00000000-0000-0000-0000-000000000111\",\n  \"teacherId\": \"00000000-0000-0000-0000-000000000222\",\n  \"comments\": \"Improving in math\",\n  \"improvementPlan\": \"Practice 30m/day\",\n  \"term\": \"2025-Q1\",\n  \"date\": \"2025-09-18\",\n  \"branchId\": \"00000000-0000-0000-0000-000000000001\"\n}"
            )
        )
    )
    public ResponseEntity<StudentReportResponse> create(@Valid @RequestBody StudentReportRequest req) {
        return ResponseEntity.status(201).body(service.create(req));
    }

    @GetMapping
    @Operation(summary = "List student reports (scoped by branch for non-admin)")
    public List<StudentReportResponse> list(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size,
                                            @RequestParam(defaultValue = "false") boolean archived) {
        return service.listAll(page, size, archived);
    }

    // Constrain ID to UUID format to prevent static path fragments from being misinterpreted
    @GetMapping("/{id:[0-9a-fA-F\\-]{36}}")
    @Operation(summary = "Get report by ID (scoped by branch for non-admin)")
    public ResponseEntity<StudentReportResponse> get(@PathVariable UUID id) {
        Optional<StudentReportResponse> r = service.getById(id);
        return r.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/student/{studentId}")
    @Operation(summary = "List reports for a student (scoped by branch for non-admin)")
    public List<StudentReportResponse> byStudent(@PathVariable UUID studentId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return service.listByStudent(studentId, page, size);
    }

    @PutMapping("/{id:[0-9a-fA-F\\-]{36}}")
    @Operation(summary = "Update a student report")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = StudentReportRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"studentId\": \"00000000-0000-0000-0000-000000000111\",\n  \"teacherId\": \"00000000-0000-0000-0000-000000000222\",\n  \"comments\": \"Great progress\",\n  \"improvementPlan\": \"Keep practicing\",\n  \"term\": \"2025-Q1\",\n  \"date\": \"2025-09-19\",\n  \"branchId\": \"00000000-0000-0000-0000-000000000001\"\n}"
            )
        )
    )
    public ResponseEntity<StudentReportResponse> update(@PathVariable UUID id, @Valid @RequestBody StudentReportRequest req) {
        return service.update(id, req).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id:[0-9a-fA-F\\-]{36}}")
    @Operation(summary = "Archive (soft delete) a student report")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        boolean archived = service.delete(id);
        return archived ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id:[0-9a-fA-F\\-]{36}}/restore")
    @Operation(summary = "Restore an archived student report")
    public ResponseEntity<Void> restore(@PathVariable UUID id) {
        boolean restored = service.restore(id);
        return restored ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
