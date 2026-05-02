'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function WisprVoicePlugin() {
  const [status, setStatus] = useState<'idle'|'listening'|'processing'|'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const mediaRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const socketRef = useRef<WebSocket|null>(null);
  const activeElRef = useRef<HTMLElement|null>(null);

  const startListening = useCallback(async () => {
    try {
      // Save active element
      activeElRef.current = document.activeElement as HTMLElement;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('listening');
      setTranscript('');

      // Connect to Deepgram via WebSocket
      const ws = new WebSocket(
        'wss://api.deepgram.com/v1/listen?language=en-US&model=nova-2&smart_format=true',
        ['token', process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '']
      );
      socketRef.current = ws;

      ws.onopen = () => {
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (ws.readyState === WebSocket.OPEN && e.data.size > 0) {
            ws.send(e.data);
          }
        };
        recorder.start(250);
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const text = data?.channel?.alternatives?.[0]?.transcript;
        if (text && data.is_final) {
          setTranscript(prev => prev + ' ' + text);
          // Insert text at cursor position in active element
          const el = activeElRef.current;
          if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              const inp = el as HTMLInputElement | HTMLTextAreaElement;
              const start = inp.selectionStart || inp.value.length;
              const end = inp.selectionEnd || inp.value.length;
              const newVal = inp.value.slice(0, start) + (text + ' ') + inp.value.slice(end);
              // Trigger React onChange
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(inp, newVal);
                inp.dispatchEvent(new Event('input', { bubbles: true }));
              }
              inp.selectionStart = inp.selectionEnd = start + text.length + 1;
            } else if (el.isContentEditable) {
              document.execCommand('insertText', false, text + ' ');
            }
          }
        }
      };

      ws.onerror = () => setStatus('error');

    } catch (err) {
      console.error('Microphone error:', err);
      setStatus('error');
    }
  }, []);

  const stopListening = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
    socketRef.current?.close();
    setStatus('idle');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat && status === 'idle') {
        startListening();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' && status === 'listening') {
        stopListening();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [status, startListening, stopListening]);

  if (status === 'idle') {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-[11px] text-gray-400 select-none pointer-events-none"
        style={{background:'rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.08)'}}>
        <span>🎤</span> Hold <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{background:'rgba(0,0,0,0.08)'}}>Ctrl</kbd> to dictate
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl select-none"
      style={{background: status==='listening'?'#0a1628':status==='error'?'#dc2626':'#1a7f5e',
        border: status==='listening'?'2px solid #c9a84c':'2px solid transparent',
        maxWidth: 320}}>
      <div className="relative flex-shrink-0">
        <div className="w-3 h-3 rounded-full" style={{background:status==='error'?'#fff':'#c9a84c'}}/>
        {status==='listening' && (
          <div className="absolute inset-0 rounded-full animate-ping" style={{background:'rgba(201,168,76,0.4)'}}/>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-white">
          {status==='listening'?'🎤 Listening... (release Ctrl to stop)':status==='error'?'⚠ Microphone error':''}
        </div>
        {transcript && (
          <div className="text-[11px] text-white/60 truncate mt-0.5">{transcript.trim()}</div>
        )}
      </div>
    </div>
  );
}
