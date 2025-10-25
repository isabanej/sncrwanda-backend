package org.sncrwanda.hr.web;
import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.repo.EmployeeRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
@RestController @RequestMapping("/hr/employees")
public class EmployeeController {
  private final EmployeeRepo repo;
  public EmployeeController(EmployeeRepo repo){this.repo=repo;}
  @PostMapping public ResponseEntity<Employee> create(@RequestBody Employee e){ return ResponseEntity.ok(repo.save(e)); }
  @GetMapping public List<Employee> list(){ return repo.findAll(); }
  
  @PutMapping("/{id}")
  public ResponseEntity<Employee> update(@PathVariable UUID id, @RequestBody Employee updatedEmployee) {
    return repo.findById(id).map(employee -> {
      employee.setFirstName(updatedEmployee.getFirstName());
      employee.setLastName(updatedEmployee.getLastName());
      employee.setDob(updatedEmployee.getDob());
      employee.setAddress(updatedEmployee.getAddress());
      employee.setPosition(updatedEmployee.getPosition());
      employee.setSalary(updatedEmployee.getSalary());
      employee.setPhone(updatedEmployee.getPhone());
      employee.setEmail(updatedEmployee.getEmail());
      employee.setActive(updatedEmployee.isActive());
      Employee saved = repo.save(employee);
      return ResponseEntity.ok(saved);
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }
  
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    return repo.findById(id).map(employee -> {
      employee.setDeleted(true);
      employee.setDeletedAt(java.time.LocalDateTime.now());
      repo.save(employee);
      return ResponseEntity.noContent().<Void>build();
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }
  
  @PutMapping("/{id}/restore")
  public ResponseEntity<Void> restore(@PathVariable UUID id) {
    return repo.findById(id).map(employee -> {
      employee.setDeleted(false);
      employee.setRestoredAt(java.time.LocalDateTime.now());
      employee.setDeletedAt(null);
      repo.save(employee);
      return ResponseEntity.noContent().<Void>build();
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }
}
