package org.sncrwanda.student.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "schedule_items", indexes = {
        @Index(name = "idx_schedule_branch_month", columnList = "branch_id, month")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleItem {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId = UUID.fromString("00000000-0000-0000-0000-000000000001");

    // Format: YYYY-MM (e.g., 2025-09)
    @Column(nullable = false, length = 7)
    private String month;

    // 0-based week index within the month (0..4)
    @Column(name = "week_index", nullable = false)
    private int weekIndex;

    // 1=Monday .. 7=Sunday
    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(nullable = false)
    private String title;

    // Display-friendly time text like "7 am-6 am"
    @Column(name = "time_text", nullable = false)
    private String timeText;

    // Optional teacher identifiers
    @Column(name = "teacher_id")
    private UUID teacherId;

    @Column(name = "teacher_name")
    private String teacherName;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Organization/tenant identifier (global default for now)
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
