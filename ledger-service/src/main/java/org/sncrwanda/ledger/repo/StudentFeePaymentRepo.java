package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.StudentFeePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentFeePaymentRepo extends JpaRepository<StudentFeePayment, UUID> {
    
    List<StudentFeePayment> findByPeriodId(UUID periodId);
    
    List<StudentFeePayment> findByStudentId(UUID studentId);
    
    Optional<StudentFeePayment> findByPeriodIdAndStudentId(UUID periodId, UUID studentId);
    
    List<StudentFeePayment> findByIsLateEntry(Boolean isLateEntry);
    
    @Query("SELECT sfp FROM StudentFeePayment sfp WHERE sfp.editAttemptsRemaining = 0")
    List<StudentFeePayment> findWithNoEditAttemptsRemaining();
    
    @Query("SELECT COALESCE(SUM(sfp.amountPaid), 0) FROM StudentFeePayment sfp WHERE sfp.period.id = :periodId")
    java.math.BigDecimal calculateTotalForPeriod(@Param("periodId") UUID periodId);
    
    @Query("SELECT SUM(sfp.amountPaid) FROM StudentFeePayment sfp WHERE sfp.period.id = :periodId")
    Optional<java.math.BigDecimal> sumAmountPaidByPeriodId(@Param("periodId") UUID periodId);
}
