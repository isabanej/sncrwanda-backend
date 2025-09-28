package org.sncrwanda.hr.service;

import org.sncrwanda.hr.domain.Department;
import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.dto.DepartmentRequest;
import org.sncrwanda.hr.dto.DepartmentResponse;
import org.sncrwanda.hr.repository.DepartmentRepository;
import org.sncrwanda.hr.repository.BranchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DepartmentService {
    @Autowired
    private DepartmentRepository departmentRepository;
    @Autowired
    private BranchRepository branchRepository;

    public List<DepartmentResponse> getAllDepartments() {
        return departmentRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Optional<DepartmentResponse> getDepartmentById(UUID id) {
        return departmentRepository.findById(id).map(this::toResponse);
    }

    @Transactional
    public DepartmentResponse createDepartment(DepartmentRequest request) {
        if (departmentRepository.existsByName(request.getName())) {
            throw new RuntimeException("Department name already exists");
        }
        Branch branch = branchRepository.findById(request.getBranchId()).orElseThrow(() -> new RuntimeException("Branch not found"));
        Department dept = new Department();
        dept.setName(request.getName());
        dept.setBranch(branch);
        dept = departmentRepository.save(dept);
        return toResponse(dept);
    }

    @Transactional
    public Optional<DepartmentResponse> updateDepartment(UUID id, DepartmentRequest request) {
        return departmentRepository.findById(id).map(dept -> {
            dept.setName(request.getName());
            Branch branch = branchRepository.findById(request.getBranchId()).orElseThrow(() -> new RuntimeException("Branch not found"));
            dept.setBranch(branch);
            return toResponse(departmentRepository.save(dept));
        });
    }

    @Transactional
    public boolean deleteDepartment(UUID id) {
        if (departmentRepository.existsById(id)) {
            departmentRepository.deleteById(id);
            return true;
        }
        return false;
    }

    private DepartmentResponse toResponse(Department dept) {
        DepartmentResponse resp = new DepartmentResponse();
        resp.setId(dept.getId());
        resp.setName(dept.getName());
        resp.setBranchId(dept.getBranch() != null ? dept.getBranch().getId() : null);
        return resp;
    }
}
