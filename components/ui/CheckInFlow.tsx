'use client';

// At the top, add supabase import
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import {
  X, Save, AlertTriangle, ChevronRight, Receipt, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  saveInvoice, setHealth, getHealth, addVitals,
  getInvoiceByApt, patientKey, InvoiceRecord, VitalSigns
} from '@/lib/store';

const METHODS      = ['Cash','Card','Online Transfer','Insurance','Waived'];
const BLOOD_GROUPS = ['','A+','A-','B+','B-','AB+','AB-','O+','O-'];
const FREQ         = ['Once daily','Twice daily','Three times daily','Four times daily','Every 6 hours','Every 8 hours','As needed','Before meals','After meals','At bedtime'];

function genId() { return `INV-${Date.now().toString(36).toUpperCase()}`; }

interface Props {
  appointment:  Appointment;
  onComplete:   (invoiceCreated: boolean) => void; // called when flow done
  onCancel:     () => void;                         // called when user cancels
}

type Step = 'invoice' | 'vitals' | 'done';

export default function CheckInFlow({ appointment: a, onComplete, onCancel }: Props) {
  const existingInv = getInvoiceByApt(a.id);
  const [step, setStep] = useState<Step>(existingInv ? 'vitals' : 'invoice');

  // ── Invoice form state ──────────────────────────────────────────────────────
  const [inv, setInv] = useState<Partial<InvoiceRecord>>({
    id:            existingInv?.id || genId(),
    appointmentId: a.id,
    childName:     a.childName,
    parentName:    a.parentName,
    date:          a.appointmentDate,
    visitType:     a.visitType,
    reason:        a.reason,
    feeAmount:     existingInv?.feeAmount || 500,
    discount:      existingInv?.discount  || 0,
    paid:          existingInv?.paid      || 0,
    paymentMethod: existingInv?.paymentMethod || 'Cash',
    notes:         existingInv?.notes || '',
    createdAt:     existingInv?.createdAt || new Date().toISOString(),
  });

  // ── Vitals form state ───────────────────────────────────────────────────────
  const existingHealth = getHealth(patientKey(a.childName));
  const [vitals, setVitals] = useState<Partial<VitalSigns & { bloodGroup: string; allergies: string }>>({
    weight:      '',
    height:      '',
    bp:          '',
    pulse:       '',
    temperature: '',
    bloodGroup:  existingHealth.bloodGroup || '',
    allergies:   existingHealth.allergies  || '',
    recordedAt:  new Date().toISOString().split('T')[0],
  });

  const net = (inv.feeAmount||0) - (inv.discount||0);
  const due = Math.max(0, net - (inv.paid||0));
  const payStatus: InvoiceRecord['paymentStatus'] =
    (inv.paid||0) >= net ? 'Paid' : (inv.paid||0) > 0 ? 'Partial' : 'Unpaid';

  // ── Save invoice and go to vitals ──────────────────────────────────────────
  const handleSaveInvoice = async () => {
  if (!inv.feeAmount) { toast.error('Please enter a fee amount'); return; }
  
  const record: InvoiceRecord = { ...inv as InvoiceRecord, paymentStatus: payStatus };
  
  // 1. Save to localStorage (keeps existing flow working)
  saveInvoice(record);

  // 2. Also save to Supabase so Billing tab sees it
  try {
    const { error } = await supabase.from('billing').upsert([{
      invoice_number:   record.id,
      mr_number:        (a as any).mr_number || '',
      child_name:       record.childName,
      parent_name:      record.parentName,
      date:             record.date,
      visit_type:       record.visitType  || '',
      reason:           record.reason     || '',
      consultation_fee: record.feeAmount,
      discount:         record.discount   || 0,
      amount_paid:      record.paid       || 0,
      payment_method:   record.paymentMethod || 'Cash',
      payment_status:   payStatus,
      notes:            record.notes      || '',
    }], { onConflict: 'invoice_number' });

    if (error) {
      console.error('Supabase billing error:', error);
      toast.error('Invoice saved locally but failed to sync: ' + error.message);
    } else {
      toast.success(`Invoice ${record.id} saved`);
    }
  } catch (err: any) {
    console.error('Supabase billing error:', err);
    toast.error('Invoice saved locally but failed to sync: ' + err.message);
  }

  setStep('vitals');
};

  // ── Skip invoice (warn) ────────────────────────────────────────────────────
  const handleSkipInvoice = () => {
    if (!confirm('Invoice not saved. Check-in will be reversed to "Not Set". Continue without invoice?')) return;
    onCancel();
  };

  // ── Save vitals and complete ───────────────────────────────────────────────
  const handleSaveVitals = () => {
    const key = patientKey(a.childName);
    const health = getHealth(key);

    // Save blood group + allergies to health record
    if (vitals.bloodGroup) health.bloodGroup = vitals.bloodGroup;
    if (vitals.allergies)  health.allergies  = vitals.allergies;
    setHealth(key, health);

    // Add vitals entry if any vital was entered
    if (vitals.weight || vitals.height || vitals.bp || vitals.pulse || vitals.temperature) {
      addVitals(key, {
        weight:      vitals.weight      || '',
        height:      vitals.height      || '',
        bp:          vitals.bp          || '',
        pulse:       vitals.pulse       || '',
        temperature: vitals.temperature || '',
        recordedAt:  vitals.recordedAt  || new Date().toISOString().split('T')[0],
      });
    }

    toast.success('Patient record updated');
    onComplete(true);
  };

  const handleSkipVitals = () => {
    onComplete(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(10,22,40,0.7)' }}>
      <div className="card w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'#f5edd8', color:'#a07a2a', fontSize:16, fontWeight:700 }}>
              {a.childName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-navy text-[15px]">{a.childName}</div>
              <div className="text-[12px] text-gray-400">Parent: {a.parentName} · {formatUSDate(a.appointmentDate)} · {a.appointmentTime}</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-5 py-3 border-b border-black/5 bg-gray-50 flex-shrink-0">
          {[
            { key:'invoice', label:'Invoice', icon: Receipt },
            { key:'vitals',  label:'Patient Vitals', icon: Activity },
          ].map((s, i) => {
            const done    = (s.key === 'invoice' && step === 'vitals') || step === 'done';
            const active  = step === s.key;
            return (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  active  ? 'bg-navy text-white' :
                  done    ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  <s.icon size={13}/>
                  {done ? '✓ ' : ''}{s.label}
                </div>
                {i === 0 && <ChevronRight size={14} className="text-gray-300 mx-1"/>}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── INVOICE STEP ── */}
          {step === 'invoice' && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-[12px]"
                style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)' }}>
                <span className="font-medium text-amber-800">Invoice required for check-in.</span>
                <span className="text-amber-700"> Without a saved invoice, check-in will be reversed.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Consultation Fee (PKR)</label>
                  <input type="number" value={inv.feeAmount || ''}
                    onChange={e => setInv(p => ({...p, feeAmount:Number(e.target.value)}))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Discount (PKR)</label>
                  <input type="number" value={inv.discount || ''}
                    onChange={e => setInv(p => ({...p, discount:Number(e.target.value)}))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Amount Paid (PKR)</label>
                  <input type="number" value={inv.paid || ''}
                    onChange={e => setInv(p => ({...p, paid:Number(e.target.value)}))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Payment Method</label>
                  <select value={inv.paymentMethod}
                    onChange={e => setInv(p => ({...p, paymentMethod:e.target.value}))}
                    className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 rounded-xl p-4 text-center"
                style={{ background:'#f9f7f3', border:'1px solid rgba(201,168,76,0.15)' }}>
                {[
                  { label:'Net Amount',  value:`PKR ${net.toLocaleString()}`,   color:'#0a1628' },
                  { label:'Paid',        value:`PKR ${(inv.paid||0).toLocaleString()}`, color:'#1a7f5e' },
                  { label:'Balance Due', value:`PKR ${due.toLocaleString()}`,   color: due>0?'#c53030':'#1a7f5e' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{s.label}</div>
                    <div className="text-[16px] font-bold" style={{ color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Notes</label>
                <input type="text" placeholder="Optional notes..." value={inv.notes||''}
                  onChange={e => setInv(p => ({...p, notes:e.target.value}))}
                  className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveInvoice} className="btn-gold gap-1.5 text-[13px] py-2.5 px-5 flex-1">
                  <Save size={14}/> Save Invoice & Continue
                </button>
                <button onClick={handleSkipInvoice}
                  className="btn-outline text-[12px] py-2 px-3 text-red-500 border-red-200 hover:border-red-400">
                  Skip (cancel check-in)
                </button>
              </div>
            </div>
          )}

          {/* ── VITALS STEP ── */}
          {step === 'vitals' && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-[12px]"
                style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                <span className="font-medium text-emerald-800">Invoice saved ✓</span>
                <span className="text-emerald-700"> Now record patient vitals and health information.</span>
              </div>

              {/* Vital signs */}
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-2">Vital Signs</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label:'Weight (kg)',     key:'weight',      placeholder:'e.g. 18.5' },
                    { label:'Height (cm)',     key:'height',      placeholder:'e.g. 105'  },
                    { label:'Blood Pressure',  key:'bp',          placeholder:'e.g. 110/70' },
                    { label:'Pulse (bpm)',     key:'pulse',       placeholder:'e.g. 88'   },
                    { label:'Temperature (°C)',key:'temperature', placeholder:'e.g. 37.2' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">{f.label}</label>
                      <input type="text" placeholder={f.placeholder}
                        value={(vitals as Record<string,string>)[f.key] || ''}
                        onChange={e => setVitals(p => ({...p, [f.key]:e.target.value}))}
                        className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Date</label>
                    <input type="date" value={vitals.recordedAt||''}
                      onChange={e => setVitals(p => ({...p, recordedAt:e.target.value}))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                  </div>
                </div>
              </div>

              {/* Health info */}
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-2">Health Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Blood Group</label>
                    <select value={vitals.bloodGroup||''}
                      onChange={e => setVitals(p => ({...p, bloodGroup:e.target.value}))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold">
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g||'Select...'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-medium block mb-1">Known Allergies</label>
                    <input type="text" placeholder="e.g. Penicillin, Peanuts"
                      value={vitals.allergies||''}
                      onChange={e => setVitals(p => ({...p, allergies:e.target.value}))}
                      className="w-full border border-black/10 rounded-lg px-3 py-2 text-[13px] text-navy bg-white outline-none focus:border-gold"/>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveVitals} className="btn-gold gap-1.5 text-[13px] py-2.5 px-5 flex-1">
                  <Save size={14}/> Save & Complete Check-In
                </button>
                <button onClick={handleSkipVitals} className="btn-outline text-[12px] py-2 px-3">
                  Skip Vitals
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
