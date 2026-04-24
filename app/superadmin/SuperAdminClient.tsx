'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, ToggleLeft, BarChart3, Plus, X, Save,
  LogOut, CheckCircle, XCircle, RefreshCw, Eye, EyeOff,
  Calendar, UserCheck, Shield, ChevronRight, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Org = {
  id: string; name: string; owner_name: string;
  email: string; phone: string; status: string; created_at: string;
};

type Clinic = {
  id: string; org_id: string; name: string; speciality: string;
  city: string; is_active: boolean; status: string;
  subscription_expiry: string | null; modules: Record<string, boolean>;
  created_at: string; patient_count?: number; appointment_count?: number;
};

type ClinicUser = {
  id: string; name: string; email: string; user_role: string;
  is_active: boolean; clinic_id: string; org_id: string; created_at: string;
};

const MODULES = [
  { key: 'vaccines',    label: 'Vaccination Schedule' },
  { key: 'who_charts',  label: 'WHO Growth Charts'    },
  { key: 'telehealth',  label: 'Telehealth'           },
  { key: 'ai_scribe',   label: 'AI Scribe'            },
  { key: 'lab_results', label: 'Lab Results'          },
  { key: 'procedures',  label: 'Procedures'           },
  { key: 'feedback',    label: 'Feedback System'      },
];

const SPECIALITIES = ['Pediatrics','General Practice','Orthopedics','Gynecology','Cardiology','Dermatology','ENT','Neurology','Other'];
const ROLES = ['org_owner','doctor_admin','admin','doctor','receptionist'];

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={active ? { background:'rgba(26,127,94,0.2)', color:'#4ade80' } : { background:'rgba(197,48,48,0.2)', color:'#fc8181' }}>
      {active ? '● Active' : '○ Disabled'}
    </span>
  );
}

function Input({ label, value, onChange, type='text', placeholder='' }: any) {
  return (
    <div>
      <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
        style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}/>
    </div>
  );
}

