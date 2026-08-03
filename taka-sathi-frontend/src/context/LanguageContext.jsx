import { createContext, useCallback, useState, useEffect } from 'react';

export const LanguageContext = createContext(null);

export const TRANSLATIONS = {
  // Navigation / AppShell
  'Dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  'Log Entry': { en: 'Log Entry', bn: 'লেনদেন এন্ট্রি' },
  'History': { en: 'History', bn: 'লেনদেনের ইতিহাস' },
  'Loan Eligibility': { en: 'Loan Eligibility', bn: 'ঋণ যোগ্যতা' },
  'Avoid Crowds': { en: 'Avoid Crowds', bn: 'কোলাহল এড়ান' },
  'Log out': { en: 'Log out', bn: 'লগ আউট' },
  'Hi': { en: 'Hi', bn: 'হ্যালো' },
  'Loading your dashboard…': { en: 'Loading your dashboard…', bn: 'ড্যাশবোর্ড লোড হচ্ছে…' },
  
  // Dashboard
  'Financial Health Score': { en: 'Financial Health Score', bn: 'আর্থিক স্বাস্থ্য স্কোর' },
  'Income': { en: 'Income', bn: 'মোট আয়' },
  'Expense': { en: 'Expense', bn: 'মোট ব্যয়' },
  'Net Profit': { en: 'Net Profit', bn: 'নিট লাভ' },
  '7-Day Cash-Flow Forecast': { en: '7-Day Cash-Flow Forecast', bn: '৭ দিনের ক্যাশ-ফ্লো পূর্বাভাস' },
  'Recent Activity': { en: 'Recent Activity', bn: 'সাম্প্রতিক লেনদেন' },
  'View all': { en: 'View all', bn: 'সব দেখুন' },
  'Top Expense Categories': { en: 'Top Expense Categories', bn: 'শীর্ষ ব্যয় ক্যাটাগরি' },
  'Check loan eligibility': { en: 'Check loan eligibility', bn: 'ঋণ যোগ্যতা যাচাই করুন' },
  'See which lenders you qualify for': { en: 'See which lenders you qualify for', bn: 'কোন কোন ঋণ পাওয়ার যোগ্য তা দেখুন' },
  'No transactions logged yet': { en: 'No transactions logged yet', bn: 'কোনো লেনদেন এন্ট্রি করা হয়নি' },
  'Start by logging your first sale or expense — by voice or a quick form.': { en: 'Start by logging your first sale or expense — by voice or a quick form.', bn: 'ভয়েস বা ফর্মের মাধ্যমে আপনার প্রথম আয় বা ব্যয় এন্ট্রি করুন।' },
  'Log your first entry': { en: 'Log your first entry', bn: 'প্রথম লেনদেন এন্ট্রি করুন' },
  'Refresh your Gemma 4 financial summary': { en: 'Refresh your Gemma 4 financial summary', bn: 'Gemma 4 আর্থিক সারসংক্ষেপ রিফ্রেশ করুন' },
  'Recomputes your health score, forecast, and plain-Bangla explanation from the latest data.': { en: 'Recomputes your health score, forecast, and plain-Bangla explanation from the latest data.', bn: 'স্বাস্থ্য স্কোর, পূর্বাভাস এবং ব্যাখ্যা নতুন তথ্য অনুসারে রিফ্রেশ করুন।' },
  'Generate summary': { en: 'Generate summary', bn: 'সারসংক্ষেপ তৈরি করুন' },
  'Cash-flow warning': { en: 'Cash-flow warning', bn: 'ক্যাশ-ফ্লো সতর্কবার্তা' },
  
  // Log Entry
  'Voice': { en: 'Voice', bn: 'ভয়েস' },
  'Manual': { en: 'Manual', bn: 'ম্যানুয়াল' },
  'Gemma 4 is structuring your entry…': { en: 'Gemma 4 is structuring your entry…', bn: 'Gemma 4 আপনার এন্ট্রি সাজাচ্ছে…' },
  'Transaction saved — parsed by Gemma 4': { en: 'Transaction saved — parsed by Gemma 4', bn: 'লেনদেন সংরক্ষিত হয়েছে — Gemma 4 দ্বারা পার্সড' },
  'Transaction saved': { en: 'Transaction saved', bn: 'লেনদেন সংরক্ষিত হয়েছে' },
  'Transaction deleted': { en: 'Transaction deleted', bn: 'লেনদেন মুছে ফেলা হয়েছে' },
  'Delete Entry': { en: 'Delete Entry', bn: 'এন্ট্রি মুছুন' },
  
  // Voice Input original Bangla keys translation
  'শুনছি… কথা বলুন': { en: 'Listening... Speak now', bn: 'শুনছি… কথা বলুন' },
  'আজকের বিক্রি বা খরচ বলুন': { en: "Say today's sale or expense", bn: 'আজকের বিক্রি বা খরচ বলুন' },
  'Avoid Crowd Mode ON': { en: 'Avoid Crowd Mode ON', bn: 'নিরাপদ শিফট মোড অন' },
  'Standard Mode (anyone can command)': { en: 'Standard Mode (anyone can command)', bn: 'স্ট্যান্ডার্ড মোড (যে কেউ কমান্ড দিতে পারবেন)' },
  "দোকানে কি ভিড় বেড়েছে? সঠিক হিসাব রাখতে 'Avoid Crowd Mode' চালু করুন।": {
    en: "Has the crowd increased? Turn on 'Avoid Crowd Mode' to keep transactions accurate.",
    bn: "দোকানে কি ভিড় বেড়েছে? সঠিক হিসাব রাখতে 'Avoid Crowd Mode' চালু করুন।"
  },
  'Turn ON': { en: 'Turn ON', bn: 'চালু করুন' },
  'আগে কমপক্ষে ১টি স্টাফ ভয়েস প্রোফাইল যুক্ত করুন।': {
    en: 'Please add at least one staff voice profile first.',
    bn: 'আগে কমপক্ষে ১টি স্টাফ ভয়েস প্রোফাইল যুক্ত করুন।'
  },
  'শিফট নিরাপদ ভয়েস মোড (Avoid Crowd Mode) চালু করা হয়েছে।': {
    en: 'Shift Safe Voice Mode (Avoid Crowd Mode) has been activated.',
    bn: 'শিফট নিরাপদ ভয়েস মোড (Avoid Crowd Mode) চালু করা হয়েছে।'
  },
  'সেটিংস আপডেট করা যায়নি।': {
    en: 'Could not update settings.',
    bn: 'সেটিংস আপডেট করা যায়নি।'
  },
};

export default function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('taka_sathi_language') || 'default';
  });

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    localStorage.setItem('taka_sathi_language', lang);
  }, []);

  const t = useCallback((key) => {
    if (!key) return '';
    if (language === 'default') return key;
    return TRANSLATIONS[key]?.[language] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
