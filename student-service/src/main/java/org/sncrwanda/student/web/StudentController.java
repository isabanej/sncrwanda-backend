package org.sncrwanda.student.web;
import org.sncrwanda.student.domain.*;
import org.sncrwanda.student.repo.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/students")
public class StudentController {
  private final StudentRepo srepo; private final GuardianRepo grepo;
  public StudentController(StudentRepo srepo, GuardianRepo grepo){this.srepo=srepo; this.grepo=grepo;}
  @PostMapping("/guardians") public ResponseEntity<Guardian> createGuardian(@RequestBody Guardian g){ return ResponseEntity.ok(grepo.save(g)); }
  @GetMapping("/guardians") public List<Guardian> listGuardians(){ return grepo.findAll(); }
  @PostMapping public ResponseEntity<Student> create(@RequestBody Student s){ return ResponseEntity.ok(srepo.save(s)); }
  @GetMapping public List<Student> list(){ return srepo.findAll(); }
}
