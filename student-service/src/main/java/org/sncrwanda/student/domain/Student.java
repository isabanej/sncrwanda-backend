package org.sncrwanda.student.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "students", indexes = {
    @Index(name = "idx_students_branch_id", columnList = "branch_id"),
    @Index(name = "idx_students_guardian_id", columnList = "guardian_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private Guardian guardian;

    @Column(nullable = false)
    private String childName;

    @Column(nullable = false)
    private LocalDate childDob;

    // Address removed: stored on Guardian

    private String hobbies;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    private Set<Need> needs = new HashSet<>();

    private String needsOtherText;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId = UUID.fromString("00000000-0000-0000-0000-000000000001");

    // Organization/tenant identifier (global default for now). Keep aligned with Guardian.
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");

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
