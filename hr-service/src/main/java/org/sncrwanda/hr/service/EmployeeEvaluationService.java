package org.sncrwanda.hr.service;

import org.sncrwanda.hr.domain.EmployeeEvaluation;
import org.sncrwanda.hr.dto.EmployeeEvaluationRequest;
import org.sncrwanda.hr.repository.EmployeeEvaluationRepository;
import org.sncrwanda.hr.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EmployeeEvaluationService {
    @Autowired
    private EmployeeEvaluationRepository repo;

    private static Pageable sanitize(Pageable pageable) {
        if (pageable == null) return PageRequest.of(0, 20);
        int size = pageable.getPageSize();
        if (size > 200) return PageRequest.of(pageable.getPageNumber(), 200, pageable.getSort());
        return pageable;
    }

    public List<EmployeeEvaluation> listByBranch() {
        if (SecurityUtils.isAdmin()) return repo.findAll();
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return repo.findByBranchId(branchId);
    }

    public List<EmployeeEvaluation> listByBranch(int page, int size) {
        if (SecurityUtils.isAdmin()) return repo.findAll(PageRequest.of(page, size)).getContent();
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        Page<EmployeeEvaluation> p = repo.findByBranchId(branchId, PageRequest.of(page, size));
        return p.getContent();
    }

    // New pageable version returning full Page metadata
    public Page<EmployeeEvaluation> pageByBranch(Pageable pageable) {
        pageable = sanitize(pageable);
        if (SecurityUtils.isAdmin()) return repo.findAll(pageable);
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return Page.empty(pageable);
        return repo.findByBranchId(branchId, pageable);
    }

    public List<EmployeeEvaluation> listByEmployee(UUID employeeId) {
        if (SecurityUtils.isAdmin()) return repo.findByEmployeeId(employeeId);
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return repo.findByEmployeeId(employeeId).stream().filter(e -> branchId.equals(e.getBranchId())).collect(Collectors.toList());
    }

    public List<EmployeeEvaluation> listByEmployee(UUID employeeId, int page, int size) {
        if (SecurityUtils.isAdmin()) return repo.findByEmployeeId(employeeId, PageRequest.of(page, size)).getContent();
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return repo.findByEmployeeId(employeeId, PageRequest.of(page, size)).getContent().stream()
                .filter(e -> branchId.equals(e.getBranchId()))
                .collect(Collectors.toList());
    }

    // New pageable version returning full Page metadata
    public Page<EmployeeEvaluation> pageByEmployee(UUID employeeId, Pageable pageable) {
        pageable = sanitize(pageable);
        if (SecurityUtils.isAdmin()) return repo.findByEmployeeId(employeeId, pageable);
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return Page.empty(pageable);
        return repo.findByEmployeeIdAndBranchId(employeeId, branchId, pageable);
    }

    public Optional<EmployeeEvaluation> getById(UUID id) {
        Optional<EmployeeEvaluation> opt = repo.findById(id);
        if (opt.isEmpty()) return Optional.empty();
        EmployeeEvaluation ev = opt.get();
        if (SecurityUtils.isAdmin()) return Optional.of(ev);
        UUID branchId = SecurityUtils.getBranchId();
        return (branchId != null && branchId.equals(ev.getBranchId())) ? Optional.of(ev) : Optional.empty();
    }

    @Transactional
    public EmployeeEvaluation create(EmployeeEvaluationRequest req) {
        UUID userBranch = SecurityUtils.getBranchId();
        if (!SecurityUtils.isAdmin()) {
            if (userBranch == null) throw new RuntimeException("User branch not found in token");
            if (req.getBranchId() != null && !userBranch.equals(req.getBranchId())) throw new RuntimeException("Cannot evaluate for another branch");
        }
        EmployeeEvaluation ev = new EmployeeEvaluation();
        ev.setEmployeeId(req.getEmployeeId());
        ev.setEvaluatorId(req.getEvaluatorId());
        ev.setScore(req.getScore());
        ev.setComments(req.getComments());
        ev.setImprovementPlan(req.getImprovementPlan());
        ev.setDate(req.getDate() != null ? req.getDate() : LocalDate.now());
        ev.setBranchId(req.getBranchId() != null ? req.getBranchId() : userBranch);
        ev = repo.save(ev);
        log.info("AUDIT evaluation.create id={} employeeId={} evaluatorId={} branchId={} score={}", ev.getId(), ev.getEmployeeId(), ev.getEvaluatorId(), ev.getBranchId(), ev.getScore());
        return ev;
    }

    @Transactional
    public boolean delete(UUID id) {
        Optional<EmployeeEvaluation> opt = repo.findById(id);
        if (opt.isEmpty()) return false;
        EmployeeEvaluation ev = opt.get();
        if (SecurityUtils.isAdmin() || (SecurityUtils.getBranchId() != null && SecurityUtils.getBranchId().equals(ev.getBranchId()))) {
            repo.deleteById(id);
            log.info("AUDIT evaluation.delete id={} employeeId={} evaluatorId={} branchId={}", ev.getId(), ev.getEmployeeId(), ev.getEvaluatorId(), ev.getBranchId());
            return true;
        }
        return false;
    }
}
