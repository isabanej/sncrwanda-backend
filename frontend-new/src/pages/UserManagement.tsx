import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import type { UserResponse, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import '../pages/Dashboard.css';
import './UserManagement.css';

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        userAPI.getAllUsers(),
        userAPI.getAllRoles(),
      ]);
      // Reverse the users array to show newest entries first
      setUsers(usersData.reverse());
      setRoles(rolesData);
    } catch (err) {
      setError('Failed to load users');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: UserResponse) => {
    setEditingUser(user.id);
    setSelectedRoles(user.roles || []);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setSelectedRoles([]);
  };

  const handleSaveRoles = async (userId: number) => {
    try {
      await userAPI.updateUser(userId, { roles: selectedRoles });
      await loadData();
      setEditingUser(null);
      setSelectedRoles([]);
    } catch (err) {
      setError('Failed to update user roles');
      console.error('Update error:', err);
    }
  };

  const handleToggleRole = (role: UserRole) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleToggleActive = async (userId: number, currentActive: boolean) => {
    try {
      await userAPI.toggleUserActive(userId, !currentActive);
      await loadData();
    } catch (err) {
      setError('Failed to toggle user status');
      console.error('Toggle error:', err);
    }
  };

  const getRoleBadgeClass = (role: UserRole): string => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'badge-purple';
      case 'ADMIN':
        return 'badge-info';
      case 'TEACHER':
        return 'badge-success';
      case 'STUDENT':
        return 'badge-warning';
      case 'GUARDIAN':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || currentUser?.role === 'SUPER_ADMIN';

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage system users and their roles</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <div className="table-header">
          <h2>All Users ({users.length})</h2>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Created</th>
              {isSuperAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td className="font-semibold">{user.username}</td>
                <td>{user.email || '-'}</td>
                <td>
                  {editingUser === user.id ? (
                    <div className="role-checkboxes">
                      {roles.map((role) => (
                        <label key={role} className="role-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role)}
                            onChange={() => handleToggleRole(role)}
                          />
                          <span>{role}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="role-badges">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span key={role} className={`badge ${getRoleBadgeClass(role)}`}>
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="badge badge-info">No roles</span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
                {isSuperAdmin && (
                  <td>
                    <div className="action-buttons">
                      {editingUser === user.id ? (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleSaveRoles(user.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEditClick(user)}
                          >
                            Edit Roles
                          </button>
                          <button
                            className={`btn btn-sm ${user.active ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleToggleActive(user.id, user.active)}
                          >
                            {user.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
