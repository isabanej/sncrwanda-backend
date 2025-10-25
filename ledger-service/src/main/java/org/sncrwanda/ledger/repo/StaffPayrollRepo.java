package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.StaffPayroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffPayrollRepo extends JpaRepository<StaffPayroll, UUID> {
    
    List<StaffPayroll> findByPeriodId(UUID periodId);
    
    List<StaffPayroll> findByEmployeeId(UUID employeeId);
    
    Optional<StaffPayroll> findByPeriodIdAndEmployeeId(UUID periodId, UUID employeeId);
    
    List<StaffPayroll> findByIsLateEntry(Boolean isLateEntry);
    
    @Query("SELECT COALESCE(SUM(sp.netSalary), 0) FROM StaffPayroll sp WHERE sp.period.id = :periodId")
    java.math.BigDecimal calculateTotalPayrollForPeriod(@Param("periodId") UUID periodId);
    
    @Query("SELECT SUM(sp.netSalary) FROM StaffPayroll sp WHERE sp.period.id = :periodId")
    Optional<java.math.BigDecimal> sumTotalPayByPeriodId(@Param("periodId") UUID periodId);
}
