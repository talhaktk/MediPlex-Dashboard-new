'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function PatientRegisterPage() {
  const router = useRouter();
  const [step,     setStep]     = useState<'verify' | 'create'>('verify');
  const [mrNumber, setMrNumber] = useState('');
  const [phone,    setPhone]    = useState('');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  // Step 1: verify MR number via server API (uses service role key)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrNumber.trim()) { setError('Please enter your MR number'); return; }
    setLoading(true); setError('');

    const res  = await fetch('/api/patient/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', mrNumber: mrNumber.trim() }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Verification failed'); return; }

    setMrNumber(data.mrNumber);
    setName(data.name  || '');
    setPhone(data.phone || '');
    setClinicId(data.clinicId || null);
    setStep('create');
  };

  // Step 2: create account via server API
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) { setError('Please fill all required fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');

    const res  = await fetch('/api/patient/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', mrNumber, name, phone, email, password, clinicId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Registration failed'); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg,#0a1628 0%,#142240 50%,#0a1628 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Account Created!</h2>
          <p className="text-white/50 text-sm mb-1">MR Number: <span className="font-mono text-[#c9a84c]">{mrNumber}</span></p>
          <p className="text-white/40 text-sm mb-6">You can now sign in with your MR number and password.</p>
          <button onClick={() => router.push('/login')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
            Go to Login →
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all";
  const inputStyle: React.CSSProperties = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor='rgba(201,168,76,0.6)';
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => e.target.style.borderColor='rgba(255,255,255,0.1)';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background:'linear-gradient(135deg,#0a1628 0%,#142240 50%,#0a1628 100%)' }}>
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl mb-3"
            style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', width:52, height:52 }}>
            <span className="text-[#0a1628] font-bold text-lg">M+</span>
          </div>
          <h1 className="text-white font-bold text-2xl mt-1">Patient Registration</h1>
          <p className="text-white/35 text-xs mt-1">MediPlex Healthcare Portal</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-6">
          {['Verify MR Number', 'Create Account'].map((s, i) => {
            const done    = i < (step === 'verify' ? 0 : 1);
            const current = i === (step === 'verify' ? 0 : 1);
            return (
              <div key={i} className="flex-1">
                <div className="text-[10px] font-semibold mb-1.5 text-center"
                  style={{ color: done ? '#10b981' : current ? '#c9a84c' : 'rgba(255,255,255,0.25)' }}>
                  {done ? '✓ ' : ''}{s}
                </div>
                <div className="h-1 rounded-full" style={{ background: done ? '#10b981' : current ? '#c9a84c' : 'rgba(255,255,255,0.1)' }} />
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl p-7"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(201,168,76,0.2)' }}>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-[12px]"
              style={{ background:'rgba(197,48,48,0.12)', border:'1px solid rgba(197,48,48,0.3)', color:'#fc8181' }}>
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* ── Step 1 ── */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">MR Number</label>
                <input value={mrNumber} onChange={e => setMrNumber(e.target.value)} autoFocus
                  placeholder="e.g. MR-0042 or 0042"
                  className={inputCls + " font-mono tracking-wider"} style={inputStyle}
                  onFocus={onFocus} onBlur={onBlur} />
                <p className="text-white/25 text-[11px] mt-1.5">
                  Your MR number is printed on any prescription or appointment slip from your clinic.
                </p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                {loading
                  ? <span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" />
                  : 'Verify & Continue →'}
              </button>
            </form>
          )}

          {/* ── Step 2 ── */}
          {step === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <button type="button" onClick={() => { setStep('verify'); setError(''); }}
                className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-[12px] mb-1 transition-colors">
                <ArrowLeft size={12} /> Back
              </button>

              <div className="p-3 rounded-xl text-[12px] flex items-center gap-2"
                style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#34d399' }}>
                <CheckCircle size={13} />
                MR Number verified: <span className="font-mono font-semibold ml-1">{mrNumber}</span>
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Phone / WhatsApp</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 0000000" type="tel"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Email (optional)</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Password *</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'} placeholder="Min 6 characters"
                    className={inputCls + " pr-10"} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Confirm Password *</label>
                <input value={confirm} onChange={e => setConfirm(e.target.value)}
                  type={showPw ? 'text' : 'password'} placeholder="Re-enter password"
                  className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                {loading
                  ? <span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" />
                  : 'Create My Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-4 text-white/35 text-[12px]">
          Already registered?{' '}
          <button onClick={() => router.push('/login')} className="text-[#c9a84c] hover:underline font-medium">
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}
