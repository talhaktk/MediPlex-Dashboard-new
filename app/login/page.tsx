'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, AlertCircle, Stethoscope, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'staff' | 'patient'>('staff');

  // Staff form
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Patient form
  const [mrNumber,  setMrNumber]  = useState('');
  const [patientPw, setPatientPw] = useState('');

  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true); setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.ok) {
      const sess = await fetch('/api/auth/session').then(r => r.json());
      if (sess?.user?.isSuperAdmin) router.push('/superadmin');
      else if (sess?.user?.role === 'org_owner') router.push('/orgdashboard');
      else router.push('/dashboard');
      router.refresh();
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrNumber || !patientPw) { setError('Please enter your MR number and password'); return; }
    setLoading(true); setError('');
    const res = await signIn('patient-login', { mrNumber: mrNumber.trim().toUpperCase(), password: patientPw, redirect: false });
    setLoading(false);
    if (res?.ok) {
      router.push('/patient/dashboard');
      router.refresh();
    } else {
      setError('Invalid MR number or password. If you haven\'t registered yet, click Register below.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #142240 50%, #0a1628 100%)' }}>

      <div className="w-full max-w-[440px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)' }}>
            <span className="text-[#0a1628] font-bold text-xl">M+</span>
          </div>
          <h1 className="text-white font-bold text-[26px] leading-tight">MediPlex</h1>
          <p className="text-[#c9a84c] text-[11px] tracking-widest uppercase font-light mt-1">
            Healthcare Portal
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl mb-6 p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {([
            { id: 'staff',   label: 'Staff Login',   icon: Stethoscope },
            { id: 'patient', label: 'Patient Login',  icon: User },
          ] as const).map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setError(''); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
                style={{
                  background: active ? 'linear-gradient(135deg,#c9a84c,#e8c87a)' : 'transparent',
                  color: active ? '#0a1628' : 'rgba(255,255,255,0.45)',
                }}>
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(12px)' }}>

          {tab === 'staff' ? (
            <>
              <h2 className="text-white text-[18px] font-semibold mb-1">Staff Sign In</h2>
              <p className="text-white/40 text-[13px] mb-6">Enter your clinic credentials to continue</p>

              {error && <ErrorBox message={error} />}

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <Field label="Email Address">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="doctor@clinic.com" autoComplete="email"
                    className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                    onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                </Field>

                <Field label="Password">
                  <PasswordInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(!showPw)} />
                </Field>

                <SubmitButton loading={loading} label="Sign In to Dashboard" />
              </form>
            </>
          ) : (
            <>
              <h2 className="text-white text-[18px] font-semibold mb-1">Patient Sign In</h2>
              <p className="text-white/40 text-[13px] mb-6">Access your medical records & appointments</p>

              {error && <ErrorBox message={error} />}

              <form onSubmit={handlePatientLogin} className="space-y-4">
                <Field label="MR Number">
                  <input type="text" value={mrNumber} onChange={e => setMrNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MR-0042" autoComplete="off"
                    className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all font-mono tracking-wider"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                    onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                </Field>

                <Field label="Password">
                  <PasswordInput value={patientPw} onChange={setPatientPw} show={showPw} onToggle={() => setShowPw(!showPw)} />
                </Field>

                <SubmitButton loading={loading} label="Access My Records" />
              </form>

              <div className="mt-5 pt-4 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-white/40 text-[12px] mb-2">First time? Create your patient account</p>
                <a href="/patient/register"
                  className="inline-block px-5 py-2 rounded-xl text-[13px] font-semibold transition-all"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}>
                  Register as Patient
                </a>
              </div>
            </>
          )}
        </div>

        {/* Bottom hint */}
        {tab === 'staff' && (
          <div className="mt-5 rounded-xl p-4 text-[11px]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-white/30 uppercase tracking-widest text-[10px] font-medium mb-2">Staff Access Levels</div>
            <div className="space-y-1.5">
              {[
                { role:'Admin',        color:'#c9a84c', desc:'Full access — all features' },
                { role:'Doctor',       color:'#1a7f5e', desc:'View + edit appointments' },
                { role:'Receptionist', color:'#2b6cb0', desc:'Appointments & calendar only' },
              ].map(r => (
                <div key={r.role} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span style={{ color: r.color }} className="font-medium">{r.role}</span>
                  <span className="text-white/25">— {r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'patient' && (
          <div className="mt-5 rounded-xl p-4 text-[11px]"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-white/30 uppercase tracking-widest text-[10px] font-medium mb-2">What you can access</div>
            <div className="space-y-1.5">
              {[
                { label:'Appointments', color:'#3b82f6', desc:'Upcoming & past visits' },
                { label:'Prescriptions', color:'#10b981', desc:'Your medication history' },
                { label:'Lab Results',   color:'#f59e0b', desc:'Reports & test results' },
                { label:'Messages',      color:'#8b5cf6', desc:'Chat with your clinic' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span style={{ color: r.color }} className="font-medium">{r.label}</span>
                  <span className="text-white/25">— {r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-white/20 text-[11px] mt-4">
          {process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex Healthcare'}
        </p>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#faf8f4',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        placeholder="••••••••" autoComplete="current-password"
        className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all pr-11"
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.6)'}
        onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
      <button type="button" onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full rounded-xl py-3 text-[14px] font-semibold transition-all flex items-center justify-center gap-2 mt-2"
      style={{ background: loading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628', cursor: loading ? 'wait' : 'pointer' }}>
      {loading
        ? <span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" />
        : <LogIn size={16} />}
      {loading ? 'Signing in...' : label}
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl mb-5 text-[12px]"
      style={{ background: 'rgba(197,48,48,0.12)', border: '1px solid rgba(197,48,48,0.3)', color: '#fc8181' }}>
      <AlertCircle size={14} className="flex-shrink-0" />
      {message}
    </div>
  );
}
