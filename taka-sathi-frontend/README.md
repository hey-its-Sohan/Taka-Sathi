# TakaSathi — Frontend

React + Vite + Tailwind CSS + daisyUI + lucide-react. Connects directly to the
`taka-sathi-backend` API.

## Setup

```bash
cd taka-sathi-frontend
npm install
cp .env.example .env
# edit .env if your backend isn't on http://localhost:5000
npm run dev
```

App runs at `http://localhost:5173`. Make sure `taka-sathi-backend` is running
(and seeded — `npm run seed` in the backend) before logging in.

## Demo login flow

1. Enter any phone number in the format `+8801XXXXXXXXX`.
2. In backend demo mode (`OTP_DEMO_MODE=true`), the OTP is always **123456**
   — check the backend server console log if you want to confirm.
3. First-time users land on Onboarding to set business profile; returning
   users go straight to the Dashboard.

## Structure

```
src/
├── components/
│   ├── layout/        # AppShell (sidebar+topbar), ProtectedRoute
│   └── ui/             # HealthScoreGauge, CashflowChart, LoanMatchCard,
│                        # VoiceInput, TransactionForm, TransactionItem, etc.
├── context/            # AuthContext (session/JWT), ToastContext (notifications)
├── lib/                # api.js (axios client matching backend routes), format.js
├── pages/               # Login, Onboarding, Dashboard, LogEntry, History, LoanEligibility
├── App.jsx              # route definitions
└── main.jsx              # entry point
```

## Design system

Custom daisyUI theme `takasathi` (see `tailwind.config.js`): deep teal
(`#0F766E`) + warm gold (`#D4A017`) — evokes trust/stability and Taka/
prosperity rather than a generic SaaS palette. Display type is **Sora**, body
is **Inter**, and **Noto Sans Bengali** is loaded throughout since the app's
AI-generated content is Bangla-first (`.font-bn` utility forces the Bengali
stack anywhere Latin text surrounds it).

The **HealthScoreGauge** (coin-style circular dial, gold→teal gradient) is the
app's signature visual element, used on the Dashboard.

## Voice input

`VoiceInput.jsx` uses the browser's native Web Speech API (`bn-BD` locale) —
works in Chrome/Edge/Android WebView. Falls back to a visible warning + the
manual form tab in unsupported browsers (e.g. Firefox, Safari).

## Notes for demo recording

- Make sure the backend's `GEMMA_MOCK_MODE=false` and Ollama is running before
  recording, so the AI-generated summaries/explanations are real Gemma 4
  output, not mock text — this is the biggest technical credibility signal
  for judges.
- The voice demo works best in Chrome on a real Android device or desktop
  with a working microphone.
