package org.sncrwanda.student.service;

import org.sncrwanda.student.domain.Student;
import org.sncrwanda.student.domain.StudentReport;
import org.sncrwanda.student.dto.StudentReportResponse;
import org.sncrwanda.student.dto.StudentResponse;
import org.sncrwanda.student.repo.StudentRepo;
import org.sncrwanda.student.repo.StudentReportRepo;
import org.sncrwanda.student.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GuardianPortalService {
    private final StudentRepo studentRepo;
    private final StudentReportRepo reportRepo;

    public GuardianPortalService(StudentRepo studentRepo, StudentReportRepo reportRepo) {
        this.studentRepo = studentRepo;
        this.reportRepo = reportRepo;
    }

    public List<StudentResponse> listMyStudents(int page, int size) {
        UUID guardianId = SecurityUtils.getGuardianId();
        if (guardianId == null) return List.of();
        Page<Student> students = studentRepo.findByGuardian_Id(guardianId, PageRequest.of(page, size));
        return students.getContent().stream().map(this::toStudentResponse).collect(Collectors.toList());
    }

    public List<StudentReportResponse> listMyReports(int page, int size) {
        UUID guardianId = SecurityUtils.getGuardianId();
        if (guardianId == null) return List.of();
        Page<Student> students = studentRepo.findByGuardian_Id(guardianId, PageRequest.of(0, Integer.MAX_VALUE));
        if (students.isEmpty()) return List.of();
        List<UUID> studentIds = students.getContent().stream().map(Student::getId).collect(Collectors.toList());
        var pageable = PageRequest.of(page, size);
        var reportsPage = reportRepo.findByStudentIdIn(studentIds, pageable);
        return reportsPage.getContent().stream().map(this::toReportResponse).collect(Collectors.toList());
    }

    private StudentResponse toStudentResponse(Student s) {
        StudentResponse r = new StudentResponse();
        r.setId(s.getId());
        r.setGuardianId(s.getGuardian() != null ? s.getGuardian().getId() : null);
        r.setChildName(s.getChildName());
        r.setChildDob(s.getChildDob());
        r.setHobbies(s.getHobbies());
        r.setNeeds(s.getNeeds());
        r.setNeedsOtherText(s.getNeedsOtherText());
        r.setBranchId(s.getBranchId());
        return r;
    }

    private StudentReportResponse toReportResponse(StudentReport sr) {
        StudentReportResponse r = new StudentReportResponse();
        r.setId(sr.getId());
        r.setStudentId(sr.getStudentId());
        r.setTeacherId(sr.getTeacherId());
        r.setComments(sr.getComments());
        r.setImprovementPlan(sr.getImprovementPlan());
        r.setTerm(sr.getTerm());
        r.setDate(sr.getDate());
        r.setBranchId(sr.getBranchId());
        return r;
    }
}
