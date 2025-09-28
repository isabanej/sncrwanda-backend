package org.sncrwanda.hr.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.sncrwanda.hr.dto.DepartmentRequest;
import org.sncrwanda.hr.dto.DepartmentResponse;
import org.sncrwanda.hr.service.DepartmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/departments")
@Tag(name = "Department", description = "Department management APIs")
public class DepartmentController {
    @Autowired
    private DepartmentService departmentService;

    @GetMapping
    @Operation(summary = "Get all departments")
    public List<DepartmentResponse> getAll() {
        return departmentService.getAllDepartments();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get department by ID")
    public ResponseEntity<DepartmentResponse> getById(@PathVariable UUID id) {
        Optional<DepartmentResponse> d = departmentService.getDepartmentById(id);
        return d.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new department")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = DepartmentRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"name\": \"Academics\",\n  \"branchId\": \"00000000-0000-0000-0000-000000000001\"\n}"
            )
        )
    )
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(201).body(departmentService.createDepartment(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a department")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = DepartmentRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"name\": \"Academic Affairs\",\n  \"branchId\": \"00000000-0000-0000-0000-000000000001\"\n}"
            )
        )
    )
    public ResponseEntity<DepartmentResponse> update(@PathVariable UUID id, @Valid @RequestBody DepartmentRequest request) {
        return departmentService.updateDepartment(id, request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a department")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        boolean deleted = departmentService.deleteDepartment(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
