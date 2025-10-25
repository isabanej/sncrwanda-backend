import { useState, useEffect } from 'react';
import { studentAPI, guardianAPI } from '../services/api';
import type { Student, Guardian } from '../types';
import { useAuth } from '../context/AuthContext';
import { canEditOrDelete } from '../utils/permissions';
import { DataTable, type Column } from '../components/DataTable';
import { SearchableSelect } from '../components/SearchableSelect';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../pages/Dashboard.css';

export const Students = () => {
  const { user } = useAuth();
  const canEdit = canEditOrDelete(user);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'restore';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'restore', id: '', name: '' });
  const [formData, setFormData] = useState({
    guardianId: '',
    childFirstName: '',
    childLastName: '',
    childDob: '',
    gender: '',
    hobbies: '',
  });
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherNeedText, setOtherNeedText] = useState('');

  const needsOptions = [
    'PHYSICAL',
    'HEARING',
    'SOCIAL_COMMUNICATION_AUTISM',
    'MENTAL_EMOTIONAL_HEALTH',
    'HEALTH_CONDITION',
    'MOBILITY',
    'VISUAL',
    'SPEECH_LANGUAGE',
    'LEARNING',
    'OTHER'
  ];

  const needsLabels: Record<string, string> = {
    'PHYSICAL': 'Physical',
    'HEARING': 'Hearing',
    'SOCIAL_COMMUNICATION_AUTISM': 'Social/Communication (Autism)',
    'MENTAL_EMOTIONAL_HEALTH': 'Mental/Emotional health',
    'HEALTH_CONDITION': 'Health conditional (e.g Epilepsy)',
    'MOBILITY': 'Mobility',
    'VISUAL': 'Visual',
    'SPEECH_LANGUAGE': 'Speech/Language',
    'LEARNING': 'Learning',
    'OTHER': 'Other'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const [studentsData, guardiansData] = await Promise.all([
        studentAPI.getAll(),
        guardianAPI.getAll(),
      ]);
      
      // DEBUG: Log the raw data from API
      console.log('📊 RAW DATA FROM API:', studentsData);
      console.log('📊 Student deletion status:', studentsData.map(s => ({
        name: `${s.childFirstName} ${s.childLastName}`,
        deleted: s.deleted,
        isDeleted: s.isDeleted
      })));
      
      // Normalize the data - backend uses 'deleted', frontend expects 'isDeleted'
      const normalizedStudents = studentsData.map(s => ({
        ...s,
        isDeleted: s.deleted ?? s.isDeleted ?? false
      }));
      
      const normalizedGuardians = guardiansData.map(g => ({
        ...g,
        isDeleted: g.deleted ?? g.isDeleted ?? false
      }));
      
      // Reverse the arrays to show newest entries first
      setStudents(normalizedStudents.reverse());
      setGuardians(normalizedGuardians.reverse());
    } catch (err: any) {
      // Only show error if it's a real API failure, not just empty data
      const errorMessage = err?.response?.status === 404 
        ? '' 
        : 'Unable to connect to the server. Please check your connection and try again.';
      setError(errorMessage);
      console.error('Load error:', err);
      setStudents([]); // Set empty arrays on error
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentData = {
        guardianId: formData.guardianId,
        childFirstName: formData.childFirstName,
        childLastName: formData.childLastName,
        childDob: formData.childDob,
        gender: (formData.gender as 'MALE' | 'FEMALE') || undefined,
        hobbies: formData.hobbies || undefined,
        needs: selectedNeeds.filter(n => n !== 'OTHER'),
        needsOtherText: showOtherInput ? otherNeedText : undefined,
      };
      
      if (editingId) {
        await studentAPI.update(editingId, studentData);
      } else {
        await studentAPI.create(studentData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        guardianId: '',
        childFirstName: '',
        childLastName: '',
        childDob: '',
        gender: '',
        hobbies: '',
      });
      setSelectedNeeds([]);
      setShowOtherInput(false);
      setOtherNeedText('');
    } catch (err) {
      setError(`Failed to ${editingId ? 'update' : 'create'} student`);
      console.error('Submit error:', err);
    }
  };
  
  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      guardianId: student.guardianId,
      childFirstName: student.childFirstName,
      childLastName: student.childLastName,
      childDob: student.childDob,
      gender: student.gender || '',
      hobbies: student.hobbies || '',
    });
    setSelectedNeeds(student.needs || []);
    if (student.needs?.includes('OTHER')) {
      setShowOtherInput(true);
      setOtherNeedText(student.needsOtherText || '');
    }
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      guardianId: '',
      childFirstName: '',
      childLastName: '',
      childDob: '',
      gender: '',
      hobbies: '',
    });
    setSelectedNeeds([]);
    setShowOtherInput(false);
    setOtherNeedText('');
  };

  const handleNeedChange = (need: string, checked: boolean) => {
    if (checked) {
      setSelectedNeeds([...selectedNeeds, need]);
      if (need === 'OTHER') setShowOtherInput(true);
    } else {
      setSelectedNeeds(selectedNeeds.filter(n => n !== need));
      if (need === 'OTHER') {
        setShowOtherInput(false);
        setOtherNeedText('');
      }
    }
  };

  const handleDelete = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (!student) {
      console.error('Student not found:', id);
      setError('Student not found');
      return;
    }
    
    console.log('Attempting to delete student:', student.childFirstName, student.childLastName, 'ID:', id);
    
    // Show custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      id,
      name: `${student.childFirstName} ${student.childLastName}`
    });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: 'delete', id: '', name: '' });
    
    try {
      console.log('Calling API to delete student:', id);
      await studentAPI.delete(id);
      console.log('✅ Student deleted successfully:', id);
      
      // Immediately update local state to reflect deletion
      setStudents(prevStudents => 
        prevStudents.map(s => s.id === id ? { ...s, isDeleted: true } : s)
      );
      
      // Also reload from server to ensure consistency
      await loadData();
      console.log('✅ Data reloaded after delete');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete student';
      setError(errorMessage);
      console.error('❌ Delete error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(`Failed to delete student: ${errorMessage}`);
    }
  };
  
  const handleRestore = async (id: string) => {
    // Find the student to show their name in the confirmation
    const student = students.find(s => s.id === id);
    const studentName = student ? `${student.childFirstName} ${student.childLastName}` : 'this student';
    
    // Show custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      id,
      name: studentName
    });
  };

  const handleConfirmRestore = async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: 'restore', id: '', name: '' });
    
    try {
      console.log('Attempting to restore student:', id);
      await studentAPI.restore(id);
      console.log('✅ Student restored successfully:', id);
      
      // Immediately update local state to reflect restoration
      setStudents(prevStudents => 
        prevStudents.map(s => s.id === id ? { ...s, isDeleted: false } : s)
      );
      
      // Also reload from server to ensure consistency
      await loadData();
      console.log('✅ Data reloaded after restore');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to restore student';
      setError(errorMessage);
      console.error('❌ Restore error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(`Failed to restore student: ${errorMessage}`);
    }
  };

  const getGuardianName = (guardianId: string) => {
    const guardian = guardians.find(g => g.id === guardianId);
    return guardian ? `${guardian.firstName} ${guardian.lastName}` : 'Unknown';
  };

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Students</h1>
        <p>Manage student records and information</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2>All Students ({students.filter(s => showDeleted ? s.isDeleted : !s.isDeleted).length})</h2>
            {canEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 500,
                  color: showDeleted ? '#ef4444' : '#10b981'
                }}>
                  {showDeleted ? '🗑️ Showing Deleted' : '✓ Showing Active'}
                </span>
                <label style={{ 
                  position: 'relative',
                  display: 'inline-block',
                  width: '52px',
                  height: '28px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: showDeleted ? '#ef4444' : '#10b981',
                    borderRadius: '28px',
                    transition: 'all 0.3s ease',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '22px',
                      width: '22px',
                      left: showDeleted ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </span>
                </label>
              </div>
            )}
          </div>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => { handleCancelEdit(); setShowForm(!showForm); }}>
              {showForm ? 'Cancel' : '+ Add Student'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>Child First Name *</label>
                <input
                  type="text"
                  value={formData.childFirstName}
                  onChange={(e) => setFormData({ ...formData, childFirstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Child Last Name *</label>
                <input
                  type="text"
                  value={formData.childLastName}
                  onChange={(e) => setFormData({ ...formData, childLastName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={formData.childDob}
                  onChange={(e) => setFormData({ ...formData, childDob: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="form-control"
                >
                  <option value="">Select gender...</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Guardian *</label>
                <SearchableSelect
                  options={guardians
                    .filter(g => !g.isDeleted)
                    .map(g => ({
                      value: g.id,
                      label: `${g.firstName} ${g.lastName}`
                    }))}
                  value={formData.guardianId}
                  onChange={(value) => setFormData({ ...formData, guardianId: value })}
                  placeholder="Select a guardian"
                  required
                  emptyMessage="No active guardians found"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Hobbies</label>
                <input
                  type="text"
                  value={formData.hobbies}
                  onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                />
              </div>
              
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: '600', fontSize: '0.9375rem', marginBottom: '0.5rem', display: 'block' }}>
                  Which of the following best describes additional needs or disability?
                </label>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Tick all that apply
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {needsOptions.map(need => (
                    <label 
                      key={need} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        cursor: 'pointer',
                        fontSize: '0.9375rem'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNeeds.includes(need)}
                        onChange={(e) => handleNeedChange(need, e.target.checked)}
                        style={{ 
                          width: '1.125rem', 
                          height: '1.125rem',
                          cursor: 'pointer',
                          accentColor: '#10b981'
                        }}
                      />
                      <span>{needsLabels[need]}</span>
                    </label>
                  ))}
                </div>
                {showOtherInput && (
                  <input
                    type="text"
                    value={otherNeedText}
                    onChange={(e) => setOtherNeedText(e.target.value)}
                    placeholder="Please specify other need"
                    style={{ 
                      marginTop: '0.75rem',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem'
                    }}
                  />
                )}
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '1rem' }}>
              {editingId ? 'Update Student' : 'Create Student'}
            </button>
          </form>
        )}

        <DataTable
          data={students.filter(s => showDeleted ? s.isDeleted : !s.isDeleted)}
          columns={[
            {
              key: 'childFirstName',
              label: 'First Name',
              sortable: true,
              searchable: true,
              width: '12%',
            },
            {
              key: 'childLastName',
              label: 'Last Name',
              sortable: true,
              searchable: true,
              width: '12%',
            },
            {
              key: 'childDob',
              label: 'Date of Birth',
              sortable: true,
              searchable: false,
              width: '10%',
              render: (value) => new Date(value).toLocaleDateString(),
            },
            {
              key: 'childDob',
              label: 'Age',
              sortable: true,
              searchable: false,
              width: '6%',
              render: (value) => {
                const today = new Date();
                const birthDate = new Date(value);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return age;
              },
            },
            {
              key: 'gender',
              label: 'Gender',
              sortable: true,
              searchable: true,
              width: '8%',
              render: (value) => value ? (value === 'MALE' ? 'Male' : 'Female') : '-',
            },
            {
              key: 'guardianId',
              label: 'Guardian',
              sortable: true,
              searchable: true,
              width: '15%',
              render: (guardianId) => getGuardianName(guardianId),
            },
            {
              key: 'needs',
              label: 'Needs',
              sortable: false,
              searchable: false,
              width: '25%',
              render: (needs, student) => (
                needs && needs.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {needs.map((need: string) => (
                      <span 
                        key={need} 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.125rem 0.5rem',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          borderRadius: '0.25rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {needsLabels[need] || need}
                      </span>
                    ))}
                    {student.needsOtherText && (
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.125rem 0.5rem',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '0.25rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {student.needsOtherText}
                      </span>
                    )}
                  </div>
                ) : '-'
              ),
            },
            {
              key: 'hobbies',
              label: 'Hobbies',
              sortable: true,
              searchable: true,
              width: '20%',
              render: (value) => value || '-',
            },
          ] as Column<Student>[]}
          actions={(student) => (
            canEdit ? (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {!student.isDeleted ? (
                  <>
                    <button
                      className="btn-icon btn-icon-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(student);
                      }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(student.id);
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-icon btn-icon-success"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(student.id);
                    }}
                    title="Restore"
                  >
                    ♻️
                  </button>
                )}
              </div>
            ) : null
          )}
          emptyMessage={`No ${showDeleted ? 'deleted' : 'active'} students found. ${canEdit && !showDeleted ? 'Click "Add Student" to create one.' : ''}`}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.type === 'delete' ? 'Delete Student' : 'Restore Student'}
        message={
          confirmDialog.type === 'delete'
            ? `Are you sure you want to delete ${confirmDialog.name}?\n\nThis will move the student to the deleted records.`
            : `Are you sure you want to restore ${confirmDialog.name}?\n\nThis will move the record back to active students.`
        }
        confirmText={confirmDialog.type === 'delete' ? 'Delete' : 'Restore'}
        cancelText="Cancel"
        onConfirm={confirmDialog.type === 'delete' ? handleConfirmDelete : handleConfirmRestore}
        onCancel={() => setConfirmDialog({ isOpen: false, type: 'restore', id: '', name: '' })}
        type={confirmDialog.type === 'delete' ? 'danger' : 'info'}
      />
    </div>
  );
};
