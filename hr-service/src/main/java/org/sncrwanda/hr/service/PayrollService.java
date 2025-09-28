package org.sncrwanda.hr.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.domain.PayrollEntry;
import org.sncrwanda.hr.domain.PayrollPeriod;
import org.sncrwanda.hr.domain.PayrollLine;
import org.sncrwanda.hr.dto.PayrollEntryUpdateRequest;
import org.sncrwanda.hr.dto.PayrollPeriodRequest;
import org.sncrwanda.hr.dto.PayrollLineRequest;
import org.sncrwanda.hr.dto.PayslipResponse;
import org.sncrwanda.hr.repository.EmployeeRepository;
import org.sncrwanda.hr.repository.PayrollEntryRepository;
import org.sncrwanda.hr.repository.PayrollPeriodRepository;
import org.sncrwanda.hr.repository.PayrollLineRepository;
import org.sncrwanda.hr.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

// PDFBox imports
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

@Service
@Slf4j
@RequiredArgsConstructor
public class PayrollService {
    private final PayrollPeriodRepository periodRepo;
    private final PayrollEntryRepository entryRepo;
    private final EmployeeRepository employeeRepo;
    private final PayrollLineRepository lineRepo;

    private static Pageable sanitize(Pageable pageable) {
        if (pageable == null) return PageRequest.of(0, 20);
        int size = pageable.getPageSize();
        if (size > 200) {
            return PageRequest.of(pageable.getPageNumber(), 200, pageable.getSort());
        }
        return pageable;
    }

    private UUID resolveBranchOrThrow(UUID requested) {
        if (SecurityUtils.isAdmin()) {
            UUID fromToken = SecurityUtils.getBranchId();
            UUID branch = requested != null ? requested : fromToken;
            if (branch == null) throw new IllegalStateException("Admin must specify branchId");
            return branch;
        }
        UUID fromToken = SecurityUtils.getBranchId();
        if (fromToken == null) throw new IllegalStateException("Branch not found in token");
        return fromToken;
    }

    private void assertPeriodAccess(PayrollPeriod p) {
        if (SecurityUtils.isAdmin()) return;
        UUID userBranch = SecurityUtils.getBranchId();
        if (userBranch == null || !userBranch.equals(p.getBranchId())) {
            throw new NoSuchElementException("Payroll period not found");
        }
    }

    private Employee currentEmployeeOrThrow() {
        String email = SecurityUtils.getEmail();
        if (email == null || email.isBlank()) throw new NoSuchElementException("User email not found in token");
        return employeeRepo.findByEmailIgnoreCase(email).orElseThrow(() -> new NoSuchElementException("Employee not found for user"));
    }

    @Transactional
    public PayrollPeriod createOrGetPeriod(PayrollPeriodRequest req) {
        UUID branchId = resolveBranchOrThrow(req.getBranchId());
        int year = req.getYear();
        int month = req.getMonth();
        Optional<PayrollPeriod> existing = periodRepo.findByBranchIdAndYearAndMonth(branchId, year, month);
        if (existing.isPresent()) {
            return existing.get();
        }
        PayrollPeriod period = PayrollPeriod.builder()
                .branchId(branchId)
                .year(year)
                .month(month)
                .status(PayrollPeriod.Status.DRAFT)
                .createdBy(SecurityUtils.getUserId())
                .createdAt(OffsetDateTime.now())
                .build();
        period = periodRepo.save(period);

        // Generate entries for all active employees in the branch
        List<Employee> employees = employeeRepo.findByBranch_IdAndActiveTrue(branchId);
        for (Employee e : employees) {
            PayrollEntry entry = PayrollEntry.builder()
                    .period(period)
                    .employeeId(e.getId())
                    .branchId(branchId)
                    .grossSalary(e.getSalary())
                    .notes(null)
                    .build();
            entryRepo.save(entry);
        }
        log.info("AUDIT payroll.period.create id={} branchId={} year={} month={} entries={}", period.getId(), branchId, year, month, employees.size());
        return period;
    }

