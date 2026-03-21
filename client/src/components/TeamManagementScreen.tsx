import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, Shield, Mail, Phone, UserPlus, Trash2, Search } from 'lucide-react';
import ConfirmationModal from './ui/ConfirmationModal';

export default function TeamManagementScreen() {
  const { user, token } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newMemberType, setNewMemberType] = useState<string>('EMPLOYEE');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', employeeId: '', role: 'EMPLOYEE', avatarUrl: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all'|'MD'|'AM'|'TL'|'EMPLOYEE'>('all');
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'inactive'>('all');

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch members', err);
    }
  };

  useEffect(() => {
    if (token) fetchMembers();
  }, [token]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.password) {
      alert("Password is required");
      return;
    }
    try {
      let avatarUrlToSend = formData.avatarUrl;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (uploadRes.ok) {
          const d = await uploadRes.json();
          avatarUrlToSend = d.url;
        } else {
          alert('Failed to upload avatar');
        }
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, role: newMemberType, avatarUrl: avatarUrlToSend })
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '', email: '', password: '', phone: '', employeeId: '', role: 'EMPLOYEE', avatarUrl: '' });
        setAvatarFile(null);
        setAvatarPreview(null);
        fetchMembers();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to add member");
      }
    } catch (err) {
      console.error('Add member failed', err);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      // handle avatar upload if a new file was chosen
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (uploadRes.ok) {
          const d = await uploadRes.json();
          payload.avatarUrl = d.url;
        }
      }
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', phone: '', employeeId: '', role: 'EMPLOYEE', avatarUrl: '' });
        setAvatarFile(null);
        setAvatarPreview(null);
        fetchMembers();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to update member");
      }
    } catch (err) {
      console.error('Update member failed', err);
    }
  };

  const openEditModal = (member: any) => {
    setEditingUser(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      employeeId: member.employeeId || '',
      password: '', // blank so they only enter if they want to change
      role: member.role,
      avatarUrl: member.avatarUrl || ''
    });
    setAvatarPreview(member.avatarUrl || null);
    setShowEditModal(true);
  };

  const canCreateAM = user?.role === 'MD';
  const canCreateTL = user?.role === 'MD' || user?.role === 'AM';
  const canCreateEmp = user?.role === 'MD' || user?.role === 'AM' || user?.role === 'TL';
  const canManage = user?.role === 'MD' || user?.role === 'AM' || user?.role === 'TL';

  const handleDeleteMember = async (memberId: number) => {
    setDeletingId(memberId);
    try {
      const res = await fetch(`/api/users/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok && res.status !== 204) throw new Error('Delete failed');
      // remove locally
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Failed to delete member', err);
      alert('Failed to delete member');
    } finally {
      setDeletingId(null);
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  // Filter members based on search, role and status
  const filteredMembers = members.filter((member: any) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const inName = (member.name || '').toLowerCase().includes(q);
      const inEmail = (member.email || '').toLowerCase().includes(q);
      const inEmp = (member.employeeId || '').toLowerCase().includes(q);
      if (!(inName || inEmail || inEmp)) return false;
    }

    if (roleFilter !== 'all' && member.role !== roleFilter) return false;

    if (statusFilter !== 'all') {
      const lastTs = member.lastLocationTimestamp ? new Date(member.lastLocationTimestamp).getTime() : 0;
      const isRecentlyLocated = !!(lastTs && Date.now() - lastTs < 2 * 60 * 1000);
      const isCurrentlyActive = !!(member.isActive && (isRecentlyLocated || member.id === user?.id));
      if (statusFilter === 'active' && !isCurrentlyActive) return false;
      if (statusFilter === 'inactive' && isCurrentlyActive) return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 font-bold text-2xl">Team Management</h1>
            <p className="text-gray-600">Manage your team members and leaders</p>
          </div>
          {canCreateEmp && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Members</p>
              <h3 className="text-gray-900 text-xl font-bold">{members.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-gray-900 font-semibold">All Team Members</h2>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search name, email or emp id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="MD">MD</option>
              <option value="AM">AM</option>
              <option value="TL">TL</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-gray-700 font-medium">Name</th>
                <th className="px-6 py-4 text-left text-gray-700 font-medium">Contact</th>
                <th className="px-6 py-4 text-left text-gray-700 font-medium">Emp ID</th>
                <th className="px-6 py-4 text-left text-gray-700 font-medium">Role</th>
                <th className="px-6 py-4 text-left text-gray-700 font-medium">Status</th>
                {canManage && <th className="px-6 py-4 text-left text-gray-700 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member: any) => {
                const lastTs = member.lastLocationTimestamp ? new Date(member.lastLocationTimestamp).getTime() : 0;
                // Consider user active if:
                // - member.isActive is true AND
                //   - lastLocationTimestamp is recent OR
                //   - this row represents the currently logged-in user
                const isRecentlyLocated = !!(lastTs && Date.now() - lastTs < 2 * 60 * 1000);
                const isCurrentlyActive = !!(
                  member.isActive && (isRecentlyLocated || member.id === user?.id)
                );
                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                          {member.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">👤</div>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium">{member.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Mail size={14} />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Phone size={14} />
                          <span>{member.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {member.employeeId || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${member.role === 'MD' ? 'bg-purple-100 text-purple-700' :
                        member.role === 'AM' ? 'bg-blue-100 text-blue-700' :
                          member.role === 'TL' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${isCurrentlyActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isCurrentlyActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 flex items-center gap-3">
                        {/* Edit permission: MD/AM can edit anyone; TL can edit employees only */}
                        {((user?.role === 'MD' || user?.role === 'AM') || (user?.role === 'TL' && member.role === 'EMPLOYEE')) && (
                          <button
                            onClick={() => openEditModal(member)}
                            className="text-orange-500 hover:text-orange-700 font-medium"
                          >
                            Edit
                          </button>
                        )}

                        {/* Delete permission: MD can delete anyone; AM can delete non-MD; TL can delete EMPLOYEE only */}
                        {((user?.role === 'MD') || (user?.role === 'AM' && member.role !== 'MD') || (user?.role === 'TL' && member.role === 'EMPLOYEE')) && (
                          <button
                            onClick={() => { setConfirmTarget(member.id); setConfirmOpen(true); }}
                            className="text-red-600 hover:text-red-800"
                            title="Delete member"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-gray-900 text-xl font-bold">Add New Team Member</h2>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Member Type</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewMemberType('EMPLOYEE')}
                    className={`p-3 rounded-xl border-2 transition-all ${newMemberType === 'EMPLOYEE' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20' : 'border-gray-100'}`}
                  >
                    Employee
                  </button>
                  {canCreateTL && (
                    <button
                      type="button"
                      onClick={() => setNewMemberType('TL')}
                      className={`p-3 rounded-xl border-2 transition-all ${newMemberType === 'TL' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20' : 'border-gray-100'}`}
                    >
                      TL
                    </button>
                  )}
                  {canCreateAM && (
                    <button
                      type="button"
                      onClick={() => setNewMemberType('AM')}
                      className={`p-3 rounded-xl border-2 transition-all ${newMemberType === 'AM' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20' : 'border-gray-100'}`}
                    >
                      AM
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Initial Password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Profile Image (optional)</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setAvatarFile(f);
                          if (f) setAvatarPreview(URL.createObjectURL(f));
                        }}
                      />
                      <span className="text-sm text-gray-700">Choose file</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste image URL"
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      value={formData.avatarUrl}
                      onChange={(e) => { setFormData({ ...formData, avatarUrl: e.target.value }); setAvatarPreview(e.target.value || null); }}
                    />
                  </div>
                  {avatarPreview && (
                    <div className="mt-3 w-20 h-20 rounded-xl overflow-hidden border border-gray-100">
                      <img src={avatarPreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-gray-900 text-xl font-bold">Edit Team Member</h2>
            </div>
            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Employee ID"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                />
                <input
                  type="password"
                  placeholder="New Password (leave blank to keep current)"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingUser(null); }} className="flex-1 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        open={confirmOpen}
        title="Delete member"
        description="This will permanently remove the member from the system. This action cannot be undone."
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        onConfirm={() => confirmTarget && handleDeleteMember(confirmTarget)}
        confirmText={deletingId ? 'Deleting...' : 'Delete'}
      />
    </div>
  );
}
