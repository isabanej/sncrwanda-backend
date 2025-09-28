package org.sncrwanda.student.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.CreationTimestamp;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guardians", indexes = {
    @Index(name = "idx_guardians_branch_id", columnList = "branch_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guardian {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    @NotBlank
    private String fullName;

    @Column(nullable = false)
    @NotBlank
    private String phone;

    @Email
    private String email;
    private String address;

    @Column(name = "org_id", nullable = false)
    @Builder.Default
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Column(name = "branch_id")
    @Builder.Default
    private UUID branchId = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by")
    private UUID deletedBy;

    @Column(name = "deleted_by_name")
    private String deletedByName;

    @Column(name = "deleted_by_phone")
    private String deletedByPhone;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
