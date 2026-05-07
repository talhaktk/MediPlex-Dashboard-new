'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle, ArrowRight, Star, Menu, X, ChevronDown, ChevronUp,
  Bot, Receipt, Calendar, MessageCircle, BarChart3, Smartphone,
  Globe, Shield, Zap, Users, FileText, Bell, Activity, Mail,
  MapPin, Phone, TrendingUp, Palette, WifiOff, Target,
  Search, Image as ImageIcon, Megaphone, CreditCard, Lock,
  ClipboardList, UserCircle, Building2, Stethoscope, FlaskConical,
  Play, Clock,
} from 'lucide-react';

const ALL_FEATURES = [
  { icon: Bot,          color: '#C9A84C', title: 'AI Clinical Scribe',         desc: 'SOAP notes, prescriptions, referrals, discharge summaries & pre-auth insurance letters generated in seconds.' },
  { icon: MessageCircle,color: '#25D366', title: 'WhatsApp AI Receptionist',   desc: 'Answers queries, confirms bookings, sends reminders & follow-ups — 24/7 on your clinic number.' },
  { icon: Calendar,     color: '#2563EB', title: 'Smart Scheduling',            desc: 'Drag-and-drop calendar, multi-doctor slots, online booking and no-show prediction.' },
  { icon: Receipt,      color: '#10B981', title: 'Billing & Invoicing',         desc: 'GST/VAT-ready invoices, receipts, insurance claims, expense tracking and daily cash reports.' },
  { icon: FlaskConical, color: '#F59E0B', title: 'Lab Integration',             desc: 'QR-based lab orders, result upload, patient result portal and two-way sync with labs.' },
  { icon: UserCircle,   color: '#8B5CF6', title: 'Patient Portal',              desc: 'Self-registration, appointment booking, medical records, prescriptions and lab results — online.' },
  { icon: BarChart3,    color: '#EF4444', title: 'Analytics Dashboard',         desc: 'Revenue trends, patient retention, no-show rates, top diagnoses and monthly growth.' },
  { icon: Shield,       color: '#0EA5E9', title: 'Security & Compliance',       desc: 'Role-based access, 2FA, session timeouts, audit logs and GDPR/HIPAA-ready encryption.' },
  { icon: TrendingUp,   color: '#C9A84C', title: 'No-Show Predictions',         desc: 'AI predicts likely no-shows 24h ahead so you can double-book or send extra nudges.' },
  { icon: Palette,      color: '#EC4899', title: 'Clinic Branding',             desc: 'Your logo, colours, header and footer on prescriptions, invoices, receipts and WhatsApp messages.' },
  { icon: Bell,         color: '#F97316', title: 'Auto Reminders & Feedback',   desc: 'Confirmation, 24h reminder, 4h reminder, follow-up and satisfaction survey — all automatic.' },
  { icon: Smartphone,   color: '#6366F1', title: 'Mobile & Desktop App',        desc: 'Install on any phone or PC as a PWA — no app store needed, works offline with biometric login.' },
  { icon: WifiOff,      color: '#14B8A6', title: 'Offline Mode',                desc: 'Full functionality without internet. Appointments, prescriptions and labs sync on reconnect.' },
  { icon: Target,       color: '#F43F5E', title: 'Meta & Google Ads',           desc: 'Managed Facebook & Instagram ad campaigns targeting local patients, linked to your booking system.' },
  { icon: Search,       color: '#84CC16', title: 'SEO Clinic Website',          desc: 'Professional, fast, SEO-optimised clinic website that ranks locally and drives organic bookings.' },
  { icon: ImageIcon,    color: '#A78BFA', title: 'Graphical Posters',           desc: '15–20 branded health awareness posters every month for Instagram, Facebook and WhatsApp.' },
  { icon: Mail,         color: '#38BDF8', title: 'Email Marketing',             desc: 'Unlimited campaigns — health tips, appointment recalls, promotions — from your clinic brand.' },
  { icon: ClipboardList,color: '#FB923C', title: 'Pre-Auth Insurance',          desc: 'Generate insurance pre-authorisation letters instantly using AI from patient records.' },
  { icon: Megaphone,    color: '#C9A84C', title: 'WhatsApp Broadcast',          desc: 'Send health campaigns, seasonal offers and appointment recalls to your entire patient list.' },
  { icon: Activity,     color: '#4ADE80', title: 'Telemedicine',                desc: 'Built-in video consultations, digital prescriptions and secure patient messaging.' },
];

