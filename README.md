# TakaSathi (টাকাসাথী)

**Financial Literacy & Micro-Business Advisor for Bangladesh's SME/street-vendor economy — powered by Gemma 4.**

Vendors log daily sales/expenses via voice or a simple form. Gemma 4 turns that into plain-Bangla financial health summaries, cash-flow warnings, and micro-loan eligibility guidance checked against real NBFI/bank criteria.

> Built for the **Gemma 4 Good Hackathon** (Kaggle).

---

## Repository Structure

```
Taka Sathi/
├── taka-sathi-backend/     # Node.js + Express + MongoDB API, MVC structure
└── taka-sathi-frontend/    # React + Vite + Tailwind + daisyUI client
```

Each folder has its own `README.md` with deeper detail — this file covers the whole system end-to-end so you can get both halves running together.

---

## Architecture Overview

```
[Vendor's Browser]
       │  voice / form input
       ▼
[React Frontend — Vite]  ──REST API (JWT)──▶  [Express Backend — MVC]
  taka-sathi-frontend                              taka-sathi-backend
                                                          │
                                    ┌─────────────────────┼─────────────────────┐
                                    ▼                     ▼                     ▼
                             [MongoDB]          [Deterministic Finance    [Gemma 4 via Ollama]
                          Users, Transactions,    Engine — cash flow,      structures voice input
                          LoanProducts,           health score,           & explains results in
                          FinancialSnapshots      loan rule matching]      plain Bangla
```

**Core design principle:** Gemma 4 never computes financial numbers. All arithmetic (totals, health score, cash-flow forecast, loan eligibility) is deterministic JavaScript. Gemma 4's only job is to _structure_ free-text/voice input and _explain_ already-computed numbers in plain Bangla — see `taka-sathi-backend/README.md` §8 for the full rationale.

---

## Prerequisites

