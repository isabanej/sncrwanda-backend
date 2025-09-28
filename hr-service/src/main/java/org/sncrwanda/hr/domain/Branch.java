package org.sncrwanda.hr.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "branches")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Branch {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @OneToOne(optional = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "head_id", nullable = true)
    @JsonIgnore
    private Employee headOfBranch;

    @Column(nullable = false)
    private String address;

    @OneToMany(mappedBy = "branch")
    @JsonIgnore
    private List<Department> departments;

    @OneToMany(mappedBy = "branch")
    @JsonIgnore
    private List<Employee> employees;
}
