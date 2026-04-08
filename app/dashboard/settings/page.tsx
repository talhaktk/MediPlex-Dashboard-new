'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, RefreshCw, Shield, UserCheck, Users, Eye, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserRow {
  rowIndex: number;
  name:     string;
  email:    string;
  password: string;
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

const emptyUser = (): Omit<UserRow,'rowIndex'> => ({
  name:'', email:'', password:'', role:'receptionist', initials:'', active:true,
});

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';

  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(emptyUser());
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState<'users'|'clinic'|'sheet'|'roles'>('users');

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
      if (data.ok || data.mode === 'env-only') {
        toast.success('User added to sheet! They can now log in.');
        setShowForm(false);
        setForm(emptyUser());
        loadUsers();
      } else toast.error('Failed to save');
    } catch { toast.error('Error saving user'); }
    setSaving(false);
  };

  const handleToggle = async (u: UserRow) => {
    try {
      await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'toggle', rowIndex: u.rowIndex, active: !u.active }),
      });
      setUsers(prev => prev.map(x => x.rowIndex === u.rowIndex ? { ...x, active: !x.active } : x));
      toast.success(u.active ? `${u.name} deactivated` : `${u.name} activated`);
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'delete', rowIndex: u.rowIndex }),
      });
      setUsers(prev => prev.filter(x => x.rowIndex !== u.rowIndex));
      toast.success(`${u.name} deleted`);
    } catch { toast.error('Failed to delete'); }
  };

  const autoInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const tabs = [
    { key:'users',  label:'User Management' },
    { key:'roles',  label:'Role Permissions' },
    { key:'clinic', label:'Clinic Info' },
    { key:'sheet',  label:'Google Sheets' },
  ] as const;

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

              {/* Setup notice */}
              <div className="rounded-xl p-4 text-[12px]"
                style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)' }}>
                <div className="font-medium text-amber-800 mb-1">📋 Google Sheet Setup Required</div>
                <div className="text-amber-700 space-y-1">
                  <div>1. Open your Google Sheet → click the <strong>+</strong> at the bottom to add a new tab</div>
                  <div>2. Name it exactly: <code className="bg-amber-100 px-1 rounded font-mono">Logins</code></div>
                  <div>3. Add these headers in Row 1: <code className="bg-amber-100 px-1 rounded font-mono">Name | Email | Password | Role | Initials | Active</code></div>
                  <div>4. Make sure your Apps Script is deployed — it will write new users to this sheet</div>
                </div>
              </div>

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
                  <button onClick={() => { setShowForm(true); setForm(emptyUser()); }}
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
                    {[
                      { label:'Full Name',  key:'name',     type:'text',     placeholder:'Dr. Ahmed Khan' },
                      { label:'Initials',   key:'initials', type:'text',     placeholder:'AK' },
                      { label:'Email',      key:'email',    type:'email',    placeholder:'dr.ahmed@mediplex.com' },
                      { label:'Password',   key:'password', type:'password', placeholder:'min 6 characters' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                        <input type={f.type} placeholder={f.placeholder}
value={String((form as Record<string, unknown>)[f.key] ?? '')}
onChange={e => {
                            const val = e.target.value;
                            setForm(prev => ({
                              ...prev,
                              [f.key]: val,
                              ...(f.key === 'name' && !prev.initials ? { initials: autoInitials(val) } : {}),
                            }));
                          }}
                          className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold" />
                      </div>
                    ))}
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
                        No users found — make sure the Logins sheet tab exists
                      </td></tr>
                    )}
                    {users.map(u => (
                      <tr key={u.rowIndex} className={!u.active ? 'opacity-50' : ''}>
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

          {/* ── CLINIC INFO ──────────────────────────────────────────────────── */}
          {tab === 'clinic' && (
            <div className="card p-6 animate-in">
              <div className="font-medium text-navy text-[15px] mb-5 pb-4 border-b border-black/5">Clinic Information</div>
              <div className="space-y-4">
                {[
                  ['Clinic Name',  process.env.NEXT_PUBLIC_CLINIC_NAME    || 'MediPlex Pediatric Clinic', 'NEXT_PUBLIC_CLINIC_NAME'],
                  ['Address',      process.env.NEXT_PUBLIC_CLINIC_ADDRESS || '123 Medical Center Drive',  'NEXT_PUBLIC_CLINIC_ADDRESS'],
                  ['Phone',        process.env.NEXT_PUBLIC_CLINIC_PHONE   || '(212) 555-0190',            'NEXT_PUBLIC_CLINIC_PHONE'],
                  ['Email',        process.env.NEXT_PUBLIC_CLINIC_EMAIL   || 'appointments@mediplex.com', 'NEXT_PUBLIC_CLINIC_EMAIL'],
                  ['Doctor Name',  process.env.NEXT_PUBLIC_DOCTOR_NAME    || 'Dr. Talha',                 'NEXT_PUBLIC_DOCTOR_NAME'],
                ].map(([l, val, envKey]) => (
                  <div key={l}>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">{l}</label>
                    <input type="text" defaultValue={val} readOnly
                      className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-[13px] text-navy bg-gray-50 outline-none" />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Edit via <code className="bg-gray-100 px-1 rounded">{envKey}</code> in Vercel Environment Variables
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GOOGLE SHEETS ────────────────────────────────────────────────── */}
          {tab === 'sheet' && (
            <div className="space-y-4 animate-in">
              <div className="card p-6">
                <div className="font-medium text-navy text-[15px] mb-5 pb-4 border-b border-black/5">Google Sheets Integration</div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1.5">Spreadsheet ID</label>
                    <input type="text" defaultValue={process.env.NEXT_PUBLIC_SHEET_ID || 'Configured in Vercel'} readOnly
                      className="w-full border border-black/10 rounded-lg px-3 py-2.5 text-[12px] text-gray-500 bg-gray-50 outline-none font-mono" />
                  </div>
                  <div className="rounded-xl p-4" style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)' }}>
                    <div className="text-[12px] font-medium text-amber-800 mb-3">Required Sheet Tabs</div>
                    <div className="space-y-2">
                      {[
                        { name:'Records',  desc:'Main appointments data — all patient records',   status:true },
                        { name:'Logins',   desc:'User accounts — Name, Email, Password, Role',    status:false },
                      ].map(s => (
                        <div key={s.name} className="flex items-center gap-3">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.status ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {s.status ? '✓ Active' : '⚠ Setup needed'}
                          </span>
                          <code className="text-[12px] font-mono font-semibold text-navy">{s.name}</code>
                          <span className="text-[12px] text-gray-500">— {s.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background:'rgba(43,108,176,0.06)', border:'1px solid rgba(43,108,176,0.15)' }}>
                    <div className="text-[12px] font-medium text-blue-800 mb-2">Logins Sheet Setup</div>
                    <ol className="text-[12px] text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Open your Google Sheet → click <strong>+</strong> to add a tab → name it <code className="bg-blue-100 px-1 rounded">Logins</code></li>
                      <li>Row 1 headers: <code className="bg-blue-100 px-1 rounded">Name | Email | Password | Role | Initials | Active</code></li>
                      <li>Add users in Row 2 onwards — Role must be admin, doctor, or receptionist</li>
                      <li>Active column: write <code className="bg-blue-100 px-1 rounded">Yes</code> or <code className="bg-blue-100 px-1 rounded">No</code></li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
