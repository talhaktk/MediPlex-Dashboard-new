'use client';

import { useState, useMemo, useEffect } from 'react';
import { Appointment } from '@/types';
import { formatUSDate } from '@/lib/sheets';
import { MessageCircle, Search, Copy, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

// ── No-Show Risk Calculation ─────────────────────────────────────────────────
function calcRisk(apt: Appointment, allData: Appointment[]): { score: number; level: 'High'|'Medium'|'Low'; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Past no-show rate for this patient
  const patientHistory = allData.filter(a =>
    a.childName?.toLowerCase() === apt.childName?.toLowerCase() && a.id !== apt.id
  );
  const noShows = patientHistory.filter(a =>
    ['No-Show','Absent','Cancelled'].includes(a.attendanceStatus || a.status)
  ).length;
  const total = patientHistory.length;
  const noShowRate = total > 0 ? noShows / total : 0;
  if (noShowRate >= 0.5) { score += 40; reasons.push(`Missed ${noShows}/${total} past visits`); }
  else if (noShowRate >= 0.3) { score += 25; reasons.push(`Missed ${noShows}/${total} past visits`); }
  else if (noShowRate > 0) { score += 10; }

  // Days until appointment — booked far in advance = higher risk
  const days = Math.max(0, Math.round((new Date(apt.appointmentDate).getTime() - Date.now()) / 86400000));
  if (days >= 14) { score += 20; reasons.push('Booked 2+ weeks ago'); }
  else if (days >= 7) { score += 10; reasons.push('Booked 1+ week ago'); }

  // Day of week risk
  const dow = new Date(apt.appointmentDate).getDay();
  if (dow === 1 || dow === 5) { score += 10; reasons.push('Monday/Friday appointment'); }
  if (dow === 0 || dow === 6) { score += 15; reasons.push('Weekend appointment'); }

  // Time of day risk
  if (apt.appointmentTime) {
    const hour = parseInt(apt.appointmentTime.split(':')[0]);
    const isPM = apt.appointmentTime.toLowerCase().includes('pm');
    const h24 = isPM && hour !== 12 ? hour + 12 : hour;
    if (h24 <= 8 || h24 >= 17) { score += 10; reasons.push('Early/late time slot'); }
  }

  // Visit type
  if (apt.visitType === 'Follow-up') { score += 10; reasons.push('Follow-up (higher no-show rate)'); }

  // No WhatsApp = can't remind = higher risk
  if (!apt.whatsapp || apt.whatsapp === '—') { score += 15; reasons.push('No WhatsApp number'); }

  const level: 'High'|'Medium'|'Low' = score >= 55 ? 'High' : score >= 30 ? 'Medium' : 'Low';
  return { score: Math.min(score, 100), level, reasons };
}

interface Props {
  data: Appointment[];
  clinicName: string;
  doctorName: string;
}

interface ReminderLog {
  appointmentId: string;
  type: string;
  sentAt: string;
}

const LS_KEY = 'mediplex_reminders';
function loadLog(): ReminderLog[] { try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch { return []; } }
function saveLog(l: ReminderLog[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(l)); } catch {} }
function daysUntil(d: string) { const t=new Date(); t.setHours(0,0,0,0); const a=new Date(d); a.setHours(0,0,0,0); return Math.round((a.getTime()-t.getTime())/86400000); }
function sendWA(phone: string, msg: string) { let p=phone.replace(/\D/g,''); if(p.startsWith('0')) p='92'+p.slice(1); window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`,'_blank'); }

export default function RemindersClient({ data, clinicName, doctorName }: Props) {
  const [log, setLog] = useState<ReminderLog[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'today'|'tomorrow'|'week'|'all'>('week');
  const [selected, setSelected] = useState<Appointment|null>(null);
  const [msgType, setMsgType] = useState('reminder_24h');
  const [showLog, setShowLog] = useState(false);
  const [riskFilter, setRiskFilter] = useState<'all'|'High'|'Medium'|'Low'>('all');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  useEffect(() => { setLog(loadLog()); }, []);

  const sentIds = new Set(log.map(l => `${l.appointmentId}_${l.type}`));

  const upcoming = useMemo(() => {
    return data.filter(a => {
      if (a.status !== 'Confirmed' && a.status !== 'Rescheduled') return false;
      const d = daysUntil(a.appointmentDate);
      if (filter === 'today') return d === 0;
      if (filter === 'tomorrow') return d === 1;
      if (filter === 'week') return d >= 0 && d <= 7;
      return d >= 0;
    }).filter(a => !search || a.childName.toLowerCase().includes(search.toLowerCase()) || a.parentName.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const ra = calcRisk(a, data);
      const rb = calcRisk(b, data);
      if (ra.level !== rb.level) {
        const order = { High:0, Medium:1, Low:2 };
        return order[ra.level] - order[rb.level];
      }
      return a.appointmentDate.localeCompare(b.appointmentDate);
    })
    .filter(a => riskFilter === 'all' || calcRisk(a, data).level === riskFilter);
  }, [data, filter, search, riskFilter]);

  const buildMsg = (type: string, a: Appointment) => {
    const date = formatUSDate(a.appointmentDate);
    const time = a.appointmentTime;
    const msgs: Record<string,string> = {
      confirmation: `Assalam-o-Alaikum *${a.parentName}* sahib,\n\n✅ *Appointment Confirmed*\n\nDear parent, appointment for *${a.childName}* has been confirmed:\n📅 Date: *${date}*\n⏰ Time: *${time}*\n�� ${clinicName}\n👨‍⚕️ ${doctorName}\n\nPlease arrive 10 minutes early.\n\nJazakAllah Khair 🤲\n\n_Powered by [MediPlex](https://mediplex.io) — AI for Smart Healthcare_`,
      reminder_24h: `Assalam-o-Alaikum *${a.parentName}* sahib,\n\n⏰ *Appointment Reminder — Tomorrow*\n\n*${a.childName}*'s appointment is tomorrow:\n📅 Date: *${date}*\n⏰ Time: *${time}*\n🏥 ${clinicName}\n\nPlease confirm attendance.\n\nJazakAllah Khair 🤲\n\n_Powered by [MediPlex](https://mediplex.io) — AI for Smart Healthcare_`,
      reminder_4h:  `Assalam-o-Alaikum *${a.parentName}* sahib,\n\n🔔 *Appointment in 4 Hours*\n\n*${a.childName}*'s appointment is today at *${time}*\n🏥 ${clinicName}\n\nPlease leave on time!\n\nJazakAllah Khair 🤲\n\n_Powered by [MediPlex](https://mediplex.io) — AI for Smart Healthcare_`,
      followup:     `Assalam-o-Alaikum *${a.parentName}* sahib,\n\n💊 *Follow-up Check*\n\nHope *${a.childName}* is feeling better after the visit on ${date}.\n\nFor any concerns please contact us.\n🏥 ${clinicName}\n👨‍⚕️ ${doctorName}\n\nJazakAllah Khair 🤲\n\n_Powered by [MediPlex](https://mediplex.io) — AI for Smart Healthcare_`,
    };
    return msgs[type] || msgs.confirmation;
  };

  const handleSend = (a: Appointment, type: string) => {
    if (!a.whatsapp || a.whatsapp === '—') { toast.error('No WhatsApp number'); return; }
    sendWA(a.whatsapp, buildMsg(type, a));
    const entry = { appointmentId: a.id, type, sentAt: new Date().toISOString() };
    const updated = [entry, ...log];
    setLog(updated); saveLog(updated);
    toast.success(`WhatsApp opened for ${a.parentName}`);
  };

  const sentToday = log.filter(l => l.sentAt.startsWith(new Date().toISOString().split('T')[0])).length;
  const noPhone   = upcoming.filter(a => !a.whatsapp || a.whatsapp === '—').length;

  const typeLabels: Record<string,string> = {
    confirmation:'✅ Confirmation', reminder_24h:'⏰ 24h Reminder',
    reminder_4h:'🔔 4h Reminder', followup:'💊 Follow-up',
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Upcoming This Week', value: data.filter(a=>{ const d=daysUntil(a.appointmentDate); return d>=0&&d<=7&&(a.status==='Confirmed'||a.status==='Rescheduled'); }).length, color:'#0369a1', bg:'#dbeafe' },
          { label:"Today's Patients",   value: data.filter(a=>daysUntil(a.appointmentDate)===0).length, color:'#166534', bg:'#dcfce7' },
          { label:'Sent Today',         value: sentToday, color:'#c9a84c', bg:'#fef9e7' },
          { label:'No WhatsApp #',      value: noPhone,   color:'#c53030', bg:'#fee2e2' },
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

      {/* Risk Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-navy text-[13px]">🎯 No-Show Risk Prediction</div>
          <div className="text-[11px] text-gray-400">{upcoming.length} appointments analyzed</div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {([['High','#dc2626','#fef2f2'],['Medium','#d97706','#fefce8'],['Low','#16a34a','#f0fdf4']] as const).map(([level,color,bg])=>{
            const count = upcoming.filter(a => calcRisk(a,data).level===level).length;
            return (
              <button key={level} onClick={()=>setRiskFilter(riskFilter===level?'all':level as any)}
                className="rounded-xl p-3 text-center transition-all"
                style={{background:riskFilter===level?color:bg,border:`2px solid ${riskFilter===level?color:color+'33'}`}}>
                <div className="text-[20px] font-bold" style={{color:riskFilter===level?'#fff':color}}>{count}</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{color:riskFilter===level?'#fff':color}}>
                  {level==='High'?'🔴':level==='Medium'?'🟡':'🟢'} {level} Risk
                </div>
              </button>
            );
          })}
        </div>
        {upcoming.filter(a=>calcRisk(a,data).level==='High'&&a.whatsapp&&a.whatsapp!=='—').length>0&&(
          <button onClick={()=>{
            const highRisk = upcoming.filter(a=>calcRisk(a,data).level==='High'&&a.whatsapp&&a.whatsapp!=='—');
            if(confirm(`Send 24h reminder to all ${highRisk.length} high-risk patients?`)){
              highRisk.forEach(a=>handleSend(a,'reminder_24h'));
            }
          }} className="w-full py-2 rounded-xl text-[12px] font-semibold"
            style={{background:'rgba(220,38,38,0.1)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.3)'}}>
            📱 Send Reminder to All High-Risk Patients ({upcoming.filter(a=>calcRisk(a,data).level==='High'&&a.whatsapp&&a.whatsapp!=='—').length})
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white border border-black/7">
          {(['today','tomorrow','week','all'] as const).map(k => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter===k?'bg-navy text-white':'text-gray-500 hover:text-navy'}`}>
              {k==='today'?'Today':k==='tomorrow'?'Tomorrow':k==='week'?'Next 7 Days':'All'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Search patient..." value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full border border-black/10 rounded-lg pl-8 pr-3 py-2 text-[12px] text-navy bg-white outline-none focus:border-gold"/>
        </div>
        <button onClick={()=>setShowLog(!showLog)} className="btn-outline text-[12px] py-2 px-3 gap-1.5 ml-auto">
          <Clock size={13}/> History ({log.length})
        </button>
      </div>

      {selected && (
        <div className="card p-5 animate-in" style={{ border:'2px solid rgba(201,168,76,0.3)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium text-navy text-[14px]">Send to {selected.parentName} — {selected.childName} · 📱 {selected.whatsapp}</div>
            <button onClick={()=>setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(typeLabels).map(([k,l]) => (
              <button key={k} onClick={()=>setMsgType(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${msgType===k?'bg-navy text-white border-navy':'border-black/10 text-gray-500 hover:border-gold'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="rounded-xl px-4 py-3 text-[13px] text-navy whitespace-pre-wrap mb-4"
            style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', fontFamily:'monospace', lineHeight:1.6 }}>
            {buildMsg(msgType, selected)}
          </div>
          <div className="flex gap-2">
            <button onClick={()=>handleSend(selected, msgType)} className="btn-gold gap-2 text-[13px] py-2.5 px-5">
              <MessageCircle size={15}/> Open WhatsApp
            </button>
            <button onClick={()=>{ navigator.clipboard.writeText(buildMsg(msgType,selected)); toast.success('Copied'); }}
              className="btn-outline gap-1.5 text-[12px] py-2 px-3"><Copy size={13}/> Copy</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden animate-in">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="font-medium text-navy text-[14px]">Upcoming Appointments</div>
          <div className="text-[12px] text-gray-400">{upcoming.length} appointments</div>
        </div>
        <div className="divide-y divide-black/5">
          {upcoming.length === 0 && <div className="text-center py-10 text-gray-400 text-[13px]">No upcoming appointments for this period</div>}
          {upcoming.map(a => {
            const days = daysUntil(a.appointmentDate);
            const hasPhone = a.whatsapp && a.whatsapp !== '—' && a.whatsapp.replace(/\D/g,'').length >= 7;
            const daysLabel = days===0?'Today':days===1?'Tomorrow':`In ${days} days`;
            const daysColor = days===0?'#166534':days===1?'#b47a00':'#0369a1';
            const daysBg    = days===0?'#dcfce7':days===1?'#fff9e6':'#dbeafe';
            return (
              <div key={a.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background:daysBg }}>
                  <div className="text-[10px] font-medium" style={{ color:daysColor }}>{new Date(a.appointmentDate).toLocaleString('en-US',{month:'short'})}</div>
                  <div className="text-[20px] font-bold" style={{ color:daysColor }}>{new Date(a.appointmentDate).getDate()}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-navy text-[14px]">{a.childName}</div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background:daysBg, color:daysColor }}>{daysLabel}</span>
                    {(()=>{
                      const risk = calcRisk(a, data);
                      const rc = risk.level==='High'?'#dc2626':risk.level==='Medium'?'#d97706':'#16a34a';
                      const rb = risk.level==='High'?'#fef2f2':risk.level==='Medium'?'#fefce8':'#f0fdf4';
                      const emoji = risk.level==='High'?'🔴':risk.level==='Medium'?'🟡':'🟢';
                      return (
                        <span title={risk.reasons.join(' | ')} className="text-[10px] font-semibold px-2 py-0.5 rounded-full cursor-help"
                          style={{background:rb,color:rc,border:`1px solid ${rc}33`}}>
                          {emoji} {risk.level} Risk ({risk.score}%)
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-[12px] text-gray-500">Parent: {a.parentName} · {a.appointmentTime} · {a.reason||'No reason'}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: hasPhone?'#16a34a':'#dc2626' }}>
                    {hasPhone ? `📱 ${a.whatsapp}` : '⚠ No WhatsApp number'}
                  </div>
                </div>
                {hasPhone && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    {Object.entries(typeLabels).map(([k,l]) => (
                      <button key={k} onClick={()=>{ setSelected(a); setMsgType(k); }}
                        title={l}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] transition-all ${sentIds.has(`${a.id}_${k}`) ? 'bg-emerald-50' : 'bg-gray-100 hover:bg-amber-50'}`}>
                        {l.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showLog && (
        <div className="card overflow-hidden animate-in">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <div className="font-medium text-navy text-[14px]">Reminder History</div>
            <button onClick={()=>{ if(confirm('Clear all?')){ setLog([]); saveLog([]); } }} className="text-[11px] text-red-400 hover:text-red-600">Clear All</button>
          </div>
          {log.length === 0 && <div className="text-center py-8 text-gray-400 text-[13px]">No reminders sent yet</div>}
          <div className="divide-y divide-black/5 max-h-64 overflow-y-auto">
            {log.slice(0,50).map((l,i) => {
              const apt = data.find(a => a.id === l.appointmentId);
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="text-[16px]">{l.type==='confirmation'?'✅':l.type==='reminder_24h'?'⏰':l.type==='reminder_4h'?'��':'💊'}</div>
                  <div className="flex-1">
                    <div className="text-[12px] font-medium text-navy">{apt?.childName||l.appointmentId} — {typeLabels[l.type]||l.type}</div>
                    <div className="text-[11px] text-gray-400">{new Date(l.sentAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
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
