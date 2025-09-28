package org.sncrwanda.student.service;

import org.sncrwanda.student.domain.StudentReport;
import org.sncrwanda.student.dto.StudentReportRequest;
import org.sncrwanda.student.dto.StudentReportResponse;
import org.sncrwanda.student.repo.StudentReportRepo;
import org.sncrwanda.student.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StudentReportService {
    @Autowired
    private StudentReportRepo repo;

    public List<StudentReportResponse> listAll() {
        return listAll(false); // default active only
    }

    public List<StudentReportResponse> listAll(boolean archived) {
        if (SecurityUtils.isAdmin()) {
            return (archived ? repo.findByArchived(true) : repo.findByArchived(false))
                    .stream().map(this::toResponse).collect(Collectors.toList());
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return (archived ? repo.findByBranchIdAndArchived(branchId, true) : repo.findByBranchIdAndArchived(branchId, false))
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<StudentReportResponse> listAll(int page, int size, boolean archived) {
        if (SecurityUtils.isAdmin()) {
            Page<StudentReport> p = archived ? repo.findByArchived(true, PageRequest.of(page, size)) : repo.findByArchived(false, PageRequest.of(page, size));
            return p.getContent().stream().map(this::toResponse).collect(Collectors.toList());
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        Page<StudentReport> p = archived ? repo.findByBranchIdAndArchived(branchId, true, PageRequest.of(page, size)) : repo.findByBranchIdAndArchived(branchId, false, PageRequest.of(page, size));
        return p.getContent().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<StudentReportResponse> listByStudent(UUID studentId) {
        if (SecurityUtils.isAdmin()) {
            return repo.findByStudentId(studentId).stream().map(this::toResponse).collect(Collectors.toList());
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return repo.findByStudentId(studentId).stream()
                .filter(r -> branchId.equals(r.getBranchId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<StudentReportResponse> listByStudent(UUID studentId, int page, int size) {
        if (SecurityUtils.isAdmin()) {
            Page<StudentReport> p = repo.findByStudentId(studentId, PageRequest.of(page, size));
            return p.getContent().stream().map(this::toResponse).collect(Collectors.toList());
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        Page<StudentReport> p = repo.findByStudentId(studentId, PageRequest.of(page, size));
        return p.getContent().stream()
                .filter(r -> branchId.equals(r.getBranchId()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Optional<StudentReportResponse> getById(UUID id) {
        return repo.findById(id)
                .filter(r -> !r.isArchived())
                .filter(r -> {
                    if (SecurityUtils.isAdmin()) return true;
                    UUID branchId = SecurityUtils.getBranchId();
                    return branchId != null && branchId.equals(r.getBranchId());
                })
                .map(this::toResponse);
    }

    @Transactional
    public StudentReportResponse create(StudentReportRequest req) {
        boolean admin = SecurityUtils.isAdmin();
        boolean teacher = SecurityUtils.hasRole("TEACHER");
        if (!admin && !teacher) {
            throw new RuntimeException("No permission to create student report");
        }
        UUID requestedBranch = req.getBranchId();
        UUID userBranch = SecurityUtils.getBranchId();
        if (!admin) {
            if (userBranch == null) throw new RuntimeException("User branch not found in token");
            if (requestedBranch != null && !userBranch.equals(requestedBranch)) throw new RuntimeException("Cannot create report for another branch");
            requestedBranch = userBranch;
        }
        if (teacher) {
            UUID userId = SecurityUtils.getUserId();
            if (userId == null || req.getTeacherId() == null || !userId.equals(req.getTeacherId())) {
                throw new RuntimeException("TeacherId must match authenticated user");
            }
        }
        StudentReport r = new StudentReport();
        r.setStudentId(req.getStudentId());
        r.setTeacherId(req.getTeacherId());
        r.setComments(req.getComments());
        r.setImprovementPlan(req.getImprovementPlan());
        r.setTerm(req.getTerm());
        r.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        r.setBranchId(requestedBranch);
        r = repo.save(r);
        return toResponse(r);
    }

    @Transactional
    public Optional<StudentReportResponse> update(UUID id, StudentReportRequest req) {
        return repo.findById(id).map(r -> {
            boolean admin = SecurityUtils.isAdmin();
            boolean teacher = SecurityUtils.hasRole("TEACHER");
            if (!admin) {
                UUID userBranch = SecurityUtils.getBranchId();
                if (userBranch == null || !userBranch.equals(r.getBranchId())) throw new RuntimeException("No permission to update this report");
                if (req.getBranchId() != null && !userBranch.equals(req.getBranchId())) throw new RuntimeException("Cannot move report to another branch");
            }
            if (teacher) {
                UUID userId = SecurityUtils.getUserId();
                if (userId == null || req.getTeacherId() == null || !userId.equals(req.getTeacherId())) {
                    throw new RuntimeException("TeacherId must match authenticated user");
                }
            }
            r.setStudentId(req.getStudentId());
            r.setTeacherId(req.getTeacherId());
            r.setComments(req.getComments());
            r.setImprovementPlan(req.getImprovementPlan());
            r.setTerm(req.getTerm());
            if (req.getDate() != null) r.setDate(req.getDate());
            if (req.getBranchId() != null) r.setBranchId(req.getBranchId());
            return toResponse(repo.save(r));
        });
    }

    @Transactional
    public boolean delete(UUID id) {
        Optional<StudentReport> opt = repo.findById(id);
        if (opt.isEmpty()) return false;
        StudentReport r = opt.get();
        if (SecurityUtils.isAdmin()) {
            r.setArchived(true);
            repo.save(r);
            return true;
        }
        UUID userBranch = SecurityUtils.getBranchId();
        if (userBranch != null && userBranch.equals(r.getBranchId())) {
            r.setArchived(true);
            repo.save(r);
            return true;
        }
        return false;
    }

    public boolean restore(UUID id) {
        Optional<StudentReport> opt = repo.findById(id);
        if (opt.isEmpty()) return false;
        StudentReport r = opt.get();
        if (!r.isArchived()) return true; // already active
        if (SecurityUtils.isAdmin()) {
            r.setArchived(false);
            repo.save(r);
            return true;
        }
        UUID userBranch = SecurityUtils.getBranchId();
        if (userBranch != null && userBranch.equals(r.getBranchId())) {
            r.setArchived(false);
            repo.save(r);
            return true;
        }
        return false;
    }

    private StudentReportResponse toResponse(StudentReport r) {
        StudentReportResponse resp = new StudentReportResponse();
        resp.setId(r.getId());
        resp.setStudentId(r.getStudentId());
        resp.setTeacherId(r.getTeacherId());
        resp.setComments(r.getComments());
        resp.setImprovementPlan(r.getImprovementPlan());
        resp.setTerm(r.getTerm());
        resp.setDate(r.getDate());
        resp.setBranchId(r.getBranchId());
        return resp;
    }
}
