import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, ShieldCheck, Loader2, ArrowLeft, Wallet } from 'lucide-react';
import useAuth from '../context/useAuth.js';
import useToast from '../context/useToast.js';

export default function Login() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState('+8801');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestOtp, verifyOtp, isProfileComplete } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestOtp(phoneNumber);
      toast.success('OTP sent — check server logs in demo mode (code: 123456)');
      setStep('otp');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(phoneNumber, otp);
      const redirectTo = location.state?.from?.pathname;
      navigate(redirectTo && redirectTo !== '/onboarding' ? redirectTo : (isProfileComplete ? '/dashboard' : '/onboarding'), {
        replace: true,
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-taka-gradient flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-2xl bg-gold-gradient p-3 shadow-card mb-4">
            <Wallet size={28} className="text-secondary-content" strokeWidth={2.25} />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">TakaSathi</h1>
          <p className="font-bn text-white/70 text-sm mt-1">আপনার ব্যবসার আর্থিক সাথী</p>
        </div>

        <div className="card-surface p-6 sm:p-8">
          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <h2 className="font-display font-semibold text-lg text-neutral">Log in or sign up</h2>
                <p className="text-sm text-base-content/50 mt-1">
                  Enter your phone number — we'll send a one-time code.
                </p>
              </div>
              <label className="form-control w-full">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Phone number</span>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+8801XXXXXXXXX"
                    className="input input-bordered w-full pl-10"
                    required
                  />
                </div>
              </label>
              <button type="submit" disabled={loading} className="btn-brand btn w-full gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                Send OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="flex items-center gap-1.5 text-sm text-base-content/50 hover:text-neutral"
              >
                <ArrowLeft size={14} /> Change number
              </button>
              <div>
                <h2 className="font-display font-semibold text-lg text-neutral">Enter the code</h2>
                <p className="text-sm text-base-content/50 mt-1">Sent to {phoneNumber}</p>
              </div>
              <label className="form-control w-full">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">
                  6-digit OTP
                </span>
                <div className="relative">
                  <ShieldCheck
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="input input-bordered w-full pl-10 tracking-[0.3em] font-display font-semibold"
                    required
                  />
                </div>
              </label>
              <button type="submit" disabled={loading} className="btn-brand btn w-full gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                Verify & continue
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
