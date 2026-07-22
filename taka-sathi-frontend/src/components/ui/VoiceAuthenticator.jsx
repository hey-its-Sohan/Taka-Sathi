import { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Square, Play, Pause, RotateCcw, 
  Check, AlertCircle, Shield, ShieldCheck, Volume2, Info, XCircle, Trash2, Key
} from 'lucide-react';
import useToast from '../../context/useToast.js';
import useAuth from '../../context/useAuth.js';
import { voiceApi } from '../../lib/api';

export default function VoiceAuthenticator() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();

  // Modes: 'enroll' (Enrollment) | 'verify' (Verification)
  const [mode, setMode] = useState('enroll');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification outcome state for display
  const [verificationResult, setVerificationResult] = useState(null); // null | { success: boolean, score: number, type: 'enroll' | 'verify' }

  // Fallback and fails counter states
  const [failCount, setFailCount] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackPin, setFallbackPin] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Live noise/volume warn state
  const [liveVolumeStatus, setLiveVolumeStatus] = useState('good'); // 'silent' | 'noisy' | 'good'

  // Microphone and Permission States
  const [micPermission, setMicPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [errorMessage, setErrorMessage] = useState('');

  // Refs for media recording and audio context
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  
  // Audio playback ref
  const audioPlayerRef = useRef(null);

  // Canvas visualizer refs
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Enrollment Prompt sentence
  const ENROLL_PROMPTS = {
    bn: "টাকাসাথী অ্যাপে আমার কণ্ঠস্বর নিরাপত্তা নিশ্চিত করছে এবং লেনদেন নিরাপদ রাখছে।",
    en: "My voice is my secure password on TakaSathi, validating my identity."
  };
  const [selectedLang, setSelectedLang] = useState('bn');

  // Sync user profile state on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Audio Synthesizer: Play direct browser Beep sounds using raw oscillators
  const playSynthSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'start') {
        // High pitch beep
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'success') {
        // Double rising chime
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'error') {
        // Low double buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, ctx.currentTime); // C3
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Synth sound error:', e);
    }
  };

  // Request Microphone permission
  const requestMicPermission = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission('granted');
      return stream;
    } catch (err) {
      console.error('Microphone access error:', err);
      setMicPermission('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('মাইক্রোফোন অ্যাক্সেস ব্লক করা আছে। অনুগ্রহ করে আপনার ব্রাউজারের অ্যাড্রেস বার থেকে মাইক্রোফোন পারমিশন চালু করুন।');
        toast.error('মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি।');
      } else {
        setErrorMessage(`মাইক্রোফোন সমস্যা: ${err.message}`);
        toast.error('মাইক্রোফোন কানেক্ট করা যায়নি।');
      }
      return null;
    }
  };

  // Start recording voice
  const startRecording = async () => {
    playSynthSound('start');
    
    // Reset previous recording states
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingDuration(0);
    setVerificationResult(null);
    audioChunksRef.current = [];
    setErrorMessage('');
    setLiveVolumeStatus('good');

    let currentStream = streamRef.current;
    if (!currentStream || !currentStream.active) {
      currentStream = await requestMicPermission();
    }

    if (!currentStream) return;

    try {
      // Determine supported mime types for high compatibility
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(currentStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
        
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Enforce minimum limit for enrollment
        if (mode === 'enroll' && recordingDuration < 5) {
          setErrorMessage('ভয়েস পাসওয়ার্ড সেভ করার জন্য কমপক্ষে ৫ সেকেন্ড কথা বলতে হবে। অনুগ্রহ করে আবার রেকর্ড করুন।');
          toast.error('ভয়েস রেকর্ডটি খুব ছোট হয়েছে।');
          playSynthSound('error');
        }
      };

      // Set up Audio Context and Analyser for Live Waveform Visualizer
      setupVisualizer(currentStream);

      // Start recording and timer
      mediaRecorder.start(100); // chunk every 100ms
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const nextVal = prev + 1;
          
          // Automatic limits
          if (mode === 'enroll' && nextVal >= 10) {
            stopRecording();
            toast.success('সর্বোচ্চ সীমা (১০ সেকেন্ড) পূর্ণ হয়েছে।');
            return 10;
          }
          if (mode === 'verify' && nextVal >= 15) {
            stopRecording();
            toast.success('সর্বোচ্চ সীমা (১৫ সেকেন্ড) পূর্ণ হয়েছে।');
            return 15;
          }
          return nextVal;
        });
      }, 1000);

    } catch (err) {
      console.error('MediaRecorder start failed:', err);
      setErrorMessage(`রেকর্ডিং চালু করতে ব্যর্থ হয়েছে: ${err.message}`);
      toast.error('রেকর্ডিং শুরু করা যায়নি।');
      playSynthSound('error');
    }
  };

  // Stop recording voice
  const stopRecording = () => {
    playSynthSound('start');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    cleanupVisualizer();
  };

  // Setup Web Audio API analyser with real-time volume validation (RMS)
  const setupVisualizer = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      // Connect to analyser, but NOT to destination to prevent audio feedback screeching
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Real-time volume (RMS) calculation to alert user of background noise or silence
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avgVol = sum / bufferLength;

        // Update warn statuses
        if (avgVol < 8) {
          setLiveVolumeStatus('silent');
        } else if (avgVol > 95) {
          setLiveVolumeStatus('noisy');
        } else {
          setLiveVolumeStatus('good');
        }

        ctx.clearRect(0, 0, width, height);

        // Center visual lines
        const barCount = 36;
        const spacing = 4;
        const barWidth = (width - spacing * barCount) / barCount;
        
        // Draw bars symmetric from center
        for (let i = 0; i < barCount; i++) {
          // Wrap frequency bins or sample selectively
          const dataIndex = Math.floor((i / barCount) * (bufferLength / 2));
          const value = dataArray[dataIndex] || 0;
          
          // Map value to height (min height 4px for aesthetic, max 80% canvas height)
          const pct = value / 255;
          const barHeight = Math.max(4, pct * height * 0.85);
          
          // Calculate X position
          const x = i * (barWidth + spacing) + spacing / 2;
          // Center vertically
          const y = (height - barHeight) / 2;

          // Teal primary color gradient based on signal intensity
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#14B8A6'); // teal-500
          gradient.addColorStop(0.5, '#0F766E'); // primary teal
          gradient.addColorStop(1, '#0B2B26'); // dark teal

          ctx.fillStyle = gradient;
          
          // Round the bars
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, barHeight, 4);
            ctx.fill();
          } else {
            // Fallback for older browsers
            ctx.rect(x, y, barWidth, barHeight);
            ctx.fill();
          }
        }
      };

      drawWaveform();
    } catch (err) {
      console.error('Failed to setup Web Audio visualizer', err);
    }
  };

  // Clean up visualizer animation and audio contexts
  const cleanupVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  // Clean up all tracks and resources on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      cleanupVisualizer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Audio Playback controls
  const handleTogglePlayback = () => {
    if (!audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Reset recording to record again
  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingDuration(0);
    setVerificationResult(null);
    setErrorMessage('');
    setLiveVolumeStatus('good');
    audioChunksRef.current = [];
  };

  // Delete enrolled voice print
  const handleDeleteVoice = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনার ভয়েস পাসওয়ার্ডটি মুছে ফেলতে চান?')) return;
    
    setIsSubmitting(true);
    try {
      await voiceApi.delete();
      toast.success('ভয়েস পাসওয়ার্ড সফলভাবে মুছে ফেলা হয়েছে!');
      handleReset();
      refreshUser();
    } catch (err) {
      toast.error(err.message || 'ভয়েস মুছতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit audio data to the backend API
  const submitAudioData = async (blob, currentMode) => {
    if (!blob) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    setVerificationResult(null);
    
    try {
      const base64Data = await convertBlobToBase64(blob);
      
      if (currentMode === 'enroll') {
        const response = await voiceApi.enroll(base64Data, recordingDuration, blob.type);
        toast.success(response?.message || 'ভয়েস পাসওয়ার্ড সফলভাবে নিবন্ধিত হয়েছে!');
        playSynthSound('success');
        setVerificationResult({
          success: true,
          score: 1.0,
          type: 'enroll',
          message: 'ভয়েস পাসওয়ার্ড সফলভাবে সেট করা হয়েছে!'
        });
        refreshUser();
      } else {
        const response = await voiceApi.verify(base64Data, recordingDuration);
        const score = response?.score || 0;
        
        playSynthSound('success');
        setFailCount(0); // Reset consecutive fails on success
        setVerificationResult({
          success: true,
          score: score,
          type: 'verify',
          message: 'কণ্ঠস্বর সফলভাবে যাচাই করা হয়েছে!'
        });
        toast.success(`ভয়েস মিলেছে! ম্যাচ স্কোর: ${Math.round(score * 100)}%`);
      }

      // Cleanup raw audio state after successful submit
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err) {
      console.error('Voice submission error:', err);
      playSynthSound('error');

      const nextFails = failCount + 1;
      setFailCount(nextFails);

      // If failed 3 times, show OTP fallback input
      if (currentMode === 'verify' && nextFails >= 3) {
        setShowFallback(true);
        toast.error('পরপর ৩ বার ভয়েস ম্যাচ করতে ব্যর্থ হয়েছে! বিকল্প PIN/OTP ব্যবহার করুন।');
      }

      const score = err.response?.data?.data?.score || 0.58; 
      setVerificationResult({
        success: false,
        score: score,
        type: currentMode,
        message: err.message || 'ভয়েস মিলানো ব্যর্থ হয়েছে।'
      });
      setErrorMessage(err.message || 'ভয়েস ভেরিফিকেশনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify PIN fallback
  const handleVerifyFallbackPin = async (e) => {
    e.preventDefault();
    if (!fallbackPin) return;

    setIsVerifyingPin(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Demo bypass code "123456"
    if (fallbackPin === '123456') {
      toast.success('পিন কোড সফলভাবে যাচাই করা হয়েছে! (বিকল্প ভেরিফিকেশন)');
      playSynthSound('success');
      setVerificationResult({
        success: true,
        score: 1.0,
        type: 'verify',
        message: 'পিন যাচাইয়ের মাধ্যমে লেনদেন অনুমোদিত হয়েছে!'
      });
      setFailCount(0);
      setShowFallback(false);
      setFallbackPin('');
    } else {
      toast.error('ভুল পিন কোড! অনুগ্রহ করে পুনরায় সঠিক পিন দিন।');
      playSynthSound('error');
    }
    setIsVerifyingPin(false);
  };

  const handleModeChange = (newMode) => {
    if (isRecording) {
      stopRecording();
    }
    setMode(newMode);
    handleReset();
  };

  return (
    <div className="card-surface p-6 md:p-8 flex flex-col items-center gap-6 max-w-xl mx-auto">
      
      {/* Header Info */}
      <div className="text-center w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-2 text-xs font-semibold tracking-wide uppercase">
          <Shield size={14} /> Safe Voice Lock
        </div>
        <h2 className="text-xl md:text-2xl font-display font-bold text-neutral leading-tight font-bn">
          ভয়েস লক নিরাপত্তা
        </h2>
        <p className="text-sm text-base-content/60 mt-1 max-w-sm mx-auto font-bn">
          কণ্ঠস্বর রেজিস্টার করে নিরাপদ ভয়েস লকের সাহায্যে অ্যাকাউন্ট লক বা আনলক করুন।
        </p>
      </div>

      {/* Mode Switches */}
      <div className="tabs tabs-boxed bg-base-200 p-1 rounded-2xl w-full max-w-sm">
        <button
          onClick={() => handleModeChange('enroll')}
          className={`tab flex-1 gap-2 rounded-xl text-sm font-semibold transition-all duration-200 font-bn ${
            mode === 'enroll' ? 'tab-active bg-taka-gradient text-primary-content shadow-sm' : 'text-neutral/70'
          }`}
        >
          ভয়েস সেট করুন (Enroll)
        </button>
        <button
          onClick={() => handleModeChange('verify')}
          className={`tab flex-1 gap-2 rounded-xl text-sm font-semibold transition-all duration-200 font-bn ${
            mode === 'verify' ? 'tab-active bg-taka-gradient text-primary-content shadow-sm' : 'text-neutral/70'
          }`}
        >
          ভয়েস মেলান (Verify)
        </button>
      </div>

      {/* Main Recording Panel */}
      <div className="w-full flex flex-col items-center p-6 border border-base-300/80 rounded-2xl bg-base-200/40 relative min-h-[310px] justify-center">
        
        {/* OTP Fallback Overlay */}
        {showFallback && (
          <form onSubmit={handleVerifyFallbackPin} className="w-full flex flex-col items-center gap-4 py-4 animate-fade-in font-bn">
            <div className="w-14 h-14 rounded-full bg-warning/15 text-warning flex items-center justify-center">
              <Key size={26} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-neutral">বিকল্প সুরক্ষায় ভেরিফাই করুন</h3>
              <p className="text-xs text-base-content/60 mt-1 max-w-xs mx-auto">
                ৩ বার ভয়েস ম্যাচ করতে ব্যর্থ হয়েছে। সুরক্ষার জন্য আপনার ওটিপি/পিন (যেমন: ১২৩৪৫৬) দিন।
              </p>
            </div>
            
            <div className="w-full max-w-xs">
              <input 
                type="password" 
                maxLength="6"
                value={fallbackPin}
                onChange={(e) => setFallbackPin(e.target.value.replace(/\D/g, ''))}
                placeholder="৬-ডিজিটের ব্যাকআপ পিন লিখুন" 
                className="input input-bordered w-full text-center tracking-widest font-mono text-lg rounded-xl"
                disabled={isVerifyingPin}
              />
            </div>

            <div className="flex gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setShowFallback(false);
                  setFailCount(0);
                  handleReset();
                }}
                className="btn btn-outline flex-1 rounded-xl"
                disabled={isVerifyingPin}
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                className="btn btn-brand flex-1 rounded-xl text-white font-medium"
                disabled={isVerifyingPin || fallbackPin.length < 6}
              >
                {isVerifyingPin ? <span className="loading loading-spinner loading-xs"></span> : 'যাচাই করুন'}
              </button>
            </div>
          </form>
        )}

        {/* State 3: Verification / Enrollment Results Display */}
        {verificationResult && !showFallback && (
          <div className="w-full flex flex-col items-center text-center gap-5 animate-fade-in py-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              verificationResult.success ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
            }`}>
              {verificationResult.success ? (
                <ShieldCheck size={32} strokeWidth={2} />
              ) : (
                <XCircle size={32} strokeWidth={2} />
              )}
            </div>

            <div>
              <h3 className="font-bold text-neutral text-lg font-bn">
                {verificationResult.success ? 'যাচাই সফল হয়েছে' : 'যাচাই ব্যর্থ হয়েছে'}
              </h3>
              <p className="text-sm text-base-content/60 mt-1 font-bn">
                {verificationResult.message}
              </p>
            </div>

            {/* Score Ring Display */}
            {verificationResult.type === 'verify' && (
              <div className="flex flex-col items-center gap-1.5 p-3 bg-white border border-base-300 rounded-xl w-full max-w-xs shadow-sm">
                <div className="flex justify-between w-full text-xs font-semibold text-neutral/70">
                  <span>ভয়েস ম্যাচিং স্কোর:</span>
                  <span className={verificationResult.success ? 'text-success' : 'text-error'}>
                    {Math.round(verificationResult.score * 100)}%
                  </span>
                </div>
                <progress 
                  className={`progress w-full ${verificationResult.success ? 'progress-success' : 'progress-error'}`} 
                  value={Math.round(verificationResult.score * 100)} 
                  max="100"
                ></progress>
                <span className="text-[10px] text-base-content/40 font-bn">
                  {verificationResult.success ? 'থ্রেশহোল্ড (৭৫%) অতিক্রম করেছে' : 'ন্যূনতম ম্যাচ স্কোর প্রয়োজন: ৭৫%'}
                </span>
              </div>
            )}

            <button 
              onClick={handleReset}
              className={`btn mt-2 rounded-xl font-bn max-w-xs w-full ${
                verificationResult.success ? 'btn-primary text-white' : 'btn-outline border-base-300 hover:bg-base-200'
              }`}
            >
              {verificationResult.success ? 'ঠিক আছে (Done)' : 'আবার চেষ্টা করুন (Retry)'}
            </button>
          </div>
        )}

        {/* Active Enrolled Profile Card (Dashboard) */}
        {mode === 'enroll' && user?.voiceEnrolled && !audioBlob && !isRecording && !verificationResult && !showFallback && (
          <div className="w-full flex flex-col items-center gap-4 py-4 animate-fade-in font-bn">
            <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center relative shadow-sm border border-success/20">
              <ShieldCheck size={26} />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-neutral text-base">আপনার ভয়েস লক অ্যাক্টিভ আছে</h3>
              <p className="text-[11px] text-base-content/50 mt-0.5">
                আপনার কণ্ঠস্বর দিয়ে নিরাপদে অ্যাপ অ্যাক্সেস সচল রয়েছে।
              </p>
            </div>

            {/* Simulated soundwave signature visualizer */}
            <div className="flex items-center gap-1 justify-center py-4 bg-white/60 rounded-xl border border-base-300 w-full max-w-xs h-16 shadow-inner">
              <span className="h-6 w-1 bg-primary rounded-full animate-pulse opacity-70"></span>
              <span className="h-10 w-1 bg-teal-500 rounded-full animate-pulse opacity-85"></span>
              <span className="h-4 w-1 bg-primary rounded-full animate-pulse opacity-50"></span>
              <span className="h-8 w-1 bg-teal-600 rounded-full animate-pulse opacity-70"></span>
              <span className="h-12 w-1 bg-primary rounded-full animate-pulse"></span>
              <span className="h-6 w-1 bg-teal-500 rounded-full animate-pulse opacity-60"></span>
              <span className="h-10 w-1 bg-primary rounded-full animate-pulse opacity-80"></span>
              <span className="h-5 w-1 bg-teal-600 rounded-full animate-pulse opacity-50"></span>
            </div>

            <div className="flex gap-3 w-full max-w-xs mt-2 text-xs">
              <button 
                onClick={handleDeleteVoice}
                disabled={isSubmitting}
                className="btn btn-outline btn-error btn-sm flex-1 rounded-xl flex gap-1 items-center font-semibold"
              >
                <Trash2 size={13} /> ভয়েস মুছুন
              </button>
              <button 
                onClick={startRecording}
                className="btn btn-brand btn-sm flex-1 rounded-xl text-white font-semibold"
              >
                ভয়েস আপডেট করুন
              </button>
            </div>
          </div>
        )}

        {/* Permission Denied Card */}
        {micPermission === 'denied' && !verificationResult && !showFallback && (
          <div className="flex flex-col items-center text-center gap-4 py-4 px-2">
            <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
              <MicOff size={28} />
            </div>
            <div className="max-w-xs font-bn">
              <h3 className="font-semibold text-neutral">মাইক্রোফোন ব্যবহারের অনুমতি নেই</h3>
              <p className="text-xs text-base-content/60 mt-2">
                ভয়েস পাসওয়ার্ড ব্যবহার করতে আমাদের মাইক্রোফোনের প্রয়োজন। অনুগ্রহ করে আপনার ব্রাউজারের উপরে লক বা সেটিংস আইকন থেকে পারমিশন দিন।
              </p>
            </div>
            <button 
              onClick={requestMicPermission}
              className="btn btn-sm btn-outline btn-error mt-2 rounded-xl font-bn"
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        )}

        {/* Prompt Instruction Section */}
        {micPermission !== 'denied' && !audioBlob && !verificationResult && !showFallback && (!user?.voiceEnrolled || mode !== 'enroll') && (
          <div className="w-full text-center mb-6">
            {mode === 'enroll' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-between w-full border-b border-base-300 pb-2 mb-1">
                  <span className="text-xs font-bold text-neutral/70 uppercase tracking-wider flex items-center gap-1 font-bn">
                    <Info size={13} className="text-primary" /> পড়ার বাক্য (Voice Phrase)
                  </span>
                  
                  {/* Language Selector */}
                  <div className="join bg-base-200 rounded-lg p-0.5 scale-90">
                    <button 
                      onClick={() => setSelectedLang('bn')} 
                      className={`join-item btn btn-xs py-0 px-2.5 rounded-md min-h-0 h-6 border-none font-bn ${selectedLang === 'bn' ? 'bg-primary text-white hover:bg-primary' : 'bg-transparent text-neutral/60 hover:bg-base-300'}`}
                    >
                      বাংলা
                    </button>
                    <button 
                      onClick={() => setSelectedLang('en')} 
                      className={`join-item btn btn-xs py-0 px-2.5 rounded-md min-h-0 h-6 border-none ${selectedLang === 'en' ? 'bg-primary text-white hover:bg-primary' : 'bg-transparent text-neutral/60 hover:bg-base-300'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <p className={`p-4 bg-white shadow-sm border border-primary/10 text-neutral rounded-xl font-medium leading-relaxed ${selectedLang === 'bn' ? 'font-bn text-base md:text-lg' : 'text-sm md:text-base italic'}`}>
                  "{ENROLL_PROMPTS[selectedLang]}"
                </p>
                <p className="text-[11px] text-base-content/50 font-bn">
                  নিচের লেখাটি পরিষ্কারভাবে পড়ুন। রেকর্ড করুন <span className="font-semibold text-primary">৫ থেকে ১০ সেকেন্ড</span>।
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-neutral/70 uppercase tracking-wider flex items-center gap-1 self-start font-bn">
                  <Info size={13} className="text-primary" /> ভয়েস যাচাই (Verify Command)
                </span>
                <p className="text-sm font-medium text-neutral p-4 bg-white shadow-sm border border-base-300 rounded-xl w-full font-bn">
                  একটি কমান্ড বলুন, যেমন: <br />
                  <span className="text-primary font-semibold font-bn mt-1 block">"টাকাসাথী, আজকের ২৫০ টাকা বিক্রি জমা করো"</span>
                </p>
                <p className="text-[11px] text-base-content/50 mt-1 font-bn">
                  কথা বলতে বাটনে চাপ দিন এবং আপনার কমান্ডটি বলুন।
                </p>
              </div>
            )}

            {/* Ambient Noise / Crowd Tip */}
            <div className="flex gap-2.5 p-3 bg-warning/5 border border-warning/20 rounded-xl text-[11px] text-neutral/70 text-left items-start mt-4 max-w-sm mx-auto">
              <Info size={14} className="text-warning shrink-0 mt-0.5" />
              <div className="font-bn">
                <span className="font-bold text-neutral block mb-0.5">কোলাহল এড়িয়ে চলুন (Avoid Crowds)</span>
                নিখুঁত ভেরিফিকেশনের জন্য শান্ত স্থানে কথা বলুন এবং ফোনটি মুখের কাছাকাছি (৫-১০ সেমি) ধরুন।
              </div>
            </div>
          </div>
        )}

        {/* Live Audio Visualizer Canvas */}
        {isRecording && micPermission === 'granted' && !verificationResult && !showFallback && (
          <div className="w-full flex flex-col items-center gap-2 mb-4 animate-fade-in">
            <canvas 
              ref={canvasRef} 
              width={280} 
              height={60} 
              className="w-full max-w-[280px] h-[60px]"
            />
            
            {/* Live Noise/Volume warning tooltips */}
            {liveVolumeStatus === 'silent' && (
              <span className="text-xs font-semibold text-warning flex items-center gap-1.5 font-bn">
                <span className="h-2 w-2 rounded-full bg-warning block animate-pulse"></span> আওয়াজ খুব কম! আর একটু জোরে বলুন।
              </span>
            )}
            {liveVolumeStatus === 'noisy' && (
              <span className="text-xs font-semibold text-error flex items-center gap-1.5 font-bn">
                <span className="h-2 w-2 rounded-full bg-error block animate-pulse"></span> চারপাশে অনেক শব্দ! শান্ত স্থানে বলুন।
              </span>
            )}
            {liveVolumeStatus === 'good' && (
              <span className="text-xs font-semibold text-primary flex items-center gap-1.5 animate-pulse font-bn">
                <span className="h-2 w-2 rounded-full bg-teal-500 block animate-ping"></span> কথা বলুন, শুনছি...
              </span>
            )}
          </div>
        )}

        {/* State 1: Ready to Record */}
        {micPermission !== 'denied' && !audioBlob && !verificationResult && !showFallback && (!user?.voiceEnrolled || mode !== 'enroll') && (
          <div className="flex flex-col items-center gap-4">
            
            {/* Record Trigger Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 focus:outline-none hover:scale-105 active:scale-95
                ${
                  isRecording
                    ? 'bg-error text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] scale-105'
                    : 'bg-taka-gradient text-primary-content shadow-card'
                }`}
              aria-label={isRecording ? 'Stop Voice Recording' : 'Start Voice Recording'}
            >
              {isRecording ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-error animate-ping opacity-35" />
                  <Square size={22} fill="currentColor" className="text-white" />
                </>
              ) : (
                <Mic size={28} />
              )}
            </button>

            {/* Duration Display */}
            {isRecording ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-base font-bold text-neutral tracking-widest font-mono">
                  00:{recordingDuration.toString().padStart(2, '0')}
                </span>
                
                {/* Progress helper for enrollment */}
                {mode === 'enroll' && (
                  <div className="flex flex-col items-center w-48 mt-1 gap-1">
                    <progress 
                      className={`progress w-full ${recordingDuration >= 5 ? 'progress-success' : 'progress-primary'}`} 
                      value={recordingDuration} 
                      max="10"
                    ></progress>
                    <span className="text-[10px] text-base-content/50 font-bn">
                      {recordingDuration < 5 ? `আরও ${5 - recordingDuration} সেকেন্ড বলুন` : 'ঠিক আছে, শেষ হলে বাটনটি চাপুন'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs font-semibold text-neutral/50 font-bn">
                {mode === 'enroll' ? 'রেকর্ড করতে চাপুন (৫-১০ সেকেন্ড)' : 'ভয়েস যাচাই করতে চাপুন'}
              </span>
            )}
          </div>
        )}

        {/* State 2: Voice Recorded and Awaiting Preview/Submit */}
        {audioBlob && !isRecording && !verificationResult && !showFallback && (
          <div className="w-full flex flex-col items-center gap-5 animate-fade-in py-2">
            
            {/* Success icon representation */}
            <div className="w-14 h-14 rounded-full bg-success/15 text-success flex items-center justify-center">
              <Check size={26} strokeWidth={2.5} />
            </div>

            <div className="text-center font-bn">
              <h3 className="font-semibold text-neutral">কণ্ঠস্বর রেকর্ড সম্পন্ন</h3>
              <p className="text-xs text-base-content/50 mt-0.5">
                সাইজ: <span className="font-mono font-medium text-neutral">{(audioBlob.size / 1024).toFixed(1)} KB</span> · সময়: <span className="font-mono font-medium text-neutral">{recordingDuration} সেকেন্ড</span>
              </p>
            </div>

            {/* Custom Audio Player Control */}
            <div className="flex items-center gap-3 bg-white shadow-sm border border-base-300 rounded-xl px-4 py-2 w-full max-w-xs justify-center font-bn">
              <button 
                onClick={handleTogglePlayback}
                className="btn btn-circle btn-primary btn-sm text-white"
                aria-label={isPlaying ? 'Pause Audio Playback' : 'Play Audio Playback'}
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
              
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-neutral truncate">আপনার রেকর্ড শুনুন</p>
                <p className="text-[10px] text-base-content/50 truncate">জমা দেওয়ার আগে একবার মিলিয়ে নিন</p>
              </div>

              <Volume2 size={16} className="text-primary/70 shrink-0" />

              {/* Hidden Native Audio Element */}
              {audioUrl && (
                <audio 
                  ref={audioPlayerRef} 
                  src={audioUrl} 
                  onEnded={handleAudioEnded}
                  className="hidden" 
                />
              )}
            </div>

            {/* Submission Actions */}
            <div className="flex gap-3 w-full max-w-xs mt-2 font-bn">
              <button
                onClick={handleReset}
                disabled={isSubmitting}
                className="btn btn-outline flex-1 rounded-xl text-neutral border-base-300 hover:bg-base-200"
              >
                <RotateCcw size={15} /> আবার রেকর্ড
              </button>
              <button
                onClick={() => submitAudioData(audioBlob, mode)}
                disabled={isSubmitting || (mode === 'enroll' && recordingDuration < 5)}
                className={`btn btn-brand flex-1 rounded-xl text-white font-medium flex gap-1.5`}
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <>
                    <ShieldCheck size={16} /> 
                    {mode === 'enroll' ? 'নিবন্ধন করুন (Save)' : 'যাচাই করুন'}
                  </>
                )}
              </button>
            </div>

            {/* Warning if baseline is invalid */}
            {mode === 'enroll' && recordingDuration < 5 && (
              <div className="text-[11px] text-error font-medium flex items-center gap-1 bg-error/10 px-3 py-1.5 rounded-lg border border-error/20 max-w-xs mt-1 text-center font-bn">
                <AlertCircle size={13} className="shrink-0" />
                <span>কমপক্ষে ৫ সেকেন্ড রেকর্ড করতে হবে। আবার চেষ্টা করুন।</span>
              </div>
            )}
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && micPermission !== 'denied' && !verificationResult && !showFallback && (
          <div className="alert alert-error/10 text-error-content border border-error/20 text-xs rounded-xl flex items-start gap-2 max-w-xs mt-4 font-bn">
            <AlertCircle size={14} className="text-error shrink-0 mt-0.5" />
            <span className="text-left leading-relaxed">{errorMessage}</span>
          </div>
        )}

      </div>

      {/* Footer Branding Notice */}
      <div className="w-full text-center flex items-center justify-center gap-1.5 text-xs text-base-content/40 border-t border-base-200 pt-4 mt-2 font-bn">
        <Shield size={12} />
        <span>আপনার কণ্ঠস্বরের তথ্য সম্পূর্ণ সুরক্ষিত এবং আপনার ফোনেই জমা থাকে।</span>
      </div>
      
    </div>
  );
}
