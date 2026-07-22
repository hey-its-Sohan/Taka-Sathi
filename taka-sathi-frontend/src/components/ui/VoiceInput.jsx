import { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';
import useAuth from '../../context/useAuth.js';

/**
 * Voice-first transaction entry with shift-based speaker verification capability.
 * Uses Web Speech API (webkitSpeechRecognition) for live Bangla transcription,
 * and simultaneously records raw audio using MediaRecorder if Safe Voice Mode is enabled
 * to allow 1:1 speaker verification on the backend.
 */
export default function VoiceInput({ onTranscriptReady, disabled }) {
  const { user } = useAuth();
  const isSafeMode = user?.isSafeVoiceEnabled || false;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  
  const transcriptRef = useRef('');
  const silenceTimeoutRef = useRef(null);
  const startTimeRef = useRef(0);

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

      // Reset 4-second silence auto-stop timer
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        handleStopListening();
      }, 4000);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      // Stop media recorder if it's still running
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };

    recognitionRef.current = recognition;
    
    return () => {
      recognition.stop();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Helper to convert blob to base64 data url
  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startListening = async () => {
    setTranscript('');
    transcriptRef.current = '';
    audioChunksRef.current = [];
    startTimeRef.current = Date.now();

    try {
      // Capture audio stream for simultaneous recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Stop all track streams to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        const finalTranscript = transcriptRef.current.trim();
        if (finalTranscript) {
          try {
            // Encode baseline audio payload to verify on server
            const base64Audio = await convertBlobToBase64(blob);
            onTranscriptReady(finalTranscript, {
              audioData: base64Audio,
              duration: durationSec
            });
          } catch (err) {
            console.error('Failed to convert speech blob to Base64:', err);
            onTranscriptReady(finalTranscript, null);
          }
        }
        transcriptRef.current = '';
      };

      // Start both listeners
      mediaRecorder.start();
      recognitionRef.current.start();
      setIsListening(true);

      // Timeout if nothing is spoken in 6s
      silenceTimeoutRef.current = setTimeout(() => {
        handleStopListening();
      }, 6000);

    } catch (err) {
      console.error('Failed to access microphone for recording:', err);
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      handleStopListening();
    } else {
      startListening();
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
    <div className="flex flex-col items-center gap-4 py-4 font-bn">
      
      {/* Mic Button wrapper */}
      <div className="relative">
        
        {/* Lock indicator overlay if shift safety is enabled */}
        {isSafeMode && (
          <div 
            className="absolute -top-1 -right-1 bg-teal-600 text-white p-1.5 rounded-full z-10 shadow-sm border border-white"
            title="Safe Shift Voice Mode is active (1:1 Verification)"
          >
            <Lock size={12} strokeWidth={2.5} />
          </div>
        )}

        <button
          onClick={toggleListening}
          disabled={disabled}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 disabled:opacity-40
            ${
              isListening
                ? 'bg-error text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] scale-105'
                : isSafeMode
                  ? 'bg-taka-gradient border-[3px] border-teal-500 text-primary-content shadow-card hover:scale-105'
                  : 'bg-taka-gradient text-primary-content shadow-card hover:scale-105'
            }`}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-full bg-error animate-ping opacity-35" />
          )}
          {isListening ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
        </button>
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-base-content/60 text-center max-w-xs font-semibold">
          {isListening ? 'শুনছি… কথা বলুন' : 'আজকের বিক্রি বা খরচ বলুন'}
        </p>
        
        {/* Subtitle status badges */}
        {isSafeMode ? (
          <span className="badge badge-sm bg-teal-500/10 text-teal-700 border-none font-bold text-[10px] flex gap-1 py-1 px-2.5 rounded-md">
            <ShieldCheck size={11} /> নিরাপদ শিফট মোড অন
          </span>
        ) : (
          <span className="text-[10px] text-base-content/40">
            স্ট্যান্ডার্ড মোড (যে কেউ কমান্ড দিতে পারবেন)
          </span>
        )}
      </div>

      {transcript && (
        <div className="w-full card-surface p-3 text-sm text-neutral border border-base-300 font-medium">
          "{transcript}"
        </div>
      )}
    </div>
  );
}
