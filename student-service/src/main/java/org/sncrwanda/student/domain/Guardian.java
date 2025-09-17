package org.sncrwanda.student.domain;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;
import java.util.UUID;
@Entity @Table(name="guardians") @Getter @Setter
public class Guardian {
  @Id @GeneratedValue private UUID id;
  @Column(nullable=false) private String fullName;
  @Column(nullable=false) private String phone;
  private String email; private String address;
  @Column(nullable=false) private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
