package org.sncrwanda.hr.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.service.EmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController("hrEmployeeController")
@RequestMapping("/employees")
@Tag(name = "Employee", description = "Employee management APIs")
public class EmployeeController {
    @Autowired
    private EmployeeService employeeService;

    @GetMapping
    @Operation(summary = "Get all employees (optionally archived)")
    public List<Employee> getAllEmployees(@RequestParam(name = "archived", required = false, defaultValue = "false") boolean archived) {
        return employeeService.getAllEmployees(archived);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get employee by ID")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable UUID id) {
        Optional<Employee> employee = employeeService.getEmployeeById(id);
        return employee.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new employee")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = Employee.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"fullName\": \"John Teacher\",\n  \"dob\": \"1990-05-01\",\n  \"address\": \"Kigali\",\n  \"position\": \"TEACHER\",\n  \"salary\": 1200,\n  \"phone\": \"078...\",\n  \"email\": \"john.t@example.com\",\n  \"active\": true,\n  \"department\": { \"id\": \"00000000-0000-0000-0000-000000000001\" },\n  \"branch\": { \"id\": \"00000000-0000-0000-0000-000000000001\" }\n}"
            )
        )
    )
    public Employee createEmployee(@RequestBody Employee employee) {
        return employeeService.createEmployee(employee);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an employee")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = Employee.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"fullName\": \"John Teacher\",\n  \"dob\": \"1990-05-01\",\n  \"address\": \"Kigali updated\",\n  \"position\": \"TEACHER\",\n  \"salary\": 1300,\n  \"phone\": \"078...\",\n  \"email\": \"john.t@example.com\",\n  \"active\": true,\n  \"department\": { \"id\": \"00000000-0000-0000-0000-000000000001\" },\n  \"branch\": { \"id\": \"00000000-0000-0000-0000-000000000001\" }\n}"
            )
        )
    )
    public ResponseEntity<Employee> updateEmployee(@PathVariable UUID id, @RequestBody Employee employee) {
        Optional<Employee> updated = employeeService.updateEmployee(id, employee);
        return updated.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Archive (soft delete) an employee")
    public ResponseEntity<Void> archiveEmployee(@PathVariable UUID id) {
        boolean archived = employeeService.archiveEmployee(id);
        return archived ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/restore")
    @Operation(summary = "Restore an archived employee")
    public ResponseEntity<Void> restoreEmployee(@PathVariable UUID id) {
        boolean restored = employeeService.restoreEmployee(id);
        return restored ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
