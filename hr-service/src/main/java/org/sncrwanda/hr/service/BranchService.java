package org.sncrwanda.hr.service;

import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.dto.BranchRequest;
import org.sncrwanda.hr.dto.BranchResponse;
import org.sncrwanda.hr.repository.BranchRepository;
import org.sncrwanda.hr.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BranchService {
    @Autowired
    private BranchRepository branchRepository;
    @Autowired
    private EmployeeRepository employeeRepository;

    public List<BranchResponse> getAllBranches() {
        return branchRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Optional<BranchResponse> getBranchById(UUID id) {
        return branchRepository.findById(id).map(this::toResponse);
    }

    @Transactional
    public BranchResponse createBranch(BranchRequest request) {
        if (branchRepository.existsByName(request.getName())) {
            throw new RuntimeException("Branch name already exists");
        }
        Branch b = new Branch();
        b.setName(request.getName());
        b.setAddress(request.getAddress());
        if (request.getHeadOfBranchId() != null) {
            Employee head = employeeRepository.findById(request.getHeadOfBranchId()).orElseThrow(() -> new RuntimeException("Head of branch employee not found"));
            b.setHeadOfBranch(head);
        }
        b = branchRepository.save(b);
        return toResponse(b);
    }

    @Transactional
    public Optional<BranchResponse> updateBranch(UUID id, BranchRequest request) {
        return branchRepository.findById(id).map(b -> {
            b.setName(request.getName());
            b.setAddress(request.getAddress());
            if (request.getHeadOfBranchId() != null) {
                Employee head = employeeRepository.findById(request.getHeadOfBranchId()).orElseThrow(() -> new RuntimeException("Head of branch employee not found"));
                b.setHeadOfBranch(head);
            } else {
                b.setHeadOfBranch(null);
            }
            return toResponse(branchRepository.save(b));
        });
    }

    @Transactional
    public boolean deleteBranch(UUID id) {
        if (branchRepository.existsById(id)) {
            branchRepository.deleteById(id);
            return true;
        }
        return false;
    }

    private BranchResponse toResponse(Branch b) {
        BranchResponse resp = new BranchResponse();
        resp.setId(b.getId());
        resp.setName(b.getName());
        resp.setAddress(b.getAddress());
        resp.setHeadOfBranchId(b.getHeadOfBranch() != null ? b.getHeadOfBranch().getId() : null);
        return resp;
    }
}
