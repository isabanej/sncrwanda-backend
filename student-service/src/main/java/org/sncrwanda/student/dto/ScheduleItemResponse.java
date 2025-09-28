package org.sncrwanda.student.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ScheduleItemResponse {
    private UUID id;
    private String month;
    private int weekIndex;
    private int dayOfWeek;
    private String title;
    private String timeText;
    private UUID teacherId;
    private String teacherName;
    private String imageUrl;
    private UUID branchId;
}
