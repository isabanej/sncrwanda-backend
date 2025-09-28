package org.sncrwanda.student.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.sncrwanda.student.domain.Need;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Data
public class StudentRequest {
    @NotNull
    private UUID guardianId;

    @NotBlank
    private String childName;

    @NotNull
    private LocalDate childDob;

    // Address removed: use Guardian.address

    private String hobbies;
    private Set<Need> needs;
    private String needsOtherText;
    private UUID branchId;
}
