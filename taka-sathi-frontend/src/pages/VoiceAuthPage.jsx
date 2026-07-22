import { useState } from 'react';
import AppShell from '../components/layout/AppShell.jsx';
import VoiceAuthenticator from '../components/ui/VoiceAuthenticator.jsx';
import VoiceSecuritySettings from '../components/ui/VoiceSecuritySettings.jsx';
import { Lock, Users, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function VoiceAuthPage() {
  const [activeTab, setActiveTab] = useState('lock');

  return (
    <AppShell title="Avoid Crowds">
      <div className="py-4 flex flex-col gap-6 font-bn">
        
        {/* Avoid Crowds Security Header Banner */}
        <div className="card-surface p-5 bg-teal-700 text-white rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-card">
          <div className="rounded-xl bg-white/10 p-3 text-white">
            <ShieldAlert size={28} />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-lg font-bold">কোলাহল এড়িয়ে চলুন (Avoid Crowds)</h2>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              বাজারের ব্যস্ত ও কোলাহলপূর্ণ পরিবেশে অন্য কারো কন্ঠস্বর থেকে লেনদেন সুরক্ষিত রাখতে ভয়েস লক এবং শিফট বাইপাস সক্রিয় করুন।
            </p>
          </div>
        </div>

        {/* Navigation tabs inside Avoid Crowds */}
        <div className="tabs tabs-boxed bg-base-200 p-1 rounded-2xl w-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('lock')}
            className={`tab flex-1 gap-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'lock' ? 'tab-active bg-taka-gradient text-primary-content shadow-sm' : 'text-neutral/70'
            }`}
          >
            <Lock size={14} /> ভয়েস লক (Voice Lock)
          </button>
          <button
            onClick={() => setActiveTab('shift')}
            className={`tab flex-1 gap-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'shift' ? 'tab-active bg-taka-gradient text-primary-content shadow-sm' : 'text-neutral/70'
            }`}
          >
            <Users size={14} /> শিফট নিরাপত্তা (Shift Security)
          </button>
        </div>

        {/* Tab content panel */}
        <div className="w-full">
          {activeTab === 'lock' ? (
            <VoiceAuthenticator />
          ) : (
            <VoiceSecuritySettings />
          )}
        </div>
      </div>
    </AppShell>
  );
}
