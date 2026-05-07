'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle, ArrowRight, Star, Menu, X, ChevronDown, ChevronUp,
  Bot, Receipt, Calendar, MessageCircle, BarChart3, Smartphone,
  Globe, Shield, Zap, Users, Bell, Activity, Mail,
  MapPin, Phone, TrendingUp, Palette, WifiOff, Target,
  Search, Image as ImageIcon, Megaphone, CreditCard, Lock,
  ClipboardList, UserCircle, Building2, Stethoscope, FlaskConical,
  Play, Clock,
} from 'lucide-react';

const ALL_FEATURES = [
  { icon: Bot,          color: '#C9A84C', title: 'AI Clinical Scribe' },
  { icon: MessageCircle,color: '#25D366', title: 'WhatsApp AI Receptionist' },
  { icon: Calendar,     color: '#2563EB', title: 'Smart Scheduling' },
  { icon: Receipt,      color: '#10B981', title: 'Billing & Invoicing' },
  { icon: FlaskConical, color: '#F59E0B', title: 'Lab Integration' },
  { icon: UserCircle,   color: '#8B5CF6', title: 'Patient Portal' },
  { icon: BarChart3,    color: '#EF4444', title: 'Analytics Dashboard' },
  { icon: Shield,       color: '#0EA5E9', title: 'Security & Compliance' },
  { icon: TrendingUp,   color: '#C9A84C', title: 'No-Show Predictions' },
  { icon: Palette,      color: '#EC4899', title: 'Clinic Branding' },
  { icon: Bell,         color: '#F97316', title: 'Auto Reminders & Feedback' },
  { icon: Smartphone,   color: '#6366F1', title: 'Mobile & Desktop App' },
  { icon: WifiOff,      color: '#14B8A6', title: 'Offline Mode' },
  { icon: Target,       color: '#F43F5E', title: 'Meta & Google Ads' },
  { icon: Search,       color: '#84CC16', title: 'SEO Clinic Website' },
  { icon: ImageIcon,    color: '#A78BFA', title: 'Graphical Posters' },
  { icon: Mail,         color: '#38BDF8', title: 'Email Marketing' },
  { icon: ClipboardList,color: '#FB923C', title: 'Pre-Auth Insurance' },
  { icon: Megaphone,    color: '#C9A84C', title: 'WhatsApp Broadcast' },
  { icon: Activity,     color: '#4ADE80', title: 'Telemedicine' },
];

const FAQS = [
  { q: 'Is MediPlex suitable for any clinic specialty?',       a: 'Yes — MediPlex works for General Practice, Pediatrics, Dentistry, Dermatology, Gynecology, ENT, Orthopaedics and any specialty. Templates and workflows adapt automatically.' },
  { q: 'What happens after the 14-day free trial?',            a: "Your card is not charged during the trial. On day 14 you'll receive an email. If you choose to continue, your first payment is processed. Cancel any time before the trial ends with zero charges." },
  { q: 'Does MediPlex work without internet?',                 a: 'Yes. The PWA works fully offline. Appointments, patient records, prescriptions and lab data are cached locally. All changes sync automatically when connection is restored.' },
  { q: 'Is my data secure and GDPR compliant?',                a: 'MediPlex is hosted on enterprise-grade infrastructure with end-to-end encryption. We are registered in the UK (KLASSICAL HOLDINGS LTD, company 16964688) and fully GDPR compliant.' },
  { q: 'What is the WhatsApp AI Receptionist?',                a: 'The AI receptionist answers patient queries, confirms bookings, sends reminders and handles follow-up — 24/7. Patients message your clinic WhatsApp number and the AI handles it automatically.' },
  { q: 'Can I use my own clinic branding?',                    a: "Yes. Upload your logo, header and footer images. All prescriptions, invoices, receipts and WhatsApp messages carry your clinic's brand — not MediPlex's." },
  { q: 'Can I migrate my existing patient data?',              a: 'Absolutely. Our team assists with data migration from spreadsheets, other software or paper records. Most migrations complete within 48 hours.' },
  { q: 'Is the marketing ecosystem integrated with MediPlex?', a: "Yes — it's one connected system. Your patient database, WhatsApp reminders, email campaigns, Meta ads audience, SEO website and poster content all talk to each other." },
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
        className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="text-[15px] font-semibold text-gray-800 group-hover:text-[#0A1628] transition-colors">{q}</span>
        {open
          ? <ChevronUp size={16} className="flex-shrink-0" style={{ color: '#C9A84C' }} />
          : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && <p className="text-[14px] text-gray-500 leading-relaxed pb-5">{a}</p>}
    </div>
  );
}

