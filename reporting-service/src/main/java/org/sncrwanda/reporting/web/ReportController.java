package org.sncrwanda.reporting.web;
import org.springframework.web.bind.annotation.*; import java.util.Map;
@RestController @RequestMapping("/reporting/reports")
public class ReportController {
  @GetMapping("/summary") public Map<String,Object> summary(){
    return Map.of("incomeTotal",1200,"expenseTotal",275,"net",925);
  }
}
