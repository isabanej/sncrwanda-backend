package org.sncrwanda.ledger.web;
import org.sncrwanda.ledger.domain.Transaction;
import org.sncrwanda.ledger.repo.TransactionRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/ledger/transactions")
public class TransactionController {
  private final TransactionRepo repo;
  public TransactionController(TransactionRepo repo){this.repo=repo;}
  @PostMapping public ResponseEntity<Transaction> create(@RequestBody Transaction tx){ return ResponseEntity.ok(repo.save(tx)); }
  @GetMapping public List<Transaction> list(){ return repo.findAll(); }
}
