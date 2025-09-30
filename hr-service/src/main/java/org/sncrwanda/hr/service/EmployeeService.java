package org.sncrwanda.hr.service;

import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.repository.EmployeeRepository;
import org.sncrwanda.hr.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmployeeService {
    @Autowired
    private EmployeeRepository employeeRepository;

    public List<Employee> getAllEmployees(boolean archived) {
        if (SecurityUtils.isAdmin()) {
            return archived ? employeeRepository.findByDeletedTrueOrderByCreatedAtDesc() : employeeRepository.findByDeletedFalseOrderByCreatedAtDesc();
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) return List.of();
        return archived ? employeeRepository.findByBranch_IdAndDeletedTrueOrderByCreatedAtDesc(branchId) : employeeRepository.findByBranch_IdAndDeletedFalseOrderByCreatedAtDesc(branchId);
    }

    public List<Employee> getAllEmployees() {
        return getAllEmployees(false);
    }

    public Optional<Employee> getEmployeeById(UUID id) {
    Optional<Employee> opt = employeeRepository.findById(id);
        if (opt.isEmpty()) return opt;
        Employee emp = opt.get();
    if (emp.isDeleted()) return Optional.empty();
        if (SecurityUtils.isAdmin()) return Optional.of(emp);
        UUID userBranch = SecurityUtils.getBranchId();
        UUID userId = SecurityUtils.getUserId();
        if (userId != null && userId.equals(emp.getId())) return Optional.of(emp);
        if (userBranch != null && emp.getBranch() != null && userBranch.equals(emp.getBranch().getId())) return Optional.of(emp);
        return Optional.empty();
    }

    @Transactional
    public Employee createEmployee(Employee employee) {
        if (SecurityUtils.isAdmin()) {
            return employeeRepository.save(employee);
        }
        if (!SecurityUtils.hasRole("BRANCH_ADMIN")) {
            throw new AccessDeniedException("No permission to create employee");
        }
        UUID userBranch = SecurityUtils.getBranchId();
        if (userBranch == null) throw new AccessDeniedException("User branch not found in token");
        if (employee.getBranch() == null || employee.getBranch().getId() == null || !userBranch.equals(employee.getBranch().getId())) {
            throw new AccessDeniedException("Can only create employees for your branch");
        }
        return employeeRepository.save(employee);
    }

    @Transactional
    public Optional<Employee> updateEmployee(UUID id, Employee updatedEmployee) {
        return employeeRepository.findById(id).map(employee -> {
            UUID userId = SecurityUtils.getUserId();
            boolean admin = SecurityUtils.isAdmin();
            UUID userBranch = SecurityUtils.getBranchId();

            if (admin) {
                employee.setFullName(updatedEmployee.getFullName());
                employee.setDob(updatedEmployee.getDob());
                employee.setAddress(updatedEmployee.getAddress());
                employee.setPosition(updatedEmployee.getPosition());
                employee.setSalary(updatedEmployee.getSalary());
                employee.setStartDate(updatedEmployee.getStartDate());
                employee.setEndDate(updatedEmployee.getEndDate());
                employee.setPhone(updatedEmployee.getPhone());
                employee.setEmail(updatedEmployee.getEmail());
                employee.setBankName(updatedEmployee.getBankName());
                employee.setBankAccount(updatedEmployee.getBankAccount());
                employee.setActive(updatedEmployee.isActive());
                employee.setDepartment(updatedEmployee.getDepartment());
                employee.setBranch(updatedEmployee.getBranch());
                return employeeRepository.save(employee);
            }

            if (userId != null && userId.equals(employee.getId())) {
                employee.setAddress(updatedEmployee.getAddress());
                employee.setPhone(updatedEmployee.getPhone());
                employee.setEmail(updatedEmployee.getEmail());
                return employeeRepository.save(employee);
            }

            if (SecurityUtils.hasRole("BRANCH_ADMIN") && userBranch != null && employee.getBranch() != null && userBranch.equals(employee.getBranch().getId())) {
                employee.setFullName(updatedEmployee.getFullName());
                employee.setAddress(updatedEmployee.getAddress());
                employee.setPhone(updatedEmployee.getPhone());
                employee.setEmail(updatedEmployee.getEmail());
                employee.setBankName(updatedEmployee.getBankName());
                employee.setBankAccount(updatedEmployee.getBankAccount());
                employee.setStartDate(updatedEmployee.getStartDate());
                employee.setEndDate(updatedEmployee.getEndDate());
                employee.setDepartment(updatedEmployee.getDepartment());
                return employeeRepository.save(employee);
            }

            throw new AccessDeniedException("No permission to update employee");
        });
    }

    @Transactional
    public boolean archiveEmployee(UUID id) {
        Optional<Employee> opt = employeeRepository.findById(id);
        if (opt.isEmpty()) return false;
        Employee emp = opt.get();
        if (emp.isDeleted()) return false;
        if (canModify(emp)) {
            var jwt = SecurityUtils.getJwt();
            UUID userId = SecurityUtils.getUserId();
            String deleterName = null;
            String deleterPhone = null;
            if (jwt != null) {
                Object nameClaim = jwt.getClaim("name");
                Object phoneClaim = jwt.getClaim("phone");
                deleterName = java.util.Objects.toString(nameClaim, null);
                deleterPhone = java.util.Objects.toString(phoneClaim, null);
            }
            emp.setDeleted(true);
            emp.setDeletedAt(java.time.Instant.now());
            emp.setDeletedBy(userId);
            emp.setDeletedByName(deleterName);
            emp.setDeletedByPhone(deleterPhone);
            employeeRepository.save(emp);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean restoreEmployee(UUID id) {
        Optional<Employee> opt = employeeRepository.findById(id);
        if (opt.isEmpty()) return false;
        Employee emp = opt.get();
        if (!emp.isDeleted()) return false;
        if (canModify(emp)) {
            emp.setDeleted(false);
            emp.setDeletedAt(null);
            emp.setDeletedBy(null);
            emp.setDeletedByName(null);
            emp.setDeletedByPhone(null);
            employeeRepository.save(emp);
            return true;
        }
        return false;
    }

    private boolean canModify(Employee emp) {
        if (SecurityUtils.isAdmin()) return true;
        if (SecurityUtils.hasRole("BRANCH_ADMIN")) {
            UUID userBranch = SecurityUtils.getBranchId();
            if (userBranch != null && emp.getBranch() != null && userBranch.equals(emp.getBranch().getId())) return true;
        }
        return false;
    }

    // Convenience service method if other services need teachers list later
    public List<Employee> listTeachers() {
        if (SecurityUtils.isAdmin()) {
            return employeeRepository.findActiveTeachers("teacher");
        }
        UUID branchId = SecurityUtils.getBranchId();
        if (branchId == null) {
            // Fallback: branch claim missing -> return global teachers list (safer than empty UX)
            return employeeRepository.findActiveTeachers("teacher");
        }
        List<Employee> scoped = employeeRepository.findActiveTeachersByBranch(branchId, "teacher");
        if (scoped.isEmpty()) {
            // If user branch has no teachers but global does, gracefully fallback (prevents empty dropdown confusion)
            List<Employee> global = employeeRepository.findActiveTeachers("teacher");
            if (!global.isEmpty()) return global;
        }
        return scoped;
    }
}
