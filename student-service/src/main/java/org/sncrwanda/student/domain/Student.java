package org.sncrwanda.student.domain;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;
import java.time.LocalDate; import java.util.HashSet; import java.util.Set; import java.util.UUID;
@Entity @Table(name="students") @Getter @Setter
public class Student {
  @Id @GeneratedValue private UUID id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) private Guardian guardian;
  @Column(nullable=false) private String childName;
  @Column(nullable=false) private LocalDate childDob;
  @Column(nullable=false) private String address;
  private String hobbies;
  @ElementCollection(fetch=FetchType.EAGER) @Enumerated(EnumType.STRING)
  private Set<Need> needs = new HashSet<>();
  private String needsOtherText;
  @Column(nullable=false) private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
