'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle, ArrowRight, Star, Menu, X, ChevronDown, ChevronUp,
  Stethoscope, Bot, Receipt, Calendar, MessageCircle, BarChart3,
  Smartphone, Globe, Shield, Zap, Users, Building2, Clock,
  FileText, Bell, Activity, Award, Phone, Mail, MapPin, Play
} from 'lucide-react';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    price: 150,
    period: 'month',
    badge: null,
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.06)',
    border: '#2563EB',
    description: 'Everything a single-doctor clinic needs to run efficiently.',
    features: [
      'Full MediPlex HMIS Platform',
      'AI Clinical Scribe (100 notes/mo)',
      'Appointment & Patient Management',
      'Billing, Invoicing & Receipts',
      'WhatsApp Appointment Reminders',
      'WhatsApp Chatbot (Auto Booking & Queries)',
      'Email Marketing — Unlimited',
      '15 Graphical Posters / month',
      'Prescription & Lab Integration',
      'Analytics Dashboard',
      'Mobile App (PWA)',
      '14-Day Free Trial',
    ],
    cta: 'Start Free Trial',
    href: '/onboarding?plan=starter',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 175,
    period: 'month',
    badge: 'Best Value',
    color: '#C9A84C',
    bg: 'rgba(201,168,76,0.06)',
    border: '#C9A84C',
    description: 'Advanced tools for growing clinics that want to scale faster.',
    features: [
      'Everything in Starter',
      'AI Clinical Scribe — Unlimited',
      'Telemedicine / Video Consult',
      'Patient Portal (Self-booking)',
      'Insurance Claims Management',
      'Multi-Doctor Support (up to 3)',
      'Priority WhatsApp Support',
      'Custom Prescription Branding',
      'Advanced Analytics & Reports',
      'API Access',
      '14-Day Free Trial',
    ],
    cta: 'Start Free Trial',
    href: '/onboarding?plan=professional',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 200,
    period: 'month',
    badge: 'Most Popular',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.06)',
    border: '#10B981',
    description: 'Full marketing engine included. Grow your clinic, not just manage it.',
    features: [
      'Everything in Professional',
      'Meta Promotional Ads (managed)',
      'Google Ads Integration',
      'Social Media Content Calendar',
      'SEO-Optimised Clinic Website',
      'Review Management (Google/Facebook)',
      'Patient Loyalty Programme',
      'Multi-Doctor Support (up to 8)',
      'WhatsApp Broadcast Campaigns',
      'Dedicated Account Manager',
      '14-Day Free Trial',
    ],
    cta: 'Start Free Trial',
    href: '/onboarding?plan=growth',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: null,
    badge: 'Custom',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.06)',
    border: '#7C3AED',
    description: 'Multi-clinic networks, hospital groups and white-label solutions.',
    features: [
      'Unlimited Clinics & Locations',
      'White-Label (your own brand)',
      'Custom Integrations (HIS, LIS, RIS)',
      'Dedicated Cloud Infrastructure',
      'SLA-backed 99.9% Uptime',
      'Custom AI Training on your data',
      'Onsite Training & Onboarding',
      'Legal & Compliance Assistance',
      'Custom Contract & Pricing',
      '24/7 Dedicated Support Line',
    ],
    cta: 'Contact Sales',
    href: 'mailto:info@mediplex.com?subject=Enterprise Enquiry',
  },
];

const FEATURES = [
  { icon: Bot,         title: 'AI Clinical Scribe',       desc: 'Dictate or type — AI generates SOAP notes, prescriptions, referrals and discharge summaries in seconds.', color: '#C9A84C' },
  { icon: MessageCircle, title: 'WhatsApp Automation',    desc: 'Auto appointment confirmations, 24h & 4h reminders, follow-ups and a chatbot that books appointments for you.', color: '#25D366' },
  { icon: Calendar,    title: 'Smart Scheduling',          desc: 'Drag-and-drop calendar, multi-doctor slots, online booking, no-show prediction and bulk reminders.', color: '#2563EB' },
  { icon: Receipt,     title: 'Billing & Invoicing',       desc: 'GST-ready invoices, payment receipts, insurance claims, expense tracking and a full daily cash report.', color: '#10B981' },
  { icon: FileText,    title: 'Prescriptions & Labs',      desc: 'Digital prescriptions with QR codes, auto lab order dispatch, result upload and two-way sync.', color: '#F59E0B' },
  { icon: Smartphone,  title: 'Mobile PWA App',            desc: 'Install on any phone instantly — works offline, push notifications, biometric login and camera capture.', color: '#8B5CF6' },
  { icon: BarChart3,   title: 'Analytics Dashboard',       desc: 'Revenue trends, patient retention, no-show rates, top diagnoses and monthly growth — all in real-time.', color: '#EF4444' },
  { icon: Shield,      title: 'HIPAA-Ready Security',      desc: 'Role-based access, session timeouts, 2FA, complete audit logs and encrypted data at rest.', color: '#0EA5E9' },
];