function PkgGroup({ icon: Icon, color, title, items }: { icon: any; color: string; title: string; items: string[] }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-[13px] font-semibold text-[#0A1628]">{title}</span>
      </div>
      <ul className="space-y-1.5 pl-9">
        {items.map(it => (
          <li key={it} className="flex items-start gap-2 text-[12px] text-gray-500 leading-relaxed">
            <CheckCircle size={11} style={{ color, flexShrink: 0, marginTop: 3 }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Inline logo mark (readable on both light and dark) ─────────────── */
function LogoMark({ dark }: { dark: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
      <img src="/icons/icon.svg" alt="MediPlex"
        style={{ height: 34, width: 34, borderRadius: 8, display: 'block' }} />
      <span style={{ fontWeight: 700, letterSpacing: '-0.6px', fontSize: '17px', lineHeight: 1 }}>
        <span style={{ color: dark ? '#ffffff' : '#0A1628' }}>Medi</span>
        <span style={{ color: '#C9A84C' }}>Plex</span>
      </span>
    </Link>
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

  const navLinkClass = `text-[13px] font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-[#0A1628]' : 'text-white/75 hover:text-white'}`;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif' }}>

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/96 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <LogoMark dark={!scrolled} />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            <Link href="/features" className={navLinkClass}>Features</Link>
            {[['Pricing','#pricing'],['Ecosystem','#ecosystem'],['FAQ','#faq']].map(([l,h])=>(
              <a key={h} href={h} className={navLinkClass}>{l}</a>
            ))}
            <Link href="/contact" className={navLinkClass}>Contact</Link>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/login"
              className={`text-[13px] font-medium px-4 py-2 rounded-lg transition-colors ${scrolled ? 'text-gray-600 hover:text-[#0A1628]' : 'text-white/70 hover:text-white'}`}>
              Sign In
            </Link>
            <Link href="/contact"
              className={`text-[13px] font-medium px-4 py-2 rounded-lg border transition-colors ${scrolled ? 'border-gray-200 text-gray-700 hover:border-gray-400' : 'border-white/25 text-white hover:bg-white/10'}`}>
              Contact Us
            </Link>
            <Link href="/onboarding"
              className="ml-1 px-4 py-2 rounded-lg text-[13px] font-semibold text-[#0A1628] transition-all hover:shadow-lg hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
              Free Trial
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu
              ? <X size={20} className={scrolled ? 'text-gray-800' : 'text-white'} />
              : <Menu size={20} className={scrolled ? 'text-gray-800' : 'text-white'} />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-1 shadow-xl">
            {[['Features','/features'],['Pricing','#pricing'],['Ecosystem','#ecosystem'],['FAQ','#faq'],['Contact Us','/contact']].map(([l,h])=>(
              h.startsWith('/')
                ? <Link key={l} href={h} onClick={() => setMobileMenu(false)} className="block text-[14px] font-medium text-gray-700 py-2.5 border-b border-gray-50">{l}</Link>
                : <a key={l} href={h} onClick={() => setMobileMenu(false)} className="block text-[14px] font-medium text-gray-700 py-2.5 border-b border-gray-50">{l}</a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link href="/login" className="text-center py-2.5 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600">Sign In</Link>
              <Link href="/onboarding"
                className="text-center py-2.5 rounded-xl text-[13px] font-semibold text-[#0A1628]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                Start Free Trial — 14 Days Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 45%, #0E1B35 80%, #0A1628 100%)' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(201,168,76,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.04) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
        {/* Glow orbs */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 65%)', filter: 'blur(40px)' }} />

        <div className="relative max-w-5xl mx-auto px-6 py-28 text-center w-full">

          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-10 text-[12px] font-medium tracking-wide"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(232,200,122,0.9)' }}>
            <span style={{ fontSize: 13 }}>🇬🇧</span>
            <span className="opacity-50">|</span>
            UK Registered · KLASSICAL HOLDINGS LTD · Co. 16964688
          </div>

          {/* Headline */}
          <h1 className="text-white font-black mb-7 mx-auto"
            style={{
              fontSize: 'clamp(48px, 7.5vw, 88px)',
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
              maxWidth: 900,
            }}>
            The Complete<br />
            <span style={{
              background: 'linear-gradient(135deg, #C9A84C 20%, #E8C87A 55%, #C9A84C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              AI‑HMIS
            </span>{' '}
            for Modern Clinics
          </h1>

          {/* Subtitle */}
          <p className="mb-10 mx-auto"
            style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: 'rgba(255,255,255,0.52)', lineHeight: 1.65, maxWidth: 560, fontWeight: 400 }}>
            One platform for clinical management, patient engagement,<br className="hidden sm:block" />
            and clinic growth — powered by AI.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
            <Link href="/onboarding"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-[14px] font-semibold text-[#0A1628] transition-all hover:shadow-2xl hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', boxShadow: '0 6px 28px rgba(201,168,76,0.3)', letterSpacing: '-0.2px' }}>
              Start Free Trial — 14 Days Free <ArrowRight size={15} />
            </Link>
            <Link href="/features"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-[14px] font-medium transition-all hover:bg-white/8"
              style={{ border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.75)', letterSpacing: '-0.2px' }}>
              <Play size={13} /> See All Features
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { val: 500,     sfx: '+',  label: 'Clinics Worldwide' },
              { val: 2000000, sfx: '+',  label: 'Prescriptions Generated' },
              { val: 50,      sfx: '+',  label: 'Cities Covered' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: '#C9A84C', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {s.val === 2000000 ? '2M+' : <><AnimatedCounter target={s.val} />{s.sfx}</>}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 5, fontWeight: 500 }}>{s.label}</div>
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

      {/* ── TRUSTED BY ──────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold mb-8">Trusted by clinics across the globe</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
            {['🇬🇧 United Kingdom','🇵🇰 Pakistan','🇦🇺 Australia','🇸🇦 Saudi Arabia','🇦🇪 UAE','🇮🇳 India'].map(c => (
              <span key={c} className="text-[13px] font-semibold text-gray-400">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES (compact grid) ──────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-5 tracking-wide"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
              ✦ Platform Features
            </div>
            <h2 className="font-black text-[#0A1628] mb-4" style={{ fontSize: 'clamp(30px, 4vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Built for how clinics actually work
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto" style={{ fontSize: 15 }}>Every feature designed with real clinical workflows in mind.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 mb-10">
            {ALL_FEATURES.map(f => (
              <Link href="/features" key={f.title}
                className="group flex flex-col items-center text-center p-4 rounded-2xl border border-gray-100 hover:border-[#C9A84C]/40 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-white">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                  style={{ background: f.color + '13' }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <span className="text-[12px] font-semibold text-[#0A1628] leading-tight">{f.title}</span>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all hover:-translate-y-0.5"
              style={{ border: '1.5px solid rgba(201,168,76,0.45)', color: '#C9A84C', background: 'rgba(201,168,76,0.04)' }}>
              Explore All 20 Features in Detail <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHATSAPP SECTION ────────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-6"
                style={{ background: 'rgba(37,211,102,0.1)', color: '#15803d', border: '1px solid rgba(37,211,102,0.2)' }}>
                💬 WhatsApp AI Booking Demo
              </div>
              <h2 className="font-black text-[#0A1628] mb-5" style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', lineHeight: 1.15, letterSpacing: '-0.03em' }}>
                Your clinic never stops<br />
                <span style={{ color: '#16a34a' }}>working</span>, even at 3am
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8" style={{ fontSize: 15 }}>
                The WhatsApp AI Receptionist handles appointment requests, answers FAQs, sends confirmations and reminders — completely automatically.
              </p>
              <ul className="space-y-3">
                {[
                  'Auto appointment booking via WhatsApp',
                  '24h & 4h smart reminders with no-show prediction',
                  'Instant replies to patient queries 24/7',
                  'Bulk WhatsApp campaigns for health promotions',
                  'Payment receipts & follow-up messages delivered instantly',
                ].map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckCircle size={16} style={{ color: '#25D366', flexShrink: 0, marginTop: 2 }} />
                    <span className="text-[14px] text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/onboarding"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold text-[#0A1628] transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                  Get WhatsApp AI <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Chat mockup */}
            <div className="relative">
              <div className="rounded-3xl p-6 shadow-2xl max-w-xs mx-auto" style={{ background: '#0A1628' }}>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', color: '#0A1628' }}>M+</div>
                  <div>
                    <div className="text-white text-[13px] font-semibold">MediPlex Clinic</div>
                    <div className="text-[10px]" style={{ color: '#25D366' }}>● Online</div>
                  </div>
                  <MessageCircle size={17} style={{ color: '#25D366', marginLeft: 'auto' }} />
                </div>
                <div className="space-y-3">
                  {[
                    { msg: 'Hi! I need an appointment for tomorrow', from: 'patient' },
                    { msg: '✅ Hi Sara! We have slots available:\n• 10:00 AM\n• 2:00 PM\nWhich do you prefer?', from: 'bot' },
                    { msg: '10am please', from: 'patient' },
                    { msg: '🎉 Appointment confirmed!\nTomorrow, 10:00 AM\nDr. Ahmad — General Practice\n\nReminder will be sent tonight.', from: 'bot' },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'patient' ? 'justify-end' : 'justify-start'}`}>
                      <div className="px-3 py-2 text-[11px] leading-relaxed max-w-[82%] whitespace-pre-line"
                        style={{
                          background: m.from === 'patient' ? 'rgba(201,168,76,0.22)' : 'rgba(255,255,255,0.09)',
                          color: m.from === 'patient' ? '#E8C87A' : 'rgba(255,255,255,0.82)',
                          borderRadius: m.from === 'patient' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        }}>
                        {m.msg}
                      </div>
                    </div>
                  ))}
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
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[11px] text-white/30 flex-1">Message MediPlex Clinic...</span>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#25D366' }}>
                    <ArrowRight size={10} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-xl px-3 py-2 shadow-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-gray-700">Available 24/7</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl px-3 py-2.5 shadow-xl border border-gray-100">
                <div className="text-[10px] text-gray-400 mb-0.5">This week</div>
                <div className="text-[13px] font-bold text-[#0A1628]">142 bookings via WhatsApp</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ────────────────────────────────────────────────────── */}
      <section id="ecosystem" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-5"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
              ✦ One Connected System
            </div>
            <h2 className="font-black text-[#0A1628] mb-4" style={{ fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              The Complete Clinic Growth Ecosystem
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto" style={{ fontSize: 15 }}>
              MediPlex is not just software — it's HMIS + Marketing + Branding + Patient Engagement, all connected through one dashboard.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {[
              { icon: Stethoscope, color: '#2563EB', title: 'Clinical Management', items: ['AI SOAP Notes & Prescriptions','Lab Orders & Results','Patient Portal & Records','Billing & Insurance Claims','Telemedicine Video Consult'] },
              { icon: MessageCircle, color: '#25D366', title: 'Patient Engagement', items: ['WhatsApp AI Receptionist','Auto Confirmations & Reminders','Follow-up & Feedback Surveys','WhatsApp Broadcast Campaigns','Patient Satisfaction Scores'] },
              { icon: Megaphone, color: '#F43F5E', title: 'Clinic Growth & Marketing', items: ['Meta Ads (Facebook & Instagram)','SEO-Optimised Clinic Website','15–20 Branded Posters / Month','Unlimited Email Campaigns','Google Business Profile Setup'] },
            ].map(c => (
              <div key={c.title} className="rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: c.color + '15' }}>
                  <c.icon size={18} style={{ color: c.color }} />
                </div>
                <h3 className="text-[15px] font-bold text-[#0A1628] mb-3">{c.title}</h3>
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
          <div className="rounded-2xl p-5 text-center border border-gray-100 bg-gray-50/70">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">Everything flows through one connected system</p>
            <div className="flex flex-wrap justify-center items-center gap-2 text-[12px] font-semibold">
              {['Patient Books via WhatsApp','→','Appointment Confirmed','→','Doctor uses AI Scribe','→','Prescription Auto-generated','→','Follow-up Reminder Sent','→','Analytics Updated'].map(s=>(
                <span key={s} style={{ color: s === '→' ? '#D1D5DB' : '#C9A84C' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="howitworks" className="py-24" style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-5"
              style={{ background: 'rgba(201,168,76,0.12)', color: '#E8C87A', border: '1px solid rgba(201,168,76,0.2)' }}>
              ✦ Simple Setup
            </div>
            <h2 className="font-black text-white mb-4" style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Up and running in under 10 minutes
            </h2>
            <p className="text-white/50" style={{ fontSize: 15 }}>No IT team needed. No complex installation. Just sign up and go.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step:'01', icon: Globe,     color:'#C9A84C', title:'Sign Up & Choose Plan',      desc:'Pick your package and start your 14-day free trial. No credit card required.' },
              { step:'02', icon: Building2, color:'#38BDF8', title:'Complete Setup Wizard',       desc:'8 quick steps — clinic details, branding, doctor profile, schedule and billing.' },
              { step:'03', icon: Activity,  color:'#10B981', title:'Go Live Instantly',           desc:'Patients can book via WhatsApp. AI Scribe is ready. Your clinic runs itself.' },
            ].map((s, i) => (
              <div key={i} className="relative text-center">
                {i < 2 && <div className="hidden md:block absolute top-10 left-[62%] w-[76%] h-px" style={{ background: 'linear-gradient(90deg,rgba(201,168,76,0.35),transparent)' }} />}
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: s.color + '14', border: `1px solid ${s.color}28` }}>
                  <s.icon size={28} style={{ color: s.color }} />
                </div>
                <div className="text-[11px] font-bold mb-2 tracking-widest" style={{ color: s.color }}>{s.step}</div>
                <h3 className="text-[17px] font-bold text-white mb-2">{s.title}</h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-5"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
              ✦ Transparent Pricing
            </div>
            <h2 className="font-black text-[#0A1628] mb-3" style={{ fontSize: 'clamp(30px, 4vw, 48px)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              Simple pricing.<br />Serious value.
            </h2>
            <p className="text-gray-500 mb-8" style={{ fontSize: 15 }}>All plans include a 14-day free trial. No credit card required.</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Professional ─────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl p-7 flex flex-col border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#2563EB' }}>Professional</div>
              <h3 className="text-[24px] font-black text-[#0A1628] mb-1" style={{ letterSpacing: '-0.03em' }}>Professional</h3>
              <p className="text-[13px] text-gray-400 mb-5">Full clinic management + marketing ecosystem</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[42px] font-black text-[#0A1628]" style={{ letterSpacing: '-0.04em' }}>£{yearly ? 125 : 150}</span>
                <span className="text-[13px] text-gray-400 mb-1">/mo</span>
              </div>
              {yearly && <div className="text-[12px] mb-4" style={{ color: '#C9A84C' }}>Save £300/yr · billed £1,500/yr</div>}

              {/* CTA at top */}
              <Link href={`/onboarding?plan=professional&billing=${yearly ? 'yearly' : 'monthly'}`}
                className="block text-center py-3 rounded-2xl text-[13px] font-bold mb-6 mt-2 transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: '1.5px solid #2563EB', color: '#2563EB', background: 'rgba(37,99,235,0.04)' }}>
                Start Free Trial →
              </Link>

              <div className="flex-1">
                <PkgGroup icon={Stethoscope} color="#2563EB" title="MediPlex HMIS" items={[
                  'Appointment & Patient Management',
                  'Digital Prescriptions with QR',
                  'Smart Billing — Invoices, Receipts, Expenses',
                  'Lab Orders & Results (QR-based)',
                  'Patient Portal (self-booking, records)',
                  'Telemedicine / Video Consult',
                  'No-Show Prediction AI',
                  'Role-based Staff Accounts',
                  'Clinic Analytics Dashboard',
                  'Offline Mode (full PWA)',
                  'Clinic Branding (logo, header, footer)',
                  'Pre-Auth Insurance Letters',
                ]} />
                <PkgGroup icon={MessageCircle} color="#25D366" title="WhatsApp AI Receptionist" items={[
                  '24/7 AI replies & auto appointment booking',
                  'Confirmation, 24h & 4h reminders',
                  'Follow-up, feedback & broadcast campaigns',
                ]} />
                <PkgGroup icon={Globe} color="#C9A84C" title="Clinic Website" items={[
                  'Professional SEO website with online booking',
                  'Google Business Profile & local SEO',
                ]} />
                <PkgGroup icon={Mail} color="#38BDF8" title="Email Marketing — Unlimited" items={[
                  'Unlimited campaigns with clinic branding',
                  'Health tips, recalls, seasonal promotions',
                ]} />
                <PkgGroup icon={ImageIcon} color="#A78BFA" title="Graphical Posters (15–20/month)" items={[
                  '15–20 branded posters per month',
                  'Formatted for Instagram, Facebook & WhatsApp',
                ]} />
                <PkgGroup icon={Bot} color="#C9A84C" title="AI Clinical Scribe — Included" items={[
                  'SOAP Notes, Prescriptions, Referrals',
                  'Discharge Summaries, Pre-Auth Letters, Sick Certs',
                  '200 AI notes/month',
                ]} />
              </div>
            </div>

            {/* ── Growth ───────────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl p-7 flex flex-col relative transition-all hover:-translate-y-1"
              style={{ border: '2px solid #C9A84C', boxShadow: '0 8px 40px rgba(201,168,76,0.15)' }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-bold text-[#0A1628]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                Most Popular
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#C9A84C' }}>Growth</div>
              <h3 className="text-[24px] font-black text-[#0A1628] mb-1" style={{ letterSpacing: '-0.03em' }}>Growth</h3>
              <p className="text-[13px] text-gray-400 mb-5">Everything in Professional + managed advertising</p>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-[42px] font-black text-[#0A1628]" style={{ letterSpacing: '-0.04em' }}>£{yearly ? 175 : 210}</span>
                <span className="text-[13px] text-gray-400 mb-1">/mo</span>
              </div>
              {yearly && <div className="text-[12px] mb-4" style={{ color: '#C9A84C' }}>Save £420/yr · billed £2,100/yr</div>}

              {/* CTA at top */}
              <Link href={`/onboarding?plan=growth&billing=${yearly ? 'yearly' : 'monthly'}`}
                className="block text-center py-3 rounded-2xl text-[13px] font-bold mb-6 mt-2 transition-all hover:shadow-lg hover:-translate-y-0.5 text-[#0A1628]"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
                Start Free Trial →
              </Link>

              <div className="flex-1">
                <div className="rounded-xl p-3 mb-5" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}>
                  <div className="text-[12px] font-semibold mb-0.5" style={{ color: '#C9A84C' }}>Everything in Professional, plus:</div>
                  <div className="text-[12px] text-gray-500">All HMIS, WhatsApp, Website, Email & Posters included</div>
                </div>
                <PkgGroup icon={Target} color="#F43F5E" title="Meta Ads — Facebook & Instagram" items={[
                  'Fully managed campaigns targeting local patients',
                  'Appointment & lead generation ad formats',
                  'Seasonal campaign creatives + monthly reports',
                  'Ad spend not included — set your own budget, or choose our commission-based model',
                ]} />
                <PkgGroup icon={Bot} color="#C9A84C" title="AI Clinical Scribe — Included" items={[
                  'SOAP Notes, Prescriptions, Referrals, Discharge & Pre-Auth',
                  '400 AI notes/month',
                ]} />
              </div>
            </div>

            {/* ── Enterprise ───────────────────────────────────────────── */}
            <div className="bg-white rounded-3xl p-7 flex flex-col border border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#7C3AED' }}>Custom</div>
              <h3 className="text-[24px] font-black text-[#0A1628] mb-1" style={{ letterSpacing: '-0.03em' }}>Enterprise</h3>
              <p className="text-[13px] text-gray-400 mb-5">Multi-clinic networks, hospital groups, multi-tenant setups</p>
              <div className="text-[38px] font-black text-[#0A1628] mb-1" style={{ letterSpacing: '-0.04em' }}>Bespoke</div>
              <div className="text-[12px] text-gray-400 mb-4">Pricing based on clinic count & requirements</div>

              {/* CTA at top */}
              <a href="mailto:info@klassicalholdings.com?subject=Enterprise Enquiry"
                className="block text-center py-3 rounded-2xl text-[13px] font-bold mb-6 transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ border: '1.5px solid #7C3AED', color: '#7C3AED', background: 'rgba(124,58,237,0.04)' }}>
                Contact Sales
              </a>

              <div className="flex-1">
                <PkgGroup icon={Building2} color="#7C3AED" title="Multi-Clinic / Multi-Doctor" items={[
                  'Unlimited clinics & locations',
                  'Multi-tenant doctor accounts',
                  'Organisation dashboard (org owner view)',
                  'Cross-clinic analytics & centralised database',
                ]} />
                <PkgGroup icon={Shield} color="#7C3AED" title="Enterprise Features" items={[
                  'White-label (your own brand)',
                  'Custom integrations (HIS, LIS, RIS)',
                  'Dedicated cloud infrastructure & SLA 99.9%',
                  'Custom AI training + onsite onboarding',
                ]} />
                <div className="rounded-xl p-3 mt-2" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <p className="text-[12px] text-gray-500">
                    <span className="font-semibold text-gray-700">Note:</span> Multi-tenant doctor setups are Enterprise only — not available in Professional or Growth.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <p className="text-center text-[12px] text-gray-400 mt-8">
            All prices in GBP. VAT may apply. Cancel anytime.{' '}
            <Link href="/contact" className="hover:underline" style={{ color: '#C9A84C' }}>Questions? Contact us →</Link>
          </p>
        </div>
      </section>

      {/* ── ROLE-BASED ACCESS ───────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-5"
              style={{ background: 'rgba(14,165,233,0.08)', color: '#0369a1', border: '1px solid rgba(14,165,233,0.2)' }}>
              🔒 HIPAA-Compliant Role-Based Access
            </div>
            <h2 className="font-black text-[#0A1628] mb-3" style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Right access for every role
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto" style={{ fontSize: 15 }}>
              Every user sees only what they need — nothing more. Minimum-necessary access, audit logs and session controls built in.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                role: 'Institution Owner',
                badge: 'Org Owner',
                badgeColor: '#7C3AED',
                icon: '🏢',
                desc: 'Multi-clinic organisation oversight, billing and staff management. No direct patient data access per HIPAA minimum-necessary rule.',
                access: [
                  { label: 'Multi-clinic dashboard',    ok: true },
                  { label: 'Organisation analytics',    ok: true },
                  { label: 'Subscription & billing',    ok: true },
                  { label: 'Staff role management',     ok: true },
                  { label: 'Patient clinical records',  ok: false, note: 'HIPAA restricted' },
                  { label: 'Prescriptions / AI Scribe', ok: false, note: 'HIPAA restricted' },
                ],
              },
              {
                role: 'Admin',
                badge: 'Admin',
                badgeColor: '#2563EB',
                icon: '⚙️',
                desc: 'Full clinic configuration, staff management and financial reporting. Patient access limited to demographics and scheduling.',
                access: [
                  { label: 'Clinic settings & config',  ok: true },
                  { label: 'Staff & role management',   ok: true },
                  { label: 'Billing & financial reports',ok: true },
                  { label: 'Appointment management',    ok: true },
                  { label: 'Patient demographics',      ok: 'partial', note: 'Name & contact only' },
                  { label: 'Clinical notes & Rx',       ok: false, note: 'HIPAA restricted' },
                ],
              },
              {
                role: 'Doctor',
                badge: 'Clinical',
                badgeColor: '#059669',
                icon: '🩺',
                desc: 'Full clinical access — patient history, AI Scribe, prescriptions, labs and telemedicine. Complete care workflow in one place.',
                access: [
                  { label: 'Full patient records',      ok: true },
                  { label: 'AI Scribe — SOAP notes',    ok: true },
                  { label: 'Prescriptions & referrals', ok: true },
                  { label: 'Lab orders & results',      ok: true },
                  { label: 'Telemedicine consults',     ok: true },
                  { label: 'Billing & financials',      ok: 'partial', note: 'Own consultations' },
                ],
              },
              {
                role: 'Receptionist',
                badge: 'Front Desk',
                badgeColor: '#C9A84C',
                icon: '📋',
                desc: 'Appointment and front-desk operations only. No access to clinical data or prescriptions — strict HIPAA compliance enforced.',
                access: [
                  { label: 'Appointment scheduling',    ok: true },
                  { label: 'Patient registration',      ok: 'partial', note: 'Demographics only' },
                  { label: 'Invoice generation',        ok: true },
                  { label: 'WhatsApp communications',   ok: true },
                  { label: 'Clinical notes',            ok: false, note: 'HIPAA restricted' },
                  { label: 'Prescriptions / AI Scribe', ok: false, note: 'HIPAA restricted' },
                ],
              },
            ].map(r => (
              <div key={r.role} className="rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5">
                {/* Header */}
                <div className="px-5 py-4" style={{ background: r.badgeColor + '0c', borderBottom: `1px solid ${r.badgeColor}18` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{r.icon}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: r.badgeColor + '18', color: r.badgeColor, border: `1px solid ${r.badgeColor}28` }}>
                      {r.badge}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-black text-[#0A1628]" style={{ letterSpacing: '-0.02em' }}>{r.role}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{r.desc}</p>
                </div>

                {/* Permissions */}
                <div className="px-5 py-4 space-y-2">
                  {r.access.map(a => (
                    <div key={a.label} className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        {a.ok === true && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#d1fae5' }}>
                            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4L3 5.5L6.5 2" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                        {a.ok === 'partial' && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#fef9c3' }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#CA8A04' }} />
                          </div>
                        )}
                        {a.ok === false && (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#fee2e2' }}>
                            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M2 2L6 6M6 2L2 6" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-[12px] font-medium ${a.ok === false ? 'text-gray-400' : 'text-gray-700'}`}>{a.label}</span>
                        {(a as any).note && (
                          <span className="ml-1.5 text-[10px] text-gray-400 italic">{(a as any).note}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* HIPAA compliance strip */}
          <div className="rounded-2xl p-5 flex flex-wrap items-center gap-6 justify-between"
            style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.1)' }}>
                <Shield size={16} style={{ color: '#0369a1' }} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#0A1628]">HIPAA & GDPR Compliant by Design</div>
                <div className="text-[12px] text-gray-500">Audit logs · Session timeouts · 2FA · Encrypted at rest · Minimum necessary access enforced</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Audit Logs','2FA','Session Control','Role Enforcement','Data Encryption','Access Reviews'].map(b => (
                <span key={b} className="px-3 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: 'rgba(14,165,233,0.08)', color: '#0369a1', border: '1px solid rgba(14,165,233,0.18)' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-black text-[#0A1628] mb-3" style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', letterSpacing: '-0.03em' }}>Loved by clinicians worldwide</h2>
            <p className="text-gray-500" style={{ fontSize: 15 }}>Real feedback from real doctors</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name:'Dr. James',    role:'Paediatrician, Luton UK 🇬🇧',     text:"The AI Scribe alone saves me 2 hours every day. SOAP notes used to take 15 minutes each — now it's 30 seconds. MediPlex has transformed how I run my clinic." },
              { name:'Dr. Anderson', role:'Dentist, Melbourne Australia 🇦🇺', text:'The WhatsApp reminders dropped our no-show rate from 28% to under 5%. The billing module handles everything automatically. Best investment I\'ve made for my practice.' },
              { name:'Dr. Waheed',   role:'GP, Riyadh Saudi Arabia 🇸🇦',     text:'I manage 40+ patients a day. MediPlex lets my receptionist handle bookings via WhatsApp while I focus on patients. The offline mode is a lifesaver when internet drops.' },
            ].map((t, i) => (
              <div key={i} className="p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="fill-[#C9A84C]" style={{ color: '#C9A84C' }} />)}
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

      {/* ── GLOBAL SECTION ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-black text-[#0A1628] mb-4" style={{ fontSize: 'clamp(24px, 3vw, 36px)', letterSpacing: '-0.03em' }}>Built for Global Clinics</h2>
          <p className="text-gray-500 mb-12 max-w-xl mx-auto" style={{ fontSize: 15 }}>
            Multi-currency, WhatsApp globally, Stripe (UK/Global), SafePay (Pakistan) and region-specific compliance.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Globe,         color:'#2563EB', title:'Multi-Currency',    desc:'GBP, USD, PKR, AED, SAR, AUD' },
              { icon: MessageCircle, color:'#25D366', title:'WhatsApp Global',   desc:'Works anywhere WhatsApp operates' },
              { icon: CreditCard,    color:'#C9A84C', title:'Stripe & SafePay', desc:'UK/Global + Pakistan payments' },
              { icon: Lock,          color:'#10B981', title:'GDPR & HIPAA',     desc:'UK, EU and international compliant' },
            ].map(f => (
              <div key={f.title} className="rounded-xl p-5 bg-white border border-gray-100 shadow-sm">
                <f.icon size={20} style={{ color: f.color }} className="mx-auto mb-3" />
                <div className="text-[13px] font-semibold text-[#0A1628] mb-1">{f.title}</div>
                <div className="text-[11px] text-gray-400">{f.desc}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-widest mb-4">Specialties supported</div>
            <div className="flex flex-wrap justify-center gap-2">
              {['General Practice','Paediatrics','Dentistry','Gynaecology','Orthopaedics','Cardiology','Dermatology','ENT','Neurology','Psychiatry','Oncology','Ophthalmology','Urology','Pulmonology','Nephrology'].map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-white border border-gray-200 text-gray-600">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-black text-[#0A1628] mb-3" style={{ fontSize: 'clamp(26px, 3.5vw, 40px)', letterSpacing: '-0.03em' }}>Frequently Asked Questions</h2>
            <p className="text-gray-500" style={{ fontSize: 15 }}>Everything you need to know before getting started.</p>
          </div>
          <div className="bg-white rounded-3xl px-8 py-2 shadow-sm border border-gray-100">
            {FAQS.map((f, i) => <FaqItem key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.8) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="font-black text-white mb-5" style={{ fontSize: 'clamp(30px, 5vw, 52px)', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
            Ready to transform<br />your clinic?
          </h2>
          <p className="text-white/50 mb-10 leading-relaxed" style={{ fontSize: 16 }}>
            Join 500+ clinics running smarter with MediPlex.<br />14 days free. No card required. Setup in 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/onboarding"
              className="flex items-center gap-2 px-9 py-4 rounded-xl text-[14px] font-semibold text-[#0A1628] transition-all hover:shadow-2xl hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', boxShadow: '0 8px 32px rgba(201,168,76,0.35)', letterSpacing: '-0.2px' }}>
              Start Free Trial Now <ArrowRight size={15} />
            </Link>
            <Link href="/contact"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-[14px] font-medium text-white border border-white/20 hover:bg-white/5 transition-all"
              style={{ letterSpacing: '-0.2px' }}>
              <Mail size={14} /> Talk to Sales
            </Link>
          </div>
          <p className="text-[12px] text-white/25 mt-6">No setup fees · Cancel anytime · GDPR compliant · UK registered</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#040C1A] text-white/50 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div>
              {/* Footer logo — dark background, so Medi is white */}
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/icons/icon.svg" alt="MediPlex" style={{ height: 30, width: 30, borderRadius: 6 }} />
                <span style={{ fontWeight: 700, letterSpacing: '-0.5px', fontSize: '16px', lineHeight: 1 }}>
                  <span style={{ color: '#ffffff' }}>Medi</span>
                  <span style={{ color: '#C9A84C' }}>Plex</span>
                </span>
              </div>
              <p className="text-[13px] leading-relaxed mb-5">
                The Complete AI-HMIS for Modern Clinics. Cloud-based, globally trusted.
              </p>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center gap-2"><Mail size={11} /> info@klassicalholdings.com</div>
                <div className="flex items-center gap-2"><Phone size={11} /> +44 7776 387877</div>
                <div className="flex items-center gap-2"><MapPin size={11} /> United Kingdom 🇬🇧</div>
                <div className="flex items-center gap-2"><Building2 size={11} /> KLASSICAL HOLDINGS LTD · Co. 16964688</div>
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[12px] mb-4 uppercase tracking-widest">Platform</div>
              <div className="space-y-2.5 text-[13px]">
                {[['Features','/features'],['Pricing','#pricing'],['How It Works','#howitworks'],['AI Scribe','/features#ai-clinical-scribe'],['WhatsApp Bot','/features#whatsapp-ai-receptionist'],['Mobile App','/features#mobile-desktop-app']].map(([l,h])=>(
                  <div key={l}><a href={h} className="hover:text-white transition-colors">{l}</a></div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[12px] mb-4 uppercase tracking-widest">Company</div>
              <div className="space-y-2.5 text-[13px]">
                {[['Contact Us','/contact'],['Privacy Policy','#'],['Terms of Service','#'],['GDPR','#'],['Companies House','https://find-and-update.company-information.service.gov.uk/company/16964688']].map(([l,h])=>(
                  <div key={l}><a href={h} target={h.startsWith('http')?'_blank':undefined} rel="noopener noreferrer" className="hover:text-white transition-colors">{l}</a></div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-[12px] mb-4 uppercase tracking-widest">Support</div>
              <div className="space-y-2.5 text-[13px]">
                <a href="https://wa.me/447776387877" className="flex items-center gap-2 hover:text-white transition-colors"><MessageCircle size={12} /> WhatsApp Support</a>
                <div className="flex items-center gap-2"><Clock size={12} /> 24/7 Help Available</div>
                <a href="mailto:info@klassicalholdings.com" className="flex items-center gap-2 hover:text-white transition-colors"><Mail size={12} /> Email Support</a>
                <Link href="/contact" className="flex items-center gap-2 hover:text-white transition-colors"><Users size={12} /> Contact Form</Link>
              </div>
              <div className="flex gap-3 mt-6">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold hover:-translate-y-0.5 transition-all"
                  style={{ background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)', color: '#0a66c2' }}>in</a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold hover:-translate-y-0.5 transition-all"
                  style={{ background: 'rgba(29,161,242,0.12)', border: '1px solid rgba(29,161,242,0.3)', color: '#1da1f2' }}>𝕏</a>
                <a href="https://wa.me/447776387877" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:-translate-y-0.5 transition-all"
                  style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}>
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[12px]">© 2025 MediPlex · <span className="text-white/25">KLASSICAL HOLDINGS LTD · Company No. 16964688 · Registered in England & Wales</span></p>
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
