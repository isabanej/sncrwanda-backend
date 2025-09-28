package unit;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.PayrollEntry;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PayrollEntryRecalcTest {
    @Test
    void recalcNet_shouldComputeGrossPlusAllowancesMinusDeductions() {
        PayrollEntry e = PayrollEntry.builder()
                .grossSalary(new BigDecimal("1000.00"))
                .allowances(new BigDecimal("200.00"))
                .deductions(new BigDecimal("150.00"))
                .build();
        e.recalcNet();
        assertEquals(new BigDecimal("1050.00"), e.getNetPay());
    }
}

