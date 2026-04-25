'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router   = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email, password,
      redirect: false,
    });

    setLoading(false);
    if (res?.ok) {
      const sess = await fetch('/api/auth/session').then(r=>r.json()); if(sess?.user?.isSuperAdmin) { router.push('/superadmin'); } else if(sess?.user?.role==='org_owner') { router.push('/orgdashboard'); } else { router.push('/dashboard'); };
      router.refresh();
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #142240 50%, #0a1628 100%)' }}>

      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c87a)' }}>
            <span className="text-navy font-bold text-xl">M+</span>
          </div>
          <h1 className="text-white font-display text-[26px] font-semibold leading-tight">
            MediPlex
          </h1>
          <p className="text-gold text-[11px] tracking-widest uppercase font-light mt-1">
            Pediatric Command Centre
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(12px)' }}>

          <h2 className="text-white text-[18px] font-semibold mb-1">Sign in</h2>
          <p className="text-white/40 text-[13px] mb-6">Enter your clinic credentials to continue</p>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl mb-5 text-[12px]"
              style={{ background: 'rgba(197,48,48,0.12)', border: '1px solid rgba(197,48,48,0.3)', color: '#fc8181' }}>
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@mediplex.com"
                autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#faf8f4',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.6)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-widest font-medium block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all pr-11"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#faf8f4',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.6)'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-[14px] font-semibold transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #c9a84c, #e8c87a)',
                color: '#0a1628',
                cursor: loading ? 'wait' : 'pointer',
              }}>
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Role info */}
        <div className="mt-5 rounded-xl p-4 text-[11px]"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-white/30 uppercase tracking-widest text-[10px] font-medium mb-2">Access Levels</div>
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

        <p className="text-center text-white/20 text-[11px] mt-4">
          {process.env.NEXT_PUBLIC_CLINIC_NAME || 'MediPlex Pediatric Clinic'}
        </p>
      </div>
    </div>
  );
}
