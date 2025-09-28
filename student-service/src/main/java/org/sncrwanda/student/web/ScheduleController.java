package org.sncrwanda.student.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.sncrwanda.student.dto.ScheduleItemRequest;
import org.sncrwanda.student.dto.ScheduleItemResponse;
import org.sncrwanda.student.service.ScheduleService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(value = "/students/schedule", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Student Schedule")
public class ScheduleController {
    private final ScheduleService service;
    public ScheduleController(ScheduleService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "List schedule items for a month (YYYY-MM)")
    public List<ScheduleItemResponse> list(@RequestParam String month) {
        return service.list(month);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Create a schedule item")
    public ScheduleItemResponse create(@RequestBody ScheduleItemRequest req) {
        return service.create(req);
    }

    @PostMapping("/seed-demo")
    @Operation(summary = "Seed demo schedule data for a month (YYYY-MM)")
    public List<ScheduleItemResponse> seedDemo(@RequestParam String month) {
        return service.seedDemo(month);
    }
}
