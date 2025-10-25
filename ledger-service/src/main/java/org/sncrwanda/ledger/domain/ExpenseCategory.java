package org.sncrwanda.ledger.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "expense_categories")
@Getter
@Setter
public class ExpenseCategory {
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @Column(name = "category_name", nullable = false, length = 100)
    private String categoryName;
    
    @Column(name = "is_system_defined")
    private Boolean isSystemDefined = false;
    
    @Column(name = "display_order")
    private Integer displayOrder;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "created_by")
    private UUID createdBy;
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
