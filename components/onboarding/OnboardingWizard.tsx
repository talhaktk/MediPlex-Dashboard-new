'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Building2, User, Palette, Calendar, CreditCard, Hash,
  UserPlus, Rocket, ChevronRight, ChevronLeft, Check,
  Upload, Camera, Eye, EyeOff, Clock, Globe, Phone, Mail,
  MapPin, FileText, Stethoscope, Shield,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface WizardData {
  // Step 1 — Clinic Profile
  clinicName: string;
  clinicType: string;
  speciality: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  // Step 2 — Doctor Profile
  doctorName: string;
  doctorSpecialization: string;
  pmdc: string;
  doctorPhotoUrl: string;
  doctorSignatureUrl: string;
  consultationFee: string;
  password: string;
  confirmPassword: string;
  // Step 3 — Branding
  headerImageUrl: string;
  footerImageUrl: string;
  brandColor: string;
  printMode: string;
  // Step 4 — Schedule
  workingDays: string[];
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
  slotDuration: string;
  maxPerSlot: string;
  // Step 5 — Billing
  currency: string;
  invoicePrefix: string;
  tax: string;
  paymentMethods: string[];
  // Step 6 — MR Number
  mrPrefix: string;
  mrDigits: string;
  // Step 7 — First Patient (optional)
  patientName: string;
  patientDob: string;
  patientParent: string;
  patientWhatsapp: string;
}

const EMPTY: WizardData = {
  clinicName: '', clinicType: 'Clinic', speciality: 'General Practice',
  address: '', city: '', phone: '', email: '', website: '', logoUrl: '',
  doctorName: '', doctorSpecialization: '', pmdc: '',
  doctorPhotoUrl: '', doctorSignatureUrl: '', consultationFee: '1500',
  password: '', confirmPassword: '',
  headerImageUrl: '', footerImageUrl: '', brandColor: '#0A1628', printMode: 'full',
  workingDays: ['Mon','Tue','Wed','Thu','Fri'], morningStart: '09:00', morningEnd: '13:00',
  eveningStart: '14:00', eveningEnd: '18:00', slotDuration: '15', maxPerSlot: '1',
  currency: 'PKR', invoicePrefix: 'INV', tax: '0', paymentMethods: ['cash'],
  mrPrefix: 'MR', mrDigits: '4',
  patientName: '', patientDob: '', patientParent: '', patientWhatsapp: '',
};

const STEPS = [
  { id: 1, label: 'Clinic Profile',  icon: Building2 },
  { id: 2, label: 'Doctor Profile',  icon: User },
  { id: 3, label: 'Branding',        icon: Palette },
  { id: 4, label: 'Schedule',        icon: Calendar },
  { id: 5, label: 'Billing',         icon: CreditCard },
  { id: 6, label: 'MR Number',       icon: Hash },
  { id: 7, label: 'First Patient',   icon: UserPlus },
  { id: 8, label: 'Go Live!',        icon: Rocket },
];

const CLINIC_TYPES  = ['Clinic', 'Hospital', 'Polyclinic', 'Dispensary', 'Medical Centre', 'Nursing Home'];
const SPECIALITIES  = ['General Practice','Pediatrics','Gynecology','Cardiology','Orthopedics','Dermatology','ENT','Ophthalmology','Neurology','Psychiatry','Dental','Urology','Nephrology','Oncology','Endocrinology','Pulmonology'];
const CURRENCIES    = [{ code:'PKR', label:'PKR — Pakistani Rupee' },{ code:'GBP', label:'GBP — British Pound' },{ code:'USD', label:'USD — US Dollar' },{ code:'AED', label:'AED — UAE Dirham' },{ code:'SAR', label:'SAR — Saudi Riyal' }];
const DAYS          = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const PAY_METHODS   = ['cash','card','bank_transfer','jazzcash','easypaisa','insurance'];
const SLOT_DURATIONS= ['5','10','15','20','30','45','60'];