const FAQS = [
  { q: 'Is MediPlex suitable for any clinic specialty?',    a: 'Yes — MediPlex works for General Practice, Pediatrics, Dentistry, Dermatology, Gynecology, ENT, Orthopaedics and any other specialty. The system adapts its templates and workflows to your speciality automatically.' },
  { q: 'What happens after the 14-day free trial?',         a: 'Your card is not charged during the trial. On day 14 you\'ll receive an email. If you choose to continue, your first payment is processed. You can cancel any time before the trial ends with zero charges.' },
  { q: 'Does MediPlex work without internet?',              a: 'Yes. The PWA works fully offline. Appointments, patient records, prescriptions and lab data are cached locally. All changes sync automatically when connection is restored.' },
  { q: 'Is my data secure and GDPR compliant?',             a: 'MediPlex is hosted on enterprise-grade infrastructure with end-to-end encryption. We are registered in the UK (KLASSICAL HOLDINGS LTD, company 16964688) and fully compliant with GDPR and UK data protection regulations.' },
  { q: 'What is the WhatsApp AI Receptionist?',             a: 'The AI receptionist answers patient queries, checks appointment availability, confirms bookings, sends reminders and handles follow-up — 24/7, automatically. Patients message your clinic WhatsApp number and the AI handles it.' },
  { q: 'Can I use my own clinic branding?',                 a: 'Yes. Upload your logo, header and footer images. All prescriptions, invoices, receipts and WhatsApp messages carry your clinic\'s brand — not MediPlex\'s.' },
  { q: 'Can I migrate my existing patient data?',           a: 'Absolutely. Our team assists with data migration from spreadsheets, other software or paper records. Most migrations complete within 48 hours.' },
  { q: 'Is the marketing ecosystem integrated with MediPlex?', a: 'Yes — it\'s one connected system. Your patient database, WhatsApp reminders, email campaigns, Meta ads audience, SEO website and poster content all talk to each other. One login, one dashboard.' },
];

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let cur = 0;
        const inc = target / 60;
        const t = setInterval(() => {
          cur += inc;
          if (cur >= target) { setCount(target); clearInterval(t); }
          else setCount(Math.floor(cur));
        }, 2000 / 60);
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
        {open
          ? <ChevronUp size={16} className="text-[#C9A84C] flex-shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && <p className="text-[14px] text-gray-500 leading-relaxed pb-4">{a}</p>}
    </div>
  );
}

