'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

export default function PatientMessages() {
  const { data: session } = useSession();
  const user     = session?.user as any;
  const mrNumber = user?.mrNumber;
  const clinicId = user?.clinicId;
  const name     = user?.patientName || user?.name || 'Patient';

  const [messages, setMessages] = useState<any[]>([]);
  const [body,     setBody]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!mrNumber) return;
    const { data } = await supabase
      .from('patient_messages')
      .select('*')
      .eq('mr_number', mrNumber)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setLoading(false);

    // Mark clinic messages as read
    const unread = (data || []).filter(m => m.sender === 'clinic' && !m.read_at).map(m => m.id);
    if (unread.length > 0) {
      await supabase.from('patient_messages').update({ read_at: new Date().toISOString() }).in('id', unread);
    }
  };

  useEffect(() => { load(); }, [mrNumber]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!mrNumber) return;
    const channel = supabase
      .channel(`patient-messages-${mrNumber}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'patient_messages',
        filter: `mr_number=eq.${mrNumber}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mrNumber]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !mrNumber) return;
    setSending(true);
    await supabase.from('patient_messages').insert([{
      mr_number:    mrNumber,
      clinic_id:    clinicId || null,
      patient_name: name,
      sender:       'patient',
      body:         body.trim(),
    }]);
    setBody('');
    setSending(false);
    await load();
  };

  const groupedDates = messages.reduce<Record<string, any[]>>((acc, m) => {
    const d = new Date(m.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
    if (!acc[d]) acc[d] = [];
    acc[d].push(m);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-[500px]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#0a1628]">Messages</h1>
        <p className="text-slate-500 text-sm">Secure messaging with your clinic</p>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-2xl flex flex-col overflow-hidden"
        style={{ border:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>

        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor:'#f1f5f9' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#0a1628,#142240)' }}>
            <span className="text-[#c9a84c] font-bold text-sm">M+</span>
          </div>
          <div>
            <div className="font-semibold text-[#0a1628] text-sm">MediPlex Clinic</div>
            <div className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Your care team
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-7 h-7 border-2 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={40} className="text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium">No messages yet</p>
              <p className="text-slate-400 text-sm mt-1">Send a message to your clinic below</p>
            </div>
          ) : (
            Object.entries(groupedDates).map(([date, msgs]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{ background:'#f1f5f9' }} />
                  <span className="text-xs text-slate-400 font-medium px-2">{date}</span>
                  <div className="flex-1 h-px" style={{ background:'#f1f5f9' }} />
                </div>

                {msgs.map(m => {
                  const isMe = m.sender === 'patient';
                  const time = new Date(m.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
                  return (
                    <div key={m.id} className={`flex mb-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 flex-shrink-0 self-end mb-1"
                          style={{ background:'rgba(10,22,40,0.08)', color:'#0a1628' }}>
                          Dr
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={{
                            background:    isMe ? 'linear-gradient(135deg,#0a1628,#142240)' : '#f8fafc',
                            color:         isMe ? '#ffffff' : '#1e293b',
                            borderRadius:  isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            border:        isMe ? 'none' : '1px solid #e2e8f0',
                          }}>
                          {m.body}
                        </div>
                        <div className={`text-[10px] text-slate-400 mt-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {time}{isMe ? '' : ' · Clinic'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3" style={{ borderColor:'#f1f5f9' }}>
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <textarea value={body} onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
              placeholder="Type your message... (Enter to send)"
              rows={2}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
              style={{ background:'#f8fafc', border:'1px solid #e2e8f0', color:'#1e293b', maxHeight:'120px' }}
              onFocus={e => e.target.style.borderColor='rgba(10,22,40,0.3)'}
              onBlur={e  => e.target.style.borderColor='#e2e8f0'} />
            <button type="submit" disabled={sending || !body.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{ background:'linear-gradient(135deg,#0a1628,#142240)' }}>
              {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-1.5 pl-1">Messages are reviewed by your clinic team during business hours.</p>
        </div>
      </div>
    </div>
  );
}