/* ─── Helpers ────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return <label className="ob-label">{children}</label>;
}
function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ob-input" {...props} />;
}
function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="ob-select" {...props}>{children}</select>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ob-field">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ImageUpload({ label, value, onChange, capture }: {
  label: string; value: string; onChange: (url: string) => void; capture?: 'user' | 'environment';
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const ext         = file.name.split('.').pop() || 'jpg';
      const name        = `onboarding/${Date.now()}.${ext}`;
      const res = await fetch(`${supabaseUrl}/storage/v1/object/clinic-assets/${name}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': file.type },
        body:    file,
      });
      if (res.ok) {
        onChange(`${supabaseUrl}/storage/v1/object/public/clinic-assets/${name}`);
      } else {
        // Fallback: use base64 data URL
        const reader = new FileReader();
        reader.onload = e => onChange(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = e => onChange(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    setUploading(false);
  }, [onChange]);

  return (
    <div className="ob-image-upload">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture={capture}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {value ? (
        <div className="ob-image-preview">
          <img src={value} alt={label} />
          <button type="button" onClick={() => onChange('')} className="ob-image-remove">✕</button>
        </div>
      ) : (
        <button type="button" className="ob-image-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <span className="ob-spinner" /> : <Upload size={16} />}
          {uploading ? 'Uploading…' : label}
        </button>
      )}
    </div>
  );
}

/* ─── Step components ────────────────────────────────────── */
function Step1({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  return (
    <div className="ob-grid-2">
      <Field label="Clinic Name *">
        <Input value={d.clinicName} onChange={e => set('clinicName', e.target.value)} placeholder="e.g. Al-Shifa Medical Centre" />
      </Field>
      <Field label="Clinic Type">
        <Select value={d.clinicType} onChange={e => set('clinicType', e.target.value)}>
          {CLINIC_TYPES.map(t => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Speciality">
        <Select value={d.speciality} onChange={e => set('speciality', e.target.value)}>
          {SPECIALITIES.map(s => <option key={s}>{s}</option>)}
        </Select>
      </Field>
      <Field label="City">
        <Input value={d.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Lahore" />
      </Field>
      <Field label="Address">
        <Input value={d.address} onChange={e => set('address', e.target.value)} placeholder="Street, Area" />
      </Field>
      <Field label="Phone">
        <Input value={d.phone} onChange={e => set('phone', e.target.value)} placeholder="+92 300 0000000" type="tel" />
      </Field>
      <Field label="Email *">
        <Input value={d.email} onChange={e => set('email', e.target.value)} placeholder="clinic@example.com" type="email" />
      </Field>
      <Field label="Website">
        <Input value={d.website} onChange={e => set('website', e.target.value)} placeholder="https://yourclinic.com" />
      </Field>
      <div className="ob-full">
        <Field label="Clinic Logo">
          <ImageUpload label="Upload Logo" value={d.logoUrl} onChange={v => set('logoUrl', v)} capture="environment" />
        </Field>
      </div>
    </div>
  );
}

function Step2({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="ob-grid-2">
      <Field label="Doctor / Owner Name *">
        <Input value={d.doctorName} onChange={e => set('doctorName', e.target.value)} placeholder="Dr. Ahmed Khan" />
      </Field>
      <Field label="Specialization">
        <Input value={d.doctorSpecialization} onChange={e => set('doctorSpecialization', e.target.value)} placeholder="e.g. MBBS, FCPS Paediatrics" />
      </Field>
      <Field label="PMDC / License No.">
        <Input value={d.pmdc} onChange={e => set('pmdc', e.target.value)} placeholder="PMDC-12345" />
      </Field>
      <Field label="Consultation Fee">
        <Input value={d.consultationFee} onChange={e => set('consultationFee', e.target.value)} type="number" min="0" placeholder="1500" />
      </Field>
      <Field label="Doctor Photo">
        <ImageUpload label="Upload Photo / 📷 Camera" value={d.doctorPhotoUrl} onChange={v => set('doctorPhotoUrl', v)} capture="user" />
      </Field>
      <Field label="Signature">
        <ImageUpload label="Upload Signature / 📷 Scan" value={d.doctorSignatureUrl} onChange={v => set('doctorSignatureUrl', v)} capture="environment" />
      </Field>
      <Field label="Account Password *">
        <div className="ob-pw-wrap">
          <Input value={d.password} onChange={e => set('password', e.target.value)} type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" />
          <button type="button" onClick={() => setShowPw(p => !p)} className="ob-pw-eye">
            {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>
      </Field>
      <Field label="Confirm Password *">
        <Input value={d.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} type={showPw ? 'text' : 'password'} placeholder="Repeat password" />
      </Field>
    </div>
  );
}

function Step3({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  return (
    <div className="ob-grid-2">
      <Field label="Prescription Header Image">
        <ImageUpload label="Upload Header" value={d.headerImageUrl} onChange={v => set('headerImageUrl', v)} />
      </Field>
      <Field label="Prescription Footer Image">
        <ImageUpload label="Upload Footer" value={d.footerImageUrl} onChange={v => set('footerImageUrl', v)} />
      </Field>
      <Field label="Brand / Theme Colour">
        <div className="ob-color-wrap">
          <input type="color" value={d.brandColor} onChange={e => set('brandColor', e.target.value)} className="ob-color-picker" />
          <Input value={d.brandColor} onChange={e => set('brandColor', e.target.value)} placeholder="#0A1628" maxLength={7} />
        </div>
      </Field>
      <Field label="Print Mode">
        <Select value={d.printMode} onChange={e => set('printMode', e.target.value)}>
          <option value="full">Full (header + footer)</option>
          <option value="compact">Compact (no header/footer)</option>
          <option value="letterhead">Letterhead only (header, no footer)</option>
        </Select>
      </Field>
      <div className="ob-full ob-preview-card">
        <p className="ob-preview-label">Prescription Preview</p>
        <div className="ob-preview-rx" style={{ borderColor: d.brandColor }}>
          {d.headerImageUrl && <img src={d.headerImageUrl} alt="header" className="ob-rx-header-img" />}
          <div className="ob-rx-body">
            <div className="ob-rx-clinic" style={{ color: d.brandColor }}>{d.clinicName || 'Clinic Name'}</div>
            <div className="ob-rx-doctor">{d.doctorName || 'Dr. Your Name'}</div>
            <div className="ob-rx-lines">
              <div className="ob-rx-line" /><div className="ob-rx-line" /><div className="ob-rx-line short" />
            </div>
          </div>
          {d.footerImageUrl && <img src={d.footerImageUrl} alt="footer" className="ob-rx-footer-img" />}
        </div>
      </div>
    </div>
  );
}

function Step4({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const toggleDay = (day: string) => {
    const days = d.workingDays.includes(day)
      ? d.workingDays.filter(x => x !== day)
      : [...d.workingDays, day];
    set('workingDays', days);
  };
  return (
    <div className="ob-grid-2">
      <div className="ob-full">
        <Field label="Working Days">
          <div className="ob-day-pills">
            {DAYS.map(day => (
              <button
                key={day} type="button"
                className={`ob-day-pill ${d.workingDays.includes(day) ? 'active' : ''}`}
                onClick={() => toggleDay(day)}
              >{day}</button>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Morning Start"><Input type="time" value={d.morningStart} onChange={e => set('morningStart', e.target.value)} /></Field>
      <Field label="Morning End"><Input type="time" value={d.morningEnd} onChange={e => set('morningEnd', e.target.value)} /></Field>
      <Field label="Evening Start"><Input type="time" value={d.eveningStart} onChange={e => set('eveningStart', e.target.value)} /></Field>
      <Field label="Evening End"><Input type="time" value={d.eveningEnd} onChange={e => set('eveningEnd', e.target.value)} /></Field>
      <Field label="Slot Duration (min)">
        <Select value={d.slotDuration} onChange={e => set('slotDuration', e.target.value)}>
          {SLOT_DURATIONS.map(s => <option key={s} value={s}>{s} minutes</option>)}
        </Select>
      </Field>
      <Field label="Max Patients per Slot">
        <Input type="number" min="1" max="10" value={d.maxPerSlot} onChange={e => set('maxPerSlot', e.target.value)} />
      </Field>
    </div>
  );
}

function Step5({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const toggleMethod = (m: string) => {
    const methods = d.paymentMethods.includes(m)
      ? d.paymentMethods.filter(x => x !== m)
      : [...d.paymentMethods, m];
    set('paymentMethods', methods);
  };
  return (
    <div className="ob-grid-2">
      <Field label="Currency">
        <Select value={d.currency} onChange={e => set('currency', e.target.value)}>
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </Select>
      </Field>
      <Field label="Invoice Prefix">
        <Input value={d.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value.toUpperCase())} placeholder="INV" maxLength={5} />
      </Field>
      <Field label="Tax / GST %">
        <Input type="number" min="0" max="100" step="0.5" value={d.tax} onChange={e => set('tax', e.target.value)} placeholder="0" />
      </Field>
      <Field label="Default Consultation Fee">
        <Input type="number" min="0" value={d.consultationFee} onChange={e => set('consultationFee', e.target.value)} />
      </Field>
      <div className="ob-full">
        <Field label="Accepted Payment Methods">
          <div className="ob-pill-group">
            {PAY_METHODS.map(m => (
              <button
                key={m} type="button"
                className={`ob-pill ${d.paymentMethods.includes(m) ? 'active' : ''}`}
                onClick={() => toggleMethod(m)}
              >{m.replace('_', ' ')}</button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Step6({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  const preview = `${d.mrPrefix}-${'0'.repeat(Math.max(0, parseInt(d.mrDigits) - 1))}1`;
  return (
    <div className="ob-grid-2">
      <Field label="MR Number Prefix">
        <Input value={d.mrPrefix} onChange={e => set('mrPrefix', e.target.value.toUpperCase())} placeholder="MR" maxLength={6} />
      </Field>
      <Field label="Number of Digits">
        <Select value={d.mrDigits} onChange={e => set('mrDigits', e.target.value)}>
          {['3','4','5','6'].map(n => <option key={n} value={n}>{n} digits</option>)}
        </Select>
      </Field>
      <div className="ob-full">
        <div className="ob-mr-preview">
          <span className="ob-mr-preview-label">Preview</span>
          <span className="ob-mr-preview-value">{preview}</span>
        </div>
      </div>
      <div className="ob-full ob-info-box">
        <p>Patients will be assigned MR numbers like <strong>{preview}</strong>, <strong>{d.mrPrefix}-{'0'.repeat(Math.max(0, parseInt(d.mrDigits) - 2))}2</strong>, etc. You can always reset or adjust this later in Settings.</p>
      </div>
    </div>
  );
}

function Step7({ d, set }: { d: WizardData; set: (k: keyof WizardData, v: any) => void }) {
  return (
    <div className="ob-grid-2">
      <div className="ob-full ob-optional-badge">Optional — skip if you want to add patients later</div>
      <Field label="Patient / Child Name">
        <Input value={d.patientName} onChange={e => set('patientName', e.target.value)} placeholder="e.g. Ali Khan" />
      </Field>
      <Field label="Date of Birth">
        <Input type="date" value={d.patientDob} onChange={e => set('patientDob', e.target.value)} />
      </Field>
      <Field label="Parent / Guardian Name">
        <Input value={d.patientParent} onChange={e => set('patientParent', e.target.value)} placeholder="e.g. Farhan Khan" />
      </Field>
      <Field label="WhatsApp Number">
        <Input value={d.patientWhatsapp} onChange={e => set('patientWhatsapp', e.target.value)} placeholder="+92 300 0000000" type="tel" />
      </Field>
    </div>
  );
}

function Step8({ d, clinicId }: { d: WizardData; clinicId: string | null }) {
  const router = useRouter();
  return (
    <div className="ob-golive">
      <div className="ob-golive-icon">🚀</div>
      <h2 className="ob-golive-title">You're All Set!</h2>
      <p className="ob-golive-sub">Your MediPlex account is live. 14-day free trial started.</p>
      <div className="ob-golive-summary">
        <div className="ob-golive-row"><Building2 size={16}/> <span>{d.clinicName}</span></div>
        <div className="ob-golive-row"><User size={16}/> <span>{d.doctorName || '—'}</span></div>
        <div className="ob-golive-row"><Stethoscope size={16}/> <span>{d.speciality}</span></div>
        <div className="ob-golive-row"><MapPin size={16}/> <span>{[d.city, d.address].filter(Boolean).join(', ') || '—'}</span></div>
        <div className="ob-golive-row"><CreditCard size={16}/> <span>{d.currency} · {d.invoicePrefix}-001</span></div>
        <div className="ob-golive-row"><Hash size={16}/> <span>MR: {d.mrPrefix}-{'0'.repeat(Math.max(0,parseInt(d.mrDigits)-1))}1</span></div>
      </div>
      <div className="ob-golive-actions">
        <button className="ob-btn-primary" onClick={() => router.push('/login')}>
          <Rocket size={16}/> Go to Dashboard
        </button>
        {clinicId && (
          <button className="ob-btn-ghost" onClick={() => {
            const portal = `${window.location.origin}/portal/${clinicId}`;
            navigator.clipboard.writeText(portal);
            toast.success('Patient portal link copied!');
          }}>
            <Globe size={16}/> Copy Patient Portal Link
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Wizard ────────────────────────────────────────── */
export default function OnboardingWizard() {
  const [step, setStep]       = useState(1);
  const [data, setData]       = useState<WizardData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const set = useCallback((key: keyof WizardData, val: any) => {
    setData(prev => ({ ...prev, [key]: val }));
  }, []);

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!data.clinicName.trim()) return 'Clinic name is required.';
      if (!data.email.trim())      return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Enter a valid email.';
    }
    if (step === 2) {
      if (!data.password)                        return 'Password is required.';
      if (data.password.length < 8)              return 'Password must be at least 8 characters.';
      if (data.password !== data.confirmPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const next = async () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }

    // On step 7 → 8: create account
    if (step === 7 && !created) {
      setLoading(true);
      try {
        const res  = await fetch('/api/onboarding', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || 'Failed to create account');
          return;
        }
        setClinicId(json.clinicId);
        setCreated(true);

        // If first patient was entered, add them
        if (data.patientName && json.clinicId) {
          await addFirstPatient(json.clinicId);
        }

        toast.success('Account created! Welcome to MediPlex 🎉');
        setStep(8);
      } catch {
        toast.error('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step < 8) setStep(s => s + 1);
  };

  const addFirstPatient = async (cid: string) => {
    if (!data.patientName) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const mrNum = `${data.mrPrefix}-${'0'.repeat(Math.max(0, parseInt(data.mrDigits) - 1))}1`;
      await sb.from('appointments').insert({
        clinic_id:        cid,
        child_name:       data.patientName,
        parent_name:      data.patientParent || '',
        whatsapp:         data.patientWhatsapp || '',
        date_of_birth:    data.patientDob || null,
        mr_number:        mrNum,
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: data.morningStart || '09:00',
        status:           'pending',
        visit_type:       'new',
        reason:           'First visit',
      });
    } catch {}
  };

  const back = () => { if (step > 1) setStep(s => s - 1); };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <>
      <style>{STYLES}</style>
      <div className="ob-root">
        {/* Sidebar stepper */}
        <aside className="ob-sidebar">
          <div className="ob-logo">
            <img src="/icons/mediplex-logo.svg" alt="MediPlex" className="ob-logo-img" />
          </div>
          <nav className="ob-stepper">
            {STEPS.map(s => {
              const Icon = s.icon;
              const done = step > s.id;
              const curr = step === s.id;
              return (
                <div key={s.id} className={`ob-step-item ${curr ? 'current' : ''} ${done ? 'done' : ''}`}>
                  <div className="ob-step-icon">
                    {done ? <Check size={14}/> : <Icon size={14}/>}
                  </div>
                  <span className="ob-step-label">{s.label}</span>
                </div>
              );
            })}
          </nav>
          <div className="ob-sidebar-footer">
            <Shield size={14}/>
            <span>256-bit SSL · HIPAA-ready</span>
          </div>
        </aside>

        {/* Main content */}
        <main className="ob-main">
          {/* Progress bar */}
          <div className="ob-progress-bar">
            <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="ob-content">
            <div className="ob-step-header">
              <span className="ob-step-num">Step {step} of {STEPS.length}</span>
              <h1 className="ob-step-title">{STEPS[step-1].label}</h1>
            </div>

            <div className="ob-form">
              {step === 1 && <Step1 d={data} set={set} />}
              {step === 2 && <Step2 d={data} set={set} />}
              {step === 3 && <Step3 d={data} set={set} />}
              {step === 4 && <Step4 d={data} set={set} />}
              {step === 5 && <Step5 d={data} set={set} />}
              {step === 6 && <Step6 d={data} set={set} />}
              {step === 7 && <Step7 d={data} set={set} />}
              {step === 8 && <Step8 d={data} clinicId={clinicId} />}
            </div>

            {step < 8 && (
              <div className="ob-nav">
                <button className="ob-btn-ghost" onClick={back} disabled={step === 1 || loading}>
                  <ChevronLeft size={16}/> Back
                </button>
                <button className="ob-btn-primary" onClick={next} disabled={loading}>
                  {loading ? <span className="ob-spinner white" /> : null}
                  {step === 7 ? 'Create Account' : 'Continue'}
                  {!loading && <ChevronRight size={16}/>}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const STYLES = `
/* Root */
.ob-root {
  display: flex;
  min-height: 100vh;
  background: #f0f4f8;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Sidebar */
.ob-sidebar {
  width: 260px;
  min-height: 100vh;
  background: #0A1628;
  display: flex;
  flex-direction: column;
  padding: 32px 20px;
  position: sticky;
  top: 0;
  flex-shrink: 0;
}
.ob-logo { margin-bottom: 40px; }
.ob-logo-img { height: 40px; width: auto; }
.ob-stepper { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.ob-step-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 10px;
  cursor: default; transition: background 0.2s;
}
.ob-step-item.current { background: rgba(201,168,76,0.15); }
.ob-step-icon {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.08); color: #6b7280;
  flex-shrink: 0; font-size: 12px;
}
.ob-step-item.current .ob-step-icon { background: #C9A84C; color: #0A1628; }
.ob-step-item.done   .ob-step-icon { background: #166534; color: #4ade80; }
.ob-step-label { font-size: 13px; color: #6b7280; font-weight: 500; }
.ob-step-item.current .ob-step-label { color: #e5c87a; font-weight: 600; }
.ob-step-item.done   .ob-step-label { color: #4ade80; }
.ob-sidebar-footer {
  display: flex; align-items: center; gap: 6px;
  color: #4b5563; font-size: 11px; margin-top: 24px;
}

/* Main */
.ob-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
.ob-progress-bar { height: 3px; background: #e5e7eb; }
.ob-progress-fill { height: 100%; background: linear-gradient(90deg, #C9A84C, #E8C87A); transition: width 0.4s ease; }

.ob-content {
  flex: 1; max-width: 720px; width: 100%;
  margin: 0 auto; padding: 48px 24px 80px;
}

.ob-step-header { margin-bottom: 32px; }
.ob-step-num { font-size: 12px; color: #9ca3af; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
.ob-step-title { font-size: 26px; font-weight: 700; color: #0A1628; margin: 6px 0 0; }

/* Form grid */
.ob-form { }
.ob-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.ob-full { grid-column: 1 / -1; }

/* Form elements */
.ob-field { display: flex; flex-direction: column; gap: 6px; }
.ob-label { font-size: 13px; font-weight: 600; color: #374151; }
.ob-input, .ob-select {
  padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px;
  font-size: 14px; color: #111827; background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none; width: 100%; box-sizing: border-box;
}
.ob-input:focus, .ob-select:focus {
  border-color: #C9A84C;
  box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
}
.ob-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 40px; }

/* Password */
.ob-pw-wrap { position: relative; }
.ob-pw-wrap .ob-input { padding-right: 42px; }
.ob-pw-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280; display: flex; }

/* Image upload */
.ob-image-upload { }
.ob-image-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border: 1.5px dashed #d1d5db; border-radius: 10px;
  background: #f9fafb; color: #374151; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  width: 100%;
}
.ob-image-btn:hover { border-color: #C9A84C; background: #fffbeb; }
.ob-image-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ob-image-preview { position: relative; display: inline-block; }
.ob-image-preview img { height: 72px; border-radius: 8px; border: 1px solid #e5e7eb; object-fit: cover; }
.ob-image-remove {
  position: absolute; top: -8px; right: -8px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #ef4444; color: white; font-size: 10px;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
}

/* Color picker */
.ob-color-wrap { display: flex; align-items: center; gap: 10px; }
.ob-color-picker { width: 42px; height: 42px; border: none; border-radius: 8px; cursor: pointer; padding: 2px; background: none; }
.ob-color-wrap .ob-input { flex: 1; }

/* Day pills */
.ob-day-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.ob-day-pill {
  padding: 6px 14px; border: 1.5px solid #e5e7eb; border-radius: 20px;
  font-size: 13px; font-weight: 500; color: #6b7280; background: #f9fafb; cursor: pointer;
  transition: all 0.15s;
}
.ob-day-pill.active { border-color: #C9A84C; background: #fffbeb; color: #92400e; }
.ob-day-pill:hover { border-color: #C9A84C; }

/* Generic pills */
.ob-pill-group { display: flex; flex-wrap: wrap; gap: 8px; }
.ob-pill {
  padding: 6px 16px; border: 1.5px solid #e5e7eb; border-radius: 20px;
  font-size: 13px; font-weight: 500; color: #6b7280; background: #f9fafb; cursor: pointer;
  text-transform: capitalize; transition: all 0.15s;
}
.ob-pill.active { border-color: #0A1628; background: #0A1628; color: #C9A84C; }

/* MR preview */
.ob-mr-preview {
  display: flex; align-items: center; gap: 16px;
  background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 12px;
  padding: 20px 24px;
}
.ob-mr-preview-label { font-size: 13px; color: #6b7280; font-weight: 500; }
.ob-mr-preview-value { font-size: 28px; font-weight: 800; color: #0A1628; letter-spacing: 0.05em; }

/* Info box */
.ob-info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; }
.ob-info-box p { font-size: 13px; color: #1e40af; margin: 0; line-height: 1.6; }

/* Optional badge */
.ob-optional-badge {
  background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;
  padding: 8px 16px; font-size: 12px; color: #92400e; font-weight: 500;
}

/* Prescription preview */
.ob-preview-card { margin-top: 8px; }
.ob-preview-label { font-size: 12px; color: #6b7280; margin-bottom: 10px; font-weight: 500; }
.ob-preview-rx {
  border: 2px solid #0A1628; border-radius: 8px; overflow: hidden;
  background: white; max-width: 340px;
}
.ob-rx-header-img, .ob-rx-footer-img { width: 100%; display: block; max-height: 60px; object-fit: cover; }
.ob-rx-body { padding: 12px 16px; }
.ob-rx-clinic { font-size: 14px; font-weight: 700; }
.ob-rx-doctor { font-size: 11px; color: #6b7280; margin-bottom: 12px; }
.ob-rx-lines { display: flex; flex-direction: column; gap: 6px; }
.ob-rx-line { height: 8px; background: #f3f4f6; border-radius: 4px; }
.ob-rx-line.short { width: 60%; }

/* Navigation */
.ob-nav {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;
}
.ob-btn-primary {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 28px; background: #0A1628; color: #C9A84C;
  border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: background 0.2s;
}
.ob-btn-primary:hover { background: #162236; }
.ob-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.ob-btn-ghost {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 20px; background: transparent; color: #6b7280;
  border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.ob-btn-ghost:hover { border-color: #9ca3af; color: #374151; }
.ob-btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

/* Spinner */
.ob-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(201,168,76,0.3); border-top-color: #C9A84C;
  animation: ob-spin 0.7s linear infinite; display: inline-block;
}
.ob-spinner.white {
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #C9A84C;
}
@keyframes ob-spin { to { transform: rotate(360deg); } }

/* Go Live */
.ob-golive { text-align: center; padding: 40px 20px; }
.ob-golive-icon { font-size: 64px; line-height: 1; margin-bottom: 16px; }
.ob-golive-title { font-size: 32px; font-weight: 800; color: #0A1628; margin: 0 0 8px; }
.ob-golive-sub { font-size: 16px; color: #6b7280; margin: 0 0 32px; }
.ob-golive-summary {
  display: inline-flex; flex-direction: column; gap: 12px;
  text-align: left; background: #f9fafb; border: 1px solid #e5e7eb;
  border-radius: 14px; padding: 20px 28px; margin-bottom: 32px;
  min-width: 280px;
}
.ob-golive-row { display: flex; align-items: center; gap: 10px; color: #374151; font-size: 14px; }
.ob-golive-row svg { color: #C9A84C; flex-shrink: 0; }
.ob-golive-actions { display: flex; flex-direction: column; gap: 12px; align-items: center; }

/* Mobile responsive */
@media (max-width: 768px) {
  .ob-sidebar { display: none; }
  .ob-grid-2 { grid-template-columns: 1fr; }
  .ob-content { padding: 24px 16px 80px; }
}
`;
