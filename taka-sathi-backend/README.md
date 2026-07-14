# TakaSathi — Backend

Financial Literacy & Micro-Business Advisor for SMEs, powered by **Gemma 4**.
Node.js + Express + MongoDB, in MVC structure.

## 1. Folder Structure

```
taka-sathi-backend/
├── config/
│   ├── db.js                 # MongoDB connection
│   └── gemmaConfig.js        # Gemma 4 (Ollama) inference config
├── controllers/               # Request handlers
│   ├── authController.js
│   ├── transactionController.js
│   ├── insightController.js
│   ├── loanController.js
│   └── dashboardController.js
├── models/                    # Mongoose schemas
│   ├── User.js
│   ├── Transaction.js
│   ├── LoanProduct.js
│   └── FinancialSnapshot.js
├── routes/                    # Express routers, mapped to controllers
│   ├── authRoutes.js
│   ├── transactionRoutes.js
│   ├── insightRoutes.js
│   ├── loanRoutes.js
│   ├── dashboardRoutes.js
│   └── index.js               # mounts all sub-routers under /api
├── services/                  # Business logic + Gemma 4 integration
│   ├── gemmaService.js        # low-level Ollama client + tool-calling loop
│   ├── aiTools.js             # function-calling schema definitions
│   ├── transactionParserService.js
│   ├── insightService.js      # finance calc + narrative generation
│   ├── loanExplanationService.js
│   ├── loanEligibilityEngine.js  # deterministic rule matching
│   ├── financeEngine.js       # deterministic math — never touches the LLM
│   └── otpService.js
├── middleware/
│   ├── authMiddleware.js      # JWT protect()
│   ├── errorHandler.js
│   └── validateRequest.js
├── utils/
│   ├── apiResponse.js
│   └── logger.js
├── seed/
│   └── loanProducts.seed.js   # illustrative NBFI/bank loan dataset
├── app.js                     # Express app config
├── server.js                  # entry point
├── package.json
└── .env.example
```

## 2. Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string
- [Ollama](https://ollama.com) installed, for serving Gemma 4 locally (optional for early dev — see Mock Mode below)

## 3. Setup

```bash
cd taka-sathi-backend
npm install
cp .env.example .env
# edit .env — at minimum set MONGO_URI and JWT_SECRET
```

### 3.1 Running Gemma 4 locally via Ollama

```bash
# Install Ollama: https://ollama.com/download
ollama pull gemma4:4b        # or whichever Gemma 4 tag is available in your Ollama version
ollama serve                 # starts the inference server on http://127.0.0.1:11434
```

Make sure `GEMMA_BASE_URL` and `GEMMA_MODEL` in `.env` match your local setup.

### 3.2 Mock Mode (develop without Ollama installed)

If you're still scaffolding the frontend or don't have Ollama set up yet, set:

```
GEMMA_MOCK_MODE=true
```

in `.env`. Every AI-dependent endpoint will still respond (with clearly-labeled mock content) so the rest of the app is fully testable end-to-end. **Switch this back to `false` before recording your demo video** — judges verify real model usage via the code repo.

## 4. Seed the loan products dataset

```bash
npm run seed
```

This populates the `LoanProduct` collection with ~7 illustrative Bangladeshi NBFI/bank micro-loan products (see `seed/loanProducts.seed.js`). Edit this file to add real, verified lender criteria if you have time before submission.

## 5. Run the server

```bash
npm run dev     # nodemon, auto-restart on change
# or
npm start        # plain node
```

Server boots on `http://localhost:5000` (or your configured `PORT`).

Health check: `GET http://localhost:5000/api/health`

## 6. API Overview

All routes except `/api/auth/request-otp` and `/api/auth/verify-otp` and `/api/health` require:

```
Authorization: Bearer <JWT from /api/auth/verify-otp>
```

| Method | Endpoint                                 | Description                                                                           |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| POST   | `/api/auth/request-otp`                  | `{ phoneNumber }` → sends OTP (logged to console in demo mode, code `123456`)         |
| POST   | `/api/auth/verify-otp`                   | `{ phoneNumber, otp }` → returns JWT                                                  |
| GET    | `/api/auth/me`                           | current user profile                                                                  |
| PUT    | `/api/auth/profile`                      | update onboarding fields                                                              |
| POST   | `/api/transactions`                      | add transaction — `{ rawInputText, source: 'voice' }` OR `{ amount, type, category }` |
| GET    | `/api/transactions`                      | list, filterable by `startDate`, `endDate`, `category`, `type`                        |
| PUT    | `/api/transactions/:id`                  | edit                                                                                  |
| DELETE | `/api/transactions/:id`                  | delete                                                                                |
| POST   | `/api/insights/summary`                  | `{ periodType: 'daily'\|'weekly'\|'monthly' }` → runs Gemma 4, caches snapshot        |
| GET    | `/api/insights/latest?periodType=weekly` | fetch cached snapshot (fast, no AI call)                                              |
| GET    | `/api/loans/products`                    | list all loan products                                                                |
| POST   | `/api/loans/check-eligibility`           | compute + explain eligibility across all products                                     |
| GET    | `/api/dashboard/overview`                | aggregate view for the frontend home screen                                           |

## 7. Quick manual test flow (curl)

```bash
# 1. Request OTP (demo mode always uses 123456)
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+8801711111111"}'

# 2. Verify OTP -> get token
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+8801711111111","otp":"123456"}'
# copy the "token" from the response

TOKEN="paste_token_here"

# 3. Log a manual transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":1500,"type":"income","category":"sales","note":"Vegetable sales"}'

# 4. Log a voice-style (free text) transaction — exercises Gemma 4 function-calling
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"rawInputText":"আজ ৫০০ টাকার সবজি কিনেছি","source":"voice"}'

# 5. Generate a weekly summary (Gemma 4 narrative)
curl -X POST http://localhost:5000/api/insights/summary \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"periodType":"weekly"}'

# 6. Check loan eligibility
curl -X POST http://localhost:5000/api/loans/check-eligibility \
  -H "Authorization: Bearer $TOKEN"

# 7. Dashboard overview
curl http://localhost:5000/api/dashboard/overview -H "Authorization: Bearer $TOKEN"
```

## 8. Architecture note for judges (Technical Implementation criterion)

Gemma 4 is deliberately **never asked to compute financial numbers**. All arithmetic
(totals, health score, cash-flow forecast, loan-eligibility matching) happens in
plain deterministic JavaScript in `services/financeEngine.js` and
`services/loanEligibilityEngine.js`. Gemma 4's role — via native function-calling
(`services/aiTools.js`, `services/gemmaService.js`) — is strictly to:

1. **Structure** free-text/voice input into transaction records (`transactionParserService.js`)
2. **Explain** already-computed numbers in plain Bangla (`insightService.js`, `loanExplanationService.js`)

This keeps the app auditable, testable, and immune to LLM-hallucinated numbers.

## 9. Known limitations (MVP scope)

- OTP is simulated (demo mode) — no real SMS gateway wired up yet
- Loan product data is illustrative/hardcoded, not live-scraped or lender-verified
- No native mobile on-device inference yet
