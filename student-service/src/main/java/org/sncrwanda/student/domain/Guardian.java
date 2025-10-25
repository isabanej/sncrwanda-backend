package org.sncrwanda.student.domain;
import jakarta.persistence.*; import lombok.Getter; import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;
@Entity @Table(name="guardians") @Getter @Setter
public class Guardian {
  @Id @GeneratedValue private UUID id;
  @Column(nullable=false) private String firstName;
  @Column(nullable=false) private String lastName;
  @Column(nullable=false) private String phone;
  private String email; private String address;
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