    public Page<PayrollPeriod> listPeriods(Pageable pageable) {
        pageable = sanitize(pageable);
        if (SecurityUtils.isAdmin()) return periodRepo.findAll(pageable);
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return Page.empty(pageable);
        return periodRepo.findByBranchId(branchId, pageable);
    }

    public Optional<PayrollPeriod> getPeriod(UUID id) {
        Optional<PayrollPeriod> opt = periodRepo.findById(id);
        opt.ifPresent(this::assertPeriodAccess);
        return opt;
    }

    public Page<PayrollEntry> listEntries(UUID periodId, Pageable pageable) {
        pageable = sanitize(pageable);
        PayrollPeriod period = periodRepo.findById(periodId).orElseThrow(NoSuchElementException::new);
        assertPeriodAccess(period);
        return entryRepo.findByPeriod_Id(period.getId(), pageable);
    }

    private void ensureDraft(PayrollPeriod period) {
        if (period.getStatus() != PayrollPeriod.Status.DRAFT) {
            throw new IllegalStateException("Only DRAFT periods can be edited");
        }
    }

    private void ensureEntryInPeriod(PayrollEntry entry, PayrollPeriod period) {
        if (entry.getPeriod() == null || !period.getId().equals(entry.getPeriod().getId())) {
            throw new NoSuchElementException("Payroll entry not found in this period");
        }
    }

