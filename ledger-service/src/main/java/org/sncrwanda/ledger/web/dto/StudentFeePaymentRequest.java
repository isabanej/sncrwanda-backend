package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class StudentFeePaymentRequest {
    private UUID periodId;
    private UUID studentId;
    private String studentName;
    private String feeType;
    private BigDecimal amountPaid;
    private LocalDate paymentDate;
    private String paymentMethod;
    private String receiptNumber;
    private UUID recordedBy;
}
