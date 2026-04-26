'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare, Search, Loader2, User, Clock, CheckCheck } from 'lucide-react';

interface Conversation {
  mrNumber:    string;
  patientName: string;
  lastMsg:     string;
  lastTime:    string;
  unread:      number;
}

interface Message {
  id:         string;
  sender:     'patient' | 'clinic';
  body:       string;
  created_at: string;
  read_at:    string | null;
  staff_read_at: string | null;
}

export default function MessagesClient({ clinicId, isSuperAdmin }: { clinicId: string | null; isSuperAdmin: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected,      setSelected]      = useState<string | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [body,          setBody]          = useState('');
  const [search,        setSearch]        = useState('');
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending,       setSending]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load conversation list ────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    let q = supabase.from('patient_messages').select('mr_number,patient_name,body,created_at,sender,staff_read_at')
      .order('created_at', { ascending: false });
    if (!isSuperAdmin && clinicId) q = q.or(`clinic_id.eq.${clinicId},clinic_id.is.null`);

    const { data } = await q;
    if (!data) { setLoadingList(false); return; }

    // Group by mr_number — keep only latest message per conversation
    const map = new Map<string, Conversation>();
    data.forEach(m => {
      if (!map.has(m.mr_number)) {
        map.set(m.mr_number, {
          mrNumber:    m.mr_number,
          patientName: m.patient_name || m.mr_number,
          lastMsg:     m.body,
          lastTime:    m.created_at,
          unread:      0,
        });
      }
      // Count unread patient messages (not yet read by staff)
      if (m.sender === 'patient' && !m.staff_read_at) {
        const c = map.get(m.mr_number)!;
        map.set(m.mr_number, { ...c, unread: c.unread + 1 });
      }
    });

    setConversations(Array.from(map.values()).sort((a,b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()));
    setLoadingList(false);
  }, [clinicId, isSuperAdmin]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load thread for selected conversation ────────────────────────────────
  const loadThread = useCallback(async (mr: string) => {
    setLoadingThread(true);
    let q = supabase.from('patient_messages').select('*').eq('mr_number', mr).order('created_at', { ascending: true });
    if (!isSuperAdmin && clinicId) q = q.or(`clinic_id.eq.${clinicId},clinic_id.is.null`);
    const { data } = await q;
    setMessages(data || []);
    setLoadingThread(false);

    // Mark patient messages as staff-read
    const unreadIds = (data || []).filter(m => m.sender === 'patient' && !m.staff_read_at).map(m => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('patient_messages').update({ staff_read_at: new Date().toISOString() }).in('id', unreadIds);
      // Refresh conversation list to clear badge
      loadConversations();
    }
  }, [clinicId, isSuperAdmin, loadConversations]);

  useEffect(() => {
    if (selected) loadThread(selected);
  }, [selected, loadThread]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Realtime: subscribe to new messages for selected conversation
  useEffect(() => {
    if (!selected) return;
    const filter = clinicId ? `clinic_id=eq.${clinicId}` : undefined;
    const channel = supabase.channel(`staff-msgs-${selected}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_messages',
        ...(filter ? { filter } : {}) },
        (payload) => {
          if ((payload.new as any).mr_number === selected) {
            setMessages(prev => [...prev, payload.new as Message]);
            loadConversations();
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected, clinicId, loadConversations]);

  // ── Send reply ────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !selected) return;
    setSending(true);
    const conv = conversations.find(c => c.mrNumber === selected);
    await supabase.from('patient_messages').insert([{
      mr_number:    selected,
      clinic_id:    clinicId || null,
      patient_name: conv?.patientName || selected,
      sender:       'clinic',
      body:         body.trim(),
      read_at:      null,
    }]);
    setBody('');
    setSending(false);
    await loadThread(selected);
  };

  const filtered = search
    ? conversations.filter(c => c.patientName.toLowerCase().includes(search.toLowerCase()) || c.mrNumber.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const selectedConv = conversations.find(c => c.mrNumber === selected);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[500px] rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>

      {/* ── Left panel: conversation list ── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)' }}>

        {/* Search */}
        <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={28} className="mx-auto mb-2 text-white/20" />
              <p className="text-white/30 text-xs">No conversations yet</p>
              <p className="text-white/20 text-[11px] mt-1">Patients who message will appear here</p>
            </div>
          ) : (
            filtered.map(c => {
              const isActive = selected === c.mrNumber;
              const time = new Date(c.lastTime);
              const timeStr = time.toLocaleDateString() === new Date().toLocaleDateString()
                ? time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

              return (
                <button key={c.mrNumber} onClick={() => setSelected(c.mrNumber)}
                  className="w-full flex items-start gap-3 px-3 py-3 transition-all text-left border-b"
                  style={{
                    background:   isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                    borderColor:  'rgba(255,255,255,0.05)',
                    borderLeft:   isActive ? '3px solid #8b5cf6' : '3px solid transparent',
                  }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: isActive ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)', color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.6)' }}>
                    {c.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-semibold truncate" style={{ color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.85)' }}>
                        {c.patientName}
                      </span>
                      <span className="text-[10px] text-white/30 flex-shrink-0">{timeStr}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[11px] text-white/40 truncate">{c.mrNumber}</span>
                      {c.unread > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: '#8b5cf6', color: '#fff' }}>
                          {c.unread > 9 ? '9+' : c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/30 truncate mt-0.5">{c.lastMsg}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: chat thread ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/20">
            <MessageSquare size={48} />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs text-white/15">Choose a patient from the left panel</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.15)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(139,92,246,0.25)', color: '#c4b5fd' }}>
                {selectedConv?.patientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{selectedConv?.patientName}</div>
                <div className="text-white/40 text-xs flex items-center gap-1">
                  <User size={10} /> MR: {selected}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingThread ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
                  <MessageSquare size={32} />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((m, i) => {
                    const isClinic = m.sender === 'clinic';
                    const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    const showDate = i === 0 || new Date(messages[i-1].created_at).toDateString() !== new Date(m.created_at).toDateString();
                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[10px] text-white/25 font-medium px-2">
                              {new Date(m.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}
                            </span>
                            <div className="flex-1 h-px bg-white/5" />
                          </div>
                        )}
                        <div className={`flex mb-3 ${isClinic ? 'justify-end' : 'justify-start'}`}>
                          {!isClinic && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 self-end flex-shrink-0"
                              style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
                              {selectedConv?.patientName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="max-w-[70%] flex flex-col" style={{ alignItems: isClinic ? 'flex-end' : 'flex-start' }}>
                            <div className="px-4 py-2.5 text-sm leading-relaxed"
                              style={{
                                background:   isClinic ? 'linear-gradient(135deg,#c9a84c,#e8c87a)' : 'rgba(255,255,255,0.08)',
                                color:        isClinic ? '#0a1628' : 'rgba(255,255,255,0.85)',
                                borderRadius: isClinic ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                border:       isClinic ? 'none' : '1px solid rgba(255,255,255,0.08)',
                              }}>
                              {m.body}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-white/25">
                              <Clock size={9} />{time}
                              {isClinic && m.read_at && <><CheckCheck size={10} className="text-emerald-400/60" /><span className="text-emerald-400/60">Seen</span></>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Reply input */}
            <div className="border-t px-4 py-3 flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.15)' }}>
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                  placeholder="Type reply… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', maxHeight: '120px' }}
                  onFocus={e => e.target.style.borderColor='rgba(201,168,76,0.5)'}
                  onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
                <button type="submit" disabled={sending || !body.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                  {sending ? <Loader2 size={15} className="text-[#0a1628] animate-spin" /> : <Send size={15} className="text-[#0a1628]" />}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
