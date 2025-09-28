package unit;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sncrwanda.ledger.domain.Transaction;
import org.sncrwanda.ledger.dto.TransactionRequest;
import org.sncrwanda.ledger.dto.TransactionResponse;
import org.sncrwanda.ledger.repo.TransactionRepository;
import org.sncrwanda.ledger.security.SecurityUtils;
import org.sncrwanda.ledger.service.TransactionService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {
    @Mock TransactionRepository repo;
    @InjectMocks TransactionService service;

    @Test
    void listAll_adminGetsAll() {
        try (MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(true);
            when(repo.findAll()).thenReturn(List.of(sampleTx(UUID.randomUUID())));
            List<TransactionResponse> out = service.listAll();
            assertEquals(1, out.size());
        }
    }

    @Test
    void create_nonAdminEnforcesBranch() {
        UUID userBranch = UUID.randomUUID();
        try (MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(false);
            st.when(SecurityUtils::getBranchId).thenReturn(userBranch);
            when(repo.save(any(Transaction.class))).thenAnswer(inv -> {
                Transaction t = inv.getArgument(0);
                t.setId(UUID.randomUUID());
                return t;
            });
            TransactionRequest req = new TransactionRequest();
            req.setType(Transaction.TxType.INCOME);
            req.setCategory("DONATION");
            req.setName("Gala");
            req.setMaterials(Set.of("Banner"));
            req.setAmount(new BigDecimal("100.00"));
            req.setTxDate(LocalDate.now());
            // attempt with different branch should be overridden/blocked
            req.setBranchId(UUID.randomUUID());
            assertThrows(RuntimeException.class, () -> service.create(req));

            // allowed when branch matches user
            req.setBranchId(userBranch);
            TransactionResponse resp = service.create(req);
            assertNotNull(resp.getId());
            assertEquals(userBranch, resp.getBranchId());
        }
    }

    private Transaction sampleTx(UUID branch) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .type(Transaction.TxType.EXPENSE)
                .category("SUPPLIES")
                .name("Paper")
                .materials(Set.of("A4"))
                .amount(new BigDecimal("50.00"))
                .txDate(LocalDate.now())
                .branchId(branch)
                .build();
    }
}

