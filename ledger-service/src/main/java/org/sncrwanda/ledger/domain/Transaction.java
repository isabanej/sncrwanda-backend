package org.sncrwanda.ledger.domain;
import jakarta.persistence.*;
import lombok.Getter; import lombok.Setter;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.HashSet; import java.util.Set; import java.util.UUID;
@Entity @Table(name="transactions") @Getter @Setter
public class Transaction {
  public enum TxType { INCOME, EXPENSE, PAYROLL }
  @Id @GeneratedValue private UUID id;
  @Enumerated(EnumType.STRING) @Column(nullable=false) private TxType type;
  @Column(nullable=false) private String category;
  private String name;
  @ElementCollection @CollectionTable(name="transaction_materials", joinColumns=@JoinColumn(name="transaction_id"))
  @Column(name="item_name") private Set<String> materials = new HashSet<>();
  @Column(nullable=false) private BigDecimal amount;
  @Column(nullable=false) private LocalDate txDate = LocalDate.now();
  private String notes;
  @Column(nullable=false) private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
