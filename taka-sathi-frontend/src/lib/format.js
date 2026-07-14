export const formatTaka = (amount = 0) => {
  const rounded = Math.round(amount);
  return `৳${rounded.toLocaleString('en-BD')}`;
};

export const formatDate = (date, opts = {}) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: opts.year === false ? undefined : 'numeric',
  });

export const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const CATEGORY_LABELS = {
  sales: { en: 'Sales', bn: 'বিক্রয়' },
  inventory: { en: 'Inventory', bn: 'মালামাল' },
  rent: { en: 'Rent', bn: 'ভাড়া' },
  transport: { en: 'Transport', bn: 'যাতায়াত' },
  utilities: { en: 'Utilities', bn: 'বিদ্যুৎ/পানি' },
  wages: { en: 'Wages', bn: 'মজুরি' },
  loan_repayment: { en: 'Loan repayment', bn: 'ঋণ পরিশোধ' },
  personal: { en: 'Personal', bn: 'ব্যক্তিগত' },
  other: { en: 'Other', bn: 'অন্যান্য' },
};

export const BUSINESS_TYPE_LABELS = {
  vendor: { en: 'Street Vendor', bn: 'ভ্রাম্যমাণ বিক্রেতা' },
  retail: { en: 'Retail Shop', bn: 'খুচরা দোকান' },
  small_manufacturing: { en: 'Small Manufacturing', bn: 'ক্ষুদ্র উৎপাদন' },
  service: { en: 'Service Business', bn: 'সেবা ব্যবসা' },
  home_based: { en: 'Home-based Business', bn: 'বাড়িভিত্তিক ব্যবসা' },
  other: { en: 'Other', bn: 'অন্যান্য' },
};

export const categoryLabel = (category, lang = 'en') =>
  CATEGORY_LABELS[category]?.[lang] || category;

export const businessTypeLabel = (type, lang = 'en') =>
  BUSINESS_TYPE_LABELS[type]?.[lang] || type;
