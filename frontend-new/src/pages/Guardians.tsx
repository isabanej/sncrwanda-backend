import { useState, useEffect } from 'react';
import { guardianAPI } from '../services/api';
import type { Guardian } from '../types';
import { useAuth } from '../context/AuthContext';
import { canEditOrDelete } from '../utils/permissions';
import { PhoneInput } from '../components/PhoneInput';
import { validateEmail, getEmailError } from '../utils/validation';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import '../pages/Dashboard.css';

export const Guardians = () => {
  const { user } = useAuth();
  const canEdit = canEditOrDelete(user);
  
  const [guardians, setGuardians] = useState<Guardian[]>([]);
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
    phone: '+250',
    gender: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    loadGuardians();
  }, []);

  const loadGuardians = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const data = await guardianAPI.getAll();
      
      // Normalize the data - backend uses 'deleted', frontend expects 'isDeleted'
      const normalizedData = data.map(g => ({
        ...g,
        isDeleted: g.deleted ?? g.isDeleted ?? false
      }));
      
      // Reverse the array to show newest entries first
      setGuardians(normalizedData.reverse());
    } catch (err: any) {
      // Only show error if it's a real API failure, not just empty data
      const errorMessage = err?.response?.status === 404 
        ? '' 
        : 'Unable to connect to the server. Please check your connection and try again.';
      setError(errorMessage);
      console.error('Load error:', err);
      setGuardians([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email if provided
    if (formData.email) {
      const error = getEmailError(formData.email);
      if (error) {
        setEmailError(error);
        return;
      }
    }
    
    try {
      const guardianData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gender: (formData.gender as 'MALE' | 'FEMALE') || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
      };
      
      if (editingId) {
        await guardianAPI.update(editingId, guardianData);
      } else {
        await guardianAPI.create(guardianData);
      }
      
      await loadGuardians();
      setShowForm(false);
      setEditingId(null);
      setEmailError(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '+250',
        gender: '',
        email: '',
        address: '',
      });
    } catch (err) {
      setError(`Failed to ${editingId ? 'update' : 'create'} guardian`);
      console.error('Submit error:', err);
    }
  };
  const handleEdit = (guardian: Guardian) => {
    setEditingId(guardian.id);
    setFormData({
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      phone: guardian.phone,
      gender: guardian.gender || '',
      email: guardian.email || '',
      address: guardian.address || '',
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
      phone: '+250',
      gender: '',
      email: '',
      address: '',
    });
  };
  
  const handleDelete = async (id: string) => {
    const guardian = guardians.find(g => g.id === id);
    if (!guardian) {
      console.error('Guardian not found:', id);
      setError('Guardian not found');
      return;
    }
    
    console.log('Attempting to delete guardian:', guardian.firstName, guardian.lastName, 'ID:', id);
    
    // Show custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      id,
      name: `${guardian.firstName} ${guardian.lastName}`
    });
  };

  const handleConfirmDelete = async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: 'delete', id: '', name: '' });
    
    try {
      console.log('Calling API to delete guardian:', id);
      await guardianAPI.delete(id);
      console.log('✅ Guardian deleted successfully:', id);
      
      // Immediately update local state to reflect deletion
      setGuardians(prevGuardians => 
        prevGuardians.map(g => g.id === id ? { ...g, isDeleted: true } : g)
      );
      
      // Also reload from server to ensure consistency
      await loadGuardians();
      console.log('✅ Data reloaded after delete');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete guardian';
      setError(errorMessage);
      console.error('❌ Delete error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(`Failed to delete guardian: ${errorMessage}`);
    }
  };
  
  const handleRestore = async (id: string) => {
    // Find the guardian to show their name in the confirmation
    const guardian = guardians.find(g => g.id === id);
    const guardianName = guardian ? `${guardian.firstName} ${guardian.lastName}` : 'this guardian';
    
    // Show custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      id,
      name: guardianName
    });
  };

  const handleConfirmRestore = async () => {
    const { id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: 'restore', id: '', name: '' });
    
    try {
      console.log('Attempting to restore guardian:', id);
      await guardianAPI.restore(id);
      console.log('✅ Guardian restored successfully:', id);
      
      // Immediately update local state to reflect restoration
      setGuardians(prevGuardians => 
        prevGuardians.map(g => g.id === id ? { ...g, isDeleted: false } : g)
      );
      
      // Also reload from server to ensure consistency
      await loadGuardians();
      console.log('✅ Data reloaded after restore');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to restore guardian';
      setError(errorMessage);
      console.error('❌ Restore error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      alert(`Failed to restore guardian: ${errorMessage}`);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Guardians</h1>
        <p>Manage guardian information</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2>All Guardians ({guardians.filter(g => showDeleted ? g.isDeleted : !g.isDeleted).length})</h2>
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
              {showForm ? 'Cancel' : '+ Add Guardian'}
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
                <label>Phone *</label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
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
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '1rem' }}>
              {editingId ? 'Update Guardian' : 'Create Guardian'}
            </button>
          </form>
        )}

        <DataTable
          data={guardians.filter(g => showDeleted ? g.isDeleted : !g.isDeleted)}
          columns={[
            {
              key: 'firstName',
              label: 'First Name',
              sortable: true,
              searchable: true,
              width: '20%',
            },
            {
              key: 'lastName',
              label: 'Last Name',
              sortable: true,
              searchable: true,
              width: '20%',
            },
            {
              key: 'phone',
              label: 'Phone',
              sortable: true,
              searchable: true,
              width: '18%',
            },
            {
              key: 'gender',
              label: 'Gender',
              sortable: true,
              searchable: true,
              width: '10%',
              render: (value) => value ? (value === 'MALE' ? 'Male' : 'Female') : '-',
            },
            {
              key: 'email',
              label: 'Email',
              sortable: true,
              searchable: true,
              width: '25%',
              render: (value) => value || '-',
            },
            {
              key: 'address',
              label: 'Address',
              sortable: true,
              searchable: true,
              width: '15%',
              render: (value) => value || '-',
            },
          ] as Column<Guardian>[]}
          actions={(guardian) => (
            canEdit ? (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                {!guardian.isDeleted ? (
                  <>
                    <button
                      className="btn-icon btn-icon-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(guardian);
                      }}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(guardian.id);
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
                      handleRestore(guardian.id);
                    }}
                    title="Restore"
                  >
                    ♻️
                  </button>
                )}
              </div>
            ) : null
          )}
          emptyMessage={`No ${showDeleted ? 'deleted' : 'active'} guardians found. ${canEdit && !showDeleted ? 'Click "Add Guardian" to create one.' : ''}`}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.type === 'delete' ? 'Delete Guardian' : 'Restore Guardian'}
        message={
          confirmDialog.type === 'delete'
            ? `Are you sure you want to delete ${confirmDialog.name}?\n\nThis will move the guardian to the deleted records.`
            : `Are you sure you want to restore ${confirmDialog.name}?\n\nThis will move the record back to active guardians.`
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
