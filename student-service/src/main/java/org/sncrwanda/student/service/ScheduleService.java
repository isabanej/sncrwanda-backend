package org.sncrwanda.student.service;

import org.sncrwanda.student.domain.ScheduleItem;
import org.sncrwanda.student.dto.ScheduleItemRequest;
import org.sncrwanda.student.dto.ScheduleItemResponse;
import org.sncrwanda.student.repo.ScheduleItemRepository;
import org.sncrwanda.student.security.SecurityUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ScheduleService {
    private final ScheduleItemRepository repo;

    public ScheduleService(ScheduleItemRepository repo) {
        this.repo = repo;
    }

    private ScheduleItemResponse toResponse(ScheduleItem s) {
        ScheduleItemResponse r = new ScheduleItemResponse();
        r.setId(s.getId());
        r.setMonth(s.getMonth());
        r.setWeekIndex(s.getWeekIndex());
        r.setDayOfWeek(s.getDayOfWeek());
        r.setTitle(s.getTitle());
        r.setTimeText(s.getTimeText());
        r.setTeacherId(s.getTeacherId());
        r.setTeacherName(s.getTeacherName());
        r.setImageUrl(s.getImageUrl());
        r.setBranchId(s.getBranchId());
        return r;
    }

    public List<ScheduleItemResponse> list(String month) {
        if (SecurityUtils.isAdmin()) {
            return repo.findByMonthAllBranches(month).stream().map(this::toResponse).collect(Collectors.toList());
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return repo.findByBranchIdAndMonth(branchId, month).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public ScheduleItemResponse create(ScheduleItemRequest req) {
        UUID branchId = req.getBranchId();
        UUID userBranch = SecurityUtils.getBranchId();
        if (!SecurityUtils.isAdmin()) {
            if (userBranch != null) {
                if (branchId != null && !userBranch.equals(branchId)) {
                    throw new RuntimeException("Cannot create schedule for another branch");
                }
                branchId = userBranch;
            }
            if (branchId == null) throw new RuntimeException("Branch required");
        }
    ScheduleItem s = ScheduleItem.builder()
                .branchId(branchId != null ? branchId : (userBranch != null ? userBranch : UUID.fromString("00000000-0000-0000-0000-000000000001")))
                .month(req.getMonth())
                .weekIndex(req.getWeekIndex())
                .dayOfWeek(req.getDayOfWeek())
                .title(req.getTitle())
                .timeText(req.getTimeText())
                .teacherId(req.getTeacherId())
                .teacherName(req.getTeacherName())
                .imageUrl(req.getImageUrl())
        .createdAt(java.time.LocalDateTime.now())
        .orgId(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .build();
        s = repo.save(s);
        return toResponse(s);
    }

    @Transactional
    public List<ScheduleItemResponse> seedDemo(String month) {
        // Seed a 5x7 grid sparsely with yoga-like classes and random images
        UUID branchId = SecurityUtils.isAdmin() ? SecurityUtils.getBranchId() : SecurityUtils.getBranchId();
        if (branchId == null && !SecurityUtils.isAdmin()) throw new RuntimeException("Branch required");
        String[] titles = {"Yoga training", "Dance", "Art & Craft", "Math Club", "Reading", "Music", "Coding"};
        String[] imgs = {
                "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?q=80&w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?q=80&w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1518600506278-4e8ef466b810?q=80&w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=200&h=200&fit=crop"
        };
        List<ScheduleItemResponse> out = new ArrayList<>();
        int seed = Math.abs(month.hashCode());
        for (int w = 0; w < 5; w++) {
            for (int d = 1; d <= 7; d++) {
                int r = (seed + w * 11 + d * 7) % 4;
                if (r == 0) continue; // leave empty
        ScheduleItem s = ScheduleItem.builder()
                        .branchId(branchId != null ? branchId : UUID.fromString("00000000-0000-0000-0000-000000000001"))
                        .month(month)
                        .weekIndex(w)
                        .dayOfWeek(d)
                        .title(titles[(seed + w + d) % titles.length])
                        .timeText("7 am-6 am")
                        .teacherName("Teacher " + (char)('A' + (seed + w + d) % 10))
                        .imageUrl(imgs[(seed + w + d) % imgs.length])
            .createdAt(java.time.LocalDateTime.now())
            .orgId(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                        .build();
                s = repo.save(s);
                out.add(toResponse(s));
            }
        }
        return out;
    }
}
