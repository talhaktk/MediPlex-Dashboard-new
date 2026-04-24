'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, RefreshCw, Shield, UserCheck, Users, Save, X, Eye, EyeOff } from 'lucide-react';
import ClinicSettingsTab from '@/components/ui/ClinicSettingsTab';
import ScheduleSettings from '@/components/ui/ScheduleSettings';
import toast from 'react-hot-toast';

interface UserRow {
  id:       string;
  name:     string;
  email:    string;
  role:     string;
  initials: string;
  active:   boolean;
}

const ROLES = ['admin', 'doctor', 'receptionist'];
const ROLE_COLOR: Record<string, string> = {
  admin:        '#c9a84c',
  doctor:       '#1a7f5e',
  receptionist: '#2b6cb0',
};
const ROLE_ICON: Record<string, React.ReactNode> = {
  admin:        <Shield size={13} />,
  doctor:       <UserCheck size={13} />,
  receptionist: <Users size={13} />,
};

const PERMS = [
  { label:'Overview',     admin:true,  doctor:true,  receptionist:true  },
  { label:'Appointments', admin:true,  doctor:true,  receptionist:true  },
  { label:'Patients',     admin:true,  doctor:true,  receptionist:false },
  { label:'Analytics',    admin:true,  doctor:true,  receptionist:false },
  { label:'Calendar',     admin:true,  doctor:true,  receptionist:true  },
  { label:'Settings',     admin:true,  doctor:false, receptionist:false },
  { label:'Export CSV',   admin:true,  doctor:true,  receptionist:true  },
  { label:'Export PDF',   admin:true,  doctor:true,  receptionist:false },
];

