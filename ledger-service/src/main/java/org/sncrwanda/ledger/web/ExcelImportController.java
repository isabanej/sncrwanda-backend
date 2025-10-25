package org.sncrwanda.ledger.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.service.ExcelImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/cashflow/import")
@RequiredArgsConstructor
@Slf4j
public class ExcelImportController {

    private final ExcelImportService excelImportService;

    /**
     * Import historical cashflow data from Excel file
     */
    @PostMapping("/excel")
    public ResponseEntity<Map<String, Object>> importExcelFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam UUID orgId,
            @RequestParam String importedBy) { // Changed from UUID to String
        
        log.info("Received Excel import request for organization {}", orgId);
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", "File is empty"));
        }
        
        // Validate file type
        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", "Only Excel files (.xlsx, .xls) are supported"));
        }
        
        try {
            Map<String, Object> result = excelImportService.importHistoricalData(file, orgId, importedBy);
            
            if (Boolean.TRUE.equals(result.get("success"))) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
            }
            
        } catch (Exception e) {
            log.error("Excel import failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * Validate Excel file structure before import
     */
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateExcelFile(
            @RequestParam("file") MultipartFile file) {
        
        log.info("Validating Excel file: {}", file.getOriginalFilename());
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(Map.of("valid", false, "error", "File is empty"));
        }
        
        try {
            Map<String, Object> validation = excelImportService.validateExcelFile(file);
            return ResponseEntity.ok(validation);
            
        } catch (Exception e) {
            log.error("Excel validation failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("valid", false, "error", e.getMessage()));
        }
    }

    /**
     * Get import status/history (placeholder for future enhancement)
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getImportHistory(@RequestParam UUID orgId) {
        log.info("Getting import history for organization {}", orgId);
        
        // Placeholder - could be enhanced to track import history in database
        return ResponseEntity.ok(Map.of(
            "message", "Import history not yet implemented",
            "orgId", orgId.toString()
        ));
    }
}
