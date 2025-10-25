package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashflowPeriodRepo extends JpaRepository<CashflowPeriod, UUID> {
    
    Optional<CashflowPeriod> findByYearAndMonthAndOrgId(Integer year, Integer month, UUID orgId);
    
    List<CashflowPeriod> findByOrgIdOrderByYearDescMonthDesc(UUID orgId);
    
    List<CashflowPeriod> findByStatusAndOrgId(CashflowPeriod.PeriodStatus status, UUID orgId);
    
    List<CashflowPeriod> findByStatus(CashflowPeriod.PeriodStatus status);
    
    @Query("SELECT p FROM CashflowPeriod p WHERE p.status = :status AND p.orgId = :orgId " +
           "ORDER BY p.year DESC, p.month DESC")
    List<CashflowPeriod> findByStatusOrderByYearMonthDesc(
        @Param("status") CashflowPeriod.PeriodStatus status, 
        @Param("orgId") UUID orgId
    );
    
    @Query("SELECT p FROM CashflowPeriod p WHERE p.year = :year AND p.orgId = :orgId " +
           "ORDER BY p.month")
    List<CashflowPeriod> findByYearOrderByMonth(@Param("year") Integer year, @Param("orgId") UUID orgId);
    
    @Query("SELECT p FROM CashflowPeriod p WHERE " +
           "(p.year < :year OR (p.year = :year AND p.month < :month)) " +
           "AND p.orgId = :orgId " +
           "ORDER BY p.year DESC, p.month DESC")
    Optional<CashflowPeriod> findPreviousPeriod(
        @Param("year") Integer year, 
        @Param("month") Integer month,
        @Param("orgId") UUID orgId
    );
    
    @Query("SELECT p FROM CashflowPeriod p WHERE " +
           "(p.year > :year OR (p.year = :year AND p.month > :month)) " +
           "AND p.orgId = :orgId " +
           "ORDER BY p.year, p.month")
    Optional<CashflowPeriod> findNextPeriod(
        @Param("year") Integer year, 
        @Param("month") Integer month,
        @Param("orgId") UUID orgId
    );
}