const emptyForm = () => ({ name:'', email:'', password:'', role:'receptionist', initials:'' , active:true });

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(emptyForm());
  const [saving,   setSaving]   = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [tab,      setTab]      = useState('users');

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res  = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
      if (data.error) toast.error(data.error);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadUsers(); }, [isAdmin]);

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email and password are required'); return;
    }
    setSaving(true);
    try {
      const res  = await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'add', ...form }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success('User added successfully');
        setShowForm(false);
        setForm(emptyForm());
        loadUsers();
      } else toast.error(data.error || 'Failed to save');
    } catch { toast.error('Error saving user'); }
    setSaving(false);
  };

  const handleToggle = async (u: UserRow) => {
    try {
      await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'toggle', id: u.id, active: !u.active }),
      });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !x.active } : x));
      toast.success(u.active ? `${u.name} deactivated` : `${u.name} activated`);
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      const res  = await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'delete', id: u.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setUsers(prev => prev.filter(x => x.id !== u.id));
        toast.success(`${u.name} deleted`);
      } else toast.error(data.error || 'Failed to delete');
    } catch { toast.error('Failed to delete'); }
  };

  const autoInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const tabs = [
    { key:'users',         label:'User Management'  },
    { key:'roles',         label:'Role Permissions' },
    { key:'clinicsettings',label:'Clinic Settings'  },
    { key:'schedule',      label:'Schedule'         },
  ];

  return (
    <>
      <Topbar title="Settings" subtitle="Clinic configuration and user management" />
      <main className="flex-1 p-8 max-w-4xl">
        <div className="space-y-5">

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7 w-fit">
            {tabs.map(t => (
              isAdmin || t.key !== 'users' ? (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${tab===t.key ? 'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
                  {t.label}
                </button>
              ) : null
            ))}
          </div>

          {/* ── USER MANAGEMENT ──────────────────────────────────────────────── */}
          {tab === 'users' && isAdmin && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="text-[13px] text-gray-500">
                  <span className="font-medium text-navy">{users.length}</span> users registered
                </div>
                <div className="flex gap-2">
                  <button onClick={loadUsers} disabled={loading}
                    className="btn-outline text-[12px] py-2 px-3 gap-1.5">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                  </button>
                  <button onClick={() => { setShowForm(true); setForm(emptyForm()); }}
                    className="btn-gold text-[12px] py-2 px-4 gap-1.5">
                    <Plus size={13} /> Add User
                  </button>
                </div>
              </div>

              {/* Add user form */}
              {showForm && (
                <div className="card p-5 animate-in" style={{ border:'2px solid rgba(201,168,76,0.3)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-medium text-navy text-[14px]">New User</div>
                    <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Full Name</label>
                      <input type="text" placeholder="Dr. Ahmed Khan"
                        value={form.name}
                        onChange={e => setForm(prev => ({
                          ...prev,
                          name: e.target.value,
                          initials: prev.initials ? prev.initials : autoInitials(e.target.value),
                        }))}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Initials</label>
                      <input type="text" placeholder="AK"
                        value={form.initials}
                        onChange={e => setForm(prev => ({ ...prev, initials: e.target.value }))}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Email</label>
                      <input type="email" placeholder="dr.ahmed@mediplex.com"
                        value={form.email}
                        onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Password</label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} placeholder="min 6 characters"
                          value={form.password}
                          onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold pr-9" />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Role</label>
                      <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.active}
                          onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} />
                        <span className="text-[13px] text-navy">Active (can log in)</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-black/5">
                    <button onClick={handleSave} disabled={saving}
                      className="btn-gold text-[12px] py-2 px-4 gap-1.5">
                      <Save size={13} /> {saving ? 'Saving...' : 'Save User'}
                    </button>
                    <button onClick={() => setShowForm(false)} className="btn-outline text-[12px] py-2 px-3">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Users list */}
              <div className="card overflow-hidden animate-in">
                <table className="data-table">
                  <thead>
                    <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-[13px]">Loading users...</td></tr>
                    )}
                    {!loading && users.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-[13px]">
                        No users found — click "Add User" to create one
                      </td></tr>
                    )}
                    {users.map(u => (
                      <tr key={u.id} className={!u.active ? 'opacity-50' : ''}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{ background:`${ROLE_COLOR[u.role] || '#888'}22`, color:ROLE_COLOR[u.role] || '#888' }}>
                              {u.initials || u.name.slice(0,2).toUpperCase()}
                            </div>
                            <div className="font-medium text-navy text-[13px]">{u.name}</div>
                          </div>
                        </td>
                        <td className="text-[12px] text-gray-500">{u.email}</td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background:`${ROLE_COLOR[u.role] || '#888'}18`, color:ROLE_COLOR[u.role] || '#888' }}>
                            {ROLE_ICON[u.role]} {u.role}
                          </span>
                        </td>
                        <td>
                          <button onClick={() => handleToggle(u)}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-all ${
                              u.active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            {u.active ? '● Active' : '○ Inactive'}
                          </button>
                        </td>
                        <td>
                          <button onClick={() => handleDelete(u)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ROLE PERMISSIONS ─────────────────────────────────────────────── */}
          {tab === 'roles' && (
            <div className="card overflow-hidden animate-in">
              <div className="px-5 py-4 border-b border-black/5 font-medium text-navy text-[14px]">Role Permissions</div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th><span className="flex items-center gap-1.5" style={{ color:'#c9a84c' }}><Shield size={12}/>Admin</span></th>
                      <th><span className="flex items-center gap-1.5" style={{ color:'#1a7f5e' }}><UserCheck size={12}/>Doctor</span></th>
                      <th><span className="flex items-center gap-1.5" style={{ color:'#2b6cb0' }}><Users size={12}/>Receptionist</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMS.map(p => (
                      <tr key={p.label}>
                        <td className="font-medium text-navy text-[13px]">{p.label}</td>
                        {(['admin','doctor','receptionist'] as const).map(role => (
                          <td key={role}>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              p[role] ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-400'
                            }`}>
                              {p[role] ? '✓ Yes' : '✗ No'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CLINIC SETTINGS ── */}
          {tab === 'clinicsettings' && <ClinicSettingsTab />}
          {tab === 'schedule'       && <ScheduleSettings />}

        </div>
      </main>
    </>
  );
}