    private void recomputeEntryFromLines(PayrollEntry entry) {
        List<PayrollLine> lines = lineRepo.findByEntry_Id(entry.getId());
        BigDecimal adds = lines.stream()
                .filter(l -> l.getType() == PayrollLine.LineType.EARNING)
                .map(PayrollLine::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal subs = lines.stream()
                .filter(l -> l.getType() == PayrollLine.LineType.DEDUCTION)
                .map(PayrollLine::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        entry.setAllowances(adds);
        entry.setDeductions(subs);
        entryRepo.save(entry);
    }

    public List<PayrollLine> listLines(UUID periodId, UUID entryId) {
        PayrollPeriod period = periodRepo.findById(periodId).orElseThrow(NoSuchElementException::new);
        assertPeriodAccess(period);
        PayrollEntry entry = entryRepo.findById(entryId).orElseThrow(NoSuchElementException::new);
        ensureEntryInPeriod(entry, period);
        return lineRepo.findByEntry_Id(entryId);
    }

    @Transactional
    public PayrollLine addLine(UUID periodId, UUID entryId, PayrollLineRequest req) {
        PayrollPeriod period = periodRepo.findById(periodId).orElseThrow(NoSuchElementException::new);
        assertPeriodAccess(period);
        ensureDraft(period);
        PayrollEntry entry = entryRepo.findById(entryId).orElseThrow(NoSuchElementException::new);
        ensureEntryInPeriod(entry, period);
        PayrollLine line = PayrollLine.builder()
                .entry(entry)
                .type(req.getType() == PayrollLineRequest.LineType.EARNING ? PayrollLine.LineType.EARNING : PayrollLine.LineType.DEDUCTION)
                .label(req.getLabel())
                .amount(req.getAmount())
                .build();
        line = lineRepo.save(line);
        recomputeEntryFromLines(entry);
        log.info("AUDIT payroll.line.add entryId={} type={} label={} amount={}", entryId, line.getType(), line.getLabel(), line.getAmount());
        return line;
    }

    @Transactional
    public boolean deleteLine(UUID periodId, UUID entryId, UUID lineId) {
        PayrollPeriod period = periodRepo.findById(periodId).orElseThrow(NoSuchElementException::new);
        assertPeriodAccess(period);
        ensureDraft(period);
        PayrollEntry entry = entryRepo.findById(entryId).orElseThrow(NoSuchElementException::new);
        ensureEntryInPeriod(entry, period);
        PayrollLine line = lineRepo.findById(lineId).orElseThrow(NoSuchElementException::new);
        if (line.getEntry() == null || !entryId.equals(line.getEntry().getId())) {
            throw new NoSuchElementException("Payroll line not found for this entry");
        }
        lineRepo.deleteById(lineId);
        recomputeEntryFromLines(entry);
        log.info("AUDIT payroll.line.delete entryId={} lineId={}", entryId, lineId);
        return true;
    }

    @Transactional
    public PayrollEntry updateEntry(UUID periodId, UUID entryId, PayrollEntryUpdateRequest req) {
        PayrollPeriod period = periodRepo.findById(periodId).orElseThrow(NoSuchElementException::new);
        assertPeriodAccess(period);
        ensureDraft(period);
        PayrollEntry entry = entryRepo.findById(entryId).orElseThrow(NoSuchElementException::new);
        ensureEntryInPeriod(entry, period);
        if (req.getAllowances() != null) entry.setAllowances(req.getAllowances());
        if (req.getDeductions() != null) entry.setDeductions(req.getDeductions());
        if (req.getNotes() != null) entry.setNotes(req.getNotes());
        // netPay recalculated by entity callbacks
        entry = entryRepo.save(entry);
        log.info("AUDIT payroll.entry.update id={} periodId={} allowances={} deductions={} netPay={}", entry.getId(), periodId, entry.getAllowances(), entry.getDeductions(), entry.getNetPay());
        return entry;
    }

    @Transactional
    public PayrollPeriod approve(UUID periodId) {
        PayrollPeriod period = periodRepo.findById(periodId).orElseThrow(NoSuchElementException::new);
        assertPeriodAccess(period);
        if (period.getStatus() != PayrollPeriod.Status.DRAFT) {
            throw new IllegalStateException("Only DRAFT period can be approved");
        }
        period.setStatus(PayrollPeriod.Status.APPROVED);
        period.setApprovedBy(SecurityUtils.getUserId());
        period.setApprovedAt(OffsetDateTime.now());
        PayrollPeriod saved = periodRepo.save(period);
        log.info("AUDIT payroll.period.approve id={} branchId={}", saved.getId(), saved.getBranchId());
        return saved;
    }

    @Transactional
    public PayrollPeriod pay(UUID periodId) {
        PayrollPeriod period = periodRepo.findById(periodId).orElseThrow(NoSuchElementException::new);
        assertPeriodAccess(period);
        if (period.getStatus() != PayrollPeriod.Status.APPROVED) {
            throw new IllegalStateException("Only APPROVED period can be paid");
        }
        OffsetDateTime now = OffsetDateTime.now();
        // Mark entries paid
        Page<PayrollEntry> page = entryRepo.findByPeriod_Id(periodId, Pageable.unpaged());
        for (PayrollEntry e : page.getContent()) {
            e.setPaid(true);
            e.setPaidAt(now);
            entryRepo.save(e);
        }
        period.setStatus(PayrollPeriod.Status.PAID);
        period.setPaidBy(SecurityUtils.getUserId());
        period.setPaidAt(now);
        PayrollPeriod saved = periodRepo.save(period);
        log.info("AUDIT payroll.period.pay id={} branchId={} entries={}", saved.getId(), saved.getBranchId(), page.getTotalElements());
        return saved;
    }

    public Optional<PayslipResponse> getMyPayslip(int year, int month) {
        Employee me = currentEmployeeOrThrow();
        UUID branchId = me.getBranch().getId();
        Optional<PayrollPeriod> periodOpt = periodRepo.findByBranchIdAndYearAndMonth(branchId, year, month);
        if (periodOpt.isEmpty()) return Optional.empty();
        PayrollPeriod period = periodOpt.get();
        Optional<PayrollEntry> entryOpt = entryRepo.findByPeriod_IdAndEmployeeId(period.getId(), me.getId());
        if (entryOpt.isEmpty()) return Optional.empty();
        PayrollEntry e = entryOpt.get();
        return Optional.of(PayslipResponse.builder()
                .year(year)
                .month(month)
                .employeeId(me.getId())
                .employeeName(me.getFullName())
                .branchId(branchId)
                .grossSalary(e.getGrossSalary())
                .allowances(e.getAllowances())
                .deductions(e.getDeductions())
                .netPay(e.getNetPay())
                .paid(e.isPaid())
                .paidAt(e.getPaidAt())
                .notes(e.getNotes())
                .periodStatus(period.getStatus().name())
                .build());
    }

    private void drawPayslipPage(PDDocument doc, PayslipResponse ps) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            float y = page.getMediaBox().getHeight() - 50;
            float x = 50;
            cs.beginText();
            cs.setFont(PDType1Font.HELVETICA_BOLD, 16);
            cs.newLineAtOffset(x, y);
            cs.showText("Payslip - " + ps.getYear() + "/" + String.format("%02d", ps.getMonth()));
            cs.endText();

            y -= 30;
            cs.beginText(); cs.setFont(PDType1Font.HELVETICA, 12); cs.newLineAtOffset(x, y);
            cs.showText("Employee: " + ps.getEmployeeName() + " (" + ps.getEmployeeId() + ")"); cs.endText();
            y -= 18;
            cs.beginText(); cs.newLineAtOffset(x, y); cs.showText("Branch: " + ps.getBranchId()); cs.endText();
            y -= 18;
            cs.beginText(); cs.newLineAtOffset(x, y); cs.showText("Status: " + ps.getPeriodStatus()); cs.endText();

            y -= 30;
            cs.beginText(); cs.setFont(PDType1Font.HELVETICA_BOLD, 12); cs.newLineAtOffset(x, y); cs.showText("Earnings"); cs.endText();
            y -= 18;
            cs.beginText(); cs.setFont(PDType1Font.HELVETICA, 12); cs.newLineAtOffset(x, y); cs.showText("Gross Salary: " + ps.getGrossSalary()); cs.endText();
            y -= 18;
            cs.beginText(); cs.newLineAtOffset(x, y); cs.showText("Allowances: " + ps.getAllowances()); cs.endText();

            y -= 24;
            cs.beginText(); cs.setFont(PDType1Font.HELVETICA_BOLD, 12); cs.newLineAtOffset(x, y); cs.showText("Deductions"); cs.endText();
            y -= 18;
            cs.beginText(); cs.setFont(PDType1Font.HELVETICA, 12); cs.newLineAtOffset(x, y); cs.showText("Deductions: " + ps.getDeductions()); cs.endText();

            y -= 24;
            cs.beginText(); cs.setFont(PDType1Font.HELVETICA_BOLD, 12); cs.newLineAtOffset(x, y); cs.showText("Net Pay: " + ps.getNetPay()); cs.endText();

            y -= 24;
            cs.beginText(); cs.setFont(PDType1Font.HELVETICA, 11); cs.newLineAtOffset(x, y);
            cs.showText("Paid: " + (ps.isPaid() ? "Yes on " + ps.getPaidAt() : "No")); cs.endText();

            if (ps.getNotes() != null && !ps.getNotes().isBlank()) {
                y -= 18;
                cs.beginText(); cs.setFont(PDType1Font.HELVETICA, 11); cs.newLineAtOffset(x, y);
                cs.showText("Notes: " + ps.getNotes()); cs.endText();
            }
        }
    }

