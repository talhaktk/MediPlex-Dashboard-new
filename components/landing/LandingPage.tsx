'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle, ArrowRight, Star, Menu, X, ChevronDown, ChevronUp,
  Bot, Receipt, Calendar, MessageCircle, BarChart3, Smartphone,
  Globe, Shield, Zap, Users, FileText, Bell, Activity, Mail,
  MapPin, Phone, TrendingUp, Palette, Wifi, WifiOff, Target,
  Search, Image as ImageIcon, Megaphone, CreditCard, Lock,
  ClipboardList, Microscope, UserCircle, Building2, Heart,
  ChevronRight, Stethoscope, FlaskConical,
} from 'lucide-react';

/* ─── Animated counter ──────────────────────────────────────────────── */
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

/* ─── FAQ accordion ─────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} className="last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left gap-4">
        <span className="text-[15px] font-semibold text-white/90">{q}</span>
        {open ? <ChevronUp size={16} style={{ color: '#C9A84C', flexShrink: 0 }} /> : <ChevronDown size={16} className="text-white/30 flex-shrink-0" />}
      </button>
      {open && <p className="text-[14px] text-white/55 leading-relaxed pb-5">{a}</p>}
    </div>
  );
}

/* ─── Feature card ──────────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  return (
    <div className="rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl group"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <h3 className="text-[15px] font-bold text-white mb-2">{title}</h3>
      <p className="text-[13px] text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ─── Pricing package feature group ────────────────────────────────── */
