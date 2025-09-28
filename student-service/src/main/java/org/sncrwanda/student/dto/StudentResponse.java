package org.sncrwanda.student.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.sncrwanda.student.domain.Need;

@Data
public class StudentResponse {
    private UUID id;
    private UUID guardianId;
    private String childName;
    private LocalDate childDob;
    // Address removed; retrieve from Guardian if needed
    private String hobbies;
    private Set<Need> needs;
    private String needsOtherText;
    private UUID branchId;
    private Instant createdAt;
}
