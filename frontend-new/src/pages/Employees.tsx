import { useState, useEffect } from 'react';
import { employeeAPI } from '../services/api';
import type { Employee } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { canEditOrDelete } from '../utils/permissions';
import { PhoneInput } from '../components/PhoneInput';
import { validateEmail, getEmailError } from '../utils/validation';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../pages/Dashboard.css';

export const Employees = () => {
  const { user } = useAuth();
  const { formatCurrency } = useSettings();
  const canEdit = canEditOrDelete(user);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'restore';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'restore', id: '', name: '' });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    address: '',
    position: '',
    salary: '',
    phone: '+250',
    email: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const data = await employeeAPI.getAll();
      
      // Normalize the data - backend uses 'deleted', frontend expects 'isDeleted'
      const normalizedData = data.map(e => ({
        ...e,
        isDeleted: e.deleted ?? e.isDeleted ?? false
      }));
      
      // Reverse the array to show newest entries first
      setEmployees(normalizedData.reverse());
    } catch (err: any) {
      // Only show error if it's a real API failure, not just empty data
      const errorMessage = err?.response?.status === 404 
        ? '' 
        : 'Unable to connect to the server. Please check your connection and try again.';
      setError(errorMessage);
      console.error('Load error:', err);
      setEmployees([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (formData.email) {
      const error = getEmailError(formData.email);
      if (error) {
        setEmailError(error);
        return;
      }
    }
    
    try {
      const employeeData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        gender: (formData.gender as 'MALE' | 'FEMALE') || undefined,
        address: formData.address,
        position: formData.position,
        salary: parseFloat(formData.salary),
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        active: true,
        orgId: '00000000-0000-0000-0000-000000000001',
      };
      
      if (editingId) {
        await employeeAPI.update(editingId, employeeData);
      } else {
        await employeeAPI.create(employeeData);
      }
      
      await loadEmployees();
      setShowForm(false);
      setEditingId(null);
      setEmailError(null);
      setFormData({
        firstName: '',
        lastName: '',
        dob: '',
        gender: '',
        address: '',
        position: '',
        salary: '',
        phone: '+250',
        email: '',
      });
    } catch (err) {
      setError(`Failed to ${editingId ? 'update' : 'create'} employee`);
      console.error('Submit error:', err);
    }
  };
  
  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      dob: employee.dob,
      gender: employee.gender || '',
      address: employee.address,
      position: employee.position,
      salary: employee.salary.toString(),
      phone: employee.phone || '+250',
      email: employee.email || '',
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setEmailError(null);
    setFormData({
      firstName: '',
      lastName: '',
      dob: '',
      gender: '',
      address: '',
      position: '',
      salary: '',
      phone: '+250',
      email: '',
    });
  };
  
  const handleDelete = async (id: string) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) {
      console.error('Employee not found:', id);
      setError('Employee not found');
      return;
    }
    
    console.log('Attempting to delete employee:', employee.firstName, employee.lastName, 'ID:', id);
    
    // Show custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      id,
      name: `${employee.firstName} ${employee.lastName}`
    });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: 'delete', id: '', name: '' });
    
    try {
      console.log('Calling API to delete employee:', id);
      await employeeAPI.delete(id);
      console.log('✅ Employee deleted successfully:', id);
      
      // Immediately update local state to reflect deletion
      setEmployees(prevEmployees => 
        prevEmployees.map(e => e.id === id ? { ...e, isDeleted: true } : e)
      );
      
      // Also reload from server to ensure consistency
      await loadEmployees();
      console.log('✅ Data reloaded after delete');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete employee';
      setError(errorMessage);
      console.error('❌ Delete error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(`Failed to delete employee: ${errorMessage}`);
    }
  };
  
  const handleRestore = async (id: string) => {
    // Find the employee to show their name in the confirmation
    const employee = employees.find(e => e.id === id);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'this employee';
    
    // Show custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      id,
      name: employeeName
    });
  };

  const handleConfirmRestore = async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: 'restore', id: '', name: '' });
    
    try {
      console.log('Attempting to restore employee:', id);
      await employeeAPI.restore(id);
      console.log('✅ Employee restored successfully:', id);
      
      // Immediately update local state to reflect restoration
      setEmployees(prevEmployees => 
        prevEmployees.map(e => e.id === id ? { ...e, isDeleted: false } : e)
      );
      
      // Also reload from server to ensure consistency
      await loadEmployees();
      console.log('✅ Data reloaded after restore');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to restore employee';
      setError(errorMessage);
      console.error('❌ Restore error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(`Failed to restore employee: ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Employees</h1>
        <p>Manage school staff and employees</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2>All Employees ({employees.filter(e => showDeleted ? e.isDeleted : !e.isDeleted).length})</h2>
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
              {showForm ? 'Cancel' : '+ Add Employee'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
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
                <label>Position *</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Salary *</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Phone</label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (e.target.value) {
                      setEmailError(getEmailError(e.target.value));
                    } else {
                      setEmailError(null);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && !validateEmail(e.target.value)) {
                      setEmailError(getEmailError(e.target.value));
                    }
                  }}
                  style={{
                    borderColor: emailError ? '#ef4444' : undefined
                  }}
                />
                {emailError && (
                  <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {emailError}
                  </div>
                )}
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '1rem' }}>
              {editingId ? 'Update Employee' : 'Create Employee'}
            </button>
          </form>
        )}

        <DataTable
          data={employees.filter(e => showDeleted ? e.isDeleted : !e.isDeleted)}
          columns={[
            {
              key: 'firstName',
              label: 'First Name',
              sortable: true,
              searchable: true,
              width: '12%',
            },
            {
              key: 'lastName',
              label: 'Last Name',
              sortable: true,
              searchable: true,
              width: '12%',
            },
            {
              key: 'position',
              label: 'Position',
              sortable: true,
              searchable: true,
              width: '12%',
            },
            {
              key: 'dob',
              label: 'DOB',
              sortable: true,
              searchable: false,
              width: '8%',
              render: (value) => new Date(value).toLocaleDateString(),
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
              key: 'address',
              label: 'Address',
              sortable: true,
              searchable: true,
              width: '13%',
              render: (value) => value || '-',
            },
            {
              key: 'salary',
              label: 'Salary',
              sortable: true,
              searchable: false,
              width: '10%',
              render: (value) => formatCurrency(value),
            },
            {
              key: 'phone',
              label: 'Phone',
              sortable: true,
              searchable: true,
              width: '10%',
              render: (value) => value || '-',
            },
            {
              key: 'email',
              label: 'Email',
              sortable: true,
              searchable: true,
              width: '13%',
              render: (value) => value || '-',
            },
            {
              key: 'active',
              label: 'Status',
              sortable: true,
              searchable: false,
              width: '8%',
              render: (active, emp) => {
                if (emp.isDeleted) {
                  return (
                    <span className="badge badge-danger">
                      DELETED
                    </span>
                  );
                }
                return (
                  <span className={`badge ${active ? 'badge-success' : 'badge-danger'}`}>
                    {active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                );
              },
            },
          ] as Column<Employee>[]}
          actions={(emp) => (
            canEdit ? (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {!emp.isDeleted ? (
                  <>
                    <button
                      className="btn-icon btn-icon-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(emp);
                      }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(emp.id);
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
                      handleRestore(emp.id);
                    }}
                    title="Restore"
                  >
                    ♻️
                  </button>
                )}
              </div>
            ) : null
          )}
          emptyMessage={`No ${showDeleted ? 'deleted' : 'active'} employees found. ${canEdit && !showDeleted ? 'Click "Add Employee" to create one.' : ''}`}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.type === 'delete' ? 'Delete Employee' : 'Restore Employee'}
        message={
          confirmDialog.type === 'delete'
            ? `Are you sure you want to delete ${confirmDialog.name}?\n\nThis will move the employee to the deleted records.`
            : `Are you sure you want to restore ${confirmDialog.name}?\n\nThis will move the record back to active employees.`
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