export default function SuperAdminClient({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'orgs'|'clinics'|'users'|'features'|'analytics'>('orgs');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Org|null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic|null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  // Forms
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ name:'', owner_name:'', email:'', phone:'', city:'', province:'', country:'Pakistan' });
  const [showAddOwner, setShowAddOwner] = useState<string|null>(null);
  const [ownerForm, setOwnerForm] = useState({ name:'', email:'', password:'' });
  
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [clinicForm, setClinicForm] = useState({
    name:'', speciality:'Pediatrics', city:'', org_id:'', subscription_expiry:'',
  });

  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name:'', email:'', password:'', user_role:'doctor', clinic_id:'' });
  const [showPw, setShowPw] = useState(false);

  // Fetch all data
  const fetchAll = async () => {
    setLoading(true);
    const [{ data: orgData }, { data: clinicData }, { data: userData }] = await Promise.all([
      supabase.from('organisations').select('*').order('created_at', { ascending: false }),
      supabase.from('clinics').select('*').order('created_at', { ascending: false }),
      supabase.from('logins').select('*').order('created_at', { ascending: false }),
    ]);
    setOrgs(orgData || []);
    // Enrich clinics with counts
    const enriched = await Promise.all((clinicData || []).map(async (c: any) => {
      const [{ count: pc }, { count: ac }] = await Promise.all([
        supabase.from('patients').select('*', { count:'exact', head:true }).eq('clinic_id', c.id),
        supabase.from('appointments').select('*', { count:'exact', head:true }).eq('clinic_id', c.id),
      ]);
      return { ...c, patient_count: pc||0, appointment_count: ac||0, is_active: c.is_active ?? c.status==='active' };
    }));
    setClinics(enriched as Clinic[]);
    setUsers((userData||[]).filter((u:any) => !u.is_super_admin) as ClinicUser[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Add Organisation
  const addOrg = async () => {
    if (!orgForm.name) { toast.error('Organisation name required'); return; }
    const id = orgForm.name.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,20) + '_' + Date.now().toString().slice(-4);
    const { error } = await supabase.from('organisations').insert([{ id, name:orgForm.name, owner_name:orgForm.owner_name, email:orgForm.email, phone:orgForm.phone, city:orgForm.city, province:orgForm.province, country:orgForm.country||'Pakistan', status:'active' }]);
    if (error) toast.error('Failed: ' + error.message);
    else { toast.success('Organisation created!'); setShowAddOrg(false); setOrgForm({name:'',owner_name:'',email:'',phone:'',city:'',province:'',country:'Pakistan'}); fetchAll(); }
  };

  // Add Org Owner
  const addOwner = async (orgId: string, orgName: string) => {
    if (!ownerForm.name || !ownerForm.email || !ownerForm.password) {
      toast.error('Name, email and password required'); return;
    }
    const org = orgs.find(o => o.id === orgId);
    const { error } = await supabase.from('logins').insert([{
      name: ownerForm.name,
      email: ownerForm.email.toLowerCase(),
      password_hash: ownerForm.password,
      user_role: 'org_owner',
      is_active: true,
      is_super_admin: false,
      clinic_id: null,
      org_id: orgId,
      initials: ownerForm.name.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2),
    }]);
    if (error) toast.error('Failed: ' + error.message);
    else {
      toast.success(`Owner added to ${orgName}`);
      setShowAddOwner(null);
      setOwnerForm({ name:'', email:'', password:'' });
      fetchAll();
    }
  };

  // Add Clinic
  const addClinic = async () => {
    if (!clinicForm.name || !clinicForm.org_id) {
      toast.error('Clinic name and organisation are required'); return;
    }
    try {
      const clinicId = clinicForm.name.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,20) + '_' + Date.now().toString().slice(-4);
      const { error: cErr } = await supabase.from('clinics').insert([{
        id: clinicId, org_id: clinicForm.org_id, name: clinicForm.name,
        speciality: clinicForm.speciality, city: clinicForm.city,
        status:'active', is_active:true,
        subscription_expiry: clinicForm.subscription_expiry || null,
        modules: { vaccines:true, who_charts:true, telehealth:true, ai_scribe:true, lab_results:true, procedures:true, feedback:true },
      }]);
      if (cErr) throw cErr;

      toast.success(`Clinic "${clinicForm.name}" created!`);
      setShowAddClinic(false);
      setClinicForm({ name:'',speciality:'Pediatrics',city:'',org_id:'',subscription_expiry:'' });
      fetchAll();
    } catch (err: any) { toast.error('Failed: ' + err.message); }
  };

  // Add User
  const addUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.clinic_id) {
      toast.error('All fields required'); return;
    }
    const clinic = clinics.find(c => c.id === userForm.clinic_id);
    const { error } = await supabase.from('logins').insert([{
      name: userForm.name, email: userForm.email.toLowerCase(),
      password_hash: userForm.password, user_role: userForm.user_role,
      is_active:true, is_super_admin:false,
      clinic_id: userForm.clinic_id, org_id: clinic?.org_id || null,
      initials: userForm.name.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2),
    }]);
    if (error) toast.error('Failed: ' + error.message);
    else { toast.success('User created'); setShowAddUser(false); setUserForm({name:'',email:'',password:'',user_role:'doctor',clinic_id:''}); fetchAll(); }
  };

  const toggleClinic = async (c: Clinic) => {
    const newActive = !c.is_active;
    await supabase.from('clinics').update({ is_active: newActive, status: newActive?'active':'inactive' }).eq('id', c.id);
    toast.success(`${c.name} ${newActive?'enabled':'disabled'}`);
    fetchAll();
  };

  const toggleModule = async (clinic: Clinic, key: string) => {
    const updated = { ...clinic.modules, [key]: !clinic.modules[key] };
    await supabase.from('clinics').update({ modules: updated }).eq('id', clinic.id);
    setClinics(prev => prev.map(c => c.id===clinic.id ? {...c,modules:updated} : c));
    if (selectedClinic?.id===clinic.id) setSelectedClinic(prev => prev ? {...prev,modules:updated} : prev);
  };

  const toggleUser = async (u: ClinicUser) => {
    await supabase.from('logins').update({ is_active: !u.is_active }).eq('id', u.id);
    toast.success(`${u.name} ${u.is_active?'deactivated':'activated'}`);
    fetchAll();
  };

  const resetPassword = async (userId: string) => {
    const np = prompt('Enter new password:');
    if (!np) return;
    await supabase.from('logins').update({ password_hash: np }).eq('id', userId);
    toast.success('Password reset');
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    await supabase.from('logins').delete().eq('id', userId);
    toast.success('Deleted'); fetchAll();
  };

  const updateSubscription = async (clinicId: string, expiry: string) => {
    await supabase.from('clinics').update({ subscription_expiry: expiry||null }).eq('id', clinicId);
    toast.success('Updated'); fetchAll();
  };

  const orgClinics = (orgId: string) => clinics.filter(c => c.org_id === orgId);
  const clinicUsers = (clinicId: string) => users.filter(u => u.clinic_id === clinicId);

  const NAV = [
    { id:'orgs',      label:'Organisations', icon: Building2  },
    { id:'clinics',   label:'All Clinics',   icon: Building2  },
    { id:'users',     label:'Users',         icon: Users      },
    { id:'features',  label:'Features',      icon: ToggleLeft },
    { id:'analytics', label:'Analytics',     icon: BarChart3  },
  ];

  return (
    <div className="min-h-screen flex" style={{ background:'#0a1628', fontFamily:'DM Sans, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-5 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-navy font-bold text-sm"
              style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>M+</div>
            <div>
              <div className="text-white font-semibold text-[14px]">MediPlex</div>
              <div className="text-[10px] uppercase tracking-widest font-light" style={{ color:'#c9a84c' }}>Super Admin</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 pt-4 space-y-0.5">
          <div className="text-[10px] text-white/25 tracking-widest uppercase px-2 mb-2 font-medium">Control Panel</div>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as any)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] transition-all text-left"
              style={tab===id ? { background:'rgba(255,255,255,0.1)', color:'#c9a84c' } : { color:'rgba(255,255,255,0.5)' }}>
              <Icon size={15}/>{label}
              {tab===id && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background:'#c9a84c' }}/>}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t pt-3" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 px-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-navy font-bold text-[10px]"
              style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>SA</div>
            <div className="min-w-0">
              <div className="text-white text-[11px] font-medium truncate">{adminEmail}</div>
              <div className="text-[10px]" style={{ color:'#c9a84c' }}>Super Admin</div>
            </div>
          </div>
          <button onClick={() => { signOut({ redirect:false }); router.push('/login'); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-red-400 w-full">
            <LogOut size={13}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── ORGANISATIONS ── */}
        {tab==='orgs' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white text-[20px] font-semibold">Organisations</h1>
                <p className="text-white/40 text-[12px] mt-0.5">{orgs.length} organisations · {clinics.length} total clinics</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddClinic(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' }}>
                  <Plus size={13}/> Add Clinic
                </button>
                <button onClick={() => setShowAddOrg(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                  <Plus size={13}/> Add Organisation
                </button>
              </div>
            </div>

            {/* Add Org Form */}
            {showAddOrg && (
              <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(201,168,76,0.3)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white font-semibold">New Organisation</div>
                  <button onClick={()=>setShowAddOrg(false)}><X size={15} className="text-white/30"/></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Organisation Name" value={orgForm.name} onChange={(v:string)=>setOrgForm(p=>({...p,name:v}))} placeholder="e.g. RMI Medical Group"/>
                  <Input label="Owner Name" value={orgForm.owner_name} onChange={(v:string)=>setOrgForm(p=>({...p,owner_name:v}))} placeholder="Dr. Ahmed"/>
                  <Input label="Email" value={orgForm.email} onChange={(v:string)=>setOrgForm(p=>({...p,email:v}))} type="email" placeholder="admin@clinic.com"/>
                  <Input label="Phone" value={orgForm.phone} onChange={(v:string)=>setOrgForm(p=>({...p,phone:v}))} placeholder="+92..."/>
                  <Input label="City" value={orgForm.city} onChange={(v:string)=>setOrgForm(p=>({...p,city:v}))} placeholder="e.g. Peshawar"/>
                  <Input label="Province" value={orgForm.province} onChange={(v:string)=>setOrgForm(p=>({...p,province:v}))} placeholder="e.g. KPK"/>
                  <Input label="Country" value={orgForm.country} onChange={(v:string)=>setOrgForm(p=>({...p,country:v}))} placeholder="Pakistan"/>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={addOrg} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                    <Save size={13}/> Create Organisation
                  </button>
                  <button onClick={()=>setShowAddOrg(false)} className="px-4 py-2 rounded-xl text-[12px] text-white/50"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Add Clinic Form */}
            {showAddClinic && (
              <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(201,168,76,0.3)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white font-semibold">New Clinic</div>
                  <button onClick={()=>setShowAddClinic(false)}><X size={15} className="text-white/30"/></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Organisation *</label>
                    <select value={clinicForm.org_id} onChange={e=>setClinicForm(p=>({...p,org_id:e.target.value}))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}>
                      <option value="" style={{ background:'#0a1628' }}>Select organisation...</option>
                      {orgs.map(o=><option key={o.id} value={o.id} style={{ background:'#0a1628' }}>{o.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Speciality</label>
                    <select value={clinicForm.speciality} onChange={e=>setClinicForm(p=>({...p,speciality:e.target.value}))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}>
                      {SPECIALITIES.map(s=><option key={s} value={s} style={{ background:'#0a1628' }}>{s}</option>)}
                    </select>
                  </div>
                  <Input label="Clinic Name *" value={clinicForm.name} onChange={(v:string)=>setClinicForm(p=>({...p,name:v}))} placeholder="e.g. RMI Pediatrics"/>
                  <Input label="City" value={clinicForm.city} onChange={(v:string)=>setClinicForm(p=>({...p,city:v}))} placeholder="e.g. Peshawar"/>
                
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Subscription Expiry</label>
                    <input type="date" value={clinicForm.subscription_expiry} onChange={e=>setClinicForm(p=>({...p,subscription_expiry:e.target.value}))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4', colorScheme:'dark' }}/>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={addClinic} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                    <Save size={13}/> Create Clinic
                  </button>
                  <button onClick={()=>setShowAddClinic(false)} className="px-4 py-2 rounded-xl text-[12px] text-white/50"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Org tree */}
            {orgs.map(org => {
              const oClinics = orgClinics(org.id);
              const expanded = expandedOrgs.has(org.id);
              return (
                <div key={org.id} className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setExpandedOrgs(prev => { const n=new Set(prev); expanded?n.delete(org.id):n.add(org.id); return n; })}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[13px] text-navy"
                        style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                        {org.name.slice(0,2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="text-white font-semibold text-[14px]">{org.name}</div>
                        <div className="text-white/40 text-[11px]">{org.owner_name} · {org.email} · {org.city}{org.province?', '+org.province:''} · {oClinics.length} clinic{oClinics.length!==1?'s':''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>setShowAddOwner(showAddOwner===org.id?null:org.id)}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1"
                        style={{ background:'rgba(201,168,76,0.15)', color:'#c9a84c', border:'1px solid rgba(201,168,76,0.3)' }}>
                        <Plus size={10}/> Add Owner
                      </button>
                      <StatusPill active={org.status==='active'}/>
                      {expanded ? <ChevronDown size={14} className="text-white/40"/> : <ChevronRight size={14} className="text-white/40"/>}
                    </div>
                  </button>

                  {showAddOwner===org.id && (
                    <div className="px-5 py-4 border-t" style={{ borderColor:'rgba(201,168,76,0.2)', background:'rgba(201,168,76,0.05)' }}>
                      <div className="text-white/60 text-[12px] font-medium mb-3">Add Organisation Owner — {org.name}</div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <Input label="Full Name" value={ownerForm.name} onChange={(v:string)=>setOwnerForm(p=>({...p,name:v}))} placeholder="Dr. Ahmed"/>
                        <Input label="Email" value={ownerForm.email} onChange={(v:string)=>setOwnerForm(p=>({...p,email:v}))} type="email" placeholder="owner@clinic.com"/>
                        <Input label="Password" value={ownerForm.password} onChange={(v:string)=>setOwnerForm(p=>({...p,password:v}))} type="password" placeholder="min 6 chars"/>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>addOwner(org.id, org.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                          <Save size={11}/> Create Owner Login
                        </button>
                        <button onClick={()=>setShowAddOwner(null)} className="px-3 py-1.5 rounded-lg text-[11px] text-white/40"
                          style={{ background:'rgba(255,255,255,0.05)' }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div className="border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                      {oClinics.length===0 && (
                        <div className="px-5 py-6 text-center text-white/30 text-[12px]">No clinics yet — click "Add Clinic" above</div>
                      )}
                      {oClinics.map(clinic => (
                        <div key={clinic.id} className="px-5 py-4 border-b hover:bg-white/[0.02] transition-colors"
                          style={{ borderColor:'rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ background: clinic.is_active?'#4ade80':'#fc8181' }}/>
                              <div>
                                <div className="text-white text-[13px] font-medium">{clinic.name}</div>
                                <div className="text-white/40 text-[11px]">{clinic.speciality} · {clinic.city||'—'} · {clinic.patient_count} patients · {clinic.appointment_count} appointments</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {clinic.subscription_expiry && (
                                <span className="text-[10px] text-white/30">Exp: {clinic.subscription_expiry}</span>
                              )}
                              <button onClick={()=>{setSelectedClinic(clinic);setTab('features');}}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Features">
                                <ToggleLeft size={12} className="text-white/50"/>
                              </button>
                              <button onClick={()=>{setSelectedClinic(clinic);setTab('users');}}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Users">
                                <Users size={12} className="text-white/50"/>
                              </button>
                              <button onClick={()=>toggleClinic(clinic)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: clinic.is_active?'rgba(197,48,48,0.1)':'rgba(26,127,94,0.1)' }}>
                                {clinic.is_active ? <XCircle size={12} className="text-red-400"/> : <CheckCircle size={12} className="text-green-400"/>}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── ALL CLINICS ── */}
        {tab==='clinics' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="text-white text-[20px] font-semibold">All Clinics ({clinics.length})</h1>
              <button onClick={()=>{setShowAddClinic(true);setTab('orgs');}} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                <Plus size={13}/> Add Clinic
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    {['Clinic','Organisation','Speciality','Patients','Appointments','Subscription','Status','Actions'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clinics.map(c => {
                    const org = orgs.find(o=>o.id===c.org_id);
                    const expired = c.subscription_expiry && new Date(c.subscription_expiry) < new Date();
                    return (
                      <tr key={c.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium text-[13px]">{c.name}</div>
                          <div className="text-white/30 text-[10px] font-mono">{c.id}</div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-white/50">{org?.name||'—'}</td>
                        <td className="px-4 py-3 text-[12px] text-white/60">{c.speciality}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-white/80">{c.patient_count}</td>
                        <td className="px-4 py-3 text-[13px] font-medium text-white/80">{c.appointment_count}</td>
                        <td className="px-4 py-3">
                          <input type="date" defaultValue={c.subscription_expiry||''}
                            onBlur={e=>{if(e.target.value!==(c.subscription_expiry||''))updateSubscription(c.id,e.target.value);}}
                            className="rounded-lg px-2 py-1 text-[11px] outline-none w-32"
                            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color: expired?'#fc8181':'#faf8f4', colorScheme:'dark' }}/>
                        </td>
                        <td className="px-4 py-3"><StatusPill active={c.is_active}/></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={()=>{setSelectedClinic(c);setTab('users');}} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Users">
                              <Users size={12} className="text-white/50"/>
                            </button>
                            <button onClick={()=>{setSelectedClinic(c);setTab('features');}} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Features">
                              <ToggleLeft size={12} className="text-white/50"/>
                            </button>
                            <button onClick={()=>toggleClinic(c)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: c.is_active?'rgba(197,48,48,0.1)':'rgba(26,127,94,0.1)' }}>
                              {c.is_active ? <XCircle size={12} className="text-red-400"/> : <CheckCircle size={12} className="text-green-400"/>}
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

        {/* ── USERS ── */}
        {tab==='users' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white text-[20px] font-semibold">Users</h1>
                <p className="text-white/40 text-[12px]">{selectedClinic?`Filtered: ${selectedClinic.name}`:`All ${users.length} users`}</p>
              </div>
              <div className="flex gap-2">
                {selectedClinic && <button onClick={()=>setSelectedClinic(null)} className="px-3 py-2 rounded-xl text-[12px] text-white/50 flex items-center gap-1.5"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}><X size={12}/> Clear filter</button>}
                <button onClick={()=>setShowAddUser(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}><Plus size={13}/> Add User</button>
              </div>
            </div>

            {/* Clinic filter */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={()=>setSelectedClinic(null)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={!selectedClinic?{background:'#c9a84c',color:'#0a1628'}:{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)'}}>
                All
              </button>
              {clinics.map(c=>(
                <button key={c.id} onClick={()=>setSelectedClinic(c)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
                  style={selectedClinic?.id===c.id?{background:'#c9a84c',color:'#0a1628'}:{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  {c.name}
                </button>
              ))}
            </div>

            {showAddUser && (
              <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(201,168,76,0.3)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white font-semibold">Add User</div>
                  <button onClick={()=>setShowAddUser(false)}><X size={15} className="text-white/30"/></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Clinic *</label>
                    <select value={userForm.clinic_id} onChange={e=>setUserForm(p=>({...p,clinic_id:e.target.value}))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}>
                      <option value="" style={{ background:'#0a1628' }}>Select clinic...</option>
                      {clinics.map(c=><option key={c.id} value={c.id} style={{ background:'#0a1628' }}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Role</label>
                    <select value={userForm.user_role} onChange={e=>setUserForm(p=>({...p,user_role:e.target.value}))}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                      style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}>
                      {ROLES.map(r=><option key={r} value={r} style={{ background:'#0a1628', textTransform:'capitalize' }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <Input label="Full Name *" value={userForm.name} onChange={(v:string)=>setUserForm(p=>({...p,name:v}))} placeholder="Dr. Ahmed Khan"/>
                  <Input label="Email *" value={userForm.email} onChange={(v:string)=>setUserForm(p=>({...p,email:v}))} type="email" placeholder="dr@clinic.com"/>
                  <Input label="Password *" value={userForm.password} onChange={(v:string)=>setUserForm(p=>({...p,password:v}))} type="password" placeholder="min 6 chars"/>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={addUser} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}><Save size={13}/> Create User</button>
                  <button onClick={()=>setShowAddUser(false)} className="px-4 py-2 rounded-xl text-[12px] text-white/50"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
                </div>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    {['Name','Email','Role','Clinic','Status','Actions'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-white/30 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedClinic ? users.filter(u=>u.clinic_id===selectedClinic.id) : users).map(u=>{
                    const clinic = clinics.find(c=>c.id===u.clinic_id);
                    return (
                      <tr key={u.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-navy font-bold text-[10px]"
                              style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                              {u.name?.slice(0,2).toUpperCase()||'U'}
                            </div>
                            <span className="text-white text-[13px] font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-white/60">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium capitalize"
                            style={{ background: u.user_role==='admin'?'rgba(201,168,76,0.15)':u.user_role==='doctor'?'rgba(26,127,94,0.15)':'rgba(43,108,176,0.15)',
                              color: u.user_role==='admin'?'#c9a84c':u.user_role==='doctor'?'#4ade80':'#63b3ed' }}>
                            {u.user_role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-white/50">{clinic?.name||'—'}</td>
                        <td className="px-4 py-3"><StatusPill active={u.is_active}/></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={()=>toggleUser(u)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title={u.is_active?'Deactivate':'Activate'}>
                              <UserCheck size={12} className="text-white/50"/>
                            </button>
                            <button onClick={()=>resetPassword(u.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Reset Password">
                              <Shield size={12} className="text-white/50"/>
                            </button>
                            <button onClick={()=>deleteUser(u.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-900/30">
                              <X size={12} className="text-red-400/60"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length===0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-white/30 text-[13px]">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FEATURES ── */}
        {tab==='features' && (
          <div className="space-y-5">
            <h1 className="text-white text-[20px] font-semibold">Feature Toggles</h1>
            <div className="flex gap-2 flex-wrap">
              {clinics.map(c=>(
                <button key={c.id} onClick={()=>setSelectedClinic(selectedClinic?.id===c.id?null:c)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5"
                  style={selectedClinic?.id===c.id?{background:'#c9a84c',color:'#0a1628'}:{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.08)'}}>
                  {c.name}<ChevronRight size={11}/>
                </button>
              ))}
            </div>
            {!selectedClinic && <div className="rounded-xl p-10 text-center text-white/30 text-[13px]"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              Select a clinic to manage features
            </div>}
            {selectedClinic && (
              <div className="rounded-2xl p-6" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-navy font-bold text-[13px]"
                    style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                    {selectedClinic.name.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{selectedClinic.name}</div>
                    <div className="text-white/40 text-[12px]">{selectedClinic.speciality}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MODULES.map(mod=>{
                    const enabled = selectedClinic.modules?.[mod.key]??false;
                    return (
                      <button key={mod.key} onClick={()=>toggleModule(selectedClinic,mod.key)}
                        className="flex items-center justify-between p-4 rounded-xl transition-all text-left"
                        style={{ background:enabled?'rgba(26,127,94,0.1)':'rgba(255,255,255,0.03)', border:`1px solid ${enabled?'rgba(26,127,94,0.3)':'rgba(255,255,255,0.08)'}` }}>
                        <div>
                          <div className="text-[13px] font-medium" style={{ color:enabled?'#4ade80':'rgba(255,255,255,0.5)' }}>{mod.label}</div>
                          <div className="text-[11px] mt-0.5" style={{ color:enabled?'rgba(74,222,128,0.6)':'rgba(255,255,255,0.25)' }}>{enabled?'Enabled':'Disabled'}</div>
                        </div>
                        <div className="w-10 h-6 rounded-full relative transition-all" style={{ background:enabled?'#1a7f5e':'rgba(255,255,255,0.1)' }}>
                          <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left:enabled?'22px':'4px' }}/>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab==='analytics' && (
          <div className="space-y-5">
            <h1 className="text-white text-[20px] font-semibold">Analytics</h1>
            {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
              {[
                { label:'Organisations', value:orgs.length, color:'#c9a84c' },
                { label:'Total Clinics', value:clinics.length, color:'#1a7f5e' },
                { label:'Total Patients', value:clinics.reduce((s,c)=>s+(c.patient_count||0),0), color:'#2b6cb0' },
                { label:'Total Users', value:users.length, color:'#9f7aea' },
              ].map(s=>(
                <div key={s.label} className="rounded-xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className="text-[28px] font-bold" style={{ color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* By Speciality */}
            <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white font-semibold text-[14px] mb-4">Clinics by Speciality</div>
              <div className="space-y-2">
                {Object.entries(clinics.reduce((m:any,c)=>{m[c.speciality]=(m[c.speciality]||0)+1;return m;},{}))
                  .sort((a:any,b:any)=>b[1]-a[1]).map(([spec,count]:any)=>(
                  <div key={spec} className="flex items-center gap-3">
                    <div className="text-[12px] text-white/60 w-36 flex-shrink-0">{spec}</div>
                    <div className="flex-1 h-2 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width:`${(count/clinics.length)*100}%`, background:'#c9a84c' }}/>
                    </div>
                    <div className="text-[12px] font-medium text-white/80 w-8 text-right">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* By City */}
            <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white font-semibold text-[14px] mb-4">Clinics by Location</div>
              <div className="space-y-2">
                {Object.entries(clinics.reduce((m:any,c)=>{const loc=c.city||'Unknown';m[loc]=(m[loc]||0)+1;return m;},{}))
                  .sort((a:any,b:any)=>b[1]-a[1]).map(([city,count]:any)=>(
                  <div key={city} className="flex items-center gap-3">
                    <div className="text-[12px] text-white/60 w-36 flex-shrink-0">{city}</div>
                    <div className="flex-1 h-2 rounded-full" style={{ background:'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width:`${(count/clinics.length)*100}%`, background:'#2b6cb0' }}/>
                    </div>
                    <div className="text-[12px] font-medium text-white/80 w-8 text-right">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per clinic */}
            {clinics.map(c=>{
              const org = orgs.find(o=>o.id===c.org_id);
              const cUsers = users.filter(u=>u.clinic_id===c.id);
              const expired = c.subscription_expiry && new Date(c.subscription_expiry) < new Date();
              return (
                <div key={c.id} className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-navy font-bold text-[13px]"
                        style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                        {c.name.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-[14px]">{c.name}</div>
                        <div className="text-white/40 text-[11px]">{org?.name} · {c.speciality} · {c.city||'—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {expired && <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background:'rgba(197,48,48,0.15)', color:'#fc8181' }}>Expired</span>}
                      <StatusPill active={c.is_active}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label:'Patients', value:c.patient_count||0, color:'#2b6cb0' },
                      { label:'Appointments', value:c.appointment_count||0, color:'#c9a84c' },
                      { label:'Users', value:cUsers.filter(u=>u.is_active).length, color:'#1a7f5e' },
                      { label:'Modules', value:`${MODULES.filter(m=>c.modules?.[m.key]).length}/${MODULES.length}`, color:'#9f7aea' },
                    ].map(s=>(
                      <div key={s.label} className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}>
                        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{s.label}</div>
                        <div className="text-[20px] font-bold" style={{ color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
