# Digital Guardian - Privacy Protection Web App

A privacy protection web application that monitors personal data exposures across the web, provides breach scanning via HaveIBeenPwned API, and handles subscriptions via Stripe.

## Features

- **3-day free trial** for new users
- **Premium subscription** required after trial (Stripe integration)
- **Exempt account**: `magboyin14@gmail.com` has indefinite premium access
- **Real breach data** via HaveIBeenPwned API (user's email scanned on login)
- **Premium feature**: Advanced search – manually search any email for breaches
- **Secure billing**: Add card, Stripe Checkout for subscriptions
- **GDPR/CCPA compliant**: User data scoped to requesting account, API logs linked to user

## Setup

### 1. Backend (Server)

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your keys
npm run dev
```

Server runs on `http://localhost:3001`

### 2. Environment Variables (Server)

Create `server/.env`:

```
PORT=3001
JWT_SECRET=your-secret-key
HIBP_API_KEY=your-hibp-api-key          # Get at https://haveibeenpwned.com/API/Key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID=price_xxx               # Your Stripe subscription price ID
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend

```bash
npm install
cp .env.example .env
# Edit .env with VITE_STRIPE_PUBLISHABLE_KEY
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to the backend.

### 4. Frontend Environment Variables

Create `.env`:

```
VITE_API_URL=                             # Leave empty to use proxy
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## Stripe Setup

1. Create a Stripe account and get API keys
2. Create a product with recurring price ($15/month)
3. Set `STRIPE_PRICE_ID` to the price ID (e.g. `price_xxx`)
4. For webhooks: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
5. Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## HaveIBeenPwned API

- Get an API key at https://haveibeenpwned.com/API/Key
- Without a key, the app uses demo breach data for development

## Running

**Terminal 1 – Backend:**
```bash
cd server && npm run dev
```

**Terminal 2 – Frontend:**
```bash
npm run dev
```

Then open http://localhost:5173

## Security & Compliance

- User scan data is scoped to the requesting account (GDPR/CCPA)
- API logs (`api_logs` table) link scans to `user_id`
- No exposure of other users' data
- Passwords hashed with bcrypt; JWT for session
