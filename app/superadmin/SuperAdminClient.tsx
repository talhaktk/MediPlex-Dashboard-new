'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, ToggleLeft, BarChart3, Plus, X, Save,
  LogOut, CheckCircle, XCircle, RefreshCw, Eye, EyeOff,
  Calendar, UserCheck, Shield, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
type Clinic = {
  id: string;
  name: string;
  speciality: string;
  city: string;
  is_active: boolean;
  subscription_expiry: string | null;
  modules: Record<string, boolean>;
  org_id: string | null;
  created_at: string;
  patient_count?: number;
  appointment_count?: number;
};

type ClinicUser = {
  id: string;
  name: string;
  email: string;
  user_role: string;
  is_active: boolean;
  clinic_id: string;
  created_at: string;
};

const MODULES = [
  { key: 'vaccines',     label: 'Vaccination Schedule' },
  { key: 'who_charts',   label: 'WHO Growth Charts'    },
  { key: 'telehealth',   label: 'Telehealth'           },
  { key: 'ai_scribe',    label: 'AI Scribe'            },
  { key: 'lab_results',  label: 'Lab Results'          },
  { key: 'procedures',   label: 'Procedures'           },
  { key: 'feedback',     label: 'Feedback System'      },
];

const SPECIALITIES = ['Pediatrics', 'General Practice', 'Orthopedics', 'Cardiology', 'Dermatology', 'Neurology', 'Other'];
const ROLES = ['admin', 'doctor', 'receptionist'];

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className="pill text-[11px]"
      style={active
        ? { background: '#e8f7f2', color: '#1a7f5e' }
        : { background: '#fff0f0', color: '#c53030' }
      }
    >
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SuperAdminClient({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [tab,            setTab]            = useState<'clinics' | 'users' | 'features' | 'analytics'>('clinics');
  const [clinics,        setClinics]        = useState<Clinic[]>([]);
  const [users,          setUsers]          = useState<ClinicUser[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [loading,        setLoading]        = useState(true);

  // Add clinic form
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [clinicForm,    setClinicForm]    = useState({
    name: '', speciality: 'Pediatrics', city: '',
    doctorName: '', email: '', password: '',
    subscription_expiry: '',
  });

  // Add user form
  const [showAddUser, setShowAddUser]  = useState(false);
  const [userForm,    setUserForm]     = useState({ name: '', email: '', password: '', user_role: 'doctor' });
  const [showPw,      setShowPw]       = useState(false);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchClinics = async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load clinics'); return; }

    const enriched = await Promise.all((data || []).map(async (c: any) => {
      const [{ count: pc }, { count: ac }] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', c.id),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', c.id),
      ]);
      return { ...c, patient_count: pc || 0, appointment_count: ac || 0 };
    }));
    setClinics(enriched as Clinic[]);
    setLoading(false);
  };

  const fetchUsers = async (clinicId?: string) => {
    let q = supabase.from('logins').select('*').order('created_at', { ascending: false });
    if (clinicId) q = q.eq('clinic_id', clinicId);
    const { data, error } = await q;
    if (!error && data) setUsers(data as ClinicUser[]);
  };

  useEffect(() => { fetchClinics(); fetchUsers(); }, []);

  useEffect(() => {
    if (selectedClinic) fetchUsers(selectedClinic.id);
    else fetchUsers();
  }, [selectedClinic]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalClinics  = clinics.length;
  const activeClinics = clinics.filter(c => c.is_active).length;
  const totalPatients = clinics.reduce((s, c) => s + (c.patient_count || 0), 0);
  const totalUsers    = users.length;

  // ── Add clinic ────────────────────────────────────────────────────────────
  const addClinic = async () => {
    if (!clinicForm.name || !clinicForm.email || !clinicForm.password || !clinicForm.doctorName) {
      toast.error('Name, doctor, email and password are required'); return;
    }
    try {
      // 1. create org
      const { data: org, error: orgErr } = await supabase
        .from('organisations')
        .insert([{ name: clinicForm.name }])
        .select('id')
        .single();
      if (orgErr) throw orgErr;

      // 2. create clinic
      const { data: clinic, error: cErr } = await supabase
        .from('clinics')
        .insert([{
          name: clinicForm.name,
          speciality: clinicForm.speciality,
          city: clinicForm.city,
          is_active: true,
          subscription_expiry: clinicForm.subscription_expiry || null,
          modules: { vaccines: true, who_charts: true, telehealth: false, ai_scribe: false, lab_results: true, procedures: false, feedback: true },
          org_id: org.id,
        }])
        .select('id')
        .single();
      if (cErr) throw cErr;

      // 3. create login
      const { error: lErr } = await supabase
        .from('logins')
        .insert([{
          name: clinicForm.doctorName,
          email: clinicForm.email.toLowerCase(),
          password_hash: clinicForm.password,
          user_role: 'admin',
          is_active: true,
          is_super_admin: false,
          clinic_id: clinic.id,
          org_id: org.id,
        }]);
      if (lErr) throw lErr;

      toast.success(`Clinic "${clinicForm.name}" created!`);
      setShowAddClinic(false);
      setClinicForm({ name: '', speciality: 'Pediatrics', city: '', doctorName: '', email: '', password: '', subscription_expiry: '' });
      fetchClinics();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  // ── Toggle clinic active ──────────────────────────────────────────────────
  const toggleClinic = async (clinic: Clinic) => {
    const { error } = await supabase
      .from('clinics')
      .update({ is_active: !clinic.is_active })
      .eq('id', clinic.id);
    if (error) toast.error('Failed to update');
    else {
      toast.success(`Clinic ${clinic.is_active ? 'disabled' : 'enabled'}`);
      fetchClinics();
    }
  };

  // ── Update subscription ───────────────────────────────────────────────────
  const updateSubscription = async (clinicId: string, expiry: string) => {
    const { error } = await supabase
      .from('clinics')
      .update({ subscription_expiry: expiry || null })
      .eq('id', clinicId);
    if (error) toast.error('Failed to update');
    else { toast.success('Subscription updated'); fetchClinics(); }
  };

  // ── Toggle module ─────────────────────────────────────────────────────────
  const toggleModule = async (clinic: Clinic, moduleKey: string) => {
    const updated = { ...clinic.modules, [moduleKey]: !clinic.modules[moduleKey] };
    const { error } = await supabase
      .from('clinics')
      .update({ modules: updated })
      .eq('id', clinic.id);
    if (error) toast.error('Failed to save');
    else {
      setClinics(prev => prev.map(c => c.id === clinic.id ? { ...c, modules: updated } : c));
      if (selectedClinic?.id === clinic.id) setSelectedClinic(prev => prev ? { ...prev, modules: updated } : prev);
    }
  };

  // ── Add user ──────────────────────────────────────────────────────────────
  const addUser = async () => {
    if (!selectedClinic) { toast.error('Select a clinic first'); return; }
    if (!userForm.name || !userForm.email || !userForm.password) {
      toast.error('Name, email and password are required'); return;
    }
    const { error } = await supabase.from('logins').insert([{
      name: userForm.name,
      email: userForm.email.toLowerCase(),
      password_hash: userForm.password,
      user_role: userForm.user_role,
      is_active: true,
      is_super_admin: false,
      clinic_id: selectedClinic.id,
      org_id: selectedClinic.org_id,
    }]);
    if (error) toast.error('Failed: ' + error.message);
    else {
      toast.success('User created');
      setShowAddUser(false);
      setUserForm({ name: '', email: '', password: '', user_role: 'doctor' });
      fetchUsers(selectedClinic.id);
    }
  };

  // ── Toggle user active ────────────────────────────────────────────────────
  const toggleUser = async (user: ClinicUser) => {
    const { error } = await supabase
      .from('logins')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);
    if (error) toast.error('Failed');
    else {
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers(selectedClinic?.id);
    }
  };

  // ── Reset password ────────────────────────────────────────────────────────
  const resetPassword = async (userId: string) => {
    const np = prompt('Enter new password:');
    if (!np) return;
    const { error } = await supabase.from('logins').update({ password_hash: np }).eq('id', userId);
    if (error) toast.error('Failed');
    else toast.success('Password reset');
  };

  // ── Delete user ───────────────────────────────────────────────────────────
  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    const { error } = await supabase.from('logins').delete().eq('id', userId);
    if (error) toast.error('Failed');
    else { toast.success('User deleted'); fetchUsers(selectedClinic?.id); }
  };

  const displayedUsers = useMemo(() =>
    selectedClinic ? users.filter(u => u.clinic_id === selectedClinic.id) : users,
    [users, selectedClinic]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: '#0a1628', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Left sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-navy font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>M+</div>
            <div>
              <div className="text-white font-semibold text-[14px] leading-tight">MediPlex</div>
              <div className="text-[10px] tracking-widest uppercase font-light mt-0.5" style={{ color: '#c9a84c' }}>
                Super Admin
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4">
          <div className="text-[10px] text-white/25 tracking-widest uppercase px-2 mb-2 font-medium">Control Panel</div>
          {[
            { id: 'clinics',   label: 'Clinics',    icon: Building2    },
            { id: 'users',     label: 'Users',      icon: Users        },
            { id: 'features',  label: 'Features',   icon: ToggleLeft   },
            { id: 'analytics', label: 'Analytics',  icon: BarChart3    },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as any)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 text-left mb-0.5"
              style={tab === id
                ? { background: 'rgba(255,255,255,0.1)', color: '#c9a84c' }
                : { color: 'rgba(255,255,255,0.5)' }
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
              {tab === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" style={{ background: '#c9a84c' }} />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-navy font-bold text-[11px]"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', flexShrink: 0 }}>SA</div>
            <div className="min-w-0">
              <div className="text-white text-[12px] font-medium truncate">{adminEmail}</div>
              <div className="text-[10px]" style={{ color: '#c9a84c' }}>Super Admin</div>
            </div>
          </div>
          <button
            onClick={() => { signOut({ redirect: false }); router.push('/login'); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-red-400 hover:bg-white/5 transition-all w-full"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6">

        {/* ══ CLINICS tab ══════════════════════════════════════════════════════ */}
        {tab === 'clinics' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white text-[20px] font-semibold">Clinics</h1>
                <p className="text-white/40 text-[12px] mt-0.5">{totalClinics} total · {activeClinics} active</p>
              </div>
              <button
                onClick={() => setShowAddClinic(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}
              >
                <Plus size={13} /> Add Clinic
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Clinics',   value: totalClinics,  color: '#c9a84c', bg: 'rgba(201,168,76,0.1)'  },
                { label: 'Active Clinics',  value: activeClinics, color: '#1a7f5e', bg: 'rgba(26,127,94,0.1)'   },
                { label: 'Total Patients',  value: totalPatients, color: '#2b6cb0', bg: 'rgba(43,108,176,0.1)'  },
                { label: 'Total Users',     value: totalUsers,    color: '#9f7aea', bg: 'rgba(159,122,234,0.1)' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Add clinic form */}
            {showAddClinic && (
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="text-white font-semibold text-[15px]">Add New Clinic</div>
                  <button onClick={() => setShowAddClinic(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Clinic Name',    key: 'name',       type: 'text'   },
                    { label: 'City',           key: 'city',       type: 'text'   },
                    { label: 'Doctor Name',    key: 'doctorName', type: 'text'   },
                    { label: 'Login Email',    key: 'email',      type: 'email'  },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                      <input
                        type={f.type}
                        value={(clinicForm as any)[f.key]}
                        onChange={e => setClinicForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Speciality</label>
                    <select
                      value={clinicForm.speciality}
                      onChange={e => setClinicForm(prev => ({ ...prev, speciality: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4' }}
                    >
                      {SPECIALITIES.map(s => <option key={s} value={s} style={{ background: '#0a1628' }}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={clinicForm.password}
                        onChange={e => setClinicForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none pr-10"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4' }}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Subscription Expiry</label>
                    <input
                      type="date"
                      value={clinicForm.subscription_expiry}
                      onChange={e => setClinicForm(prev => ({ ...prev, subscription_expiry: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4', colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={addClinic}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                    <Save size={13} /> Create Clinic
                  </button>
                  <button onClick={() => setShowAddClinic(false)}
                    className="px-4 py-2 rounded-xl text-[12px] text-white/50 hover:text-white/80 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Clinics table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-white font-medium text-[14px]">All Clinics</div>
                <button onClick={fetchClinics} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw size={13} /></button>
              </div>
              {loading ? (
                <div className="py-12 text-center text-white/30 text-[13px]">Loading...</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Clinic', 'Speciality', 'City', 'Patients', 'Appointments', 'Subscription', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-widest font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clinics.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-white/30 text-[13px]">No clinics yet</td></tr>
                    )}
                    {clinics.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium text-[13px]">{c.name}</div>
                          <div className="text-white/30 text-[10px] font-mono">{c.id.slice(0, 8)}…</div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-white/60">{c.speciality}</td>
                        <td className="px-4 py-3 text-[12px] text-white/60">{c.city || '—'}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-white/80">{c.patient_count ?? '—'}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-white/80">{c.appointment_count ?? '—'}</td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            defaultValue={c.subscription_expiry || ''}
                            onBlur={e => { if (e.target.value !== (c.subscription_expiry || '')) updateSubscription(c.id, e.target.value); }}
                            className="rounded-lg px-2 py-1 text-[11px] outline-none w-32"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4', colorScheme: 'dark' }}
                          />
                        </td>
                        <td className="px-4 py-3"><StatusPill active={c.is_active} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setSelectedClinic(c); setTab('users'); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                              title="Manage Users"
                            >
                              <Users size={12} className="text-white/50" />
                            </button>
                            <button
                              onClick={() => { setSelectedClinic(c); setTab('features'); }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                              title="Feature Toggles"
                            >
                              <ToggleLeft size={12} className="text-white/50" />
                            </button>
                            <button
                              onClick={() => toggleClinic(c)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: c.is_active ? 'rgba(197,48,48,0.1)' : 'rgba(26,127,94,0.1)' }}
                              title={c.is_active ? 'Disable' : 'Enable'}
                            >
                              {c.is_active
                                ? <XCircle size={12} className="text-red-400" />
                                : <CheckCircle size={12} className="text-green-400" />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══ USERS tab ════════════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-white text-[20px] font-semibold">Users</h1>
                <p className="text-white/40 text-[12px] mt-0.5">
                  {selectedClinic ? `Showing users for: ${selectedClinic.name}` : 'All users across all clinics'}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedClinic && (
                  <button
                    onClick={() => setSelectedClinic(null)}
                    className="px-3 py-2 rounded-xl text-[12px] text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X size={12} /> Clear filter
                  </button>
                )}
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}
                >
                  <Plus size={13} /> Add User
                </button>
              </div>
            </div>

            {/* Clinic filter chips */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedClinic(null)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={!selectedClinic
                  ? { background: '#c9a84c', color: '#0a1628' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >All</button>
              {clinics.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClinic(c)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={selectedClinic?.id === c.id
                    ? { background: '#c9a84c', color: '#0a1628' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >{c.name}</button>
              ))}
            </div>

            {/* Add user form */}
            {showAddUser && (
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.3)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white font-semibold text-[15px]">
                    Add User {selectedClinic ? `— ${selectedClinic.name}` : ''}
                  </div>
                  <button onClick={() => setShowAddUser(false)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
                </div>
                {!selectedClinic && (
                  <div className="mb-4 p-3 rounded-xl text-[12px]" style={{ background: 'rgba(197,48,48,0.1)', color: '#fc8181', border: '1px solid rgba(197,48,48,0.2)' }}>
                    Please select a clinic from the filter above before adding a user.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', key: 'name',     type: 'text'  },
                    { label: 'Email',     key: 'email',    type: 'email' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">{f.label}</label>
                      <input
                        type={f.type}
                        value={(userForm as any)[f.key]}
                        onChange={e => setUserForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Password</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Role</label>
                    <select
                      value={userForm.user_role}
                      onChange={e => setUserForm(prev => ({ ...prev, user_role: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#faf8f4' }}
                    >
                      {ROLES.map(r => <option key={r} value={r} style={{ background: '#0a1628', textTransform: 'capitalize' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={addUser}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                    <Save size={13} /> Create User
                  </button>
                  <button onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 rounded-xl text-[12px] text-white/50"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Users table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-white font-medium text-[14px]">{displayedUsers.length} users</div>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Name', 'Email', 'Role', 'Clinic', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-widest font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30 text-[13px]">No users</td></tr>
                  )}
                  {displayedUsers.map(u => {
                    const clinic = clinics.find(c => c.id === u.clinic_id);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-navy font-bold text-[10px] flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                              {u.name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="text-white text-[13px] font-medium">{u.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-white/60">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium capitalize"
                            style={{
                              background: u.user_role === 'admin' ? 'rgba(201,168,76,0.15)' : u.user_role === 'doctor' ? 'rgba(26,127,94,0.15)' : 'rgba(43,108,176,0.15)',
                              color: u.user_role === 'admin' ? '#c9a84c' : u.user_role === 'doctor' ? '#1a7f5e' : '#2b6cb0',
                            }}>
                            {u.user_role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-white/50">{clinic?.name || '—'}</td>
                        <td className="px-4 py-3"><StatusPill active={u.is_active} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => toggleUser(u)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                              title={u.is_active ? 'Deactivate' : 'Activate'}>
                              <UserCheck size={12} className="text-white/50" />
                            </button>
                            <button onClick={() => resetPassword(u.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                              title="Reset Password">
                              <Shield size={12} className="text-white/50" />
                            </button>
                            <button onClick={() => deleteUser(u.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-900/30 transition-colors"
                              title="Delete">
                              <X size={12} className="text-red-400/60" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ FEATURES tab ═════════════════════════════════════════════════════ */}
        {tab === 'features' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-white text-[20px] font-semibold">Feature Toggles</h1>
              <p className="text-white/40 text-[12px] mt-0.5">Control which modules each clinic can access</p>
            </div>

            {/* Clinic selector */}
            <div className="flex gap-2 flex-wrap">
              {clinics.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClinic(selectedClinic?.id === c.id ? null : c)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1.5"
                  style={selectedClinic?.id === c.id
                    ? { background: '#c9a84c', color: '#0a1628' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {c.name}
                  <ChevronRight size={11} />
                </button>
              ))}
            </div>

            {!selectedClinic && (
              <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <ToggleLeft size={32} className="mx-auto mb-3 text-white/20" />
                <div className="text-white/40 text-[13px]">Select a clinic above to manage its feature modules</div>
              </div>
            )}

            {selectedClinic && (
              <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-navy font-bold text-[13px]"
                    style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                    {selectedClinic.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-[15px]">{selectedClinic.name}</div>
                    <div className="text-white/40 text-[12px]">{selectedClinic.speciality} · {selectedClinic.city}</div>
                  </div>
                  <StatusPill active={selectedClinic.is_active} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {MODULES.map(mod => {
                    const enabled = selectedClinic.modules?.[mod.key] ?? false;
                    return (
                      <button
                        key={mod.key}
                        onClick={() => toggleModule(selectedClinic, mod.key)}
                        className="flex items-center justify-between p-4 rounded-xl transition-all text-left"
                        style={{
                          background: enabled ? 'rgba(26,127,94,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${enabled ? 'rgba(26,127,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: enabled ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                            {mod.label}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: enabled ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.25)' }}>
                            {enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                        <div
                          className="w-10 h-6 rounded-full relative transition-all flex-shrink-0"
                          style={{ background: enabled ? '#1a7f5e' : 'rgba(255,255,255,0.1)' }}
                        >
                          <div
                            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                            style={{ left: enabled ? '22px' : '4px' }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ANALYTICS tab ════════════════════════════════════════════════════ */}
        {tab === 'analytics' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-white text-[20px] font-semibold">Analytics</h1>
              <p className="text-white/40 text-[12px] mt-0.5">Usage overview across all clinics</p>
            </div>

            {/* Per-clinic cards */}
            <div className="grid grid-cols-1 gap-4">
              {clinics.map(c => {
                const clinicUsers = users.filter(u => u.clinic_id === c.id);
                const activeUsers = clinicUsers.filter(u => u.is_active).length;
                const enabledModules = MODULES.filter(m => c.modules?.[m.key]).length;
                const expired = c.subscription_expiry && new Date(c.subscription_expiry) < new Date();
                return (
                  <div key={c.id} className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-navy font-bold text-[13px]"
                          style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-[14px]">{c.name}</div>
                          <div className="text-white/40 text-[11px]">{c.speciality} · {c.city || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expired && (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(197,48,48,0.15)', color: '#fc8181' }}>
                            Expired
                          </span>
                        )}
                        <StatusPill active={c.is_active} />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Patients',        value: c.patient_count ?? 0,     icon: Users,        color: '#2b6cb0' },
                        { label: 'Appointments',    value: c.appointment_count ?? 0, icon: Calendar,     color: '#c9a84c' },
                        { label: 'Active Users',    value: activeUsers,              icon: UserCheck,    color: '#1a7f5e' },
                        { label: 'Modules On',      value: `${enabledModules}/${MODULES.length}`, icon: ToggleLeft, color: '#9f7aea' },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl p-3"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{s.label}</div>
                          <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {c.subscription_expiry && (
                      <div className="mt-3 text-[11px] text-white/30 flex items-center gap-1.5">
                        <Calendar size={11} />
                        Subscription expires: <span className={expired ? 'text-red-400' : 'text-white/50'}>{c.subscription_expiry}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {clinics.length === 0 && (
                <div className="rounded-xl p-10 text-center text-white/30 text-[13px]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  No clinics to display
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
