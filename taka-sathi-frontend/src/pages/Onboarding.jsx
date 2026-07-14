import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Wallet, Languages } from 'lucide-react';
import useAuth from '../context/useAuth.js';
import useToast from '../context/useToast.js';
import { BUSINESS_TYPE_LABELS } from '../lib/format';

const BUSINESS_TYPES = Object.keys(BUSINESS_TYPE_LABELS);

export default function Onboarding() {
  const { updateProfile, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    businessType: 'vendor',
    businessStartDate: '',
    district: '',
    area: '',
    language: 'bn',
  });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        name: form.name,
        businessName: form.businessName,
        businessType: form.businessType,
        businessStartDate: form.businessStartDate || undefined,
        location: { district: form.district, area: form.area },
        language: form.language,
      });
      toast.success('Profile saved — welcome to TakaSathi!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="rounded-2xl bg-taka-gradient p-3 shadow-card mb-3">
            <Wallet size={24} className="text-primary-content" />
          </div>
          <h1 className="font-display text-xl font-bold text-neutral">Tell us about your business</h1>
          <p className="text-sm text-base-content/50 mt-1 text-center">
            Hi {user?.phoneNumber} — this helps us tailor your financial summaries and loan matches.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface p-6 sm:p-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="form-control w-full">
              <span className="label-text text-xs font-medium text-base-content/60 mb-1">Your name</span>
              <input
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Rahima Begum"
                className="input input-bordered w-full"
                required
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text text-xs font-medium text-base-content/60 mb-1">Business name</span>
              <input
                type="text"
                value={form.businessName}
                onChange={update('businessName')}
                placeholder="Rahima's Vegetable Cart"
                className="input input-bordered w-full"
                required
              />
            </label>
          </div>

          <label className="form-control w-full">
            <span className="label-text text-xs font-medium text-base-content/60 mb-1">Business type</span>
            <select
              value={form.businessType}
              onChange={update('businessType')}
              className="select select-bordered w-full"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BUSINESS_TYPE_LABELS[t].en} · {BUSINESS_TYPE_LABELS[t].bn}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="label-text text-xs font-medium text-base-content/60 mb-1">
              Business start date (optional)
            </span>
            <input
              type="date"
              value={form.businessStartDate}
              onChange={update('businessStartDate')}
              className="input input-bordered w-full"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="form-control w-full">
              <span className="label-text text-xs font-medium text-base-content/60 mb-1">District</span>
              <input
                type="text"
                value={form.district}
                onChange={update('district')}
                placeholder="Dhaka"
                className="input input-bordered w-full"
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text text-xs font-medium text-base-content/60 mb-1">Area</span>
              <input
                type="text"
                value={form.area}
                onChange={update('area')}
                placeholder="Kafrul"
                className="input input-bordered w-full"
              />
            </label>
          </div>

          <label className="form-control w-full">
            <span className="label-text text-xs font-medium text-base-content/60 mb-1 flex items-center gap-1.5">
              <Languages size={13} /> Preferred language for AI summaries
            </span>
            <div className="join w-full">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, language: 'bn' }))}
                className={`join-item btn flex-1 ${form.language === 'bn' ? 'btn-primary' : 'btn-ghost bg-base-200'}`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, language: 'en' }))}
                className={`join-item btn flex-1 ${form.language === 'en' ? 'btn-primary' : 'btn-ghost bg-base-200'}`}
              >
                English
              </button>
            </div>
          </label>

          <button type="submit" disabled={loading} className="btn-brand btn w-full gap-2 mt-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Save & continue
          </button>
        </form>
      </div>
    </div>
  );
}
