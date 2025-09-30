package org.sncrwanda.reporting.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.sncrwanda.reporting.dto.ReportSummaryResponse;
import org.sncrwanda.reporting.dto.StudentSummaryResponse;
import org.sncrwanda.reporting.service.ReportingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports")
@Tag(name = "Reporting", description = "Reporting and aggregation APIs")
public class ReportingController {
    @Autowired
    private ReportingService reportingService;

    @GetMapping("/summary")
    @Operation(summary = "Get a system summary: counts and totals")
    public ResponseEntity<ReportSummaryResponse> summary() {
        return ResponseEntity.ok(reportingService.getSummary());
    }

    @GetMapping("/students/summary")
    @Operation(summary = "Get student aggregate counts (total/active/deleted)")
    public ResponseEntity<StudentSummaryResponse> studentSummary() {
        return ResponseEntity.ok(reportingService.getStudentSummary());
    }
}

