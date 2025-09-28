package org.sncrwanda.student.repo;

import org.sncrwanda.student.domain.ScheduleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ScheduleItemRepository extends JpaRepository<ScheduleItem, UUID> {
    @Query("select s from ScheduleItem s where s.branchId = :branchId and s.month = :month order by s.weekIndex, s.dayOfWeek")
    List<ScheduleItem> findByBranchIdAndMonth(UUID branchId, String month);

    @Query("select s from ScheduleItem s where s.month = :month order by s.weekIndex, s.dayOfWeek")
    List<ScheduleItem> findByMonthAllBranches(String month);
}
