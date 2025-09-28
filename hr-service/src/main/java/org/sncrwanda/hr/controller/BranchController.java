package org.sncrwanda.hr.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.sncrwanda.hr.dto.BranchRequest;
import org.sncrwanda.hr.dto.BranchResponse;
import org.sncrwanda.hr.service.BranchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/branches")
@Tag(name = "Branch", description = "Branch management APIs")
public class BranchController {
    @Autowired
    private BranchService branchService;

    @GetMapping
    @Operation(summary = "Get all branches")
    public List<BranchResponse> getAllBranches() {
        return branchService.getAllBranches();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get branch by ID")
    public ResponseEntity<BranchResponse> getBranchById(@PathVariable UUID id) {
        Optional<BranchResponse> b = branchService.getBranchById(id);
        return b.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new branch")
    public ResponseEntity<BranchResponse> createBranch(@Valid @RequestBody BranchRequest request) {
        return ResponseEntity.ok(branchService.createBranch(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a branch")
    public ResponseEntity<BranchResponse> updateBranch(@PathVariable UUID id, @Valid @RequestBody BranchRequest request) {
        Optional<BranchResponse> updated = branchService.updateBranch(id, request);
        return updated.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a branch")
    public ResponseEntity<Void> deleteBranch(@PathVariable UUID id) {
        boolean deleted = branchService.deleteBranch(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}