function PkgGroup({ icon: Icon, color, title, items }: { icon: any; color: string; title: string; items: string[] }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-[13px] font-bold text-[#0A1628]">{title}</span>
      </div>
      <ul className="space-y-1 pl-9">
        {items.map(it => (
          <li key={it} className="flex items-start gap-2 text-[12px] text-gray-500">
            <CheckCircle size={11} style={{ color, flexShrink: 0, marginTop: 2 }} />
            {it}
          </li>
        ))}
      </ul>
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

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src="/icons/mediplex-logo.svg" alt="MediPlex" className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className={`text-[13px] font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-[#0A1628]' : 'text-white/80 hover:text-white'}`}>Features</Link>
            {[['Pricing','#pricing'],['Ecosystem','#ecosystem'],['FAQ','#faq']].map(([l,h])=>(
              <a key={h} href={h} className={`text-[13px] font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-[#0A1628]' : 'text-white/80 hover:text-white'}`}>{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className={`text-[13px] font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-[#0A1628]' : 'text-white/80 hover:text-white'}`}>Sign In</Link>
            <Link href="/onboarding"
              className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#0A1628] transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
              Start Free Trial
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu
              ? <X size={20} className={scrolled ? 'text-gray-800' : 'text-white'} />
              : <Menu size={20} className={scrolled ? 'text-gray-800' : 'text-white'} />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
            <Link href="/features" onClick={() => setMobileMenu(false)} className="block text-[14px] font-medium text-gray-700 py-2 border-b border-gray-50">Features</Link>
            {[['Pricing','#pricing'],['Ecosystem','#ecosystem'],['FAQ','#faq']].map(([l,h])=>(
              <a key={h} href={h} onClick={() => setMobileMenu(false)} className="block text-[14px] font-medium text-gray-700 py-2 border-b border-gray-50">{l}</a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/login" className="text-center py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Sign In</Link>
              <Link href="/onboarding"
                className="text-center py-2.5 rounded-xl text-[13px] font-semibold text-[#0A1628]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                Start Free Trial — Free for 14 Days
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 40%, #0F1E3A 70%, #0A1628 100%)' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20" style={{ background: '#C9A84C' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-15" style={{ background: '#2563EB' }} />

        <div className="relative max-w-7xl mx-auto px-6 py-20 text-center w-full">
          {/* UK Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-[12px] font-medium"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#E8C87A' }}>
            <span>🇬🇧</span> UK Registered · KLASSICAL HOLDINGS LTD · Company 16964688
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 max-w-5xl mx-auto">
            The Complete<br />
            <span style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI‑HMIS
            </span>{' '}
            for Modern Clinics
          </h1>

          <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI Scribe · Smart Scheduling · WhatsApp Automation · Digital Prescriptions ·
            Marketing Ecosystem — everything your clinic needs in one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/onboarding"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-bold text-[#0A1628] transition-all hover:shadow-2xl hover:-translate-y-1 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', boxShadow: '0 8px 32px rgba(201,168,76,0.35)' }}>
              Start Free Trial — 14 Days Free <ArrowRight size={16} />
            </Link>
            <Link href="/features"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-white transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
              <Play size={14} /> See All Features
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { val: 500,     sfx: '+',  label: 'Clinics Worldwide' },
              { val: 2000000, sfx: '+',  label: 'Prescriptions Generated' },
              { val: 50,      sfx: '+',  label: 'Cities Covered' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-black" style={{ color: '#C9A84C' }}>
                  {s.val === 2000000 ? '2M+' : <><AnimatedCounter target={s.val} />{s.sfx}</>}
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

      {/* ── TRUSTED BY ─────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[12px] uppercase tracking-widest text-gray-400 font-semibold mb-8">Trusted by clinics across the globe</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40">
            {['🇬🇧 United Kingdom','🇵🇰 Pakistan','🇦🇺 Australia','🇸🇦 Saudi Arabia','🇦🇪 UAE','🇮🇳 India'].map(c => (
              <div key={c} className="text-[13px] font-bold text-gray-500 tracking-wide">{c}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES (compact) ─────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-4"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
              ✦ Platform Features
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0A1628] mb-4">
              Built for how clinics<br />actually work
            </h2>
            <p className="text-[16px] text-gray-500 max-w-xl mx-auto">Every feature is designed with real clinical workflows in mind — not generic software bolted together.</p>
          </div>

          {/* Compact icon grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-10">
            {ALL_FEATURES.map(f => (
              <Link href="/features" key={f.title}
                className="group flex flex-col items-center text-center p-4 rounded-2xl border border-gray-100 hover:border-[#C9A84C]/40 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{ background: f.color + '15' }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <span className="text-[12px] font-semibold text-[#0A1628] leading-tight">{f.title}</span>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all hover:-translate-y-0.5"
              style={{ border: '1.5px solid rgba(201,168,76,0.5)', color: '#C9A84C', background: 'rgba(201,168,76,0.05)' }}>
              Explore All Features in Detail <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHATSAPP HIGHLIGHT ─────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-6"
                style={{ background: 'rgba(37,211,102,0.1)', color: '#16a34a' }}>
                💬 WhatsApp AI Booking Demo
              </div>
              <h2 className="text-4xl font-black text-[#0A1628] leading-tight mb-5">
                Your clinic never stops<br />
                <span style={{ color: '#25D366' }}>working</span>, even at 3am
              </h2>
              <p className="text-[15px] text-gray-500 leading-relaxed mb-8">
                The WhatsApp AI Receptionist handles appointment requests, answers FAQs, sends confirmations and reminders — completely automatically. Your staff focus on care, not admin.
              </p>
              <div className="space-y-3">
                {[
                  'Auto appointment booking via WhatsApp',
                  '24h & 4h smart reminders with no-show prediction',
                  'Instant replies to patient queries 24/7',
                  'Bulk WhatsApp campaigns for health promotions',
                  'Payment receipts & follow-up messages delivered instantly',
                ].map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <CheckCircle size={16} className="flex-shrink-0" style={{ color: '#25D366' }} />
                    <span className="text-[14px] text-gray-600">{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/onboarding"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-bold text-[#0A1628] transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                  Get WhatsApp AI <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* WhatsApp chat mockup */}
            <div className="relative">
              <div className="rounded-3xl p-6 shadow-2xl max-w-xs mx-auto" style={{ background: '#0A1628' }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0A1628' }}>
                    M+
                  </div>
                  <div>
                    <div className="text-white text-[13px] font-semibold">MediPlex Clinic</div>
                    <div className="text-[10px]" style={{ color: '#25D366' }}>● Online</div>
                  </div>
                  <div className="ml-auto">
                    <MessageCircle size={18} style={{ color: '#25D366' }} />
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {[
                    { msg: 'Hi! I need an appointment for tomorrow', from: 'patient' },
                    { msg: '✅ Hi Sara! We have slots available:\n• 10:00 AM\n• 2:00 PM\nWhich do you prefer?', from: 'bot' },
                    { msg: '10am please', from: 'patient' },
                    { msg: '🎉 Appointment confirmed!\nTomorrow, 10:00 AM\nDr. Ahmad — General Practice\n\nReminder will be sent tonight.', from: 'bot' },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'patient' ? 'justify-end' : 'justify-start'}`}>
                      <div className="px-3 py-2 text-[11px] leading-relaxed max-w-[80%] whitespace-pre-line"
                        style={{
                          background: m.from === 'patient' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)',
                          color: m.from === 'patient' ? '#E8C87A' : 'rgba(255,255,255,0.85)',
                          borderRadius: m.from === 'patient' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        }}>
                        {m.msg}
                      </div>
                    </div>
                  ))}
                  {/* Typing indicator */}
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="flex gap-1 items-center h-4">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[11px] text-white/30 flex-1">Message MediPlex Clinic...</span>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#25D366' }}>
                    <ArrowRight size={10} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl px-3 py-2 shadow-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-gray-700">Available 24/7</span>
                </div>
              </div>

              {/* Stats badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl px-3 py-2 shadow-xl border border-gray-100">
                <div className="text-[10px] text-gray-500">This week</div>
                <div className="text-[13px] font-bold text-[#0A1628]">142 bookings via WhatsApp</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATED ECOSYSTEM ───────────────────────────────────────── */}
      <section id="ecosystem" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-4"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
              ✦ One Connected System
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0A1628] mb-4">The Complete Clinic Growth Ecosystem</h2>
            <p className="text-[16px] text-gray-500 max-w-2xl mx-auto">
              MediPlex is not just software — it's a fully integrated system: HMIS + Marketing + Branding + Patient Engagement, all connected through one dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Stethoscope, color: '#2563EB', title: 'Clinical Management',
                items: ['AI SOAP Notes & Prescriptions', 'Lab Orders & Results', 'Patient Portal & Records', 'Billing & Insurance Claims', 'Telemedicine Video Consult'],
              },
              {
                icon: MessageCircle, color: '#25D366', title: 'Patient Engagement',
                items: ['WhatsApp AI Receptionist', 'Auto Confirmations & Reminders', 'Follow-up & Feedback Surveys', 'WhatsApp Broadcast Campaigns', 'Patient Satisfaction Scores'],
              },
              {
                icon: Megaphone, color: '#F43F5E', title: 'Clinic Growth & Marketing',
                items: ['Meta Ads (Facebook & Instagram)', 'SEO-Optimised Clinic Website', '15–20 Branded Posters / Month', 'Unlimited Email Campaigns', 'Google Business Profile Setup'],
              },
            ].map(c => (
              <div key={c.title} className="rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: c.color + '15', border: `1px solid ${c.color}25` }}>
                  <c.icon size={18} style={{ color: c.color }} />
                </div>
                <h3 className="text-[16px] font-bold text-[#0A1628] mb-3">{c.title}</h3>
                <ul className="space-y-2">
                  {c.items.map(it => (
                    <li key={it} className="flex items-center gap-2 text-[13px] text-gray-500">
                      <CheckCircle size={12} style={{ color: c.color, flexShrink: 0 }} /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Flow */}
          <div className="rounded-2xl p-6 text-center border border-gray-100 bg-gray-50">
            <p className="text-[12px] text-gray-400 uppercase tracking-widest mb-4">Everything flows through one connected system</p>
            <div className="flex flex-wrap justify-center items-center gap-2 text-[12px] font-semibold">
              {['Patient Books via WhatsApp','→','Appointment Confirmed','→','Doctor uses AI Scribe','→','Prescription Auto-generated','→','Lab Results Sent to Portal','→','Follow-up Reminder Sent','→','Feedback Collected','→','Analytics Updated'].map(s=>(
                <span key={s} style={{ color: s === '→' ? '#D1D5DB' : '#C9A84C' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="howitworks" className="py-24"
        style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-4"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#E8C87A' }}>
              ✦ Simple Setup
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Up and running in<br />under 10 minutes</h2>
            <p className="text-[16px] text-white/50">No IT team needed. No complex installation. Just sign up and go.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Globe,     color: '#C9A84C', title: 'Sign Up & Choose Plan',        desc: 'Pick your package and start your 14-day free trial. No credit card required to begin.' },
              { step: '02', icon: Building2, color: '#38BDF8', title: 'Complete Onboarding Wizard',   desc: '8 quick steps to configure your clinic, doctor profile, schedule, billing and branding.' },
              { step: '03', icon: Activity,  color: '#10B981', title: 'Go Live Instantly',            desc: 'Your clinic is live. Patients can book via WhatsApp. AI Scribe is ready to generate notes.' },
            ].map((s, i) => (
              <div key={i} className="relative text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px"
                    style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />
                )}
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
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

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-4"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
              ✦ Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#0A1628] mb-4">Simple pricing.<br />Serious value.</h2>
            <p className="text-[16px] text-gray-500 mb-8">All plans include a 14-day free trial. No credit card required.</p>
            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 bg-white rounded-2xl p-1.5 border border-gray-200 shadow-sm">
              <button onClick={() => setYearly(false)}
                className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${!yearly ? 'bg-[#0A1628] text-white shadow-sm' : 'text-gray-500'}`}>
                Monthly
              </button>
              <button onClick={() => setYearly(true)}
                className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 ${yearly ? 'bg-[#0A1628] text-white shadow-sm' : 'text-gray-500'}`}>
                Yearly <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Package 1 */}
            <div className="bg-white rounded-3xl p-7 flex flex-col border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: '#2563EB' }}>Package 1</div>
              <h3 className="text-[22px] font-extrabold text-[#0A1628] mb-1">MediPlex</h3>
              <p className="text-[13px] text-gray-400 mb-4">Full clinic management + marketing ecosystem</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[38px] font-black text-[#0A1628]">£{yearly ? 125 : 150}</span>
                <span className="text-[13px] text-gray-400">/{yearly ? 'year' : 'mo'}</span>
              </div>
              {yearly && <div className="text-[12px] mb-1" style={{ color: '#C9A84C' }}>Save £300/year</div>}
              <div className="text-[12px] text-gray-400 mb-6">+ AI Scribe add-on: <span className="text-gray-600 font-semibold">£{yearly ? 83 : 100}/mo</span></div>

              <div className="flex-1">
                <PkgGroup icon={Stethoscope} color="#2563EB" title="MediPlex HMIS" items={[
                  'Appointment & Patient Management','Digital Prescriptions with QR','Smart Billing — Invoices, Receipts, Expenses','Lab Orders & Results (QR-based)','Patient Portal (self-booking, records)','Telemedicine / Video Consult','No-Show Prediction AI','Role-based Staff Accounts','Clinic Analytics Dashboard','Offline Mode (full PWA)','Clinic Branding (your logo, header, footer)','Pre-Auth Insurance Letters',
                ]} />
                <PkgGroup icon={MessageCircle} color="#25D366" title="WhatsApp AI Receptionist" items={[
                  '24/7 AI replies to patient queries','Auto appointment booking via WhatsApp','Confirmation, 24h & 4h reminders','Follow-up & satisfaction feedback','WhatsApp Broadcast to patient list',
                ]} />
                <PkgGroup icon={Globe} color="#C9A84C" title="Clinic Website" items={[
                  'Professional SEO-optimised website','Online appointment booking widget','Google Business Profile setup','Local SEO targeting',
                ]} />
                <PkgGroup icon={Mail} color="#38BDF8" title="Email Marketing — Unlimited" items={[
                  'Unlimited email campaigns','Branded clinic templates','Health tips & appointment recalls',
                ]} />
                <PkgGroup icon={ImageIcon} color="#A78BFA" title="Graphical Posters (15–20/month)" items={[
                  'Branded health awareness posters','Seasonal & awareness days','Formatted for Instagram & WhatsApp',
                ]} />
                <PkgGroup icon={Bot} color="#C9A84C" title="AI Scribe Add-on (£100/mo)" items={[
                  'SOAP Notes, Prescriptions, Referrals','Discharge Summaries, Pre-Auth Letters','Sick Certificates',
                ]} />
              </div>

              <Link href="/onboarding?plan=package1"
                className="mt-7 block text-center py-3 rounded-2xl text-[13px] font-bold transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: '1.5px solid #2563EB', color: '#2563EB' }}>
                Start Free Trial →
              </Link>
            </div>

            {/* Package 2 — Most Popular */}
            <div className="bg-white rounded-3xl p-7 flex flex-col relative transition-all hover:-translate-y-1"
              style={{ border: '2px solid #C9A84C', boxShadow: '0 8px 40px rgba(201,168,76,0.2)' }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold text-[#0A1628]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                Most Popular
              </div>
              <div className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>Package 2</div>
              <h3 className="text-[22px] font-extrabold text-[#0A1628] mb-1">MediPlex + Meta Ads</h3>
              <p className="text-[13px] text-gray-400 mb-4">Everything in Package 1 plus managed social media advertising</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[38px] font-black text-[#0A1628]">£{yearly ? 175 : 210}</span>
                <span className="text-[13px] text-gray-400">/{yearly ? 'year' : 'mo'}</span>
              </div>
              {yearly && <div className="text-[12px] mb-1" style={{ color: '#C9A84C' }}>Save £420/year</div>}
              <div className="text-[12px] text-gray-400 mb-4">+ AI Scribe add-on: <span className="text-gray-600 font-semibold">£{yearly ? 83 : 100}/mo</span></div>

              <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <div className="text-[12px] font-semibold mb-1" style={{ color: '#C9A84C' }}>Everything in Package 1, plus:</div>
                <div className="text-[12px] text-gray-500">All HMIS, WhatsApp, Website, Email & Posters included</div>
              </div>

              <div className="flex-1">
                <PkgGroup icon={Target} color="#F43F5E" title="Meta Ads — Facebook & Instagram" items={[
                  'Fully managed ad campaigns','Audience targeting — local patient demographics','Appointment & lead generation ads','Seasonal health campaign creatives','Monthly ad performance reports','Remarketing to website visitors','Ad spend not included (you set budget)',
                ]} />
                <PkgGroup icon={Bot} color="#C9A84C" title="AI Scribe Add-on (£100/mo)" items={[
                  'SOAP Notes, Prescriptions, Referrals','Discharge & Pre-Auth Insurance letters','Increased limit — 400 AI notes/month',
                ]} />
              </div>

              <Link href="/onboarding?plan=package2"
                className="mt-7 block text-center py-3 rounded-2xl text-[13px] font-bold transition-all hover:shadow-lg hover:-translate-y-0.5 text-[#0A1628]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                Start Free Trial →
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-3xl p-7 flex flex-col border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: '#7C3AED' }}>Custom</div>
              <h3 className="text-[22px] font-extrabold text-[#0A1628] mb-1">Enterprise</h3>
              <p className="text-[13px] text-gray-400 mb-4">Multi-clinic networks, hospital groups, multi-tenant doctor setups</p>
              <div className="text-[32px] font-black text-[#0A1628] mb-1">Bespoke</div>
              <div className="text-[12px] text-gray-400 mb-6">Pricing based on clinic count & requirements</div>

              <div className="flex-1">
                <PkgGroup icon={Building2} color="#7C3AED" title="Multi-Clinic / Multi-Doctor" items={[
                  'Unlimited clinics & locations','Multi-tenant doctor accounts','Organisation dashboard (org owner view)','Cross-clinic analytics & reporting','Centralised patient database',
                ]} />
                <PkgGroup icon={Shield} color="#7C3AED" title="Enterprise Features" items={[
                  'White-label (your own brand)','Custom integrations (HIS, LIS, RIS)','Dedicated cloud infrastructure','SLA-backed 99.9% uptime','Custom AI training on your data','Onsite training & onboarding',
                ]} />
                <div className="rounded-xl p-3 mt-2 border text-[12px] text-gray-500"
                  style={{ background: 'rgba(124,58,237,0.05)', borderColor: 'rgba(124,58,237,0.15)' }}>
                  <span className="font-semibold text-gray-700">Note:</span> Multi-tenant doctor setups are available on Enterprise only — not in Package 1 or 2.
                </div>
              </div>

              <a href="mailto:info@klassicalholdings.com?subject=Enterprise Enquiry"
                className="mt-7 block text-center py-3 rounded-2xl text-[13px] font-bold transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: '1.5px solid #7C3AED', color: '#7C3AED' }}>
                Contact Sales
              </a>
            </div>
          </div>

          <p className="text-center text-[12px] text-gray-400 mt-8">
            All prices in GBP. VAT may apply. Cancel anytime.{' '}
            <a href="mailto:info@klassicalholdings.com" className="hover:underline" style={{ color: '#C9A84C' }}>Questions? Email us →</a>
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-[#0A1628] mb-3">Loved by clinicians worldwide</h2>
            <p className="text-[16px] text-gray-500">Real feedback from real doctors</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Dr. James',    role: 'Paediatrician, Luton UK 🇬🇧',          text: 'The AI Scribe alone saves me 2 hours every day. SOAP notes used to take 15 minutes each — now it\'s 30 seconds. MediPlex has transformed how I run my clinic.' },
              { name: 'Dr. Anderson', role: 'Dentist, Melbourne Australia 🇦🇺',      text: 'The WhatsApp reminders dropped our no-show rate from 28% to under 5%. The billing module handles everything automatically. Best investment I\'ve made for my practice.' },
              { name: 'Dr. Waheed',   role: 'General Practitioner, Riyadh 🇸🇦',     text: 'I manage 40+ patients a day. MediPlex lets my receptionist handle bookings via WhatsApp while I focus on patients. The offline mode is a lifesaver when internet drops.' },
            ].map((t, i) => (
              <div key={i} className="p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} className="fill-[#C9A84C]" style={{ color: '#C9A84C' }} />)}
                </div>
                <p className="text-[14px] text-gray-600 leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px]"
                    style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0A1628' }}>
                    {t.name.split(' ')[1][0]}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[#0A1628]">{t.name}</div>
                    <div className="text-[12px] text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GLOBAL SECTION ─────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-[#0A1628] mb-4">Built for Global Clinics</h2>
          <p className="text-gray-500 text-[15px] mb-12 max-w-2xl mx-auto">
            Multi-currency support, WhatsApp globally, Stripe (UK/Global), SafePay (Pakistan) and region-specific compliance.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Globe,        color: '#2563EB', title: 'Multi-Currency',     desc: 'GBP, USD, PKR, AED, SAR, AUD and more' },
              { icon: MessageCircle,color: '#25D366', title: 'WhatsApp Global',    desc: 'Works in any country with WhatsApp' },
              { icon: CreditCard,   color: '#C9A84C', title: 'Stripe & SafePay',  desc: 'UK/Global payments + Pakistan SafePay' },
              { icon: Lock,         color: '#10B981', title: 'GDPR & HIPAA Ready',desc: 'UK, EU and international compliance' },
            ].map(f => (
              <div key={f.title} className="rounded-xl p-5 bg-white border border-gray-100 shadow-sm">
                <f.icon size={20} style={{ color: f.color }} className="mx-auto mb-3" />
                <div className="text-[13px] font-bold text-[#0A1628] mb-1">{f.title}</div>
                <div className="text-[12px] text-gray-400">{f.desc}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[13px] text-gray-400 mb-4">Specialties supported</div>
            <div className="flex flex-wrap justify-center gap-2">
              {['General Practice','Paediatrics','Dentistry','Gynaecology','Orthopaedics','Cardiology','Dermatology','ENT','Neurology','Psychiatry','Oncology','Ophthalmology','Urology','Pulmonology','Nephrology'].map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-white border border-gray-200 text-gray-600">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
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

      {/* ── FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.6) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-5">Ready to transform<br />your clinic?</h2>
          <p className="text-[17px] text-white/55 mb-10 leading-relaxed">
            Join 500+ clinics already running smarter with MediPlex.<br />
            14 days free. No card required. Setup in 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding"
              className="flex items-center gap-2 px-10 py-4 rounded-2xl text-[15px] font-bold text-[#0A1628] transition-all hover:shadow-2xl hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', boxShadow: '0 8px 32px rgba(201,168,76,0.4)' }}>
              Start Free Trial Now <ArrowRight size={16} />
            </Link>
            <a href="mailto:info@klassicalholdings.com"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-white border border-white/20 hover:bg-white/5 transition-all">
              <Mail size={15} /> Talk to Sales
            </a>
          </div>
          <p className="text-[12px] text-white/25 mt-6">No setup fees · Cancel anytime · GDPR compliant · UK registered</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="bg-[#040C1A] text-white/50 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <img src="/icons/mediplex-logo.svg" alt="MediPlex" className="h-8 mb-4 brightness-200" />
              <p className="text-[13px] leading-relaxed mb-5">
                The Complete AI-HMIS for Modern Clinics. Cloud-based, globally trusted.
              </p>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center gap-2"><Mail size={12} /> info@klassicalholdings.com</div>
                <div className="flex items-center gap-2"><Phone size={12} /> +44 7776 387877</div>
                <div className="flex items-center gap-2"><MapPin size={12} /> United Kingdom 🇬🇧</div>
                <div className="flex items-center gap-2"><Building2 size={12} /> KLASSICAL HOLDINGS LTD · Co. 16964688</div>
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[13px] mb-4 uppercase tracking-widest">Platform</div>
              <div className="space-y-2 text-[13px]">
                {[['Features','/features'],['Pricing','#pricing'],['How It Works','#howitworks'],['AI Scribe','#features'],['WhatsApp Bot','#features'],['Mobile App','#features']].map(([l,h])=>(
                  <div key={l}><a href={h} className="hover:text-white cursor-pointer transition-colors">{l}</a></div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[13px] mb-4 uppercase tracking-widest">Company</div>
              <div className="space-y-2 text-[13px]">
                {[['About Us','#'],['Contact','mailto:info@klassicalholdings.com'],['Privacy Policy','#'],['Terms of Service','#'],['GDPR','#'],['Companies House','https://find-and-update.company-information.service.gov.uk/company/16964688']].map(([l,h])=>(
                  <div key={l}><a href={h} target={h.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="hover:text-white transition-colors">{l}</a></div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[13px] mb-4 uppercase tracking-widest">Support</div>
              <div className="space-y-2 text-[13px]">
                <a href="https://wa.me/447776387877" className="flex items-center gap-2 hover:text-white transition-colors">
                  <MessageCircle size={12} /> WhatsApp Support
                </a>
                <div className="flex items-center gap-2"><Clock size={12} /> 24/7 Help Available</div>
                <a href="mailto:info@klassicalholdings.com" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail size={12} /> Email Support
                </a>
              </div>
              <div className="flex gap-3 mt-6">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)', color: '#0a66c2' }}>in</a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(29,161,242,0.12)', border: '1px solid rgba(29,161,242,0.3)', color: '#1da1f2' }}>𝕏</a>
                <a href="https://wa.me/447776387877" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}>
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[12px]">
              © 2025 MediPlex · <span className="text-white/30">KLASSICAL HOLDINGS LTD · Company No. 16964688 · Registered in England & Wales</span>
            </div>
            <a href="https://find-and-update.company-information.service.gov.uk/company/16964688"
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] flex items-center gap-1.5 hover:text-white transition-colors">
              🇬🇧 Verify on Companies House
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
