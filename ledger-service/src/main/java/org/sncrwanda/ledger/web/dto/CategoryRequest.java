package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class CategoryRequest {
    private String categoryName;
    private UUID createdBy;
}
