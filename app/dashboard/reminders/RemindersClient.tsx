'use client';

import { useState, useMemo, useEffect } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import {
  MessageCircle, Send, CheckCircle, Clock, AlertTriangle,
  Search, Filter, Copy, RefreshCw, Bell, BellOff, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReminderLog {
  appointmentId: string;
  type:          'confirmation' | 'reminder_24h' | 'reminder_1h' | 'followup' | 'custom';
  sentAt:        string;
  message:       string;
}

const LS_KEY = 'mediplex_reminders';

function loadLog(): ReminderLog[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveLog(log: ReminderLog[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(log)); } catch {}
}

// ── Message templates ─────────────────────────────────────────────────────────
function buildMessage(type: string, a: Appointment, clinicName: string, doctorName: string): string {
  const date = formatUSDate(a.appointmentDate);
  const time = a.appointmentTime || '';
  const child = a.childName;
  const parent = a.parentName;

  const templates: Record<string, string> = {
    confirmation: `Assalam-o-Alaikum ${parent} sahib,\n\n✅ *Appointment Confirmed*\n\nDear parent, appointment for *${child}* has been confirmed:\n📅 Date: *${date}*\n⏰ Time: *${time}*\n🏥 ${clinicName}\n👨‍⚕️ ${doctorName}\n\nPlease arrive 10 minutes early. For any changes, please contact us.\n\nJazakAllah Khair 🤲`,

    reminder_24h: `Assalam-o-Alaikum ${parent} sahib,\n\n⏰ *Appointment Reminder — Tomorrow*\n\nThis is a reminder that *${child}'s* appointment is *tomorrow*:\n📅 Date: *${date}*\n⏰ Time: *${time}*\n🏥 ${clinicName}\n\nPlease confirm your attendance. If you need to reschedule, kindly let us know today.\n\nJazakAllah Khair 🤲`,

    reminder_1h: `Assalam-o-Alaikum ${parent} sahib,\n\n🔔 *Appointment in 1 Hour*\n\nReminder: *${child}'s* appointment is in approximately 1 hour:\n⏰ Time: *${time}*\n🏥 ${clinicName}\n\nPlease leave on time. We look forward to seeing you!\n\nJazakAllah Khair 🤲`,

    followup: `Assalam-o-Alaikum ${parent} sahib,\n\n💊 *Follow-up Reminder*\n\nWe hope *${child}* is feeling better after their visit on ${date}.\n\nIf symptoms persist or you have any concerns, please don't hesitate to schedule a follow-up appointment.\n\n🏥 ${clinicName}\n👨‍⚕️ ${doctorName}\n\nJazakAllah Khair 🤲`,

    custom: `Assalam-o-Alaikum ${parent} sahib,\n\nRegarding *${child}'s* appointment on ${date} at ${time}.\n\n🏥 ${clinicName}`,
  };
  return templates[type] || templates.custom;
}

// ── WhatsApp send ─────────────────────────────────────────────────────────────
function sendWhatsApp(phone: string, message: string) {
  // Clean phone number
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '92' + clean.slice(1); // Pakistan local → international
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// ── Days until appointment ────────────────────────────────────────────────────
function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const apt   = new Date(dateStr); apt.setHours(0,0,0,0);
  return Math.round((apt.getTime() - today.getTime()) / 86400000);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RemindersClient({ data, clinicName, doctorName }: {
  data: Appointment[];
  clinicName: string;
  doctorName: string;
}) {
  const [log,          setLog]          = useState<ReminderLog[]>([]);
  const [search,       setSearch]       = useState('');
  const [filterDays,   setFilterDays]   = useState<'today'|'tomorrow'|'week'|'all'>('week');
  const [selectedApt,  setSelectedApt]  = useState<Appointment | null>(null);
  const [msgType,      setMsgType]      = useState<string>('reminder_24h');
  const [customMsg,    setCustomMsg]    = useState('');
  const [showCustom,   setShowCustom]   = useState(false);
  const [showLog,      setShowLog]      = useState(false);

  useEffect(() => { setLog(loadLog()); }, []);

  // Upcoming confirmed appointments with WhatsApp numbers
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return data
      .filter(a =>
        a.status === 'Confirmed' || a.status === 'Rescheduled'
      )
      .filter(a => {
        const d = daysUntil(a.appointmentDate);
        if (filterDays === 'today')    return d === 0;
        if (filterDays === 'tomorrow') return d === 1;
        if (filterDays === 'week')     return d >= 0 && d <= 7;
        return d >= 0;
      })
      .filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return a.childName.toLowerCase().includes(q) || a.parentName.toLowerCase().includes(q);
      })
      .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
  }, [data, filterDays, search]);

  // Past appointments for follow-up reminders
  const pastForFollowup = useMemo(() => {
    return data
      .filter(a => {
        const d = daysUntil(a.appointmentDate);
        return d < 0 && d >= -7 && a.status === 'Confirmed';
      })
      .filter(a => !search || a.childName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
  }, [data, search]);

  const sentIds = new Set(log.map(l => `${l.appointmentId}_${l.type}`));

  const openSend = (a: Appointment, type: string) => {
    setSelectedApt(a);
    setMsgType(type);
    setCustomMsg(buildMessage(type, a, clinicName, doctorName));
    setShowCustom(false);
  };

  const handleSend = () => {
    if (!selectedApt) return;
    const phone = selectedApt.whatsapp;
    if (!phone || phone === '—' || phone.replace(/\D/g,'').length < 7) {
      toast.error('No valid WhatsApp number for this patient');
      return;
    }
    const msg = showCustom ? customMsg : buildMessage(msgType, selectedApt, clinicName, doctorName);
    sendWhatsApp(phone, msg);

    // Log it
    const entry: ReminderLog = {
      appointmentId: selectedApt.id,
      type:          msgType as ReminderLog['type'],
      sentAt:        new Date().toISOString(),
      message:       msg,
    };
    const updated = [entry, ...log];
    setLog(updated);
    saveLog(updated);
    toast.success(`WhatsApp opened for ${selectedApt.parentName}`);
    setSelectedApt(null);
  };

  const copyMessage = () => {
    if (!selectedApt) return;
    const msg = showCustom ? customMsg : buildMessage(msgType, selectedApt, clinicName, doctorName);
    navigator.clipboard.writeText(msg);
    toast.success('Message copied to clipboard');
  };

  const typeLabels: Record<string, string> = {
    confirmation: '✅ Confirmation',
    reminder_24h: '⏰ 24h Reminder',
    reminder_1h:  '🔔 1h Reminder',
    followup:     '💊 Follow-up',
    custom:       '✏️ Custom',
  };

  // Stats
  const sentToday = log.filter(l => l.sentAt.startsWith(new Date().toISOString().split('T')[0])).length;
  const totalSent = log.length;
  const noPhone   = upcoming.filter(a => !a.whatsapp || a.whatsapp === '—').length;

  return (
    <div className="space-y-5">

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Upcoming This Week', value: data.filter(a => { const d = daysUntil(a.appointmentDate); return d >= 0 && d <= 7 && (a.status==='Confirmed'||a.status==='Rescheduled'); }).length, color:'#0369a1', bg:'#dbeafe' },
          { label:'Today\'s Patients',  value: data.filter(a => daysUntil(a.appointmentDate) === 0).length,                                                                                              color:'#166534', bg:'#dcfce7' },
          { label:'Sent Today',         value: sentToday,                                                                                                                                                 color:'#c9a84c', bg:'#fef9e7' },
          { label:'No WhatsApp #',      value: noPhone,                                                                                                                                                   color:'#c53030', bg:'#fee2e2' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:s.bg }}>
              <MessageCircle size={18} style={{ color:s.color }} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{s.label}</div>
              <div className="text-[22px] font-semibold text-navy leading-tight">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters & Search ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7">
          {([['today','Today'],['tomorrow','Tomorrow'],['week','Next 7 Days'],['all','All Upcoming']] as const).map(([k,l]) => (
            <button key={k} onClick={() => setFilterDays(k)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filterDays===k?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Search patient..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold" />
        </div>
        <button onClick={() => setShowLog(!showLog)}
          className="btn-outline text-[12px] py-2 px-3 gap-1.5 ml-auto">
          <Clock size={13}/> History ({totalSent})
        </button>
      </div>

      {/* ── Message Composer ──────────────────────────────────────────────── */}
      {selectedApt && (
        <div className="card p-5 animate-in" style={{ border:'2px solid rgba(201,168,76,0.3)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium text-navy text-[14px]">
              Send to {selectedApt.parentName} — {selectedApt.childName}
              <span className="ml-2 text-[12px] text-gray-400 font-normal">📱 {selectedApt.whatsapp}</span>
            </div>
            <button onClick={() => setSelectedApt(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          {/* Message type selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(typeLabels).map(([k, l]) => (
              <button key={k} onClick={() => { setMsgType(k); setShowCustom(k==='custom'); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  msgType===k ? 'bg-navy text-white border-navy' : 'border-black/10 text-gray-500 hover:border-gold'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Message preview */}
          <div className="relative mb-4">
            <div className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-1.5">Message Preview</div>
            {showCustom ? (
              <textarea rows={8} value={customMsg}
                onChange={e => setCustomMsg(e.target.value)}
                className="w-full border border-black/10 rounded-xl px-4 py-3 text-[13px] text-navy bg-white outline-none focus:border-gold resize-none font-mono" />
            ) : (
              <div className="rounded-xl px-4 py-3 text-[13px] text-navy whitespace-pre-wrap"
                style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', fontFamily:'monospace', lineHeight:1.6 }}>
                {buildMessage(msgType, selectedApt, clinicName, doctorName)}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSend}
              className="btn-gold gap-2 text-[13px] py-2.5 px-5">
              <MessageCircle size={15}/> Open WhatsApp
            </button>
            <button onClick={copyMessage}
              className="btn-outline gap-1.5 text-[12px] py-2 px-3">
              <Copy size={13}/> Copy Message
            </button>
            <button onClick={() => setShowCustom(!showCustom)}
              className="btn-outline gap-1.5 text-[12px] py-2 px-3">
              ✏️ {showCustom ? 'Use Template' : 'Edit Message'}
            </button>
          </div>
        </div>
      )}

      {/* ── Upcoming Appointments ─────────────────────────────────────────── */}
      <div className="card overflow-hidden animate-in">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="font-medium text-navy text-[14px]">Upcoming Appointments</div>
          <div className="text-[12px] text-gray-400">{upcoming.length} appointments</div>
        </div>
        <div className="divide-y divide-black/5">
          {upcoming.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-[13px]">No upcoming appointments for this period</div>
          )}
          {upcoming.map(a => {
            const days     = daysUntil(a.appointmentDate);
            const hasPhone = a.whatsapp && a.whatsapp !== '—' && a.whatsapp.replace(/\D/g,'').length >= 7;
            const sent24h  = sentIds.has(`${a.id}_reminder_24h`);
            const sentConf = sentIds.has(`${a.id}_confirmation`);
            const daysLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
            const daysColor = days === 0 ? '#166534' : days === 1 ? '#b47a00' : '#0369a1';

            return (
              <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                {/* Date badge */}
                <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background: days===0?'#dcfce7':days===1?'#fff9e6':'#dbeafe' }}>
                  <div className="text-[10px] font-medium" style={{ color:daysColor }}>
                    {new Date(a.appointmentDate).toLocaleString('en-US',{month:'short'})}
                  </div>
                  <div className="text-[20px] font-bold" style={{ color:daysColor }}>
                    {new Date(a.appointmentDate).getDate()}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-navy text-[14px]">{a.childName}</div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: days===0?'#dcfce7':days===1?'#fff9e6':'#dbeafe', color:daysColor }}>
                      {daysLabel}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-500">
                    Parent: {a.parentName} · {a.appointmentTime} · {a.reason || 'No reason'}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {hasPhone ? (
                      <span className="text-[11px] text-emerald-600">📱 {a.whatsapp}</span>
                    ) : (
                      <span className="text-[11px] text-red-400">⚠ No WhatsApp number</span>
                    )}
                    {sentConf && <span className="text-[10px] text-gray-400">✓ Confirmed</span>}
                    {sent24h  && <span className="text-[10px] text-gray-400">✓ 24h sent</span>}
                  </div>
                </div>

                {/* Quick send buttons */}
                {hasPhone && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openSend(a, 'confirmation')}
                      title="Send Confirmation"
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[11px] ${
                        sentConf ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 hover:bg-emerald-50 hover:text-emerald-600 text-gray-500'
                      }`}>✅</button>
                    <button onClick={() => openSend(a, 'reminder_24h')}
                      title="Send 24h Reminder"
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[11px] ${
                        sent24h ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 hover:bg-amber-50 hover:text-amber-600 text-gray-500'
                      }`}>⏰</button>
                    <button onClick={() => openSend(a, 'reminder_1h')}
                      title="Send 1h Reminder"
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 text-gray-500 transition-all text-[11px]">
                      🔔
                    </button>
                    <button onClick={() => openSend(a, 'custom')}
                      title="Custom Message"
                      className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gold/10 text-gray-500 transition-all text-[11px]">
                      ✏️
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Follow-up Reminders ───────────────────────────────────────────── */}
      {pastForFollowup.length > 0 && (
        <div className="card overflow-hidden animate-in">
          <div className="px-5 py-4 border-b border-black/5">
            <div className="font-medium text-navy text-[14px]">💊 Follow-up Reminders — Last 7 Days</div>
            <div className="text-[12px] text-gray-400 mt-0.5">Patients who visited recently — send a follow-up check</div>
          </div>
          <div className="divide-y divide-black/5">
            {pastForFollowup.map(a => {
              const hasPhone = a.whatsapp && a.whatsapp !== '—' && a.whatsapp.replace(/\D/g,'').length >= 7;
              const sentFU   = sentIds.has(`${a.id}_followup`);
              return (
                <div key={a.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-navy text-[13px]">{a.childName}</div>
                    <div className="text-[12px] text-gray-500">
                      {formatUSDate(a.appointmentDate)} · {a.reason || 'No reason'} · Parent: {a.parentName}
                    </div>
                  </div>
                  {hasPhone && (
                    <button onClick={() => openSend(a, 'followup')}
                      className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all gap-1.5 flex items-center ${
                        sentFU ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}>
                      {sentFU ? '✓ Sent' : '💊 Send Follow-up'}
                    </button>
                  )}
                  {!hasPhone && <span className="text-[11px] text-red-400">No number</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sent History ─────────────────────────────────────────────────── */}
      {showLog && (
        <div className="card overflow-hidden animate-in">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <div className="font-medium text-navy text-[14px]">Reminder History</div>
            <button onClick={() => { if(confirm('Clear all history?')) { setLog([]); saveLog([]); } }}
              className="text-[11px] text-red-400 hover:text-red-600">Clear All</button>
          </div>
          {log.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-[13px]">No reminders sent yet</div>
          )}
          <div className="divide-y divide-black/5 max-h-72 overflow-y-auto">
            {log.slice(0, 50).map((l, i) => {
              const apt = data.find(a => a.id === l.appointmentId);
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="text-[18px]">
                    {l.type==='confirmation'?'✅':l.type==='reminder_24h'?'⏰':l.type==='reminder_1h'?'🔔':l.type==='followup'?'💊':'✏️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-navy">
                      {apt?.childName || l.appointmentId} — {typeLabels[l.type] || l.type}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(l.sentAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