function PkgGroup({ icon: Icon, color, title, items }: { icon: any; color: string; title: string; items: string[] }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-[13px] font-bold text-white">{title}</span>
      </div>
      <ul className="space-y-1 pl-9">
        {items.map(it => (
          <li key={it} className="flex items-start gap-2 text-[12px] text-white/55">
            <CheckCircle size={11} style={{ color, flexShrink: 0, marginTop: 2 }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

const FAQS = [
  { q: 'Is MediPlex suitable for any clinic specialty?', a: 'Yes — MediPlex works for General Practice, Pediatrics, Dentistry, Dermatology, Gynecology, ENT, Orthopaedics and any other specialty. The system adapts its templates and workflows to your speciality automatically.' },
  { q: 'What happens after the 14-day free trial?', a: 'Your card is not charged during the trial. On day 14 you\'ll receive an email. If you choose to continue, your first payment is processed. You can cancel any time before the trial ends with zero charges.' },
  { q: 'Does MediPlex work without internet?', a: 'Yes. The PWA works fully offline. Appointments, patient records, prescriptions and lab data are cached locally. All changes sync automatically when connection is restored.' },
  { q: 'Is my data secure and GDPR compliant?', a: 'MediPlex is hosted on enterprise-grade infrastructure with end-to-end encryption. We are registered in the UK (KLASSICAL HOLDINGS LTD, company 16964688) and fully compliant with GDPR and UK data protection regulations.' },
  { q: 'What is the WhatsApp AI Receptionist?', a: 'The AI receptionist answers patient queries, checks appointment availability, confirms bookings, sends reminders and handles follow-up — 24/7, automatically. Patients message your clinic WhatsApp number and the AI handles it.' },
  { q: 'Can I use my own clinic branding?', a: 'Yes. Upload your logo, header and footer images. All prescriptions, invoices, receipts and WhatsApp messages carry your clinic\'s brand — not MediPlex\'s.' },
  { q: 'Can I migrate my existing patient data?', a: 'Absolutely. Our team assists with data migration from spreadsheets, other software or paper records. Most migrations complete within 48 hours.' },
  { q: 'Is the marketing ecosystem integrated with MediPlex?', a: 'Yes — it\'s one connected system. Your patient database, WhatsApp reminders, email campaigns, Meta ads audience, SEO website and poster content all talk to each other. One login, one dashboard.' },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0a1628', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── NAVBAR ────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-lg' : ''}`}
        style={{ background: scrolled ? 'rgba(10,22,40,0.98)' : 'transparent', backdropFilter: 'blur(12px)', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo — same SVG used in dashboard */}
          <Link href="/" className="flex items-center">
            <img src="/icons/mediplex-logo.svg" alt="MediPlex" style={{ height: 36, width: 'auto' }} />
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {[['#features','Features'],['#ecosystem','Ecosystem'],['#pricing','Pricing'],['#faq','FAQ']].map(([href,label])=>(
              <a key={href} href={href} className="text-[13px] font-medium text-white/60 hover:text-white transition-colors">{label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-[13px] font-medium text-white/60 hover:text-white px-4 py-2">Sign In</Link>
            <Link href="/onboarding"
              className="text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0a1628' }}>
              Start Free Trial
            </Link>
          </div>
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t px-6 py-4 space-y-3" style={{ background: '#0a1628', borderColor: 'rgba(255,255,255,0.08)' }}>
            {[['#features','Features'],['#ecosystem','Ecosystem'],['#pricing','Pricing'],['#faq','FAQ']].map(([href,label])=>(
              <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block text-[14px] text-white/70 py-1">{label}</a>
            ))}
            <Link href="/onboarding" className="block text-center py-3 rounded-xl text-[14px] font-semibold mt-2"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0a1628' }}>
              Start Free Trial — 14 Days Free
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2040 60%, #0a1628 100%)' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-[12px] font-semibold"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#E8C87A' }}>
              <Zap size={12} /> AI-Powered Healthcare Management Platform
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5" style={{ letterSpacing: '-0.02em' }}>
              The Complete<br />
              <span style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AI‑HMIS
              </span>{' '}
              for Modern Clinics
            </h1>
            <p className="text-[17px] text-white/60 leading-relaxed mb-8 max-w-xl">
              AI Receptionist, Prescriptions, Billing, Labs, Patient Portal, Analytics, Reminders &amp; Feedbacks — all in one place. Powered by AI.
            </p>
            {/* Stats ticker */}
            <div className="flex flex-wrap gap-6 mb-10">
              {[
                { label: 'Clinics', value: 500, suffix: '+' },
                { label: 'Prescriptions', value: 2000000, suffix: 'M+' },
                { label: 'Cities', value: 50, suffix: '+' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold" style={{ color: '#C9A84C' }}>
                    {s.suffix === 'M+' ? '2M+' : <><AnimatedCounter target={s.value} />{s.suffix}</>}
                  </div>
                  <div className="text-[12px] text-white/40 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/onboarding"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0a1628' }}>
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <a href="#features"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-white/70 hover:text-white transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
                See Features
              </a>
            </div>
            <p className="text-[12px] text-white/30 mt-4">14-day free trial · No credit card required · Cancel anytime</p>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              {/* Fake browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-4 py-1 px-3 rounded text-[11px] text-white/30 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}>app.mediplex.com/dashboard</div>
              </div>
              {/* Dashboard UI mockup */}
              <div className="p-5" style={{ background: '#0f172a' }}>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Today's Patients", val: '24', color: '#C9A84C' },
                    { label: 'Revenue Today', val: '£1,840', color: '#10b981' },
                    { label: 'AI Notes Done', val: '12', color: '#3b82f6' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-[10px] text-white/40 mb-1">{s.label}</div>
                      <div className="text-[20px] font-bold" style={{ color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                {/* Appointment list mockup */}
                <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-4 py-2 text-[11px] font-semibold text-white/50" style={{ background: 'rgba(255,255,255,0.04)' }}>Upcoming Appointments</div>
                  {[
                    { name: 'Ahmed Hassan', time: '09:00', status: 'Confirmed', color: '#10b981' },
                    { name: 'Sarah Williams', time: '09:30', status: 'Pending', color: '#f59e0b' },
                    { name: 'Omar Khalid', time: '10:00', status: 'Confirmed', color: '#10b981' },
                  ].map(a => (
                    <div key={a.name} className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>{a.name[0]}</div>
                        <div>
                          <div className="text-[12px] text-white font-medium">{a.name}</div>
                          <div className="text-[10px] text-white/30">{a.time}</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${a.color}20`, color: a.color }}>{a.status}</span>
                    </div>
                  ))}
                </div>
                {/* AI scribe mockup */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={12} style={{ color: '#C9A84C' }} />
                    <span className="text-[11px] font-semibold" style={{ color: '#C9A84C' }}>AI Scribe — SOAP Note Generated</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 rounded bg-white/10 w-full" />
                    <div className="h-2 rounded bg-white/10 w-4/5" />
                    <div className="h-2 rounded bg-white/10 w-3/5" />
                  </div>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 rounded-xl px-4 py-3 shadow-xl" style={{ background: '#0a1628', border: '1px solid rgba(201,168,76,0.3)' }}>
              <div className="flex items-center gap-2">
                <MessageCircle size={16} style={{ color: '#25D366' }} />
                <div>
                  <div className="text-[11px] font-bold text-white">WhatsApp AI sent</div>
                  <div className="text-[10px] text-white/40">3 reminders · 2 bookings</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUSTED BY ────────────────────────────────────────────────── */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-6 py-10 text-center">
          <p className="text-[12px] text-white/30 uppercase tracking-widest font-medium mb-6">Trusted by clinics across</p>
          <div className="flex flex-wrap justify-center gap-8 text-[13px] font-semibold text-white/40">
            {['🇬🇧 United Kingdom','🇵🇰 Pakistan','🇦🇺 Australia','🇸🇦 Saudi Arabia','🇦🇪 UAE','🇮🇳 India'].map(c=>(
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-[12px] font-semibold"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
              Complete Feature Set
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">Everything Your Clinic Needs</h2>
            <p className="text-[16px] text-white/50 max-w-2xl mx-auto">One integrated platform — clinical, administrative, marketing and patient engagement — all talking to each other.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Bot,          color: '#C9A84C', title: 'AI Clinical Scribe', desc: 'SOAP notes, prescriptions, referrals, discharge summaries & pre-auth insurance letters generated in seconds.' },
              { icon: MessageCircle,color: '#25D366', title: 'WhatsApp AI Receptionist', desc: 'Answers queries, confirms bookings, sends reminders & follow-ups — 24/7 automatically on your clinic number.' },
              { icon: Calendar,     color: '#3b82f6', title: 'Smart Scheduling', desc: 'Drag-and-drop calendar, multi-doctor slots, online booking and no-show prediction.' },
              { icon: Receipt,      color: '#10b981', title: 'Billing & Invoicing', desc: 'GST/VAT-ready invoices, receipts, insurance claims, expense tracking and daily cash reports.' },
              { icon: FlaskConical, color: '#f59e0b', title: 'Lab Integration', desc: 'QR-based lab orders, result upload, patient result portal and two-way sync with labs.' },
              { icon: UserCircle,   color: '#8b5cf6', title: 'Patient Portal', desc: 'Self-registration, appointment booking, medical records, prescriptions and lab results — all online.' },
              { icon: BarChart3,    color: '#ef4444', title: 'Analytics Dashboard', desc: 'Revenue trends, patient retention, no-show rates, top diagnoses, demographics and monthly growth.' },
              { icon: Shield,       color: '#0ea5e9', title: 'Security & Compliance', desc: 'Role-based access, 2FA, session timeouts, audit logs and GDPR/HIPAA-ready encryption.' },
              { icon: TrendingUp,   color: '#C9A84C', title: 'No-Show Predictions', desc: 'AI predicts likely no-shows 24h ahead so you can double-book or send extra nudges.' },
              { icon: Palette,      color: '#ec4899', title: 'Clinic Branding', desc: 'Your logo, colours, header and footer on prescriptions, invoices, receipts and WhatsApp messages.' },
              { icon: Bell,         color: '#f97316', title: 'Auto Reminders & Feedback', desc: 'Confirmation, 24h reminder, 4h reminder, follow-up and satisfaction survey — all automatic.' },
              { icon: Smartphone,   color: '#6366f1', title: 'Mobile & Desktop App', desc: 'Install on iPhone, Android or PC as a PWA — no app store needed, works offline with biometric login.' },
              { icon: WifiOff,      color: '#14b8a6', title: 'Offline Mode', desc: 'Full functionality without internet. Appointments, prescriptions and labs cached locally, sync on reconnect.' },
              { icon: Target,       color: '#f43f5e', title: 'Meta & Google Ads', desc: 'Managed Facebook & Instagram ad campaigns targeting local patients, integrated with your booking system.' },
              { icon: Search,       color: '#84cc16', title: 'SEO Clinic Website', desc: 'Professional, fast, SEO-optimised clinic website that ranks locally and drives organic appointment bookings.' },
              { icon: ImageIcon,    color: '#a78bfa', title: 'Graphical Posters', desc: '15–20 branded social media health awareness posters every month for Instagram, Facebook and WhatsApp.' },
              { icon: Mail,         color: '#38bdf8', title: 'Email Marketing', desc: 'Unlimited campaigns — seasonal health tips, appointment recalls, promotions — sent from your clinic brand.' },
              { icon: ClipboardList,color: '#fb923c', title: 'Pre-Auth Insurance', desc: 'Generate insurance pre-authorisation letters instantly using AI from patient records and clinical notes.' },
              { icon: Megaphone,    color: '#C9A84C', title: 'WhatsApp Broadcast', desc: 'Send health campaigns, seasonal offers and appointment recalls to your entire patient list at once.' },
              { icon: Activity,     color: '#4ade80', title: 'Telemedicine', desc: 'Built-in video consultations, digital prescriptions and secure patient messaging — no third-party apps.' },
            ].map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── INTEGRATED ECOSYSTEM ──────────────────────────────────────── */}
      <section id="ecosystem" className="py-24 px-6" style={{ background: 'linear-gradient(180deg, rgba(10,22,40,0) 0%, rgba(201,168,76,0.04) 50%, rgba(10,22,40,0) 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-[12px] font-semibold"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
              One Connected System
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">The Complete Clinic Growth Ecosystem</h2>
            <p className="text-[16px] text-white/50 max-w-2xl mx-auto">
              MediPlex is not just software — it's a fully integrated system: HMIS + Marketing + Branding + Patient Engagement, all connected through one dashboard.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: Stethoscope, color: '#C9A84C', title: 'Clinical Management',
                items: ['AI SOAP Notes & Prescriptions', 'Lab Orders & Results', 'Patient Portal & Records', 'Billing & Insurance', 'Telemedicine'],
              },
              {
                icon: MessageCircle, color: '#25D366', title: 'Patient Engagement',
                items: ['WhatsApp AI Receptionist', 'Auto Confirmations & Reminders', 'Follow-up & Feedback', 'WhatsApp Broadcast Campaigns', 'Patient Satisfaction Scores'],
              },
              {
                icon: Megaphone, color: '#f43f5e', title: 'Clinic Growth & Marketing',
                items: ['Meta Ads (Facebook & Instagram)', 'SEO-Optimised Clinic Website', '15–20 Branded Posters / Month', 'Unlimited Email Campaigns', 'Google Ads Integration'],
              },
            ].map(c => (
              <div key={c.title} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
                  <c.icon size={18} style={{ color: c.color }} />
                </div>
                <h3 className="text-[16px] font-bold text-white mb-3">{c.title}</h3>
                <ul className="space-y-2">
                  {c.items.map(it => (
                    <li key={it} className="flex items-center gap-2 text-[13px] text-white/55">
                      <CheckCircle size={12} style={{ color: c.color, flexShrink: 0 }} /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Flow diagram */}
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <p className="text-[13px] text-white/50 mb-4">Everything flows through one connected system</p>
            <div className="flex flex-wrap justify-center items-center gap-2 text-[13px] font-semibold">
              {['Patient Books via WhatsApp','→','Appointment Confirmed','→','Doctor uses AI Scribe','→','Prescription & Invoice Auto-generated','→','Lab Results Sent to Portal','→','Follow-up Reminder Sent','→','Feedback Collected','→','Analytics Updated'].map(s=>(
                <span key={s} style={{ color: s==='→' ? 'rgba(201,168,76,0.4)' : '#C9A84C' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Get Started in Minutes</h2>
          <p className="text-white/50 mb-16">No installation. No IT team. Just sign up and go.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Building2, color: '#C9A84C', title: 'Register Your Clinic', desc: 'Sign up, complete the 8-step setup wizard — clinic details, branding, doctor profile, schedule. Takes 5 minutes.' },
              { step: '02', icon: Users, color: '#3b82f6', title: 'Add Your Patients', desc: 'Import existing records or start fresh. Patients can self-register via the patient portal or QR code at reception.' },
              { step: '03', icon: Zap, color: '#10b981', title: 'Go Paperless', desc: 'AI Scribe generates notes, WhatsApp sends reminders, billing auto-calculates. Your clinic runs itself.' },
            ].map(s => (
              <div key={s.step} className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
                  <s.icon size={24} style={{ color: s.color }} />
                </div>
                <div className="text-[11px] font-bold tracking-widest mb-2" style={{ color: s.color }}>{s.step}</div>
                <h3 className="text-[17px] font-bold text-white mb-3">{s.title}</h3>
                <p className="text-[14px] text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-[12px] font-semibold"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
              Simple, Transparent Pricing
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">One Package. Everything Included.</h2>
            <p className="text-white/50 text-[15px] mb-8">All prices in GBP. 14-day free trial on all plans.</p>
            {/* Yearly toggle */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-[13px] font-medium" style={{ color: yearly ? 'rgba(255,255,255,0.4)' : 'white' }}>Monthly</span>
              <button onClick={() => setYearly(!yearly)}
                className="w-11 h-6 rounded-full relative transition-all"
                style={{ background: yearly ? '#C9A84C' : 'rgba(255,255,255,0.15)' }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: yearly ? '26px' : '4px' }} />
              </button>
              <span className="text-[13px] font-medium" style={{ color: yearly ? 'white' : 'rgba(255,255,255,0.4)' }}>Yearly <span style={{ color: '#C9A84C' }}>−17%</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Package 1: MediPlex ── */}
            <div className="rounded-2xl p-7 flex flex-col" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="mb-6">
                <div className="text-[11px] font-bold tracking-widest mb-2" style={{ color: '#3b82f6' }}>PACKAGE 1</div>
                <h3 className="text-[22px] font-extrabold text-white mb-1">MediPlex</h3>
                <p className="text-[13px] text-white/45 mb-4">Full clinic management + marketing ecosystem</p>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-[38px] font-extrabold text-white">£{yearly ? 125 : 150}</span>
                  <span className="text-white/40 text-[14px] mb-2">/month</span>
                </div>
                {yearly && <div className="text-[12px] mb-1" style={{ color: '#C9A84C' }}>Save £300/year (£1,500/yr)</div>}
                <div className="text-[12px] text-white/40">+ AI Scribe add-on: <span className="text-white/70 font-semibold">£{yearly ? 83 : 100}/mo</span></div>
              </div>

              <div className="flex-1 space-y-1">
                <PkgGroup icon={Stethoscope} color="#3b82f6" title="MediPlex HMIS" items={[
                  'Appointment & Patient Management','Digital Prescriptions with QR','Smart Billing — Invoices, Receipts, Expenses','Lab Orders & Results (QR-based)','Patient Portal (self-booking, records)','Telemedicine / Video Consult','No-Show Prediction AI','Role-based Staff Accounts','Clinic Analytics Dashboard','Offline Mode (full PWA)','Clinic Branding (your logo, header, footer)','Pre-Auth Insurance Letters','Mobile & Desktop App (no app store needed)',
                ]} />
                <PkgGroup icon={MessageCircle} color="#25D366" title="WhatsApp AI Receptionist" items={[
                  '24/7 AI replies to patient queries','Auto appointment booking via WhatsApp','Confirmation, 24h & 4h reminders','Follow-up & satisfaction feedback','WhatsApp Broadcast to patient list',
                ]} />
                <PkgGroup icon={Globe} color="#C9A84C" title="Clinic Website" items={[
                  'Professional SEO-optimised website','Online appointment booking widget','Mobile responsive & fast-loading','Google Business Profile setup','Local SEO targeting',
                ]} />
                <PkgGroup icon={Mail} color="#38bdf8" title="Email Marketing — Unlimited" items={[
                  'Unlimited email campaigns','Branded clinic email templates','Health tips, appointment recalls','Patient re-engagement campaigns','Open rate & click tracking',
                ]} />
                <PkgGroup icon={ImageIcon} color="#a78bfa" title="Graphical Posters (15–20 / month)" items={[
                  'Branded health awareness posters','Eid, seasonal & awareness days','Formatted for WhatsApp, Instagram & Facebook','Ready to post — zero effort',
                ]} />
                <PkgGroup icon={Bot} color="#C9A84C" title="AI Scribe — Add-on (£100/mo)" items={[
                  'SOAP Notes (dictate or type)','AI Prescription Writer','Referral Letters','Discharge Summaries','Pre-Auth Insurance Letters','Sick Certificates',
                ]} />
              </div>

              <Link href="/onboarding?plan=package1"
                className="mt-7 block text-center py-3.5 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd' }}>
                Start Free Trial <ArrowRight size={14} className="inline ml-1" />
              </Link>
            </div>

            {/* ── Package 2: MediPlex + Meta Ads ── */}
            <div className="rounded-2xl p-7 flex flex-col relative" style={{ background: 'rgba(201,168,76,0.06)', border: '2px solid rgba(201,168,76,0.4)' }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0a1628' }}>
                Most Popular
              </div>
              <div className="mb-6">
                <div className="text-[11px] font-bold tracking-widest mb-2" style={{ color: '#C9A84C' }}>PACKAGE 2</div>
                <h3 className="text-[22px] font-extrabold text-white mb-1">MediPlex + Meta Ads</h3>
                <p className="text-[13px] text-white/45 mb-4">Everything in Package 1 plus managed social media advertising</p>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-[38px] font-extrabold text-white">£{yearly ? 175 : 210}</span>
                  <span className="text-white/40 text-[14px] mb-2">/month</span>
                </div>
                {yearly && <div className="text-[12px] mb-1" style={{ color: '#C9A84C' }}>Save £420/year (£2,100/yr)</div>}
                <div className="text-[12px] text-white/40">+ AI Scribe add-on: <span className="text-white/70 font-semibold">£{yearly ? 83 : 100}/mo</span></div>
              </div>

              <div className="flex-1 space-y-1">
                <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div className="text-[12px] font-semibold mb-1" style={{ color: '#C9A84C' }}>Everything in Package 1, plus:</div>
                  <div className="text-[12px] text-white/50">All HMIS, WhatsApp, Website, Email & Posters included</div>
                </div>
                <PkgGroup icon={Target} color="#f43f5e" title="Meta Ads — Facebook & Instagram" items={[
                  'Fully managed ad campaigns','Audience targeting — local patient demographics','Appointment & lead generation ads','Seasonal health campaign creatives','Monthly ad performance reports','Remarketing to website visitors','Ad spend not included (you set budget)',
                ]} />
                <PkgGroup icon={Bot} color="#C9A84C" title="AI Scribe — Add-on (£100/mo)" items={[
                  'SOAP Notes, Prescriptions, Referrals','Discharge & Pre-Auth Insurance letters','Increased limit — 400 AI notes/month',
                ]} />
              </div>

              <Link href="/onboarding?plan=package2"
                className="mt-7 block text-center py-3.5 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0a1628' }}>
                Start Free Trial <ArrowRight size={14} className="inline ml-1" />
              </Link>
            </div>

            {/* ── Enterprise / Custom ── */}
            <div className="rounded-2xl p-7 flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="mb-6">
                <div className="text-[11px] font-bold tracking-widest mb-2" style={{ color: '#7c3aed' }}>CUSTOM</div>
                <h3 className="text-[22px] font-extrabold text-white mb-1">Enterprise</h3>
                <p className="text-[13px] text-white/45 mb-4">Multi-clinic networks, hospital groups, multi-tenant doctor setups</p>
                <div className="text-[32px] font-extrabold text-white mb-1">Bespoke</div>
                <div className="text-[12px] text-white/40">Pricing based on clinic count & requirements</div>
              </div>
              <div className="flex-1 space-y-1">
                <PkgGroup icon={Building2} color="#7c3aed" title="Multi-Clinic / Multi-Doctor" items={[
                  'Unlimited clinics & locations','Multi-tenant doctor accounts','Organisation dashboard (org owner view)','Cross-clinic analytics & reporting','Centralised patient database',
                ]} />
                <PkgGroup icon={Shield} color="#7c3aed" title="Enterprise Features" items={[
                  'White-label (your own brand)','Custom integrations (HIS, LIS, RIS)','Dedicated cloud infrastructure','SLA-backed 99.9% uptime','Custom AI training on your data','Onsite training & onboarding','Legal & compliance assistance',
                ]} />
                <div className="rounded-xl p-3 mt-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <div className="text-[12px] text-white/50"><span className="font-semibold text-white/70">Note:</span> Multi-tenant doctor setups (multiple independent doctors under one org) are available on Enterprise Custom only — not available in Package 1 or 2.</div>
                </div>
              </div>
              <a href="mailto:info@klassicalholdings.com?subject=Enterprise Enquiry"
                className="mt-7 block text-center py-3.5 rounded-xl text-[14px] font-bold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', color: '#c4b5fd' }}>
                Contact Sales
              </a>
            </div>
          </div>

          {/* Add-on note */}
          <div className="mt-8 text-center text-[13px] text-white/35">
            All packages include a <span className="text-white/60">14-day free trial</span>. AI Scribe is an optional add-on. Ad spend for Meta Ads is billed separately and set by you.
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-3">Trusted by Doctors Globally</h2>
            <p className="text-white/45">From Luton to Sydney to Riyadh — clinics powered by MediPlex</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Dr. James', role: 'Paediatrician', location: 'Luton, UK 🇬🇧', quote: 'The AI Scribe alone saves me 2 hours every day. SOAP notes used to take 15 minutes each — now it\'s 30 seconds. MediPlex has transformed how I run my clinic.' },
              { name: 'Dr. Anderson', role: 'Dentist', location: 'Melbourne, Australia 🇦🇺', quote: 'The WhatsApp reminders dropped our no-show rate from 28% to under 5%. The billing module handles everything automatically. Honestly the best investment I\'ve made for my practice.' },
              { name: 'Dr. Waheed', role: 'General Practitioner', location: 'Riyadh, Saudi Arabia 🇸🇦', quote: 'I manage 40+ patients a day. MediPlex lets my receptionist handle bookings via WhatsApp while I focus on patients. The offline mode is a lifesaver when the internet drops.' },
            ].map(t => (
              <div key={t.name} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_,i)=><Star key={i} size={13} fill="#C9A84C" style={{ color: '#C9A84C' }} />)}
                </div>
                <p className="text-[14px] text-white/65 leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px]" style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0a1628' }}>
                    {t.name.split(' ')[1][0]}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-white">{t.name}</div>
                    <div className="text-[12px] text-white/40">{t.role} · {t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GLOBAL / SPECIALTIES ──────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: 'rgba(201,168,76,0.04)', borderTop: '1px solid rgba(201,168,76,0.1)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Built for Global Clinics</h2>
          <p className="text-white/50 text-[15px] mb-12 max-w-2xl mx-auto">
            Global multi-currency support, local insurance integrations, WhatsApp (global), Stripe (UK/Global), SafePay (Pakistan) and region-specific compliance.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Globe, color: '#3b82f6', title: 'Multi-Currency', desc: 'GBP, USD, PKR, AED, SAR, AUD and more' },
              { icon: MessageCircle, color: '#25D366', title: 'WhatsApp Global', desc: 'Works in any country with WhatsApp' },
              { icon: CreditCard, color: '#C9A84C', title: 'Stripe & SafePay', desc: 'UK/Global payments + Pakistan SafePay' },
              { icon: Lock, color: '#10b981', title: 'GDPR & HIPAA Ready', desc: 'UK, EU and international compliance' },
            ].map(f => (
              <div key={f.title} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <f.icon size={20} style={{ color: f.color }} className="mx-auto mb-3" />
                <div className="text-[13px] font-bold text-white mb-1">{f.title}</div>
                <div className="text-[12px] text-white/45">{f.desc}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[13px] text-white/35 mb-4">Specialties supported</div>
            <div className="flex flex-wrap justify-center gap-2">
              {['General Practice','Paediatrics','Dentistry','Gynaecology','Orthopaedics','Cardiology','Dermatology','ENT','Neurology','Psychiatry','Oncology','Ophthalmology','Urology','Pulmonology','Nephrology'].map(s=>(
                <span key={s} className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-3">Frequently Asked Questions</h2>
            <p className="text-white/45">Everything you need to know before you start</p>
          </div>
          <div>
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 mx-6 mb-12 rounded-3xl" style={{ background: 'linear-gradient(135deg, #0f2040, #162845)', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">Ready to Transform Your Clinic?</h2>
          <p className="text-[16px] text-white/55 mb-8">Join 500+ clinics already running on MediPlex. Start your free 14-day trial today — no credit card, no commitment.</p>
          <Link href="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-bold transition-all hover:-translate-y-1 hover:shadow-2xl"
            style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0a1628' }}>
            Start Free Trial Now <ArrowRight size={18} />
          </Link>
          <p className="text-[12px] text-white/30 mt-4">14 days free · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ background: '#060f1e', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <img src="/icons/mediplex-logo.svg" alt="MediPlex" style={{ height: 36, width: 'auto', marginBottom: 16 }} />
              <p className="text-[13px] text-white/40 leading-relaxed mb-4">AI-powered clinic management for modern healthcare providers globally.</p>
              <div className="space-y-2 text-[12px] text-white/35">
                <div className="flex items-center gap-2"><MapPin size={11}/> KLASSICAL HOLDINGS LTD, UK</div>
                <div className="flex items-center gap-2"><Building2 size={11}/> Company No. 16964688</div>
                <div className="flex items-center gap-2"><Mail size={11}/> info@klassicalholdings.com</div>
                <div className="flex items-center gap-2"><Phone size={11}/> +44 7700 000000</div>
              </div>
            </div>
            {/* Product */}
            <div>
              <div className="text-[11px] font-bold tracking-widest text-white/30 uppercase mb-4">Product</div>
              <ul className="space-y-2.5 text-[13px] text-white/50">
                {['Features','Pricing','AI Scribe','Patient Portal','WhatsApp Bot','Mobile App'].map(l=>(
                  <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            {/* Company */}
            <div>
              <div className="text-[11px] font-bold tracking-widest text-white/30 uppercase mb-4">Company</div>
              <ul className="space-y-2.5 text-[13px] text-white/50">
                {[['About','#'],['Contact','mailto:info@klassicalholdings.com'],['Privacy Policy','#'],['Terms of Service','#'],['GDPR','#'],['Companies House','https://find-and-update.company-information.service.gov.uk/company/16964688']].map(([l,h])=>(
                  <li key={l}><a href={h} className="hover:text-white transition-colors" target={h.startsWith('http')?'_blank':undefined}>{l}</a></li>
                ))}
              </ul>
            </div>
            {/* Lead Capture */}
            <div>
              <div className="text-[11px] font-bold tracking-widest text-white/30 uppercase mb-4">Get In Touch</div>
              <p className="text-[13px] text-white/45 mb-4">Book a free demo or ask us anything.</p>
              <a href="https://wa.me/447700000000?text=Hi%20MediPlex%2C%20I%27d%20like%20to%20know%20more"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold mb-3 transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}>
                <MessageCircle size={15}/> WhatsApp Us
              </a>
              <a href="mailto:info@klassicalholdings.com?subject=MediPlex Demo Request"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                <Mail size={15}/> Email Us
              </a>
              <div className="flex gap-3 mt-4">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)', color: '#0a66c2' }}>in</a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(29,161,242,0.12)', border: '1px solid rgba(29,161,242,0.3)', color: '#1da1f2' }}>𝕏</a>
                <a href="https://wa.me/447700000000" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}>
                  <MessageCircle size={14}/>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[12px] text-white/25">© 2025 KLASSICAL HOLDINGS LTD · Company No. 16964688 · Registered in England & Wales</p>
            <p className="text-[12px] text-white/25">Powered by <span style={{ color: '#C9A84C', fontWeight: 600 }}>MediPlex</span> — AI for Smart Healthcare</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
