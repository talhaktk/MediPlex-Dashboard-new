'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Mail, Phone, MapPin, MessageCircle, Building2,
  Send, CheckCircle, Clock, Globe, ArrowRight,
} from 'lucide-react';

const SUBJECTS = [
  'Book a Demo',
  'Package 1 — Professional',
  'Package 2 — Growth',
  'Enterprise / Custom Pricing',
  'Technical Support',
  'Partnership Enquiry',
  'Other',
];

function LogoMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
      <img src="/icons/icon.svg" alt="MediPlex" style={{ height: 32, width: 32, borderRadius: 7 }} />
      <span style={{ fontWeight: 700, letterSpacing: '-0.5px', fontSize: '16px', lineHeight: 1 }}>
        <span style={{ color: '#0A1628' }}>Medi</span>
        <span style={{ color: '#C9A84C' }}>Plex</span>
      </span>
    </Link>
  );
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { setError('Please fill in name, email and message.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const d = await res.json();
        setError(d.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] text-[#0A1628] placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white";
  const inputFocus = "focus:ring-[#C9A84C]/30";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>

      {/* Top bar */}
      <div className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-15 py-4 flex items-center justify-between">
          <LogoMark />
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#0A1628] transition-colors">
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <Link href="/onboarding"
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-[#0A1628] transition-all hover:shadow-md"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
              Free Trial
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }} className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 tracking-wide"
            style={{ background: 'rgba(201,168,76,0.12)', color: '#E8C87A', border: '1px solid rgba(201,168,76,0.22)' }}>
            ✦ Get In Touch
          </div>
          <h1 className="font-black text-white mb-4"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
            Let's talk about<br />
            <span style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              your clinic
            </span>
          </h1>
          <p className="text-white/55" style={{ fontSize: 16 }}>
            Book a demo, ask a question, or get a custom quote. We reply within 2 hours.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-12">

          {/* Left — contact info */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <h2 className="text-[18px] font-bold text-[#0A1628] mb-5" style={{ letterSpacing: '-0.02em' }}>Contact Information</h2>
              <div className="space-y-4">
                {[
                  { icon: Mail,         label: 'Email',            val: 'info@klassicalholdings.com', href: 'mailto:info@klassicalholdings.com' },
                  { icon: MessageCircle,label: 'WhatsApp',          val: '+44 7776 387877',            href: 'https://wa.me/447776387877' },
                  { icon: Phone,        label: 'Phone',            val: '+44 7776 387877',            href: 'tel:+447776387877' },
                  { icon: MapPin,       label: 'Location',         val: 'United Kingdom 🇬🇧',         href: undefined },
                  { icon: Building2,    label: 'Company',          val: 'KLASSICAL HOLDINGS LTD\nCo. No. 16964688', href: undefined },
                ].map(({ icon: Icon, label, val, href }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <Icon size={15} style={{ color: '#C9A84C' }} />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</div>
                      {href
                        ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                            className="text-[14px] text-[#0A1628] font-medium hover:text-[#C9A84C] transition-colors whitespace-pre-line">
                            {val}
                          </a>
                        : <div className="text-[14px] text-[#0A1628] font-medium whitespace-pre-line">{val}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} style={{ color: '#C9A84C' }} />
                <span className="text-[13px] font-semibold text-[#0A1628]">Typical Response Time</span>
              </div>
              <p className="text-[13px] text-gray-500">We reply to all enquiries within <span className="font-semibold text-[#0A1628]">2 business hours</span> during Mon–Fri 9am–6pm GMT.</p>
            </div>

            {/* WhatsApp quick contact */}
            <a href="https://wa.me/447776387877?text=Hi%20MediPlex%2C%20I%27d%20like%20to%20know%20more%20about%20your%20platform"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#25D366' }}>
                <MessageCircle size={18} className="text-white" />
              </div>
              <div>
                <div className="text-[14px] font-semibold" style={{ color: '#15803d' }}>Chat on WhatsApp</div>
                <div className="text-[12px] text-gray-500">Quick response · Available now</div>
              </div>
              <ArrowRight size={14} style={{ color: '#25D366', marginLeft: 'auto' }} />
            </a>

            {/* What to expect */}
            <div>
              <h3 className="text-[14px] font-bold text-[#0A1628] mb-3">What happens next?</h3>
              <ol className="space-y-3">
                {[
                  "We receive your message and review your requirements",
                  "A MediPlex specialist replies within 2 hours",
                  "We schedule a personalised demo at your convenience",
                  "Your clinic is set up and live within 24 hours",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                      style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>{i+1}</div>
                    <span className="text-[13px] text-gray-500">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right — form */}
          <div className="md:col-span-3">
            {done ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <CheckCircle size={30} style={{ color: '#C9A84C' }} />
                </div>
                <h2 className="text-[26px] font-black text-[#0A1628] mb-3" style={{ letterSpacing: '-0.03em' }}>Message sent!</h2>
                <p className="text-gray-500 mb-8 max-w-sm">
                  Thank you for reaching out. We'll get back to you within 2 hours. Check your email for a confirmation.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/"
                    className="px-6 py-3 rounded-xl text-[13px] font-semibold text-[#0A1628] transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                    Back to Home
                  </Link>
                  <a href="https://wa.me/447776387877"
                    className="px-6 py-3 rounded-xl text-[13px] font-medium border border-gray-200 text-gray-600 hover:border-gray-400 transition-all">
                    WhatsApp Us Instead
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <h2 className="text-[20px] font-black text-[#0A1628] mb-6" style={{ letterSpacing: '-0.03em' }}>Send us a message</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
                    <input type="text" placeholder="Dr. Ahmed Khan" value={form.name} onChange={set('name')}
                      className={`${inputClass} ${inputFocus}`} required />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email Address *</label>
                    <input type="email" placeholder="doctor@clinic.com" value={form.email} onChange={set('email')}
                      className={`${inputClass} ${inputFocus}`} required />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">WhatsApp / Phone</label>
                    <input type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={set('phone')}
                      className={`${inputClass} ${inputFocus}`} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Subject</label>
                    <select value={form.subject} onChange={set('subject')} className={`${inputClass} ${inputFocus}`}>
                      <option value="">Select a subject...</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Message *</label>
                  <textarea placeholder="Tell us about your clinic, number of doctors, specialty, and what you're looking for..." value={form.message} onChange={set('message')}
                    rows={6} className={`${inputClass} ${inputFocus} resize-none`} required />
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl text-[13px] text-red-600" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-[#0A1628] transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                    <Send size={15} />
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                  <p className="text-[12px] text-gray-400">
                    Or reach us directly:{' '}
                    <a href="mailto:info@klassicalholdings.com" className="text-[#C9A84C] hover:underline">info@klassicalholdings.com</a>
                  </p>
                </div>

                <p className="text-[11px] text-gray-400 pt-1">
                  By submitting this form you agree to our Privacy Policy. Your information is used solely to respond to your enquiry.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom info strip */}
      <div className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-8 text-center">
          {[
            { icon: Clock,   label: '2hr response',    sub: 'Mon–Fri 9am–6pm GMT' },
            { icon: Globe,   label: 'Global clinics',  sub: 'UK · Pakistan · AU · SA' },
            { icon: CheckCircle, label: '14-day trial', sub: 'No credit card needed' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={16} style={{ color: '#C9A84C' }} />
              <div className="text-left">
                <div className="text-[13px] font-semibold text-[#0A1628]">{label}</div>
                <div className="text-[11px] text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
