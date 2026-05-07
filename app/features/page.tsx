import Link from 'next/link';
import {
  Bot, Receipt, Calendar, MessageCircle, BarChart3, Smartphone,
  Globe, Shield, Bell, Activity, Mail, TrendingUp, Palette,
  WifiOff, Target, Search, Image as ImageIcon, Megaphone,
  ClipboardList, UserCircle, FlaskConical, ArrowLeft, CheckCircle,
  Zap, ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Bot, color: '#C9A84C',
    title: 'AI Clinical Scribe',
    tagline: 'Dictate once. Structured notes instantly.',
    desc: 'MediPlex AI Scribe converts your spoken or typed consultation notes into fully formatted clinical documents. No more end-of-day paperwork.',
    bullets: [
      'SOAP Notes — Subjective, Objective, Assessment, Plan formatted automatically',
      'AI Prescription Writer — generates drug names, dosage, frequency and duration',
      'Referral Letters — consultant-ready referrals in one click',
      'Discharge Summaries — structured discharge notes with follow-up plan',
      'Pre-Auth Insurance Letters — full insurance pre-authorisation documents from patient records',
      'Sick Certificates — issued instantly from consultation',
      '100 or 400 AI notes/month depending on plan',
    ],
  },
  {
    icon: MessageCircle, color: '#25D366',
    title: 'WhatsApp AI Receptionist',
    tagline: 'Your clinic answers patients 24/7 — automatically.',
    desc: 'The WhatsApp AI Receptionist is a fully automated chatbot that runs on your clinic\'s WhatsApp number. It handles patient queries, booking, reminders and feedback without any staff intervention.',
    bullets: [
      'Patients message your clinic WhatsApp and AI replies instantly',
      'Appointment booking — checks availability and confirms slots',
      'Confirmation sent immediately on booking',
      '24h and 4h smart reminders to reduce no-shows',
      'Follow-up message after appointment',
      'Satisfaction survey collected automatically',
      'WhatsApp Broadcast — send campaigns to your entire patient list',
    ],
  },
  {
    icon: Calendar, color: '#2563EB',
    title: 'Smart Scheduling',
    tagline: 'Appointments that run themselves.',
    desc: 'A drag-and-drop calendar built for busy clinics. Supports multiple doctors, multiple slots, walk-ins and online booking from patients directly.',
    bullets: [
      'Drag-and-drop appointment management',
      'Multi-doctor and multi-room scheduling',
      'Online booking via patient portal or WhatsApp',
      'Morning / Evening slot configuration',
      'No-show prediction — AI flags high-risk appointments 24h ahead',
      'Waiting list management',
      'Bulk appointment SMS and WhatsApp reminders',
    ],
  },
  {
    icon: Receipt, color: '#10B981',
    title: 'Billing & Invoicing',
    tagline: 'From consultation to receipt in seconds.',
    desc: 'Complete financial management for your clinic — invoices, receipts, insurance claims, expense tracking and end-of-day cash summary, all automated.',
    bullets: [
      'GST / VAT-ready invoices with your clinic branding',
      'Payment receipts sent via WhatsApp instantly',
      'Partial payments and outstanding balance tracking',
      'Insurance claim documentation',
      'Daily, weekly and monthly revenue reports',
      'Expense tracking and P&L summary',
      'Multi-currency support (GBP, PKR, AED, SAR, AUD, USD)',
    ],
  },
  {
    icon: FlaskConical, color: '#F59E0B',
    title: 'Lab Integration',
    tagline: 'Lab orders and results without the paperwork.',
    desc: 'Order lab tests digitally, receive results electronically and share with patients through their portal — all linked to the patient record.',
    bullets: [
      'QR-based lab order generation',
      'Lab result upload by clinic or lab partner',
      'Patient notified via WhatsApp when results are ready',
      'Results viewable in patient portal',
      'Two-way sync with partner labs',
      'Lab result history in patient timeline',
      'Abnormal result flags and doctor alerts',
    ],
  },
  {
    icon: UserCircle, color: '#8B5CF6',
    title: 'Patient Portal',
    tagline: 'Patients take ownership of their health.',
    desc: 'A secure self-service portal where patients can register, book appointments, view prescriptions and lab results — reducing front-desk load significantly.',
    bullets: [
      'Patient self-registration (QR code at reception or link via WhatsApp)',
      'Online appointment booking 24/7',
      'Digital prescriptions downloadable as PDF',
      'Lab results accessible securely',
      'Medical history and visit timeline',
      'Billing and payment receipts',
      'Telemedicine video call join link',
    ],
  },
  {
    icon: BarChart3, color: '#EF4444',
    title: 'Analytics Dashboard',
    tagline: 'Know your clinic inside out.',
    desc: 'Real-time analytics covering every aspect of your clinic — revenue, patients, diagnoses, staff performance and marketing ROI.',
    bullets: [
      'Daily, weekly and monthly revenue charts',
      'Patient visit trends and new vs returning breakdown',
      'No-show rates and appointment completion stats',
      'Top diagnoses and procedures',
      'Demographics — age, gender, location breakdown',
      'Staff productivity and appointment volumes',
      'WhatsApp and email campaign performance',
    ],
  },
  {
    icon: Shield, color: '#0EA5E9',
    title: 'Security & Compliance',
    tagline: 'Enterprise-grade security for patient data.',
    desc: 'MediPlex is built with GDPR and HIPAA compliance at its core — not added as an afterthought. Your patient data is protected at every layer.',
    bullets: [
      'Role-based access — Admin, Doctor, Receptionist, Nurse roles',
      'Two-factor authentication (2FA)',
      'Session timeout and device management',
      'Complete audit log — who viewed and edited what, when',
      'End-to-end encryption at rest and in transit',
      'GDPR compliant — UK registered (KLASSICAL HOLDINGS LTD)',
      'Data residency options for EU and international clinics',
    ],
  },
  {
    icon: TrendingUp, color: '#C9A84C',
    title: 'No-Show Predictions',
    tagline: 'Fill every slot. Recover every missed appointment.',
    desc: 'MediPlex AI analyses historical appointment data to identify patients most likely to miss their appointment — 24 hours before.',
    bullets: [
      'Predicts no-show risk for each appointment',
      'Automated extra reminder sent to high-risk patients',
      'Option to double-book high-risk slots',
      'No-show history per patient',
      'Weekly no-show report for clinic review',
      'Helps improve utilisation rate by 20–35%',
    ],
  },
  {
    icon: Palette, color: '#EC4899',
    title: 'Clinic Branding',
    tagline: 'Every touchpoint carries your brand.',
    desc: 'Your logo, colours, header image and footer appear on every prescription, invoice, receipt and WhatsApp message — building patient trust consistently.',
    bullets: [
      'Upload your clinic logo',
      'Custom header and footer image on documents',
      'Branded prescription and invoice PDFs',
      'Clinic name and contact on WhatsApp messages',
      'Custom MR Number prefix (e.g. MR-001, PAT-001)',
      'Invoice prefix customisation (INV, RX, etc.)',
      'Colour theme customisation',
    ],
  },
  {
    icon: Bell, color: '#F97316',
    title: 'Auto Reminders & Feedback',
    tagline: 'Never miss a follow-up again.',
    desc: 'A complete automated communication workflow triggered by every appointment — from confirmation to feedback — without any manual effort.',
    bullets: [
      'Instant booking confirmation via WhatsApp',
      '24-hour reminder before appointment',
      '4-hour reminder same day',
      'Post-appointment follow-up message',
      'Automated satisfaction survey (1–5 star rating)',
      'Patient feedback stored in analytics',
      'Recall messages for overdue follow-ups',
    ],
  },
  {
    icon: Smartphone, color: '#6366F1',
    title: 'Mobile & Desktop App',
    tagline: 'Your clinic in your pocket.',
    desc: 'MediPlex is a Progressive Web App (PWA) that installs directly on any device — iPhone, Android, PC or Mac — without going through an app store.',
    bullets: [
      'Installable on iPhone, Android, Windows and Mac',
      'No app store required — install directly from browser',
      'Works offline (appointments, prescriptions, lab data cached)',
      'Biometric login (Face ID / fingerprint)',
      'Push notifications for appointments and messages',
      'Camera capture for prescriptions and documents',
      'Responsive across all screen sizes',
    ],
  },
  {
    icon: WifiOff, color: '#14B8A6',
    title: 'Offline Mode',
    tagline: 'Power cut? No problem.',
    desc: 'MediPlex keeps working even without internet. All critical data is cached locally and syncs automatically when connection is restored.',
    bullets: [
      'Appointments viewable and editable offline',
      'Patient records accessible without internet',
      'Prescriptions can be created and printed offline',
      'Lab data cached for offline review',
      'Automatic sync queue — no data lost',
      'Conflict resolution when reconnecting',
      'Works during power cuts or poor connectivity',
    ],
  },
  {
    icon: Target, color: '#F43F5E',
    title: 'Meta & Google Ads',
    tagline: 'Grow your patient base with managed advertising.',
    desc: 'Package 2 includes fully managed Facebook and Instagram ad campaigns targeting local patients. You set the ad budget — we handle everything else.',
    bullets: [
      'Fully managed Facebook and Instagram campaigns',
      'Audience targeting — demographics, location, interests',
      'Appointment and lead generation ad formats',
      'Seasonal health campaign creatives (designed for you)',
      'Monthly ad performance report',
      'Remarketing to website visitors',
      'A/B testing for best-performing ads',
      'Ad spend is separate — you control your budget',
    ],
  },
  {
    icon: Search, color: '#84CC16',
    title: 'SEO Clinic Website',
    tagline: 'Be found when patients search for a clinic near them.',
    desc: 'Every MediPlex clinic gets a professional, SEO-optimised website that ranks in Google for local searches and converts visitors into booked appointments.',
    bullets: [
      'Professionally designed clinic website',
      'Online appointment booking widget embedded',
      'SEO optimised for local searches (e.g. "paediatrician Luton")',
      'Mobile-responsive and fast-loading (Core Web Vitals)',
      'Google Business Profile setup and optimisation',
      'Patient reviews integration',
      'Services, team, contact and location pages',
    ],
  },
  {
    icon: ImageIcon, color: '#A78BFA',
    title: 'Graphical Posters',
    tagline: '15–20 branded posters every month. Zero effort.',
    desc: 'Our design team creates 15–20 branded health awareness posters each month — seasonal campaigns, awareness days and health tips — formatted for all platforms.',
    bullets: [
      '15–20 posters per month included',
      'Branded with your clinic logo and colours',
      'Seasonal campaigns (Eid, Ramadan, awareness months)',
      'International health awareness days covered',
      'Formatted for Instagram, Facebook and WhatsApp',
      'Delivered in PNG and print-ready PDF',
      'Ready to post — zero design effort on your end',
    ],
  },
  {
    icon: Mail, color: '#38BDF8',
    title: 'Email Marketing',
    tagline: 'Stay top of mind with every patient.',
    desc: 'Unlimited email campaigns to your entire patient list — seasonal health tips, appointment recalls, health awareness and promotional offers — all branded.',
    bullets: [
      'Unlimited email campaigns included',
      'Branded clinic email templates',
      'Seasonal health tips and awareness campaigns',
      'Appointment recall campaigns (e.g. annual check-up)',
      'Open rate, click rate and unsubscribe tracking',
      'Patient list segmentation by age, diagnosis or last visit',
      'GDPR-compliant opt-in and unsubscribe management',
    ],
  },
  {
    icon: ClipboardList, color: '#FB923C',
    title: 'Pre-Auth Insurance',
    tagline: 'Insurance letters in seconds, not hours.',
    desc: 'Generate fully formatted insurance pre-authorisation request letters instantly using AI — drawing from patient records, clinical notes and diagnosis data.',
    bullets: [
      'Full pre-auth letter generated from patient clinical notes',
      'Includes ICD-10 diagnosis codes',
      'Clinical justification section auto-written by AI',
      'Procedure and CPT code fields included',
      'Supporting evidence from existing lab and imaging records',
      'Attending physician and clinic details auto-filled',
      'Download as PDF or send directly via email',
    ],
  },
  {
    icon: Megaphone, color: '#C9A84C',
    title: 'WhatsApp Broadcast',
    tagline: 'Reach your entire patient list in one message.',
    desc: 'Send bulk WhatsApp messages to your entire patient list — health campaigns, seasonal offers, appointment recalls, clinic news — directly from MediPlex.',
    bullets: [
      'Send to entire patient list or filtered segments',
      'Health campaigns and seasonal promotions',
      'Appointment recall broadcasts',
      'Clinic news and announcement messages',
      'Scheduled broadcasts (send at optimal time)',
      'Delivery and read receipts tracked',
      'Compliant with WhatsApp Business messaging policies',
    ],
  },
  {
    icon: Activity, color: '#4ADE80',
    title: 'Telemedicine',
    tagline: 'Consult patients remotely — no third-party app needed.',
    desc: 'Built-in video consultations, digital prescriptions and secure patient messaging — fully integrated with your appointment system and patient records.',
    bullets: [
      'One-click video consultation from appointment calendar',
      'Patient joins via link — no app download needed',
      'Digital prescription issued during or after call',
      'Consultation notes saved to patient record',
      'Secure in-app patient messaging (between appointments)',
      'Video call recording (optional, with consent)',
      'Works globally — no regional restrictions',
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-[13px]">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="w-px h-4 bg-white/20" />
          <img src="/icons/mediplex-logo.svg" alt="MediPlex" style={{ height: 28, width: 'auto' }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-16 pt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-6"
            style={{ background: 'rgba(201,168,76,0.12)', color: '#E8C87A' }}>
            <Zap size={11} /> 20 Features · One Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">
            Everything Your<br />
            <span style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Clinic Needs
            </span>
          </h1>
          <p className="text-[17px] text-white/55 max-w-2xl mx-auto mb-8">
            Every feature is purpose-built for clinical workflows — not generic software adapted for healthcare.
          </p>
          <Link href="/onboarding"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-bold text-[#0A1628] transition-all hover:-translate-y-0.5 hover:shadow-xl"
            style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
            Start Free Trial — 14 Days Free <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Quick nav pills */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-2">
          {FEATURES.map(f => (
            <a key={f.title} href={`#${f.title.toLowerCase().replace(/[^a-z0-9]/g,'-')}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-all">
              <f.icon size={11} style={{ color: f.color }} />
              {f.title}
            </a>
          ))}
        </div>
      </div>

      {/* Feature detail sections */}
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-20">
        {FEATURES.map((f, i) => (
          <div key={f.title} id={f.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}
            className={`grid md:grid-cols-2 gap-12 items-start ${i % 2 === 1 ? 'md:grid-flow-dense' : ''}`}>

            {/* Text */}
            <div className={i % 2 === 1 ? 'md:col-start-2' : ''}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: f.color + '15', border: `1px solid ${f.color}25` }}>
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: f.color }}>Feature {String(i + 1).padStart(2,'0')}</div>
                  <h2 className="text-[22px] font-black text-[#0A1628]">{f.title}</h2>
                </div>
              </div>
              <p className="text-[16px] font-semibold text-[#0A1628] mb-3">{f.tagline}</p>
              <p className="text-[14px] text-gray-500 leading-relaxed mb-6">{f.desc}</p>
              <ul className="space-y-2.5">
                {f.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2.5 text-[13px] text-gray-600">
                    <CheckCircle size={15} style={{ color: f.color, flexShrink: 0, marginTop: 2 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual card */}
            <div className={i % 2 === 1 ? 'md:col-start-1 md:row-start-1' : ''}>
              <div className="rounded-2xl p-8 h-full min-h-[200px] flex flex-col justify-center"
                style={{ background: `linear-gradient(135deg, ${f.color}08 0%, ${f.color}15 100%)`, border: `1px solid ${f.color}20` }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: f.color + '20', border: `1px solid ${f.color}30` }}>
                  <f.icon size={30} style={{ color: f.color }} />
                </div>
                <div className="text-[20px] font-black text-[#0A1628] mb-2">{f.title}</div>
                <div className="text-[14px] font-medium mb-6" style={{ color: f.color }}>{f.tagline}</div>
                <div className="flex flex-wrap gap-2">
                  {f.bullets.slice(0, 3).map(b => (
                    <span key={b} className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: f.color + '15', color: f.color }}>
                      {b.split('—')[0].trim().slice(0, 30)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="py-20 px-6" style={{ background: 'linear-gradient(135deg, #060E1F 0%, #0A1628 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">All 20 features. One subscription.</h2>
          <p className="text-white/55 text-[16px] mb-8">
            Package 1 starts at £150/month. 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-bold text-[#0A1628] transition-all hover:-translate-y-1 hover:shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E8C87A)' }}>
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link href="/#pricing"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold text-white border border-white/20 hover:bg-white/5 transition-all">
              View Pricing
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
