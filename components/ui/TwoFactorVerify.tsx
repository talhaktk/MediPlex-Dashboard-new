'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function TwoFactorVerify({ email, onVerified, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storedCode, setStoredCode] = useState('');

  const sendCode = async () => {
    setLoading(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setStoredCode(otp);
    // Store OTP in Supabase with expiry
    await supabase.from('logins').update({
      otp_code: otp,
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    }).eq('email', email);
    // In production: send via WhatsApp/SMS/Email
    // For now show in toast (replace with actual send)
    toast.success(`OTP sent to ${email} — for demo: ${otp}`);
    setSent(true);
    setLoading(false);
  };

  const verify = async () => {
    if (!code || code.length !== 6) { toast.error('Enter 6-digit code'); return; }
    setLoading(true);
    const { data } = await supabase.from('logins')
      .select('otp_code,otp_expires_at')
      .eq('email', email)
      .maybeSingle();
    
    if (!data?.otp_code) { toast.error('No OTP found'); setLoading(false); return; }
    if (new Date(data.otp_expires_at) < new Date()) { toast.error('OTP expired'); setLoading(false); return; }
    if (data.otp_code !== code) { toast.error('Invalid code'); setLoading(false); return; }

    // Clear OTP
    await supabase.from('logins').update({ otp_code: null, otp_expires_at: null }).eq('email', email);
    toast.success('Verified successfully!');
    onVerified();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🔐</div>
          <div className="font-bold text-navy text-[16px]">Two-Factor Authentication</div>
          <div className="text-[12px] text-gray-500 mt-1">
            {sent ? `Enter the 6-digit code sent to ${email}` : 'Verify your identity to continue'}
          </div>
        </div>
        {!sent ? (
          <button onClick={sendCode} disabled={loading}
            className="w-full btn-gold py-3 text-[13px] font-semibold">
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g,''))}
              placeholder="000000"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-[20px] text-center font-mono text-navy tracking-widest outline-none focus:border-gold"
              autoFocus
            />
            <button onClick={verify} disabled={loading || code.length !== 6}
              className="w-full btn-gold py-3 text-[13px] font-semibold disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button onClick={sendCode} className="w-full text-[12px] text-gray-400 hover:text-gray-600 py-1">
              Resend Code
            </button>
          </div>
        )}
        <button onClick={onCancel} className="w-full mt-3 text-[12px] text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
