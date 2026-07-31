import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import useAuth from '../../context/useAuth.js';
import VoiceAuthenticator from '../ui/VoiceAuthenticator.jsx';
import Loader from '../ui/Loader.jsx';

export default function VoiceLockGate() {
  const { user, loading, logout } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (loading) {
    return <Loader fullscreen label="Checking security access…" />;
  }

  // If user is authenticated, has voice security enrolled, and hasn't unlocked yet
  if (user && user.voiceEnrolled && !isUnlocked) {
    const handleUnlockSuccess = () => {
      setIsUnlocked(true);
    };

    return (
      <div className="min-h-screen bg-taka-gradient flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

        {/* Top bar with logout */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={logout}
            className="btn btn-ghost btn-sm text-white/80 hover:text-white hover:bg-white/10 gap-1.5 rounded-xl font-bn"
          >
            <LogOut size={15} /> লগআউট করুন
          </button>
        </div>

        {/* Lock Screen content */}
        <div className="w-full max-w-lg z-10 animate-fade-in-up">
          <div className="flex flex-col items-center mb-6">
            <div className="rounded-2xl bg-white/10 p-3.5 text-white shadow-card mb-3 animate-pulse">
              <ShieldAlert size={32} />
            </div>
            <h1 className="text-xl font-bold text-white font-bn">টাকা-সাথী ভয়েস লক</h1>
            <p className="text-xs text-white/70 mt-1 font-bn">অ্যাপটি ব্যবহার করতে আপনার কণ্ঠস্বর ভেরিফাই করুন</p>
          </div>

          <div className="glass-card shadow-xl overflow-hidden rounded-3xl">
            <VoiceAuthenticator 
              isLockScreen={true} 
              onVerificationSuccess={handleUnlockSuccess} 
            />
          </div>
        </div>
      </div>
    );
  }

  // Render child routes if unlocked or voice security is not set up yet
  return <Outlet />;
}
