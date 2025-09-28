package org.sncrwanda.hr.web;
import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.repo.EmployeeRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/hr/employees")
public class EmployeeWebController {
  private final EmployeeRepo repo;
  public EmployeeWebController(EmployeeRepo repo){this.repo=repo;}
  @PostMapping public ResponseEntity<Employee> create(@RequestBody Employee e){ return ResponseEntity.ok(repo.save(e)); }
  @GetMapping public List<Employee> list(){ return repo.findAll(); }
}
