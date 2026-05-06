'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare, Search, Loader2, User, Clock, CheckCheck, ChevronRight } from 'lucide-react';

interface Conversation {
  mrNumber:    string;
  patientName: string;
  lastMsg:     string;
  lastTime:    string;
  unread:      number;
}

interface Message {
  id:            string;
  sender:        'patient' | 'clinic';
  body:          string;
  created_at:    string;
  read_at:       string | null;
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

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/staff/messages?action=list');
    if (!res.ok) { setLoadingList(false); return; }
    const { data } = await res.json();
    if (!data) { setLoadingList(false); return; }

    const map = new Map<string, Conversation>();
    data.forEach((m: any) => {
      if (!map.has(m.mr_number)) {
        map.set(m.mr_number, {
          mrNumber:    m.mr_number,
          patientName: m.patient_name || m.mr_number,
          lastMsg:     m.body,
          lastTime:    m.created_at,
          unread:      0,
        });
      }
      if (m.sender === 'patient' && !m.staff_read_at) {
        const c = map.get(m.mr_number)!;
        map.set(m.mr_number, { ...c, unread: c.unread + 1 });
      }
    });

    setConversations(Array.from(map.values()).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()));
    setLoadingList(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadThread = useCallback(async (mr: string) => {
    setLoadingThread(true);
    const res = await fetch(`/api/staff/messages?action=thread&mr=${encodeURIComponent(mr)}`);
    if (!res.ok) { setLoadingThread(false); return; }
    const { data } = await res.json();
    setMessages(data || []);
    setLoadingThread(false);

    const unreadIds = (data || []).filter((m: any) => m.sender === 'patient' && !m.staff_read_at).map((m: any) => m.id);
    if (unreadIds.length > 0) {
      await fetch('/api/staff/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds }),
      });
      loadConversations();
    }
  }, [loadConversations]);

  useEffect(() => {
    if (selected) loadThread(selected);
  }, [selected, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!selected) return;
    const channel = supabase.channel(`staff-msgs-${selected}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patient_messages' },
        (payload) => {
          if ((payload.new as any).mr_number === selected) loadThread(selected);
          loadConversations();
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected, loadThread, loadConversations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !selected) return;
    setSending(true);
    const conv = conversations.find(c => c.mrNumber === selected);
    await fetch('/api/staff/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mrNumber:    selected,
        patientName: conv?.patientName || selected,
        body:        body.trim(),
        clinicId:    clinicId || null,
      }),
    });
    setBody('');
    setSending(false);
    await loadThread(selected);
  };

  const filtered = search
    ? conversations.filter(c => c.patientName.toLowerCase().includes(search.toLowerCase()) || c.mrNumber.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const selectedConv = conversations.find(c => c.mrNumber === selected);

  const avatarColors = ['#0a1628', '#1a7f5e', '#2b6cb0', '#6d28d9', '#c9a84c', '#b45309'];
  const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[520px] rounded-2xl overflow-hidden bg-white"
      style={{ border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

      {/* ── Left sidebar ── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-100">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-navy">Messages</span>
            {conversations.reduce((s, c) => s + c.unread, 0) > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#b47a00' }}>
                {conversations.reduce((s, c) => s + c.unread, 0)} unread
              </span>
            )}
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none transition-all"
              style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', color: '#0a1628' }}
              onFocus={e => e.target.style.borderColor = '#c9a84c'}
              onBlur={e  => e.target.style.borderColor = '#e5e7eb'} />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-gold rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(201,168,76,0.08)' }}>
                <MessageSquare size={22} style={{ color: '#c9a84c' }} />
              </div>
              <p className="text-[13px] font-medium text-navy">No conversations yet</p>
              <p className="text-[11px] text-gray-400 mt-1">Patients who message will appear here</p>
            </div>
          ) : (
            filtered.map(c => {
              const isActive = selected === c.mrNumber;
              const time = new Date(c.lastTime);
              const timeStr = time.toLocaleDateString() === new Date().toLocaleDateString()
                ? time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const avatarBg = getAvatarColor(c.patientName);

              return (
                <button key={c.mrNumber} onClick={() => setSelected(c.mrNumber)}
                  className="w-full flex items-start gap-3 px-3 py-3 transition-all text-left"
                  style={{
                    background:   isActive ? 'rgba(201,168,76,0.07)' : 'transparent',
                    borderLeft:   isActive ? '3px solid #c9a84c' : '3px solid transparent',
                    borderBottom: '1px solid #f3f4f6',
                  }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ background: avatarBg }}>
                    {c.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13px] font-semibold truncate" style={{ color: '#0a1628' }}>
                        {c.patientName}
                      </span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{timeStr}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[11px] text-gray-400 truncate">{c.mrNumber}</span>
                      {c.unread > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: '#c9a84c', color: '#0a1628' }}>
                          {c.unread > 9 ? '9+' : c.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.lastMsg}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: chat panel ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <MessageSquare size={28} style={{ color: '#c9a84c' }} />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-navy">Select a conversation</p>
              <p className="text-[12px] text-gray-400 mt-1">Choose a patient from the left panel to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                style={{ background: getAvatarColor(selectedConv?.patientName || '') }}>
                {selectedConv?.patientName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-navy truncate">{selectedConv?.patientName}</div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <User size={9} />MR: {selected}
                </div>
              </div>
              <div className="text-[11px] px-3 py-1 rounded-full font-medium"
                style={{ background: 'rgba(26,127,94,0.08)', color: '#1a7f5e', border: '1px solid rgba(26,127,94,0.15)' }}>
                Patient
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5" style={{ background: '#fafafa' }}>
              {loadingThread ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-gold rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(201,168,76,0.08)' }}>
                    <MessageSquare size={22} style={{ color: '#c9a84c' }} />
                  </div>
                  <p className="text-[13px] text-gray-400">No messages yet in this conversation</p>
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
                          <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] text-gray-400 font-medium px-3 py-1 rounded-full"
                              style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                              {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <div className={`flex mb-3 ${isClinic ? 'justify-end' : 'justify-start'}`}>
                          {!isClinic && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 self-end flex-shrink-0 text-white"
                              style={{ background: getAvatarColor(selectedConv?.patientName || '') }}>
                              {selectedConv?.patientName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="max-w-[68%] flex flex-col" style={{ alignItems: isClinic ? 'flex-end' : 'flex-start' }}>
                            <div className="px-4 py-2.5 text-[13px] leading-relaxed"
                              style={{
                                background:   isClinic ? 'linear-gradient(135deg,#c9a84c,#e8c87a)' : '#fff',
                                color:        isClinic ? '#0a1628' : '#1a2535',
                                borderRadius: isClinic ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                border:       isClinic ? 'none' : '1px solid #e5e7eb',
                                boxShadow:    isClinic ? '0 1px 2px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                                fontWeight:   isClinic ? 500 : 400,
                              }}>
                              {m.body}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-400">
                              <Clock size={9} />{time}
                              {isClinic && m.read_at && (
                                <><CheckCheck size={10} className="text-emerald-500" /><span className="text-emerald-500">Seen</span></>
                              )}
                            </div>
                          </div>
                          {isClinic && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ml-2 self-end flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)', color: '#0a1628' }}>
                              DR
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Compose */}
            <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0 bg-white">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="flex-1 resize-none rounded-2xl px-4 py-3 text-[13px] outline-none transition-all"
                  style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', color: '#0a1628', maxHeight: '120px' }}
                  onFocus={e => e.target.style.borderColor = '#c9a84c'}
                  onBlur={e  => e.target.style.borderColor = '#e5e7eb'} />
                <button type="submit" disabled={sending || !body.trim()}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#c9a84c,#e8c87a)' }}>
                  {sending ? <Loader2 size={15} className="text-[#0a1628] animate-spin" /> : <Send size={15} className="text-[#0a1628]" />}
                </button>
              </form>
              <p className="text-[10px] text-gray-300 mt-1.5 px-1">Messages are delivered via the patient portal</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
