package org.sncrwanda.ledger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.sncrwanda.ledger.domain.StaffPayroll;
import org.sncrwanda.ledger.repo.StaffPayrollRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayrollService {

    private final StaffPayrollRepo payrollRepo;
    private final CashflowPeriodService periodService;
    private final RestTemplate restTemplate;

    // HR Service endpoint to get employee salary
    private static final String HR_SERVICE_URL = "http://localhost:8084";

    /**
     * Record payroll for an employee
     * Fetches base salary from hr-service employee table
     */
    @Transactional
    public StaffPayroll recordPayroll(
            UUID periodId,
            UUID employeeId,
            BigDecimal bonuses,
            BigDecimal deductions,
            String paymentMethod,
            LocalDate paymentDate,
            String recordedBy) { // Changed from UUID to String
        
        // Validate period
        periodService.validatePeriodForEntry(periodId);
        
        // Check if payroll already exists for this employee in this period
        Optional<StaffPayroll> existing = payrollRepo.findByPeriodIdAndEmployeeId(periodId, employeeId);
        if (existing.isPresent()) {
            throw new IllegalStateException(
                "Payroll already recorded for employee " + employeeId + " in this period. Use update instead.");
        }
        
        // Get period entity
        CashflowPeriod period = periodService.getPeriodById(periodId);
        
        // Fetch employee details from hr-service
        Map<String, Object> employee = fetchEmployeeFromHRService(employeeId);
        String employeeName = (String) employee.get("name");
        String position = (String) employee.get("position");
        
        // Get base salary from employee table
        BigDecimal baseSalary = new BigDecimal(employee.get("salary").toString());
        
        // Create payroll record (net_salary will be calculated by database)
        StaffPayroll payroll = new StaffPayroll();
        payroll.setId(UUID.randomUUID());
        payroll.setPeriod(period);
        payroll.setEmployeeId(employeeId);
        payroll.setEmployeeName(employeeName);
        payroll.setPosition(position);
        payroll.setBaseSalary(baseSalary);
        payroll.setBonuses(bonuses != null ? bonuses : BigDecimal.ZERO);
        payroll.setDeductions(deductions != null ? deductions : BigDecimal.ZERO);
        payroll.setPaymentMethod(paymentMethod);
        payroll.setPaymentDate(paymentDate);
        payroll.setRecordedBy(recordedBy);
        payroll.setRecordedAt(LocalDateTime.now());
        
        // Check if this is a late entry
        payroll.setIsLateEntry(periodService.isLateEntry(period));
        
        // Initialize edit tracking
        payroll.setEditCount(0);
        payroll.setEditAttemptsRemaining(3);
        
        StaffPayroll saved = payrollRepo.save(payroll);
        log.info("Recorded payroll for employee {} ({}) in period {}: Base={}, Bonuses={}, Deductions={}, Net={}", 
            employeeName, position, periodId, baseSalary, bonuses, deductions, saved.getNetSalary());
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(periodId);
        
        return saved;
    }

    /**
     * Fetch employee details from hr-service
     */
    private Map<String, Object> fetchEmployeeFromHRService(UUID employeeId) {
        try {
            String url = HR_SERVICE_URL + "/api/employees/" + employeeId;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
            if (response.getBody() == null) {
                throw new IllegalArgumentException("Employee not found: " + employeeId);
            }
            
            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to fetch employee from hr-service: {}", e.getMessage());
            throw new IllegalArgumentException("Employee not found or hr-service unavailable: " + employeeId);
        }
    }

    /**
     * Update payroll record (with edit attempt tracking)
     */
    @Transactional
    public StaffPayroll updatePayroll(
            UUID payrollId,
            BigDecimal newBonuses,
            BigDecimal newDeductions,
            String newPaymentMethod,
            LocalDate newPaymentDate,
            UUID updatedBy) {
        
        StaffPayroll payroll = payrollRepo.findById(payrollId)
            .orElseThrow(() -> new IllegalArgumentException("Payroll not found: " + payrollId));
        
        // Check edit attempts remaining
        if (payroll.getEditAttemptsRemaining() <= 0) {
            throw new IllegalStateException(
                "No edit attempts remaining for this payroll. Contact administrator for assistance.");
        }
        
        // Validate period is still open
        periodService.validatePeriodForEntry(payroll.getPeriod().getId());
        
        // Re-fetch base salary from hr-service (in case it changed)
        Map<String, Object> employee = fetchEmployeeFromHRService(payroll.getEmployeeId());
        BigDecimal currentBaseSalary = new BigDecimal(employee.get("salary").toString());
        
        // Update fields
        payroll.setBaseSalary(currentBaseSalary);
        payroll.setBonuses(newBonuses);
        payroll.setDeductions(newDeductions);
        payroll.setPaymentMethod(newPaymentMethod);
        payroll.setPaymentDate(newPaymentDate);
        
        // Increment edit count and decrement attempts remaining
        payroll.setEditCount(payroll.getEditCount() + 1);
        payroll.setEditAttemptsRemaining(payroll.getEditAttemptsRemaining() - 1);
        payroll.setLastEdited(LocalDateTime.now());
        
        StaffPayroll saved = payrollRepo.save(payroll);
        log.info("Updated payroll {} (edits: {}/3) for employee {} by user {}", 
            payrollId, payroll.getEditCount(), payroll.getEmployeeName(), updatedBy);
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(payroll.getPeriod().getId());
        
        return saved;
    }

    /**
     * Get all payroll records for a period
     */
    public List<StaffPayroll> getPayrollForPeriod(UUID periodId) {
        return payrollRepo.findByPeriodId(periodId);
    }

    /**
     * Get payroll for specific employee in period
     */
    public Optional<StaffPayroll> getPayrollForEmployee(UUID periodId, UUID employeeId) {
        return payrollRepo.findByPeriodIdAndEmployeeId(periodId, employeeId);
    }

    /**
     * Get all late entries
     */
    public List<StaffPayroll> getLateEntries() {
        return payrollRepo.findByIsLateEntry(true);
    }

    /**
     * Calculate total payroll for a period
     */
    public BigDecimal calculateTotalPayroll(UUID periodId) {
        return payrollRepo.calculateTotalPayrollForPeriod(periodId);
    }
}
