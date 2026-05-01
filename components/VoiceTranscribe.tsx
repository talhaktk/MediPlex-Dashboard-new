"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceTranscribeProps {
  /** Called whenever transcript updates (live + final) */
  onTranscriptChange?: (text: string) => void;
  /** Placeholder shown in the textarea */
  placeholder?: string;
  /** Label above the component */
  label?: string;
  /** Initial text value */
  defaultValue?: string;
  /** Tailwind classes to add to the outer wrapper */
  className?: string;
}

type RecordingState = "idle" | "recording" | "processing";

export default function VoiceTranscribe({
  onTranscriptChange,
  placeholder = "Click the mic and start speaking. Medical terms will be accurately transcribed...",
  label = "Voice Transcription",
  defaultValue = "",
  className = "",
}: VoiceTranscribeProps) {
  const [transcript, setTranscript] = useState(defaultValue);
  const [interimText, setInterimText] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll textarea to bottom
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Notify parent on transcript change
  useEffect(() => {
    onTranscriptChange?.(transcript);
  }, [transcript, onTranscriptChange]);

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    stopTimer();
  }, []);

  const sendToDeepgram = useCallback(async (audioBlob: Blob) => {
    setRecordingState("processing");
    setInterimText("");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transcription failed");
      }

      const { transcript: newText } = await res.json();

      if (newText.trim()) {
        setTranscript((prev) => {
          const separator = prev.trim() ? " " : "";
          return prev + separator + newText;
        });
      }
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      setError(msg);
    } finally {
      setRecordingState("idle");
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm/opus, fallback to whatever browser supports
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        sendToDeepgram(blob);
      };

      recorder.start();
      setRecordingState("recording");
      startTimer();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Microphone access denied";
      setError("Microphone error: " + msg);
      setRecordingState("idle");
    }
  }, [sendToDeepgram]);

  const handleMicClick = () => {
    if (recordingState === "recording") {
      stopRecording();
    } else if (recordingState === "idle") {
      startRecording();
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setInterimText("");
    onTranscriptChange?.("");
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
  };

  const displayText = transcript + (interimText ? " " + interimText : "");

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {/* Badge: Powered by Deepgram */}
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Deepgram Medical AI
          </span>
        </div>
      </div>

      {/* Transcript area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={displayText}
          onChange={(e) => {
            setTranscript(e.target.value);
            setInterimText("");
          }}
          placeholder={placeholder}
          rows={6}
          className={`
            w-full resize-y rounded-lg border px-4 py-3 text-sm leading-relaxed
            transition-all duration-200 outline-none
            ${
              recordingState === "recording"
                ? "border-red-400 ring-2 ring-red-100 dark:ring-red-900/30"
                : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:focus:ring-blue-900/30"
            }
            bg-white dark:bg-gray-900
            text-gray-800 dark:text-gray-100
            placeholder:text-gray-400 dark:placeholder:text-gray-600
          `}
        />

        {/* Recording pulse overlay indicator */}
        {recordingState === "recording" && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-semibold text-red-500">
              {formatDuration(duration)}
            </span>
          </div>
        )}

        {/* Processing spinner */}
        {recordingState === "processing" && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <svg
              className="h-4 w-4 animate-spin text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs font-medium text-blue-500">
              Transcribing...
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={recordingState === "processing"}
          aria-label={
            recordingState === "recording" ? "Stop recording" : "Start recording"
          }
          className={`
            flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${
              recordingState === "recording"
                ? "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 shadow-lg shadow-red-200 dark:shadow-red-900/30"
                : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400 shadow-sm"
            }
          `}
        >
          {recordingState === "recording" ? (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <rect x="5" y="5" width="10" height="10" rx="1" />
              </svg>
              Stop Recording
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zm-7 9a7 7 0 0014 0h2a9 9 0 01-8 8.94V23h-2v-2.06A9 9 0 013 12H5z" />
              </svg>
              {recordingState === "processing" ? "Processing…" : "Start Recording"}
            </>
          )}
        </button>

        {/* Copy button */}
        <button
          type="button"
          onClick={copyTranscript}
          disabled={!transcript}
          title="Copy transcript"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600
            hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
            transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy
        </button>

        {/* Clear button */}
        <button
          type="button"
          onClick={clearTranscript}
          disabled={!transcript && !interimText}
          title="Clear transcript"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600
            hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-40
            dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400
            transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </button>

        {/* Word count */}
        {transcript && (
          <span className="ml-auto text-xs text-gray-400">
            {transcript.trim().split(/\s+/).filter(Boolean).length} words
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Hint */}
      {recordingState === "idle" && !error && (
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Uses Deepgram <strong>nova-2-medical</strong> — optimised for clinical vocabulary, drug names & medical terminology.
        </p>
      )}
    </div>
  );
}