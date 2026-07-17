import { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';

/**
 * Voice-first transaction entry. Uses the browser's native Web Speech API
 * (webkitSpeechRecognition — Chrome/Edge/Android WebView) set to Bangla
 * (bn-BD) so a vendor can just speak their sale/expense instead of typing.
 *
 * The raw transcript is handed to the backend's /api/transactions endpoint
 * as `rawInputText`, where Gemma 4's function-calling structures it — this
 * component does zero parsing itself, it's purely capture + UI.
 */
export default function VoiceInput({ onTranscriptReady, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const silenceTimeoutRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setTranscript(text);
      transcriptRef.current = text;

      // Clear any existing silence timer
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Start a new 4-second silence timer
      silenceTimeoutRef.current = setTimeout(() => {
        recognition.stop();
      }, 4000);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (transcriptRef.current.trim()) {
        onTranscriptReady(transcriptRef.current.trim());
        transcriptRef.current = '';
      }
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [onTranscriptReady]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      transcriptRef.current = '';
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!supported) {
    return (
      <div className="alert bg-warning/10 text-warning-content border border-warning/20 text-sm rounded-xl">
        <AlertCircle size={16} className="text-warning" />
        <span>
          Voice input isn't supported in this browser. Try Chrome, or use the manual form below.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 disabled:opacity-40
          ${
            isListening
              ? 'bg-error text-white shadow-glow scale-105'
              : 'bg-taka-gradient text-primary-content shadow-card hover:scale-105'
          }`}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-error animate-ping opacity-30" />
        )}
        {isListening ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
      </button>

      <p className="font-bn text-sm text-base-content/60 text-center max-w-xs">
        {isListening ? 'শুনছি… কথা বলুন' : 'আজকের বিক্রি বা খরচ বলুন'}
      </p>

      {transcript && (
        <div className="w-full card-surface p-3 text-sm font-bn text-neutral">
          "{transcript}"
        </div>
      )}
    </div>
  );
}
