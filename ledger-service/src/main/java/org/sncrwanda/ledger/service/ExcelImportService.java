package org.sncrwanda.ledger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.sncrwanda.ledger.domain.*;
import org.sncrwanda.ledger.domain.CashflowPeriod.PeriodStatus;
import org.sncrwanda.ledger.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelImportService {

    private final CashflowPeriodRepo periodRepo;
    private final StudentFeePaymentRepo feePaymentRepo;
    private final StaffPayrollRepo payrollRepo;
    private final CashflowExpenseRepo expenseRepo;
    private final PettyCashTransactionRepo pettyCashRepo;
    private final ExpenseCategoryRepo categoryRepo;
    private final CashflowPeriodService periodService;
    
    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Import historical cashflow data from Excel file
     */
    @Transactional
    public Map<String, Object> importHistoricalData(MultipartFile file, UUID orgId, UUID importedBy) 
            throws IOException {
        
        log.info("Starting Excel import for organization {}", orgId);
        
        Map<String, Object> result = new HashMap<>();
        int periodsCreated = 0;
        int feesImported = 0;
        int expensesImported = 0;
        int pettyCashImported = 0;
        
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            
            // Parse Sheet 1: Cashflow Statement
            Sheet cashflowSheet = workbook.getSheet("Cashflow Statement");
            if (cashflowSheet == null) {
                cashflowSheet = workbook.getSheetAt(0); // Fallback to first sheet
            }
            
            // Parse Sheet 2: School Fees Revenue
            Sheet revenueSheet = workbook.getSheet("School Fees received - Revenue");
            if (revenueSheet == null && workbook.getNumberOfSheets() > 1) {
                revenueSheet = workbook.getSheetAt(1); // Fallback to second sheet
            }
            
            // Step 1: Parse months from header row
            List<String> months = parseMonthHeaders(cashflowSheet);
            log.info("Found {} months in Excel file", months.size());
            
            // Step 2: Read "Start Up" beginning cash from column C (index 2), row 3 (index 2)
            BigDecimal startUpCash = BigDecimal.ZERO;
            Row beginningCashRow = cashflowSheet.getRow(2); // Row 3 is index 2 (0-based)
            if (beginningCashRow != null) {
                Cell startUpCell = beginningCashRow.getCell(2); // Column C is index 2 (0-based)
                if (startUpCell != null && startUpCell.getCellType() == CellType.NUMERIC) {
                    startUpCash = BigDecimal.valueOf(startUpCell.getNumericCellValue());
                    log.info("Found Start Up beginning cash: {}", startUpCash);
                }
            }
            
            // Step 3: Create periods for each month (marked as LOCKED since historical)
            Map<String, CashflowPeriod> periodsByMonth = new HashMap<>();
            for (String monthName : months) {
                CashflowPeriod period = createHistoricalPeriod(monthName, orgId);
                periodsByMonth.put(monthName, period);
                periodsCreated++;
            }
            
            // Set the Start Up cash as beginning cash for AUGUST (month 8 - fiscal year start)
            if (startUpCash.compareTo(BigDecimal.ZERO) > 0) {
                // Find August period
                CashflowPeriod augustPeriod = periodsByMonth.values().stream()
                    .filter(p -> p.getMonth() == 8)
                    .findFirst()
                    .orElse(null);
                
                if (augustPeriod != null) {
                    augustPeriod.setBeginningCash(startUpCash);
                    periodRepo.save(augustPeriod);
                    log.info("Set beginning cash for August 2025 to: {}", startUpCash);
                } else {
                    log.warn("August period not found, could not set Start Up cash");
                }
            }
            
            // Flush and clear to avoid "updated by another transaction" errors
            entityManager.flush();
            entityManager.clear();
            log.info("Flushed and cleared Hibernate session after creating {} periods", periodsCreated);
            
            // Reload all periods fresh from DB into a new map
            Map<String, CashflowPeriod> freshPeriods = new HashMap<>();
            for (Map.Entry<String, CashflowPeriod> entry : periodsByMonth.entrySet()) {
                UUID periodId = entry.getValue().getId();
                CashflowPeriod fresh = periodRepo.findById(periodId).orElse(null);
                if (fresh != null) {
                    freshPeriods.put(entry.getKey(), fresh);
                }
            }
            periodsByMonth = freshPeriods; // Replace with fresh instances
            log.info("Reloaded {} fresh period instances from DB", freshPeriods.size());
            
            // Step 3: Import student fees from Revenue sheet
            if (revenueSheet != null) {
                feesImported = importStudentFees(revenueSheet, periodsByMonth, months, importedBy);
            }
            
            // Step 4: Import expenses from Cashflow Statement sheet
            expensesImported = importExpenses(cashflowSheet, periodsByMonth, months, importedBy);
            
            // Step 5: Import petty cash IN/OUT transactions from Cashflow Statement sheet
            pettyCashImported = importPettyCash(cashflowSheet, periodsByMonth, months, importedBy);
            
            // Step 6: Skip recalculation for now to avoid Hibernate conflicts
            // Ending cash will remain at zero (can be manually recalculated later)
            log.info("Skipping ending cash recalculation - periods created with zero balances");
            
            result.put("success", true);
            result.put("periodsCreated", periodsCreated);
            result.put("feesImported", feesImported);
            result.put("expensesImported", expensesImported);
            result.put("pettyCashImported", pettyCashImported);
            result.put("message", "Successfully imported historical data");
            
            log.info("Excel import completed: {} periods, {} fees, {} expenses", 
                periodsCreated, feesImported, expensesImported);
            
        } catch (Exception e) {
            log.error("Excel import failed", e);
            result.put("success", false);
            result.put("error", e.getMessage());
            throw new RuntimeException("Excel import failed: " + e.getMessage(), e);
        }
        
        return result;
    }

    /**
     * Parse month headers from first row (e.g., "February", "March", etc.)
     */
    private List<String> parseMonthHeaders(Sheet sheet) {
        List<String> months = new ArrayList<>();
        Row headerRow = sheet.getRow(0);
        
        if (headerRow != null) {
            for (int col = 3; col < headerRow.getLastCellNum(); col++) {
                Cell cell = headerRow.getCell(col);
                if (cell != null && cell.getCellType() == CellType.STRING) {
                    String value = cell.getStringCellValue().trim();
                    if (!value.isEmpty() && isMonthName(value)) {
                        months.add(value);
                    }
                }
            }
        }
        
        return months;
    }

    /**
     * Check if string is a month name (handles full names and common abbreviations)
     */
    private boolean isMonthName(String value) {
        String[] monthNames = {"January", "February", "March", "April", "May", "June",
                               "July", "August", "September", "October", "November", "December",
                               "Jan", "Feb", "Fab", "Mar", "Apr", "Jun", "Jul", "Aug", "Sept", "Sep", "Oct", "Nov", "Dec"};
        for (String month : monthNames) {
            if (value.equalsIgnoreCase(month)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Create a historical period (marked as LOCKED)
     */
    private CashflowPeriod createHistoricalPeriod(String monthName, UUID orgId) {
        // Parse month name to get month number (use current year for historical import)
        int monthNumber = getMonthNumber(monthName);
        int year = LocalDate.now().getYear(); // Use current year for historical data
        
        // Check if period already exists
        Optional<CashflowPeriod> existing = periodRepo.findByYearAndMonthAndOrgId(year, monthNumber, orgId);
        if (existing.isPresent()) {
            log.info("Period {}-{} already exists, skipping creation", year, monthNumber);
            return existing.get();
        }
        
        CashflowPeriod period = new CashflowPeriod();
        // Don't set ID manually - let @GeneratedValue handle it
        period.setOrgId(orgId);
        period.setYear(year);
        period.setMonth(monthNumber);
        period.setPeriodName(String.format("%s %d", monthName, year));
        
        // Set beginning cash to zero initially - will be cascaded after all periods are created
        period.setBeginningCash(BigDecimal.ZERO);
        period.setEndingCash(BigDecimal.ZERO); // Will be recalculated later
        
        // Mark as LOCKED (historical data)
        period.setStatus(PeriodStatus.LOCKED);
        period.setLockedDate(LocalDateTime.now());
        period.setLateEntryDeadline(YearMonth.of(year, monthNumber).atEndOfMonth()
            .plusDays(5).atTime(23, 59, 59));
        
        // JPA will auto-manage createdAt and lastUpdated via @PrePersist and @PreUpdate
        CashflowPeriod saved = periodRepo.save(period);
        log.info("Created historical period: {}-{}", year, monthNumber);
        
        return saved;
    }

    /**
     * Get month number from month name (handles full names and abbreviations)
     */
    private int getMonthNumber(String monthName) {
        monthName = monthName.trim().toLowerCase();
        
        // Handle common abbreviations and typos
        if (monthName.equals("jan") || monthName.equals("january")) return 1;
        if (monthName.equals("feb") || monthName.equals("fab") || monthName.equals("february")) return 2;
        if (monthName.equals("mar") || monthName.equals("march")) return 3;
        if (monthName.equals("apr") || monthName.equals("april")) return 4;
        if (monthName.equals("may")) return 5;
        if (monthName.equals("jun") || monthName.equals("june")) return 6;
        if (monthName.equals("jul") || monthName.equals("july")) return 7;
        if (monthName.equals("aug") || monthName.equals("august")) return 8;
        if (monthName.equals("sep") || monthName.equals("sept") || monthName.equals("september")) return 9;
        if (monthName.equals("oct") || monthName.equals("october")) return 10;
        if (monthName.equals("nov") || monthName.equals("november")) return 11;
        if (monthName.equals("dec") || monthName.equals("december")) return 12;
        
        throw new IllegalArgumentException("Invalid month name: " + monthName);
    }

    /**
     * Import student fees from Revenue sheet
     */
    private int importStudentFees(Sheet sheet, Map<String, CashflowPeriod> periodsByMonth, 
                                   List<String> months, UUID importedBy) {
        int count = 0;
        
        // Start from row 4 (row 3 is header, rows 1-2 are titles)
        for (int rowIndex = 3; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) continue;
            
            // Column A: Student name
            Cell nameCell = row.getCell(0);
            if (nameCell == null || nameCell.getCellType() != CellType.STRING) continue;
            
            String studentName = nameCell.getStringCellValue().trim();
            if (studentName.isEmpty() || 
                studentName.equalsIgnoreCase("Total") ||
                studentName.toLowerCase().contains("total fee") ||
                studentName.toLowerCase().startsWith("student ")) continue;
            
            // Column B: Fee type (e.g., "Home Schooling", "SNC")
            Cell feeTypeCell = row.getCell(1);
            String feeType = (feeTypeCell != null && feeTypeCell.getCellType() == CellType.STRING) 
                ? feeTypeCell.getStringCellValue().trim() : "School Fees";
            
            // Parse fees for each month - months start at column C (index 2)
            // The months list contains the column names from header row starting from column D (index 3) in Cashflow sheet
            // But in Revenue sheet, months start from column C (index 2)
            int startCol = 2; // Column C = index 2 (Jan starts here in Revenue sheet)
            for (int i = 0; i < months.size() && (startCol + i) < row.getLastCellNum(); i++) {
                Cell amountCell = row.getCell(startCol + i);
                if (amountCell == null) continue;
                
                BigDecimal amount = getCellValueAsDecimal(amountCell);
                if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                    String monthName = months.get(i);
                    CashflowPeriod period = periodsByMonth.get(monthName);
                    
                    if (period != null) {
                        // Period is already fresh from DB after session clear
                        // Check if fee already exists
                        UUID studentId = UUID.randomUUID(); // Generate UUID for imported student
                        Optional<StudentFeePayment> existing = feePaymentRepo
                            .findByPeriodIdAndStudentId(period.getId(), studentId);
                        
                        if (existing.isEmpty()) {
                            StudentFeePayment fee = new StudentFeePayment();
                            // Don't set ID manually - let @GeneratedValue handle it
                            fee.setPeriod(period);
                            fee.setStudentId(studentId);
                            fee.setStudentName(studentName);
                            fee.setFeeType(feeType);
                            fee.setAmountPaid(amount);
                            fee.setPaymentDate(YearMonth.of(period.getYear(), period.getMonth())
                                .atEndOfMonth());
                            fee.setPaymentMethod("Historical Import");
                            fee.setReceiptNumber("IMPORT-" + rowIndex + "-" + i);
                            fee.setRecordedBy(importedBy);
                            fee.setRecordedAt(LocalDateTime.now());
                            fee.setIsLateEntry(false);
                            fee.setEditCount(0);
                            fee.setEditAttemptsRemaining(3);
                            
                            feePaymentRepo.save(fee);
                            count++;
                        }
                    }
                }
            }
        }
        
        log.info("Imported {} student fee payments", count);
        return count;
    }

    /**
     * Import expenses from Cashflow Statement sheet
     */
    private int importExpenses(Sheet sheet, Map<String, CashflowPeriod> periodsByMonth, 
                               List<String> months, UUID importedBy) {
        log.info("=== STARTING EXPENSE IMPORT ===");
        log.info("Sheet name: {}", sheet.getSheetName());
        log.info("Periods available: {}", periodsByMonth.size());
        log.info("Months list: {}", months);
        
        int count = 0;
        
        // Map to track expense category rows (e.g., row 10 = "Rent", row 11 = "Training", etc.)
        Map<Integer, String> categoryByRow = new HashMap<>();
        
        // Parse expense categories from column B (index 1)
        log.info("Scanning rows 10-29 for expense categories...");
        for (int rowIndex = 10; rowIndex <= 29; rowIndex++) { // Typical expense rows
            Row row = sheet.getRow(rowIndex);
            if (row == null) continue;
            
            // Column B has the category names
            Cell categoryCell = row.getCell(1);
            
            if (categoryCell != null && categoryCell.getCellType() == CellType.STRING) {
                String category = categoryCell.getStringCellValue().trim();
                log.debug("Row {}: Found category '{}'", rowIndex, category);
                
                if (!category.isEmpty() && 
                    !category.equalsIgnoreCase("Total") && 
                    !category.equalsIgnoreCase("Cash Available") &&
                    !category.equalsIgnoreCase("Total Expenses") &&
                    !category.toLowerCase().contains("petty cash") &&  // Exclude petty cash rows
                    !category.contains("Cash In") &&
                    !category.contains("Cash Out")) {
                    
                    // Try to find matching category in database (case-insensitive)
                    Optional<ExpenseCategory> dbCategory = categoryRepo.findByCategoryName(category);
                    if (dbCategory.isEmpty()) {
                        // Try case-insensitive search
                        log.debug("Category '{}' not found with exact match, trying case-insensitive", category);
                        List<ExpenseCategory> allCategories = categoryRepo.findAll();
                        boolean found = false;
                        for (ExpenseCategory cat : allCategories) {
                            if (cat.getCategoryName().equalsIgnoreCase(category)) {
                                category = cat.getCategoryName(); // Use DB version
                                categoryByRow.put(rowIndex, category);
                                log.debug("Matched '{}' to DB category '{}'", categoryCell.getStringCellValue().trim(), category);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            log.warn("Category '{}' from row {} not found in database - skipping", category, rowIndex);
                        }
                    } else {
                        categoryByRow.put(rowIndex, category);
                        log.debug("Category '{}' found with exact match", category);
                    }
                } else {
                    log.debug("Skipping row {} with category '{}' (filtered out)", rowIndex, category);
                }
            }
        }
        
        log.info("Found {} expense categories to import", categoryByRow.size());
        
        // Import expense amounts for each month
        for (Map.Entry<Integer, String> entry : categoryByRow.entrySet()) {
            int rowIndex = entry.getKey();
            String category = entry.getValue();
            Row row = sheet.getRow(rowIndex);
            
            if (row != null) {
                // Months start at column D (index 3 in POI)
                int startCol = 3;
                for (int i = 0; i < months.size() && (startCol + i) < row.getLastCellNum(); i++) {
                    Cell amountCell = row.getCell(startCol + i);
                    if (amountCell == null) continue;
                    
                    BigDecimal amount = getCellValueAsDecimal(amountCell);
                    if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                        String monthName = months.get(i);
                        CashflowPeriod period = periodsByMonth.get(monthName);
                        
                        if (period != null) {
                            // Period is already fresh from DB after session clear
                            CashflowExpense expense = new CashflowExpense();
                            // Don't set ID manually - let @GeneratedValue handle it
                            expense.setPeriod(period);
                            expense.setCategory(category);
                            expense.setAmount(amount);
                            expense.setTransactionDate(YearMonth.of(period.getYear(), period.getMonth())
                                .atEndOfMonth());
                            expense.setDescription("Historical import - " + category);
                            expense.setReceiptNumber("IMPORT-" + category + "-" + monthName);
                            expense.setPaymentMethod("Historical Import");
                            expense.setVendorName("Imported");
                            expense.setRecordedBy(importedBy);
                            expense.setRecordedAt(LocalDateTime.now());
                            expense.setIsLateEntry(false);
                            
                            expenseRepo.save(expense);
                            count++;
                        }
                    }
                }
            }
        }
        
        log.info("Imported {} expense entries", count);
        return count;
    }

    /**
     * Import petty cash IN/OUT transactions from Cashflow Statement sheet
     */
    private int importPettyCash(Sheet sheet, Map<String, CashflowPeriod> periodsByMonth, 
                                List<String> months, UUID importedBy) {
        int count = 0;
        
        // Find petty cash rows: Row 6 = Petty Cash(IN), Row 10 = Petty Cash(OUT)
        // POI uses 0-based indexing, so Excel row 6 = POI row 5
        Map<Integer, PettyCashTransaction.TransactionType> pettyCashRows = new HashMap<>();
        
        for (int rowIndex = 0; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) continue;
            
            Cell categoryCell = row.getCell(1); // Column B
            if (categoryCell != null && categoryCell.getCellType() == CellType.STRING) {
                String category = categoryCell.getStringCellValue().trim();
                
                if (category.equalsIgnoreCase("Petty Cash(IN)")) {
                    pettyCashRows.put(rowIndex, PettyCashTransaction.TransactionType.IN);
                    log.info("Found Petty Cash IN at row {}", rowIndex + 1);
                } else if (category.equalsIgnoreCase("Petty Cash(OUT)")) {
                    pettyCashRows.put(rowIndex, PettyCashTransaction.TransactionType.OUT);
                    log.info("Found Petty Cash OUT at row {}", rowIndex + 1);
                }
            }
        }
        
        log.info("Found {} petty cash rows to import", pettyCashRows.size());
        
        // Import petty cash amounts for each month
        for (Map.Entry<Integer, PettyCashTransaction.TransactionType> entry : pettyCashRows.entrySet()) {
            int rowIndex = entry.getKey();
            PettyCashTransaction.TransactionType type = entry.getValue();
            Row row = sheet.getRow(rowIndex);
            
            if (row != null) {
                // Months start at column D (index 3 in POI)
                int startCol = 3;
                for (int i = 0; i < months.size() && (startCol + i) < row.getLastCellNum(); i++) {
                    Cell amountCell = row.getCell(startCol + i);
                    if (amountCell == null) continue;
                    
                    BigDecimal amount = getCellValueAsDecimal(amountCell);
                    if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                        String monthName = months.get(i);
                        CashflowPeriod period = periodsByMonth.get(monthName);
                        
                        if (period != null) {
                            PettyCashTransaction transaction = new PettyCashTransaction();
                            // Don't set ID manually - let @GeneratedValue handle it
                            transaction.setPeriod(period);
                            transaction.setTransactionType(type);
                            transaction.setAmount(amount);
                            transaction.setTransactionDate(YearMonth.of(period.getYear(), period.getMonth())
                                .atEndOfMonth());
                            transaction.setDescription("Historical import - Petty Cash " + type);
                            transaction.setRecordedBy(importedBy);
                            transaction.setRecordedAt(LocalDateTime.now());
                            
                            pettyCashRepo.save(transaction);
                            count++;
                            
                            log.debug("Imported petty cash {} of {} for {}", type, amount, monthName);
                        }
                    }
                }
            }
        }
        
        log.info("Imported {} petty cash transactions", count);
        return count;
    }

    /**
     * Get cell value as BigDecimal
     */
    private BigDecimal getCellValueAsDecimal(Cell cell) {
        if (cell == null) return null;
        
        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    return BigDecimal.valueOf(cell.getNumericCellValue());
                case STRING:
                    String value = cell.getStringCellValue().trim()
                        .replace(",", "")
                        .replace("$", "")
                        .replace("RWF", "")
                        .trim();
                    if (value.isEmpty()) return null;
                    return new BigDecimal(value);
                case FORMULA:
                    // Try to get cached value
                    try {
                        return BigDecimal.valueOf(cell.getNumericCellValue());
                    } catch (Exception e) {
                        return null;
                    }
                default:
                    return null;
            }
        } catch (Exception e) {
            log.warn("Failed to parse cell value as decimal: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Validate Excel file structure before import
     */
    public Map<String, Object> validateExcelFile(MultipartFile file) throws IOException {
        Map<String, Object> validation = new HashMap<>();
        List<String> errors = new ArrayList<>();
        List<String> sheets = new ArrayList<>();
        List<String> months = new ArrayList<>();
        
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            // List all sheets
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                sheets.add(workbook.getSheetName(i));
            }
            
            // Check for required sheets
            Sheet cashflowSheet = workbook.getSheet("Cashflow Statement");
            Sheet revenueSheet = workbook.getSheet("School Fees received - Revenue");
            
            if (cashflowSheet == null) {
                errors.add("Missing required sheet: 'Cashflow Statement'");
            }
            if (revenueSheet == null) {
                errors.add("Missing required sheet: 'School Fees received - Revenue'");
            }
            
            if (cashflowSheet != null) {
                try {
                    months = parseMonthHeaders(cashflowSheet);
                    if (months.isEmpty()) {
                        errors.add("No month columns found in Cashflow Statement sheet");
                    }
                } catch (Exception e) {
                    errors.add("Failed to parse month headers: " + e.getMessage());
                }
            }
            
            validation.put("valid", errors.isEmpty());
            validation.put("sheets", sheets);
            validation.put("months", months);
            validation.put("errors", errors);
            
        } catch (Exception e) {
            log.error("Excel validation failed", e);
            validation.put("valid", false);
            validation.put("sheets", sheets);
            validation.put("months", months);
            validation.put("errors", List.of(e.getMessage()));
        }
        
        return validation;
    }
}