const FAQS = [
  { q: 'Is MediPlex suitable for any clinic specialty?', a: 'Yes — MediPlex works for General Practice, Pediatrics, Dentistry, Dermatology, Gynecology, ENT, Orthopaedics and any other specialty. The system adapts its language, templates and workflows to your speciality.' },
  { q: 'What happens after the 14-day free trial?', a: 'Your card is not charged during the trial. On day 14 you\'ll receive an email. If you choose to continue, your first payment is processed. You can cancel any time before the trial ends with zero charges.' },
  { q: 'Does MediPlex work without internet?', a: 'Yes. The PWA (Progressive Web App) works offline. Appointments, patient records, prescriptions and lab data are cached locally. All changes sync automatically when connection is restored.' },
  { q: 'Can I migrate my existing patient data?', a: 'Absolutely. Our onboarding team assists with data migration from spreadsheets, other software or paper records. Most migrations are completed within 48 hours.' },
  { q: 'Is my data secure and GDPR compliant?', a: 'MediPlex is hosted on enterprise-grade infrastructure with end-to-end encryption. We are registered in the UK (KLASSICAL HOLDINGS LTD, company 16964688) and fully compliant with GDPR and UK data protection regulations.' },
  { q: 'Can I use my own clinic branding?', a: 'Yes. Upload your logo, header and footer images. All prescriptions, invoices, receipts and WhatsApp messages carry your clinic\'s brand identity — not MediPlex\'s.' },
  { q: 'What is the WhatsApp Chatbot?', a: 'The chatbot answers patient queries, checks appointment availability, confirms bookings and sends reminders — 24/7, automatically. Patients message your clinic\'s WhatsApp number and the bot handles it.' },
  { q: 'Can I have multiple doctors/staff on one account?', a: 'Yes. Starter supports 1 doctor. Professional supports up to 3. Growth supports up to 8. Enterprise is unlimited. Each user has role-based access (Admin, Doctor, Receptionist).' },
];

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const dur = 2000;
        const steps = 60;
        const inc = target / steps;
        let cur = 0;
        const t = setInterval(() => {
          cur += inc;
          if (cur >= target) { setCount(target); clearInterval(t); }
          else setCount(Math.floor(cur));
        }, dur / steps);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group">
        <span className="text-[15px] font-semibold text-gray-800 group-hover:text-[#0A1628] transition-colors">{q}</span>
        {open ? <ChevronUp size={16} className="text-[#C9A84C] flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && <p className="text-[14px] text-gray-500 leading-relaxed pb-4">{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [yearly,     setYearly]     = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const discountedPrice = (p: number) => yearly ? Math.round(p * 10) : p;

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/icons/mediplex-logo.svg" alt="MediPlex" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[['Features','#features'],['Pricing','#pricing'],['How It Works','#howitworks'],['FAQ','#faq']].map(([l,h])=>(
              <a key={h} href={h} className={`text-[13px] font-medium transition-colors ${scrolled?'text-gray-600 hover:text-[#0A1628]':'text-white/80 hover:text-white'}`}>{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className={`text-[13px] font-medium transition-colors ${scrolled?'text-gray-600 hover:text-[#0A1628]':'text-white/80 hover:text-white'}`}>
              Sign In
            </Link>
            <Link href="/onboarding" className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#0A1628] transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
              Start Free Trial
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X size={20} className={scrolled?'text-gray-800':'text-white'} /> : <Menu size={20} className={scrolled?'text-gray-800':'text-white'} />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
            {[['Features','#features'],['Pricing','#pricing'],['How It Works','#howitworks'],['FAQ','#faq']].map(([l,h])=>(
              <a key={h} href={h} onClick={()=>setMobileMenu(false)} className="block text-[14px] font-medium text-gray-700 py-2 border-b border-gray-50">{l}</a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="text-center py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Sign In</Link>
              <Link href="/onboarding" className="text-center py-2.5 rounded-xl text-[13px] font-semibold text-[#0A1628]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>Start Free Trial — Free for 14 Days</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 40%, #0F1E3A 70%, #0A1628 100%)' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20" style={{ background: '#C9A84C' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-15" style={{ background: '#2563EB' }} />

        <div className="relative max-w-7xl mx-auto px-6 py-20 text-center">
          {/* UK Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[12px] font-medium"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#E8C87A' }}>
            <span>🇬🇧</span> UK Registered · KLASSICAL HOLDINGS LTD · Company 16964688
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 max-w-5xl mx-auto">
            The Complete<br />
            <span style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              HMIS
            </span>{' '}
            for Modern Clinics
          </h1>

          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI Scribe. Smart Scheduling. WhatsApp Automation. Digital Prescriptions.
            Everything your clinic needs — in one beautifully designed platform.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/onboarding"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-bold text-[#0A1628] transition-all hover:shadow-2xl hover:-translate-y-1 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', boxShadow: '0 8px 32px rgba(201,168,76,0.35)' }}>
              Start Free Trial — 14 Days Free <ArrowRight size={16} />
            </Link>
            <a href="#features"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-white transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
              <Play size={14} /> See How It Works
            </a>
          </div>

          {/* Animated Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { val: 500,  sfx: '+', label: 'Clinics Worldwide' },
              { val: 2000000, sfx: '+', label: 'Prescriptions Generated' },
              { val: 50,   sfx: '+', label: 'Cities Covered' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-black" style={{ color: '#C9A84C' }}>
                  <AnimatedCounter target={s.val} suffix={s.sfx} />
                </div>
                <div className="text-[12px] text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 20C1200 60 900 0 720 20C540 40 240 0 0 20L0 60Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── TRUSTED BY ─────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[12px] uppercase tracking-widest text-gray-400 font-semibold mb-8">Trusted by clinics across the globe</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40">
            {['General Practice','Pediatrics','Dentistry','Cardiology','Dermatology','Orthopedics'].map(s => (
              <div key={s} className="text-[13px] font-bold text-gray-500 tracking-wide">{s}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-4"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
              ✦ Platform Features
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0A1628] mb-4">Built for how clinics<br/>actually work</h2>
            <p className="text-[16px] text-gray-500 max-w-xl mx-auto">Every feature is designed with real clinical workflows in mind — not generic software bolted together.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-100 hover:border-[#C9A84C]/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: f.color + '15' }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-[15px] font-bold text-[#0A1628] mb-2">{f.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="howitworks" className="py-24" style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-4"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#E8C87A' }}>
              ✦ Simple Setup
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Up and running in<br/>under 10 minutes</h2>
            <p className="text-[16px] text-white/50">No IT team needed. No complex installation. Just sign up and go.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step:'01', icon: Globe, title:'Sign Up & Choose Plan', desc:'Pick your package, start your 14-day free trial. No credit card required to begin.', color:'#C9A84C' },
              { step:'02', icon: Building2, title:'Complete Onboarding Wizard', desc:'8 quick steps to configure your clinic, doctor profile, schedule, billing and branding.', color:'#38BDF8' },
              { step:'03', icon: Activity, title:'Go Live Instantly', desc:'Your clinic is live. Patients can book. AI Scribe is ready. WhatsApp is connected.', color:'#10B981' },
            ].map((s,i) => (
              <div key={i} className="relative text-center">
                {i < 2 && <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />}
                <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center mx-auto mb-5"
                  style={{ background: s.color + '15', border: `1px solid ${s.color}30` }}>
                  <s.icon size={28} style={{ color: s.color }} />
                </div>
                <div className="text-[11px] font-bold mb-2" style={{ color: s.color }}>{s.step}</div>
                <h3 className="text-[17px] font-bold text-white mb-2">{s.title}</h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHATSAPP HIGHLIGHT ──────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-6"
                style={{ background: 'rgba(37,211,102,0.1)', color: '#16a34a' }}>
                💬 WhatsApp Automation
              </div>
              <h2 className="text-4xl font-black text-[#0A1628] leading-tight mb-5">Your clinic never stops<br/><span style={{ color: '#25D366' }}>working</span>, even at 3am</h2>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
                The WhatsApp Chatbot handles appointment requests, answers FAQs, sends confirmations and reminders — completely automatically. Your staff focus on care, not admin.
              </p>
              <div className="space-y-3">
                {[
                  'Auto appointment booking via WhatsApp',
                  '24h & 4h smart reminders with no-show prediction',
                  'Instant replies to patient queries 24/7',
                  'Bulk WhatsApp campaigns for promotions',
                  'Payment receipts delivered instantly',
                ].map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <CheckCircle size={16} className="text-[#25D366] flex-shrink-0" />
                    <span className="text-[14px] text-gray-600">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* WhatsApp mockup */}
            <div className="relative">
              <div className="bg-[#0A1628] rounded-3xl p-6 shadow-2xl max-w-xs mx-auto">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0A1628' }}>M+</div>
                  <div>
                    <div className="text-white text-[13px] font-semibold">MediPlex Clinic</div>
                    <div className="text-[#25D366] text-[10px]">● Online</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { msg: 'Hi! I need an appointment for tomorrow', from: 'patient' },
                    { msg: '✅ Hi Sara! We have slots available:\n• 10:00 AM\n• 2:00 PM\nWhich do you prefer?', from: 'bot' },
                    { msg: '10am please', from: 'patient' },
                    { msg: '🎉 Appointment confirmed!\nTomorrow, 10:00 AM\nDr. Ahmad — General Practice\n\nReminder will be sent tonight.', from: 'bot' },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.from==='patient'?'justify-end':'justify-start'}`}>
                      <div className="px-3 py-2 rounded-xl text-[11px] leading-relaxed max-w-[80%] whitespace-pre-line"
                        style={{
                          background: m.from==='patient' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)',
                          color: m.from==='patient' ? '#E8C87A' : 'rgba(255,255,255,0.85)',
                          borderRadius: m.from==='patient' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        }}>
                        {m.msg}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-[#25D366] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                Available 24/7
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-4"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
              ✦ Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0A1628] mb-4">Simple pricing.<br/>Serious value.</h2>
            <p className="text-[16px] text-gray-500 mb-8">All plans include a 14-day free trial. No credit card required.</p>
            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl p-1.5 border border-gray-200 shadow-sm">
              <button onClick={() => setYearly(false)}
                className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${!yearly ? 'bg-[#0A1628] text-white shadow-sm' : 'text-gray-500'}`}>
                Monthly
              </button>
              <button onClick={() => setYearly(true)}
                className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 ${yearly ? 'bg-[#0A1628] text-white shadow-sm' : 'text-gray-500'}`}>
                Yearly <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: yearly ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PACKAGES.map(pkg => (
              <div key={pkg.id}
                className="relative bg-white rounded-3xl p-7 flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                style={{
                  border: pkg.badge === 'Most Popular' ? `2px solid ${pkg.color}` : '1px solid #E5E7EB',
                  boxShadow: pkg.badge === 'Most Popular' ? `0 8px 40px ${pkg.color}25` : undefined,
                }}>
                {pkg.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: pkg.color }}>
                    {pkg.badge}
                  </div>
                )}
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: pkg.color }}>{pkg.name}</div>
                  {pkg.price ? (
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-black text-[#0A1628]">£{yearly ? discountedPrice(pkg.price) : pkg.price}</span>
                      <span className="text-[13px] text-gray-400">/{yearly ? 'year' : 'mo'}</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-black text-[#0A1628] mb-1">Custom</div>
                  )}
                  <p className="text-[12px] text-gray-400 mb-6 leading-relaxed">{pkg.description}</p>
                  <Link href={pkg.href}
                    className="block w-full text-center py-3 rounded-2xl text-[13px] font-bold mb-7 transition-all hover:shadow-lg hover:-translate-y-0.5"
                    style={{
                      background: pkg.badge === 'Most Popular' ? pkg.color : 'transparent',
                      color: pkg.badge === 'Most Popular' ? '#fff' : pkg.color,
                      border: `1.5px solid ${pkg.color}`,
                    }}>
                    {pkg.cta} {pkg.price ? '→' : ''}
                  </Link>
                </div>
                <div className="space-y-2.5 flex-1">
                  {pkg.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: pkg.color }} />
                      <span className="text-[13px] text-gray-600 leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[12px] text-gray-400 mt-8">
            All prices in GBP. VAT may apply. Cancel anytime.
            <a href="mailto:info@mediplex.com" className="text-[#C9A84C] hover:underline ml-1">Questions? Email us →</a>
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-[#0A1628] mb-3">Loved by clinicians worldwide</h2>
            <p className="text-[16px] text-gray-500">Real feedback from real doctors</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:'Dr. Sarah Williams', role:'General Practitioner, London', text:'MediPlex replaced three separate tools in one go. The AI Scribe alone saves me 90 minutes every day. I cannot imagine going back.', rating:5 },
              { name:'Dr. Ahmed Al-Rashid', role:'Pediatrician, Manchester', text:'The WhatsApp automation has completely eliminated no-shows. Patients love it and my receptionist now handles triple the load.', rating:5 },
              { name:'Dr. Priya Sharma', role:'Dermatologist, Birmingham', text:'Setup was genuinely 10 minutes. Clean interface, brilliant mobile app, and the billing is finally stress-free. Worth every penny.', rating:5 },
            ].map((t,i) => (
              <div key={i} className="p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="flex gap-1 mb-4">
                  {Array(t.rating).fill(0).map((_,j) => <Star key={j} size={14} className="text-[#C9A84C] fill-[#C9A84C]" />)}
                </div>
                <p className="text-[14px] text-gray-600 leading-relaxed mb-5 italic">"{t.text}"</p>
                <div>
                  <div className="text-[14px] font-bold text-[#0A1628]">{t.name}</div>
                  <div className="text-[12px] text-gray-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-[#0A1628] mb-3">Frequently Asked Questions</h2>
            <p className="text-[16px] text-gray-500">Everything you need to know before getting started.</p>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            {FAQS.map((f, i) => <FaqItem key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.6) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-5">Ready to transform<br/>your clinic?</h2>
          <p className="text-[17px] text-white/55 mb-10 leading-relaxed">
            Join 500+ clinics already running smarter with MediPlex.<br/>
            14 days free. No card required. Setup in 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding"
              className="flex items-center gap-2 px-10 py-4 rounded-2xl text-[15px] font-bold text-[#0A1628] transition-all hover:shadow-2xl hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', boxShadow: '0 8px 32px rgba(201,168,76,0.4)' }}>
              Start Free Trial Now <ArrowRight size={16} />
            </Link>
            <a href="mailto:info@mediplex.com"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-white border border-white/20 hover:bg-white/5 transition-all">
              <Mail size={15} /> Talk to Sales
            </a>
          </div>
          <p className="text-[12px] text-white/25 mt-6">No setup fees · Cancel anytime · GDPR compliant · UK registered</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-[#040C1A] text-white/50 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <img src="/icons/mediplex-logo.svg" alt="MediPlex" className="h-8 mb-4 brightness-200" />
              <p className="text-[13px] leading-relaxed mb-5">
                The Complete HMIS for Modern Clinics. AI-powered, cloud-based, globally trusted.
              </p>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center gap-2"><Mail size={12}/> info@mediplex.com</div>
                <div className="flex items-center gap-2"><Phone size={12}/> +44 7776 387877</div>
                <div className="flex items-center gap-2"><MapPin size={12}/> United Kingdom 🇬🇧</div>
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[13px] mb-4 uppercase tracking-widest">Platform</div>
              <div className="space-y-2 text-[13px]">
                {['Features','Pricing','How It Works','Mobile App','AI Scribe','WhatsApp Bot'].map(l=>(
                  <div key={l} className="hover:text-white cursor-pointer transition-colors">{l}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[13px] mb-4 uppercase tracking-widest">Company</div>
              <div className="space-y-2 text-[13px]">
                {['About Us','Blog','Contact','Privacy Policy','Terms of Service','GDPR'].map(l=>(
                  <div key={l} className="hover:text-white cursor-pointer transition-colors">{l}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[13px] mb-4 uppercase tracking-widest">Support</div>
              <div className="space-y-2 text-[13px]">
                <a href="https://wa.me/447776387877" className="flex items-center gap-2 hover:text-white transition-colors">
                  💬 WhatsApp Support
                </a>
                <div className="flex items-center gap-2">
                  <Clock size={12}/> 24/7 Help Available
                </div>
                <a href="mailto:info@mediplex.com" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail size={12}/> Email Support
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[12px]">
              © 2025 MediPlex · <span className="text-white/30">KLASSICAL HOLDINGS LTD · Company No. 16964688 · Registered in England & Wales</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <a href="https://find-and-update.company-information.service.gov.uk/company/16964688"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-white transition-colors">
                🇬🇧 Verify on Companies House
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
