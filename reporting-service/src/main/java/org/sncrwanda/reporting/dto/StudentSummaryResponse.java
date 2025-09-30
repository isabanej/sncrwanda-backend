package org.sncrwanda.reporting.dto;

import lombok.Data;

@Data
public class StudentSummaryResponse {
    private long totalStudents;
    private long activeStudents; // non-deleted
    private long deletedStudents; // soft deleted
}
