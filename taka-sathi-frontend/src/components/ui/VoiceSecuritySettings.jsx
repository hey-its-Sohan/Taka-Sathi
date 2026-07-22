import { useState, useRef, useEffect } from 'react';
import { 
  Users, Mic, Square, Trash2, Shield, UserCheck, Play, Pause, 
  RotateCcw, Info, Volume2, PlusCircle, CheckCircle2, ShieldAlert
} from 'lucide-react';
import useToast from '../../context/useToast.js';
import useAuth from '../../context/useAuth.js';
import { voiceApi } from '../../lib/api';

export default function VoiceSecuritySettings() {
  const toast = useToast();
  const { user, refreshUser } = useAuth();

  // Settings states
  const [isSafeVoiceEnabled, setIsSafeVoiceEnabled] = useState(user?.isSafeVoiceEnabled || false);
  const [activeVoiceProfileId, setActiveVoiceProfileId] = useState(user?.activeVoiceProfileId || null);

  // Profile creation states
  const [isAdding, setIsAdding] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [liveVolumeStatus, setLiveVolumeStatus] = useState('good');
  const [errorMessage, setErrorMessage] = useState('');

  // Refs for recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Canvas visualizer refs
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Sync states with user context updates
  useEffect(() => {
    if (user) {
      setIsSafeVoiceEnabled(user.isSafeVoiceEnabled || false);
      setActiveVoiceProfileId(user.activeVoiceProfileId || null);
    }
  }, [user]);

  // Audio tone generator
  const playSynthBeep = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'start') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Synth beep failed:', e);
    }
  };

  // Safe toggler updates
  const handleToggleSettings = async (enabledState, activeProfileId) => {
    try {
      const res = await voiceApi.updateSettings(enabledState, activeProfileId);
      toast.success(res?.message || 'সেটিংস সফলভাবে সেভ করা হয়েছে।');
      refreshUser();
    } catch (err) {
      toast.error(err.message || 'সেটিংস আপডেট করা যায়নি।');
    }
  };

  // Start recording voice profile print
  const startRecording = async () => {
    if (!staffName.trim()) {
      toast.error('অনুগ্রহ করে আগে স্টাফ এর নাম লিখুন।');
      return;
    }

    playSynthBeep('start');
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingDuration(0);
    setErrorMessage('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        if (recordingDuration < 5) {
          setErrorMessage('অন্তত ৫ সেকেন্ড রেকর্ড করা প্রয়োজন। অনুগ্রহ করে নতুন করে রেকর্ড করুন।');
          playSynthBeep('error');
        }
      };

      setupVisualizer(stream);
      mediaRecorder.start(100);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const nextVal = prev + 1;
          if (nextVal >= 10) {
            stopRecording();
            toast.success('সর্বোচ্চ সীমা (১০ সেকেন্ড) রেকর্ড সম্পন্ন হয়েছে।');
            return 10;
          }
          return nextVal;
        });
      }, 1000);
    } catch (err) {
      setErrorMessage(`মাইক্রোফোন চালু করা যায়নি: ${err.message}`);
      toast.error('মাইক্রোফোন ব্যবহারের পারমিশন দিন।');
    }
  };

  // Stop recording
  const stopRecording = () => {
    playSynthBeep('start');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    cleanupVisualizer();
  };

  // RMS level audio visualizer
  const setupVisualizer = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;

        if (avg < 8) {
          setLiveVolumeStatus('silent');
        } else if (avg > 95) {
          setLiveVolumeStatus('noisy');
        } else {
          setLiveVolumeStatus('good');
        }

        ctx.clearRect(0, 0, width, height);

        const barCount = 28;
        const spacing = 3;
        const barWidth = (width - spacing * barCount) / barCount;

        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (bufferLength / 2));
          const value = dataArray[index] || 0;
          const pct = value / 255;
          const barHeight = Math.max(4, pct * height * 0.8);
          const x = i * (barWidth + spacing) + spacing / 2;
          const y = (height - barHeight) / 2;

          ctx.fillStyle = '#0F766E'; // teal-700
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, barHeight, 3);
            ctx.fill();
          } else {
            ctx.rect(x, y, barWidth, barHeight);
            ctx.fill();
          }
        }
      };
      draw();
    } catch (e) {
      console.warn('Canvas visualizer setup failed:', e);
    }
  };

  const cleanupVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  // Convert audio blob to base64
  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Save new voice profile
  const handleSaveProfile = async () => {
    if (!audioBlob || recordingDuration < 5) return;
    setIsSaving(true);

    try {
      const base64Data = await convertBlobToBase64(audioBlob);
      await voiceApi.enrollProfile(staffName, base64Data, recordingDuration, audioBlob.type);
      
      toast.success('নতুন স্টাফ ভয়েস প্রোফাইল যুক্ত করা হয়েছে!');
      playSynthBeep('success');
      
      // Reset form states
      setStaffName('');
      setAudioBlob(null);
      setAudioUrl(null);
      setIsAdding(false);
      
      refreshUser();
    } catch (err) {
      toast.error(err.message || 'সেভ করতে ব্যর্থ হয়েছে।');
      playSynthBeep('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete profile
  const handleDeleteProfile = async (id, name) => {
    if (!window.confirm(`আপনি কি ${name} এর ভয়েস প্রোফাইল মুছে ফেলতে চান?`)) return;

    try {
      await voiceApi.deleteProfile(id);
      toast.success(`${name} এর প্রোফাইল মুছে ফেলা হয়েছে!`);
      playSynthBeep('success');
      refreshUser();
    } catch (err) {
      toast.error(err.message || 'মুছে ফেলতে ব্যর্থ হয়েছে।');
      playSynthBeep('error');
    }
  };

  const handleResetRecord = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    setErrorMessage('');
    audioChunksRef.current = [];
  };

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

  return (
    <div className="card-surface p-6 md:p-8 flex flex-col gap-6 max-w-xl mx-auto font-bn">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-base-200 pb-4">
        <div className="rounded-xl bg-teal-500/10 text-teal-600 p-2.5">
          <Users size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral leading-tight">শিফট ভিত্তিক ভয়েস নিরাপত্তা</h2>
          <p className="text-xs text-base-content/50 mt-0.5">দোকানের অন্য কোনো স্টাফকে ভয়েস রেকর্ড এন্ট্রি দেওয়ার অনুমতি দিন।</p>
        </div>
      </div>

      {/* Main Settings Toggles */}
      <div className="bg-base-200/50 rounded-2xl p-4 border border-base-300 flex flex-col gap-4">
        
        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-neutral flex items-center gap-1.5">
              <Shield size={16} className="text-teal-600" /> শিফট নিরাপদ ভয়েস মোড
            </span>
            <span className="text-[11px] text-base-content/50">
              অন থাকলে শুধুমাত্র "সক্রিয় স্টাফ" ই ভয়েসে এন্ট্রি দিতে পারবে।
            </span>
          </div>
          <input 
            type="checkbox" 
            className="toggle toggle-teal" 
            checked={isSafeVoiceEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked && (!user?.voiceProfiles || user.voiceProfiles.length === 0)) {
                toast.error('আগে কমপক্ষে ১টি স্টাফ ভয়েস প্রোফাইল যুক্ত করুন।');
                return;
              }
              setIsSafeVoiceEnabled(checked);
              handleToggleSettings(checked, activeVoiceProfileId);
            }}
          />
        </div>

        {/* Dropdown selectors for active staff */}
        {isSafeVoiceEnabled && user?.voiceProfiles && user.voiceProfiles.length > 0 && (
          <div className="border-t border-base-300 pt-3 flex flex-col gap-2">
            <label className="text-xs font-bold text-neutral/70">কাউন্টারে এখন কে আছেন? (সক্রিয় স্টাফ নির্বাচন):</label>
            <div className="grid grid-cols-1 gap-2 mt-1">
              {user.voiceProfiles.map((p) => (
                <label 
                  key={p.voiceProfileId} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer text-sm font-semibold
                    ${
                      activeVoiceProfileId === p.voiceProfileId
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-700'
                        : 'bg-white border-base-300 text-neutral hover:bg-base-200/30'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="activeStaffRadio" 
                      className="radio radio-primary radio-xs"
                      checked={activeVoiceProfileId === p.voiceProfileId}
                      onChange={() => {
                        setActiveVoiceProfileId(p.voiceProfileId);
                        handleToggleSettings(isSafeVoiceEnabled, p.voiceProfileId);
                      }}
                    />
                    <span>{p.name}</span>
                  </div>
                  {activeVoiceProfileId === p.voiceProfileId && (
                    <span className="badge badge-success text-[10px] text-white px-2 py-0.5 rounded-md font-bold flex gap-0.5 items-center">
                      <UserCheck size={10} /> সক্রিয়
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Staff Profiles List */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-bold text-neutral/70 flex items-center gap-1.5">
            <Users size={14} /> স্টাফ ভয়েস প্রোফাইল সমূহ ({user?.voiceProfiles?.length || 0}/৩)
          </span>
          
          {!isAdding && (!user?.voiceProfiles || user.voiceProfiles.length < 3) && (
            <button 
              onClick={() => setIsAdding(true)}
              className="btn btn-xs btn-outline btn-brand flex gap-1 items-center font-bold"
            >
              <PlusCircle size={12} /> নতুন স্টাফ যুক্ত
            </button>
          )}
        </div>

        {/* Enrollment Add Interface */}
        {isAdding && (
          <div className="border border-teal-500/20 bg-teal-50/20 rounded-2xl p-5 mb-4 animate-fade-in flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-base-200 pb-2">
              <span className="font-bold text-neutral text-sm">নতুন ভয়েস রেজিস্টার</span>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  handleResetRecord();
                }}
                className="btn btn-ghost btn-xs text-neutral/50 font-bold"
              >
                বাতিল
              </button>
            </div>

            {/* Name Input */}
            <div className="form-control w-full">
              <label className="label py-1 text-xs font-semibold text-neutral">স্টাফের আসল নাম (Real Name):</label>
              <input 
                type="text" 
                placeholder="যেমন: মোঃ কামরুল ইসলাম, আশিকুর রহমান" 
                className="input input-bordered input-sm rounded-xl text-neutral font-medium"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                disabled={isRecording || isSaving}
              />
            </div>

            {/* Record sentence prompt */}
            <div className="p-3.5 bg-white border border-base-300 rounded-xl text-sm leading-relaxed text-center font-semibold text-neutral shadow-sm">
              "টাকাসাথী অ্যাপে আমার কণ্ঠস্বর নিরাপত্তা নিশ্চিত করছে এবং লেনদেন নিরাপদ রাখছে।"
            </div>
            <p className="text-[10px] text-base-content/50 text-center">
              উপরের লেখাটি পরিষ্কারভাবে পড়ার জন্য রেকর্ড বোতামে চাপ দিন (কমপক্ষে ৫ সেকেন্ড)।
            </p>

            {/* Canvas Visualizer / Volume tips */}
            {isRecording && (
              <div className="flex flex-col items-center gap-1.5">
                <canvas ref={canvasRef} width={280} height={40} className="w-full max-w-[280px] h-[40px]" />
                {liveVolumeStatus === 'silent' && (
                  <span className="text-[10px] font-bold text-warning">আওয়াজ খুব কম! আর একটু জোরে বলুন।</span>
                )}
                {liveVolumeStatus === 'noisy' && (
                  <span className="text-[10px] font-bold text-error">চারপাশে অনেক শব্দ! একটু নিরিবিলিতে বলুন।</span>
                )}
                {liveVolumeStatus === 'good' && (
                  <span className="text-[10px] font-bold text-teal-600 animate-pulse">রেকর্ড হচ্ছে, স্পষ্ট করে কথা বলুন...</span>
                )}
              </div>
            )}

            {/* Record button trigger */}
            {!audioBlob && (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!staffName.trim() || isSaving}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95
                    ${
                      isRecording 
                        ? 'bg-error text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] scale-105' 
                        : 'bg-teal-500 text-white shadow-md disabled:opacity-40'
                    }`}
                >
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
                </button>
                <span className="text-[10px] font-semibold text-base-content/40">
                  {isRecording ? `রেকর্ডিং: 00:${recordingDuration.toString().padStart(2, '0')}` : 'কথা বলতে বোতামে চাপুন'}
                </span>
              </div>
            )}

            {/* Playback preview & Save actions */}
            {audioBlob && !isRecording && (
              <div className="flex flex-col items-center gap-4 py-1 animate-fade-in">
                <div className="flex items-center gap-3 bg-white border border-base-300 rounded-xl px-4 py-2 w-full max-w-xs justify-between shadow-sm">
                  <button 
                    onClick={handleTogglePlayback}
                    className="btn btn-circle btn-primary btn-xs text-white"
                  >
                    {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <div className="flex-1 text-left ml-2 text-xs">
                    <p className="font-bold text-neutral">রেকর্ড শুনুন ({recordingDuration} সেকেন্ড)</p>
                  </div>
                  <Volume2 size={14} className="text-primary/70" />
                  {audioUrl && (
                    <audio 
                      ref={audioPlayerRef} 
                      src={audioUrl} 
                      onEnded={() => setIsPlaying(false)}
                      className="hidden" 
                    />
                  )}
                </div>

                {errorMessage && (
                  <div className="text-[11px] text-error font-semibold flex items-center gap-1 bg-error/10 px-3 py-1.5 rounded-lg border border-error/10">
                    <ShieldAlert size={12} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex gap-2.5 w-full max-w-xs text-xs font-semibold">
                  <button 
                    onClick={handleResetRecord}
                    disabled={isSaving}
                    className="btn btn-outline btn-sm flex-1 rounded-xl"
                  >
                    <RotateCcw size={12} /> আবার রেকর্ড
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving || recordingDuration < 5}
                    className="btn btn-brand btn-sm flex-1 rounded-xl text-white flex gap-1 items-center"
                  >
                    {isSaving ? <span className="loading loading-spinner loading-xs"></span> : <><CheckCircle2 size={13} /> সেভ করুন</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing staff profiles list layout */}
        {!user?.voiceProfiles || user.voiceProfiles.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-base-300 rounded-2xl bg-base-200/10 text-base-content/40 text-xs">
            কোনো স্টাফ ভয়েস প্রোফাইল যুক্ত করা নেই। উপরে বোতামে চাপ দিয়ে নতুন প্রোফাইল তৈরি করুন।
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {user.voiceProfiles.map((profile) => (
              <div 
                key={profile.voiceProfileId} 
                className="flex items-center justify-between p-4 bg-white border border-base-300 rounded-xl shadow-sm hover:shadow transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-sm">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral text-sm">{profile.name}</h4>
                    <p className="text-[10px] text-base-content/40 mt-0.5">
                      নিবন্ধিত: {new Date(profile.enrolledAt).toLocaleDateString('bn-BD')} · সময়: {profile.duration || 5} সে.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeVoiceProfileId === profile.voiceProfileId && (
                    <span className="badge badge-success text-[10px] text-white px-2.5 py-1 rounded-md font-bold flex gap-0.5 items-center">
                      <UserCheck size={11} /> সক্রিয়
                    </span>
                  )}
                  <button 
                    onClick={() => handleDeleteProfile(profile.voiceProfileId, profile.name)}
                    className="btn btn-ghost btn-circle btn-sm text-error/60 hover:text-error hover:bg-error/10"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Warning Tip */}
      <div className="flex gap-2.5 p-3.5 bg-warning/5 border border-warning/10 rounded-2xl text-[11px] leading-relaxed text-neutral/70 items-start">
        <Info size={15} className="text-warning shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-neutral block mb-0.5">গুরুত্বপূর্ণ নিরাপত্তা নির্দেশিকা:</span>
          শিফট ভয়েস মোড অন থাকলে যখনই নতুন কেউ ক্যাশ কাউন্টারে বসবেন, অবশ্যই তাকে "সক্রিয় স্টাফ" হিসেবে নির্বাচন করুন। নতুবা সুরক্ষার খাতিরে তাদের কণ্ঠস্বরের লেনদেনগুলো অ্যাপ রিজেক্ট করে দেবে।
        </div>
      </div>
      
    </div>
  );
}
