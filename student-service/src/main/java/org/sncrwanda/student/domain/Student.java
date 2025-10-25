package org.sncrwanda.student.domain;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;
import java.time.LocalDate; 
import java.time.LocalDateTime;
import java.util.HashSet; import java.util.Set; import java.util.UUID;
@Entity @Table(name="students") @Getter @Setter
public class Student {
  @Id @GeneratedValue private UUID id;
  @ManyToOne(optional=false, fetch=FetchType.LAZY) private Guardian guardian;
  @Column(nullable=false) private String childFirstName;
  @Column(nullable=false) private String childLastName;
  @Column(nullable=false) private LocalDate childDob;
  @Enumerated(EnumType.STRING)
  private Gender gender;
  private String hobbies;
  @ElementCollection(fetch=FetchType.EAGER) @Enumerated(EnumType.STRING)
  private Set<Need> needs = new HashSet<>();
  private String needsOtherText;
  @Column(nullable=false) private boolean isDeleted = false;
  @Column(nullable=false) private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
  
  // Audit timestamps
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;
  
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;
  
  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;
  
  @Column(name = "restored_at")
  private LocalDateTime restoredAt;
  
  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
  }
  
  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }
}
