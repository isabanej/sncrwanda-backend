package org.sncrwanda.hr.domain;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.UUID;
@Entity @Table(name="employees") @Getter @Setter
public class Employee {
  @Id @GeneratedValue private UUID id;
  @Column(nullable=false) private String fullName;
  @Column(nullable=false) private LocalDate dob;
  @Column(nullable=false) private String address;
  @Column(nullable=false) private String position;
  @Column(nullable=false) private BigDecimal salary;
  private String phone; private String email;
  @Column(nullable=false) private boolean active = true;
  @Column(nullable=false) private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