    public byte[] getMyPayslipPdf(int year, int month) {
        PayslipResponse ps = getMyPayslip(year, month).orElseThrow(NoSuchElementException::new);
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            drawPayslipPage(doc, ps);
            doc.save(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate payslip PDF", e);
        }
    }

    public List<PayslipResponse> getMyPayslips(int year, List<Integer> months) {
        if (months == null || months.isEmpty()) throw new IllegalArgumentException("months is required");
        // normalize months: 1..12 unique sorted
        List<Integer> norm = months.stream()
                .filter(Objects::nonNull)
                .map(Integer::intValue)
                .filter(m -> m >= 1 && m <= 12)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        if (norm.isEmpty()) throw new IllegalArgumentException("No valid months provided");
        List<PayslipResponse> out = new ArrayList<>();
        for (Integer m : norm) {
            getMyPayslip(year, m).ifPresent(out::add);
        }
        return out;
    }

    public byte[] getMyPayslipsPdf(int year, List<Integer> months) {
        List<PayslipResponse> slips = getMyPayslips(year, months);
        if (slips.isEmpty()) throw new NoSuchElementException("No payslips found for requested months");
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            for (PayslipResponse ps : slips) {
                drawPayslipPage(doc, ps);
            }
            doc.save(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate payslips PDF", e);
        }
    }
}
