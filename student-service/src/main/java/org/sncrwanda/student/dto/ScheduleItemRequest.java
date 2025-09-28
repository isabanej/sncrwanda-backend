package org.sncrwanda.student.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ScheduleItemRequest {
    private String month;      // YYYY-MM
    private int weekIndex;     // 0..4
    private int dayOfWeek;     // 1..7 (Mon..Sun)
    private String title;
    private String timeText;
    private UUID teacherId;    // optional
    private String teacherName;// optional
    private String imageUrl;   // optional
    private UUID branchId;     // optional; enforced by security
}
