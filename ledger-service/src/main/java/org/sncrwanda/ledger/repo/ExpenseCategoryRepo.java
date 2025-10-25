package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpenseCategoryRepo extends JpaRepository<ExpenseCategory, UUID> {
    
    List<ExpenseCategory> findByIsActiveOrderByDisplayOrder(Boolean isActive);
    
    List<ExpenseCategory> findByOrgIdAndIsActiveOrderByDisplayOrder(UUID orgId, Boolean isActive);
    
    Optional<ExpenseCategory> findByCategoryNameAndOrgId(String categoryName, UUID orgId);
    
    Optional<ExpenseCategory> findByCategoryName(String categoryName);
    
    List<ExpenseCategory> findByIsSystemDefined(Boolean isSystemDefined);
}
