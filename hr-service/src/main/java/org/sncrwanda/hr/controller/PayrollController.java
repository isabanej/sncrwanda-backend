package org.sncrwanda.hr.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.sncrwanda.hr.domain.PayrollEntry;
import org.sncrwanda.hr.domain.PayrollPeriod;
import org.sncrwanda.hr.domain.PayrollLine;
import org.sncrwanda.hr.dto.PayrollEntryUpdateRequest;
import org.sncrwanda.hr.dto.PayrollPeriodRequest;
import org.sncrwanda.hr.dto.PayrollLineRequest;
import org.sncrwanda.hr.dto.PayslipResponse;
import org.sncrwanda.hr.service.PayrollService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/payroll")
@Tag(name = "Payroll", description = "Monthly payroll management per employee")
@RequiredArgsConstructor
public class PayrollController {
    private final PayrollService service;

    @PostMapping("/periods")
    @Operation(summary = "Create or get a payroll period and generate entries for active employees")
    public ResponseEntity<PayrollPeriod> createOrGet(@Valid @RequestBody PayrollPeriodRequest req) {
        PayrollPeriod p = service.createOrGetPeriod(req);
        // 200 OK since it may return an existing period
        return ResponseEntity.ok(p);
    }

    @GetMapping("/periods")
    @Operation(summary = "List payroll periods (branch-scoped) with pagination")
    public Page<PayrollPeriod> listPeriods(@PageableDefault(size = 20) Pageable pageable) {
        return service.listPeriods(pageable);
    }

    @GetMapping("/periods/{id}")
    @Operation(summary = "Get payroll period by ID")
    public ResponseEntity<PayrollPeriod> getPeriod(@PathVariable UUID id) {
        Optional<PayrollPeriod> opt = service.getPeriod(id);
        return opt.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/periods/{id}/entries")
    @Operation(summary = "List entries for a payroll period")
    public Page<PayrollEntry> listEntries(@PathVariable UUID id, @PageableDefault(size = 50) Pageable pageable) {
        return service.listEntries(id, pageable);
    }

    @PatchMapping("/periods/{id}/entries/{entryId}")
    @Operation(summary = "Update a payroll entry (allowances/deductions/notes) in DRAFT period")
    public ResponseEntity<PayrollEntry> updateEntry(@PathVariable UUID id,
                                                    @PathVariable UUID entryId,
                                                    @Valid @RequestBody PayrollEntryUpdateRequest req) {
        PayrollEntry e = service.updateEntry(id, entryId, req);
        return ResponseEntity.ok(e);
    }

    @PostMapping("/periods/{id}/approve")
    @Operation(summary = "Approve a payroll period (locks entries)")
    public ResponseEntity<PayrollPeriod> approve(@PathVariable UUID id) {
        PayrollPeriod p = service.approve(id);
        return ResponseEntity.ok(p);
    }

    @PostMapping("/periods/{id}/pay")
    @Operation(summary = "Mark a payroll period as paid and stamp entries")
    public ResponseEntity<PayrollPeriod> pay(@PathVariable UUID id) {
        PayrollPeriod p = service.pay(id);
        return ResponseEntity.ok(p);
    }

    @GetMapping("/my/payslip")
    @Operation(summary = "Get my payslip (JSON) for a given year and month")
    public ResponseEntity<PayslipResponse> myPayslip(@RequestParam int year, @RequestParam int month) {
        return service.getMyPayslip(year, month)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/my/payslip.pdf", produces = "application/pdf")
    @Operation(summary = "Get my payslip as PDF for a given year and month")
    public ResponseEntity<byte[]> myPayslipPdf(@RequestParam int year, @RequestParam int month) {
        byte[] pdf = service.getMyPayslipPdf(year, month);
        String filename = String.format("payslip-%d-%02d.pdf", year, month);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(pdf);
    }

    @GetMapping("/my/payslips")
    @Operation(summary = "Get my payslips (JSON) for selected months in a year. Provide months as comma-separated or repeated query param.")
    public ResponseEntity<List<PayslipResponse>> myPayslips(@RequestParam int year, @RequestParam List<Integer> months) {
        List<PayslipResponse> list = service.getMyPayslips(year, months);
        return ResponseEntity.ok(list);
    }

    @GetMapping(value = "/my/payslips.pdf", produces = "application/pdf")
    @Operation(summary = "Get my payslips as a single PDF with multiple pages for selected months in a year")
    public ResponseEntity<byte[]> myPayslipsPdf(@RequestParam int year, @RequestParam List<Integer> months) {
        byte[] pdf = service.getMyPayslipsPdf(year, months);
        String monthsLabel = months.stream().map(Object::toString).collect(Collectors.joining("-"));
        String filename = String.format("payslips-%d-%s.pdf", year, monthsLabel);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(pdf);
    }

    @GetMapping("/periods/{id}/entries/{entryId}/lines")
    @Operation(summary = "List itemized lines for a payroll entry")
    public ResponseEntity<List<PayrollLine>> listLines(@PathVariable UUID id, @PathVariable UUID entryId) {
        return ResponseEntity.ok(service.listLines(id, entryId));
    }

    @PostMapping("/periods/{id}/entries/{entryId}/lines")
    @Operation(summary = "Add an itemized line to a payroll entry (DRAFT only)")
    public ResponseEntity<PayrollLine> addLine(@PathVariable UUID id,
                                               @PathVariable UUID entryId,
                                               @Valid @RequestBody PayrollLineRequest req) {
        PayrollLine line = service.addLine(id, entryId, req);
        return ResponseEntity.ok(line);
    }

    @DeleteMapping("/periods/{id}/entries/{entryId}/lines/{lineId}")
    @Operation(summary = "Delete an itemized line from a payroll entry (DRAFT only)")
    public ResponseEntity<Void> deleteLine(@PathVariable UUID id,
                                           @PathVariable UUID entryId,
                                           @PathVariable UUID lineId) {
        service.deleteLine(id, entryId, lineId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> badRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> notFound(NoSuchElementException ex) {
        return ResponseEntity.status(404).body(ex.getMessage());
    }
}
