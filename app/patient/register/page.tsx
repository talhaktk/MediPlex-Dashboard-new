'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PatientRegisterPage() {
  const router = useRouter();
  const [step, setStep]       = useState<'verify' | 'create'>('verify');
  const [mrNumber, setMrNumber] = useState('');
  const [phone,    setPhone]    = useState('');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  // Step 1: verify MR number exists in the clinic system
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrNumber.trim()) { setError('Please enter your MR number'); return; }
    setLoading(true); setError('');
    const mr = mrNumber.trim().toUpperCase();

    // Check existing account
    const { data: existing } = await supabase
      .from('patient_accounts').select('id').eq('mr_number', mr).maybeSingle();
    if (existing) { setError('An account already exists for this MR number. Please sign in.'); setLoading(false); return; }

    // Verify MR exists in patients or appointments
    const { data: patient } = await supabase
      .from('patients').select('name,phone').eq('mr_number', mr).maybeSingle();
    const { data: appt } = !patient
      ? await supabase.from('appointments').select('child_name,whatsapp,clinic_id').eq('mr_number', mr).order('appointment_date',{ascending:false}).limit(1).maybeSingle()
      : { data: null };

    if (!patient && !appt) {
      setError('MR number not found in our system. Please check with your clinic.');
      setLoading(false); return;
    }

    // Pre-fill known info
    if (patient?.name)   setName(patient.name);
    if (patient?.phone)  setPhone(patient.phone);
    if (appt?.child_name) setName(appt.child_name);
    if (appt?.whatsapp)   setPhone(appt.whatsapp);
    setMrNumber(mr);
    setStep('create');
    setLoading(false);
  };

  // Step 2: create the account
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) { setError('Please fill all required fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');

    // Get clinic_id from appointments
    const { data: appt } = await supabase
      .from('appointments').select('clinic_id').eq('mr_number', mrNumber)
      .order('appointment_date',{ascending:false}).limit(1).maybeSingle();

    const { error: insertErr } = await supabase.from('patient_accounts').insert([{
      mr_number:    mrNumber,
      clinic_id:    appt?.clinic_id || null,
      patient_name: name.trim(),
      phone:        phone.trim() || null,
      email:        email.trim() || null,
      password_hash: password,
    }]);

    setLoading(false);
    if (insertErr) { setError('Registration failed: ' + insertErr.message); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg,#0a1628 0%,#142240 50%,#0a1628 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Account Created!</h2>
          <p className="text-white/50 text-sm mb-6">You can now sign in with your MR number and password.</p>
          <button onClick={() => router.push('/login')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg,#0a1628 0%,#142240 50%,#0a1628 100%)' }}>
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
            <span className="text-[#0a1628] font-bold text-lg">M+</span>
          </div>
          <h1 className="text-white font-bold text-2xl">Patient Registration</h1>
          <p className="text-white/40 text-xs mt-1">MediPlex Healthcare Portal</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Verify MR Number','Create Account'].map((s,i) => (
            <div key={i} className="flex-1">
              <div className="text-[10px] font-medium mb-1 text-center"
                style={{ color: i === (step==='verify'?0:1) ? '#c9a84c' : i < (step==='verify'?0:1) ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                {s}
              </div>
              <div className="h-1 rounded-full" style={{
                background: i < (step==='verify'?0:1) ? '#10b981' : i === (step==='verify'?0:1) ? '#c9a84c' : 'rgba(255,255,255,0.1)'
              }} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-7"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)' }}>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-[12px]"
              style={{ background: 'rgba(197,48,48,0.12)', border: '1px solid rgba(197,48,48,0.3)', color: '#fc8181' }}>
              <AlertCircle size={13} className="flex-shrink-0" /> {error}
            </div>
          )}

          {step === 'verify' ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">MR Number</label>
                <input value={mrNumber} onChange={e => setMrNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MR-0042" autoFocus
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none font-mono tracking-wider"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}
                  onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                <p className="text-white/30 text-[11px] mt-1.5">Your MR number is on any prescription or appointment slip from your clinic.</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                {loading ? <span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" /> : 'Verify & Continue →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <button type="button" onClick={() => { setStep('verify'); setError(''); }}
                className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-[12px] mb-2 transition-colors">
                <ArrowLeft size={13} /> Back
              </button>

              <div className="p-3 rounded-xl text-[12px] flex items-center gap-2"
                style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#34d399' }}>
                <CheckCircle size={13} /> MR Number verified: <span className="font-mono font-semibold">{mrNumber}</span>
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}
                  onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Phone / WhatsApp</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 0000000" type="tel"
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}
                  onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Email (optional)</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email"
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}
                  onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">Password *</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'} placeholder="Min 6 characters"
                    className="w-full rounded-xl px-4 py-3 pr-10 text-[13px] outline-none"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}
                    onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                    onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
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
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#faf8f4' }}
                  onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.6)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background:'linear-gradient(135deg,#c9a84c,#e8c87a)', color:'#0a1628' }}>
                {loading ? <span className="w-4 h-4 border-2 border-[#0a1628]/30 border-t-[#0a1628] rounded-full animate-spin" /> : 'Create My Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-4 text-white/40 text-[12px]">
          Already registered?{' '}
          <button onClick={() => router.push('/login')} className="text-[#c9a84c] hover:underline">Sign in here</button>
        </p>
      </div>
    </div>
  );
}
