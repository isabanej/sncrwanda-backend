package org.sncrwanda.student.dto;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

public class StudentRequest {
    private UUID guardianId;
    private String childFirstName;
    private String childLastName;
    private LocalDate childDob;
    private String hobbies;
    private Set<String> needs;
    private String needsOtherText;
    
    public StudentRequest() {}
    
    public UUID getGuardianId() { return guardianId; }
    public void setGuardianId(UUID guardianId) { this.guardianId = guardianId; }
    
    public String getChildFirstName() { return childFirstName; }
    public void setChildFirstName(String childFirstName) { this.childFirstName = childFirstName; }
    
    public String getChildLastName() { return childLastName; }
    public void setChildLastName(String childLastName) { this.childLastName = childLastName; }
    
    public LocalDate getChildDob() { return childDob; }
    public void setChildDob(LocalDate childDob) { this.childDob = childDob; }
    
    public String getHobbies() { return hobbies; }
    public void setHobbies(String hobbies) { this.hobbies = hobbies; }
    
    public Set<String> getNeeds() { return needs; }
    public void setNeeds(Set<String> needs) { this.needs = needs; }
    
    public String getNeedsOtherText() { return needsOtherText; }
    public void setNeedsOtherText(String needsOtherText) { this.needsOtherText = needsOtherText; }
}