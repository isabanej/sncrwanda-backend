package org.sncrwanda.hr.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.sncrwanda.hr.domain.EmployeeEvaluation;
import org.sncrwanda.hr.dto.EmployeeEvaluationRequest;
import org.sncrwanda.hr.service.EmployeeEvaluationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/employee-evaluations")
@Tag(name = "EmployeeEvaluation", description = "Employee performance evaluations")
public class EmployeeEvaluationController {
    @Autowired
    private EmployeeEvaluationService service;

    @GetMapping
    @Operation(summary = "List evaluations (branch-scoped) with pagination")
    public Page<EmployeeEvaluation> list(@PageableDefault(size = 20) Pageable pageable) {
        return service.pageByBranch(pageable);
    }

    @GetMapping("/employee/{employeeId}")
    @Operation(summary = "List evaluations for an employee with pagination")
    public Page<EmployeeEvaluation> listForEmployee(@PathVariable UUID employeeId,
                                                    @PageableDefault(size = 20) Pageable pageable) {
        return service.pageByEmployee(employeeId, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get evaluation by ID")
    public ResponseEntity<EmployeeEvaluation> get(@PathVariable UUID id) {
        return service.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create evaluation")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = EmployeeEvaluationRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"employeeId\": \"00000000-0000-0000-0000-000000000123\",\n  \"evaluatorId\": \"00000000-0000-0000-0000-000000000456\",\n  \"score\": 4,\n  \"comments\": \"Solid performance\",\n  \"improvementPlan\": \"More training\",\n  \"date\": \"2025-09-18\"\n}"
            )
        )
    )
    public ResponseEntity<EmployeeEvaluation> create(@Valid @RequestBody EmployeeEvaluationRequest req) {
        return ResponseEntity.status(201).body(service.create(req));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete evaluation")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        boolean deleted = service.delete(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