| Tool                                                      | Version                                                                                | Required for                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org)                             | 18+                                                                                    | Both frontend and backend                                                         |
| [MongoDB](https://www.mongodb.com/try/download/community) | 6+ (local) or [Atlas](https://www.mongodb.com/cloud/atlas/register) (cloud, free tier) | Backend data storage                                                              |
| [Ollama](https://ollama.com/download)                     | latest                                                                                 | Serving Gemma 4 locally for real AI inference (optional at first — see Mock Mode) |
| npm                                                       | comes with Node                                                                        | Package management                                                                |

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url> "Taka Sathi"
cd "Taka Sathi"

cd taka-sathi-backend && npm install && cd ..
cd taka-sathi-frontend && npm install && cd ..
```

### 2. Configure environment variables

Copy the example files and fill them in (full variable tables below):

```bash
cp taka-sathi-backend/.env.example taka-sathi-backend/.env
cp taka-sathi-frontend/.env.example taka-sathi-frontend/.env
```

### 3. Seed the database

```bash
cd taka-sathi-backend
npm run seed        # populates illustrative NBFI/bank loan products
cd ..
```

### 4. Run both apps (two terminals)

```bash
# Terminal 1 — backend
cd taka-sathi-backend
npm run dev          # http://localhost:5000

# Terminal 2 — frontend
cd taka-sathi-frontend
npm run dev          # http://localhost:5173
```

### 5. Open the app

Visit **http://localhost:5173**. Log in with any phone number in the format `+8801XXXXXXXXX` — in demo mode the OTP is always `123456` (also printed to the backend console).

---

## Environment Variables

### `taka-sathi-backend/.env`

| Variable                    | Example / Default                      | Description                                                                                                                                                  |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                      | `5000`                                 | Backend server port                                                                                                                                          |
| `NODE_ENV`                  | `development`                          | `development` or `production`                                                                                                                                |
| `MONGO_URI`                 | `mongodb://127.0.0.1:27017/taka_sathi` | MongoDB connection string (local or Atlas — see below)                                                                                                       |
| `JWT_SECRET`                | _(generate your own)_                  | Secret used to sign auth tokens — **must not** be left as the placeholder                                                                                    |
| `JWT_EXPIRES_IN`            | `7d`                                   | Auth token lifetime                                                                                                                                          |
| `OTP_EXPIRES_IN_MINUTES`    | `5`                                    | How long an OTP stays valid                                                                                                                                  |
| `OTP_DEMO_MODE`             | `true`                                 | When `true`, OTP is always `123456` and logged to console instead of sent via SMS — keep `true` for hackathon demos                                          |
| `GEMMA_BASE_URL`            | `http://127.0.0.1:11434`               | Ollama server address                                                                                                                                        |
| `GEMMA_MODEL`               | `gemma4:e4b`                            | Must match the exact tag pulled in Ollama (`ollama list` to check)                                                                                           |
| `GEMMA_TIMEOUT_MS`          | `30000`                                | Max wait time per inference call                                                                                                                             |
| `GEMMA_MOCK_MODE`           | `true` / `false`                       | `true` = no live model calls, canned responses (build without Ollama running). Set `false` once Ollama + Gemma 4 are working, and before recording your demo |
| `CLIENT_ORIGIN`             | `http://localhost:5173`                | Allowed CORS origin — must match the frontend's dev URL                                                                                                      |
| `OTP_RATE_LIMIT_WINDOW_MIN` | `15`                                   | OTP request rate-limit window                                                                                                                                |
| `OTP_RATE_LIMIT_MAX`        | `5`                                    | Max OTP requests per window                                                                                                                                  |

Generate a real `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**MongoDB connection options:**

- **Local**: install MongoDB Community Edition, then use `MONGO_URI=mongodb://127.0.0.1:27017/taka_sathi`
- **Atlas (no local install)**: create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register), then use:
  ```
  MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/taka_sathi
  ```

### `taka-sathi-frontend/.env`

| Variable            | Example / Default           | Description                                                   |
| ------------------- | --------------------------- | ------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Base URL the frontend calls — must match the backend's `PORT` |

> If you deploy the backend (e.g. Render/Railway), update this to the deployed API URL before building the frontend for production.

---

## Running Gemma 4 for Real Inference

By default, set `GEMMA_MOCK_MODE=true` so you can build and test the full app without any model running. When ready for real AI output:

```bash
ollama pull gemma4:e4b     # match this tag to GEMMA_MODEL in .env
ollama serve               # starts inference server on :11434
```

Then in `taka-sathi-backend/.env`, set:

```
GEMMA_MOCK_MODE=false
```

Restart the backend (`npm run dev`). Confirm it picked up the live model — the startup log should show:

```
[INFO ...] Gemma 4 inference: http://127.0.0.1:11434 (model: gemma4:e4b)
```

---

## Dependency List

### Backend (`taka-sathi-backend`)

| Package                 | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `express`               | Web framework / routing                                 |
| `mongoose`              | MongoDB ODM (models/schemas)                            |
| `dotenv`                | Loads `.env` config                                     |
| `jsonwebtoken`          | JWT auth token signing/verification                     |
| `bcryptjs`              | (reserved for password hashing if added later)          |
| `axios`                 | HTTP client — calls the Gemma 4/Ollama inference server |
| `express-validator`     | Request body/query validation                           |
| `express-async-handler` | Wraps async controllers for error handling              |
| `express-rate-limit`    | Rate-limits the OTP request endpoint                    |
| `helmet`                | Security headers                                        |
| `cors`                  | Cross-origin requests from the frontend                 |
| `morgan`                | HTTP request logging                                    |
| `nodemon` _(dev)_       | Auto-restart during development                         |

### Frontend (`taka-sathi-frontend`)

| Package                                          | Purpose                                   |
| ------------------------------------------------ | ----------------------------------------- |
| `react`, `react-dom`                             | UI framework                              |
| `react-router-dom`                               | Client-side routing                       |
| `axios`                                          | API client (talks to the backend)         |
| `recharts`                                       | Cash-flow forecast chart                  |
| `lucide-react`                                   | Icon set                                  |
| `tailwindcss`, `autoprefixer`, `postcss` _(dev)_ | Styling engine                            |
| `daisyui` _(dev)_                                | Tailwind component library / theme system |
| `vite`, `@vitejs/plugin-react` _(dev)_           | Build tool & dev server                   |

---

## Required Configuration Files

These exist as `*.example` templates in the repo — copy and fill in before running:

| File                       | Copy from      | Purpose                                          |
| -------------------------- | -------------- | ------------------------------------------------ |
| `taka-sathi-backend/.env`  | `.env.example` | DB connection, JWT secret, Gemma 4/Ollama config |
| `taka-sathi-frontend/.env` | `.env.example` | Backend API base URL                             |

No other config files need manual setup — `tailwind.config.js`, `vite.config.js`, `postcss.config.js` on the frontend and `package.json` scripts on the backend are already committed and require no edits for local development.

---

## Usage Walkthrough

1. **Sign up / log in** — enter a phone number, verify with OTP (`123456` in demo mode).
2. **Onboarding** — enter business name, type, and location (used for loan-eligibility matching).
3. **Log Entry** — tap the mic and speak a sale/expense in Bangla, or use the manual form. Gemma 4 (or mock mode) structures the entry automatically.
4. **Dashboard** — view your Financial Health Score, 7-day cash-flow forecast, and tap "Generate summary" to get a fresh Gemma 4 narrative.
5. **History** — browse/filter/delete past transactions.
6. **Loan Eligibility** — tap "Check eligibility" to compare your transaction history against real NBFI/bank loan criteria, explained in plain Bangla.

---

## Manual API Test (curl)

Useful for confirming the backend works before the frontend is even running — see `taka-sathi-backend/README.md` §7 for the full copy-pasteable curl sequence (OTP → login → log transaction → generate summary → check loan eligibility).

---

## Troubleshooting

| Symptom                                        | Likely cause                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Frontend shows network errors on login         | Backend isn't running, or `VITE_API_BASE_URL` doesn't match the backend's `PORT`                     |
| `MongoDB connection failed` on backend start   | `MONGO_URI` wrong, or local MongoDB isn't running (`mongod`)                                         |
| AI summaries return generic `[MOCK MODE]` text | `GEMMA_MOCK_MODE=true` — expected until Ollama is set up                                             |
| Gemma 4 inference errors / timeouts            | Ollama isn't running (`ollama serve`), or `GEMMA_MODEL` doesn't match a pulled model (`ollama list`) |
| CORS errors in browser console                 | `CLIENT_ORIGIN` in backend `.env` doesn't match the frontend's actual URL                            |
| Voice input button does nothing                | Browser doesn't support the Web Speech API (use Chrome/Edge) — manual form tab still works           |

---

## Known Limitations

- OTP delivery is simulated (demo mode) — no real SMS gateway integrated yet
- Loan product data is illustrative/hardcoded (see `seed/loanProducts.seed.js`), not live-scraped or lender-verified
- Gemma 4 runs self-hosted via Ollama on a server you control, not yet on-device on the vendor's phone (see backend PRD §9.2 for the on-device stretch-goal path)

---

## License / Disclaimer

Prototype built for hackathon submission purposes. Loan product data included is illustrative and for demonstration only — not verified real-time lending offers. Do not use as-is for real financial decisions without verifying directly with the named institutions.
