'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function WisprVoicePlugin() {
  const [status, setStatus] = useState<'idle'|'listening'|'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const mediaRef = useRef<MediaRecorder|null>(null);
  const socketRef = useRef<WebSocket|null>(null);
  const activeElRef = useRef<HTMLElement|null>(null);
  const insertedRef = useRef('');

  const insertText = (text: string) => {
    const el = activeElRef.current;
    if (!el || !text.trim()) return;
    const word = text.trim() + ' ';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const inp = el as HTMLInputElement | HTMLTextAreaElement;
      const start = inp.selectionStart ?? inp.value.length;
      const end = inp.selectionEnd ?? inp.value.length;
      const newVal = inp.value.slice(0, start) + word + inp.value.slice(end);
      const setter = Object.getOwnPropertyDescriptor(
        el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (setter) {
        setter.call(inp, newVal);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      inp.selectionStart = inp.selectionEnd = start + word.length;
    } else if (el.isContentEditable) {
      document.execCommand('insertText', false, word);
    }
  };

  const startListening = useCallback(async () => {
    try {
      activeElRef.current = document.activeElement as HTMLElement;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('listening');
      setTranscript('');
      insertedRef.current = '';

      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '';
      if (!apiKey) {
        console.error('NEXT_PUBLIC_DEEPGRAM_API_KEY not set');
        setStatus('error');
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=false`,
        ['token', apiKey]
      );
      socketRef.current = ws;

      ws.onopen = () => {
        const recorder = new MediaRecorder(stream);
        mediaRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (ws.readyState === WebSocket.OPEN && e.data.size > 0) ws.send(e.data);
        };
        recorder.start(300);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const text = data?.channel?.alternatives?.[0]?.transcript || '';
          if (text && data.is_final) {
            setTranscript(prev => prev + ' ' + text);
            insertText(text);
          }
        } catch {}
      };

      ws.onerror = (e) => {
        console.error('Deepgram WS error:', e);
        setStatus('error');
      };

      ws.onclose = () => {
        stream.getTracks().forEach(t => t.stop());
      };

    } catch (err) {
      console.error('Mic error:', err);
      setStatus('error');
    }
  }, []);

  const stopListening = useCallback(() => {
    mediaRef.current?.stop();
    socketRef.current?.close();
    setTimeout(() => setStatus('idle'), 300);
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat && status === 'idle') startListening();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' && status === 'listening') stopListening();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [status, startListening, stopListening]);

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none select-none">
      {status === 'idle' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full text-[11px] text-gray-400"
          style={{background:'rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.08)'}}>
          🎤 Hold <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono mx-1"
            style={{background:'rgba(0,0,0,0.1)'}}>Ctrl</kbd> to dictate
        </div>
      )}
      {status === 'listening' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
          style={{background:'#0a1628',border:'2px solid #c9a84c',maxWidth:300}}>
          <div className="relative flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-gold"/>
            <div className="absolute inset-0 rounded-full animate-ping" style={{background:'rgba(201,168,76,0.5)'}}/>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-white">🎤 Listening...</div>
            <div className="text-[10px] text-white/50">Release Ctrl to stop</div>
            {transcript && <div className="text-[11px] text-gold mt-1 truncate max-w-[220px]">{transcript.trim()}</div>}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl"
          style={{background:'#dc2626',border:'2px solid #fca5a5'}}>
          <span className="text-white text-[12px]">⚠ Mic error — check API key & permissions</span>
        </div>
      )}
    </div>
  );
}
