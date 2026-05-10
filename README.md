# TransitSwap

Marketplace web app for **buying and selling unused train and bus tickets**. Sellers list tickets from their dashboard; buyers browse, open listings, and contact your platform via WhatsApp for purchase requests. Built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Firebase** (Authentication + Firestore).

**Repository:** [github.com/mosabbir-maruf/TransitSwap](https://github.com/mosabbir-maruf/TransitSwap)

## Features

- Public browse/home feeds with filters and ticket detail pages  
- Seller dashboard: listings, drafts, edit profile, alerts (notifications + purchase/admin signals)  
- Admin dashboard for tickets, users, reports, logs, and roles — **active tab is stored in the URL** (`/admin?tab=…`) so refresh and deep links keep context  
- Admin view of a user profile (`/admin/users/:id`) with **Back to dashboard** respecting the prior tab via query params  
- Firebase Auth with email verification flow  
- Firestore-backed tickets, users, notifications, ticket reports  
- Navbar waits on auth initialization (no flash of **Log In / Register** while the session restores); admins see a slimmer account menu (no Alerts / edit-profile shortcuts in the dropdown)  
- Footer **Stay in the loop**: optional **Join Telegram** button when `VITE_PUBLIC_TELEGRAM_URL` is set  
- Optional public contact fields: platform WhatsApp and support phone via environment variables  
- Heading font (**Space Grotesk**) bundled locally for smoother first paint on the home hero  

## Tech stack

| Area | Choice |
|------|--------|
| UI | React 19, React Router 7, shadcn-style UI components |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Fonts | Inter + JetBrains Mono (Google Fonts CSS); Space Grotesk (`@fontsource/space-grotesk`) for headings |
| Backend | Firebase Auth, Firestore |
| Hosting | Static deploy of `dist/` (Firebase Hosting or any CDN-friendly host) |

## Prerequisites

- **Node.js** (LTS recommended, e.g. 20+)  
- A **Firebase** project with **Authentication** (email/password) and **Firestore** enabled  
- **Firebase CLI** (optional): `npm install -g firebase-tools` — for deploying rules and indexes  

## Environment setup

### 1. Create `.env.local`

From the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your real values. **Never commit `.env.local`** (it is listed in `.gitignore`).

### 2. Variables

All **`VITE_*`** keys are inlined at **build time** by Vite. Set them in the environment that runs `npm run build` for production.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | `*.firebaseapp.com` auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | GCP / Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Default Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | Yes | Firestore database ID (use `(default)` only if that is your DB) |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Google Analytics measurement ID (if enabled) |
| `VITE_PUBLIC_WHATSAPP_NUMBER` | Recommended | Platform WhatsApp (any formatting); used on Contact and **Request to buy** prefilled messages |
| `VITE_PUBLIC_SUPPORT_PHONE` | No | Optional phone line shown on Contact |
| `VITE_PUBLIC_SITE_URL` | No | Production site origin (no trailing slash); admin mailto helpers use this instead of `localhost` when set |
| `VITE_PUBLIC_TELEGRAM_URL` | No | Full Telegram invite URL (e.g. `https://t.me/your_channel`); powers the footer **Join Telegram** button |

If `VITE_PUBLIC_WHATSAPP_NUMBER` is empty, **Request to buy** still opens WhatsApp only after you configure this value.

This app does **not** use Google Gemini or `GEMINI_API_KEY`; no AI SDK is required for the shipped UI.

### 3. Install and run

```bash
npm install
npm run dev
```

Dev server listens on **port 3000** (see `package.json`).

### 4. Build and typecheck

```bash
npm run build       # output: dist/
npm run preview     # optional local preview of dist/
npm run lint        # tsc --noEmit
```

## Firebase

| File | Role |
|------|------|
| `firestore.rules` | Security rules |
| `firestore.indexes.json` | Composite indexes |
| `firebase.json` | Firebase CLI targets |
| `.firebaserc` | Default Firebase project alias |

Deploy rules and indexes (after `firebase login`):

```bash
firebase deploy --only firestore
```

Add a **hosting** target to `firebase.json` when you want Firebase Hosting to serve `dist/`, or deploy `dist/` elsewhere with production env vars set before `npm run build`.

### Vercel

Import the repo with **Vite** (build output **`dist/`**). Root [`vercel.json`](vercel.json) serves **`index.html`** when no static file matches the URL so **refresh** on client routes (e.g. `/browse`, `/admin`) does not return **404**. That happens **only on the CDN/router** for document requests — it does **not** slow down the client app or cause extra React rendering beyond a normal page load. Set the same **`VITE_*`** env vars in the Vercel project before deploy.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run clean` | Remove `dist/` |
| `npm run lint` | TypeScript check only |

## Repository structure

Paths below match what lives in this repo (excluding `node_modules/`, `dist/`, and local-only files such as `.env.local`). UI primitives live under `components/`; feature code under `src/`.

```
TransitSwap/
├── .env.example              # Template for Vite + Firebase env (copy → .env.local)
├── .firebaserc               # Firebase CLI default project
├── .gitignore
├── README.md
├── vercel.json               # SPA fallback rewrites for Vercel
├── components.json           # shadcn-style UI config
├── firebase.json               # Firestore rules + indexes targets
├── firestore.indexes.json
├── firestore.rules
├── index.html                # Vite HTML shell
├── lib/
│   └── utils.ts              # Shared helpers (e.g. cn())
├── package.json
├── package-lock.json
├── security_spec.md
├── tsconfig.json
├── vite.config.ts
├── components/
│   └── ui/                   # Reusable primitives (button, card, dialog, tabs, …)
└── src/
    ├── main.tsx              # App bootstrap
    ├── App.tsx               # Router shell, layout, footer
    ├── index.css             # Global styles / Tailwind
    ├── vite-env.d.ts         # Vite + ImportMetaEnv typings
    ├── constants.ts          # Shared constants (stations, etc.)
    ├── contexts/
    │   └── AuthContext.tsx   # Firebase auth + user profile
    ├── hooks/
    │   ├── useTicketDetailListing.ts
    │   └── useTicketSellerPrivacy.ts
    ├── components/
    │   ├── ErrorBoundary.tsx
    │   └── common/           # TicketCard, EditTicketDialog, EditProfileDialog, TimePicker
    ├── lib/
    │   ├── adminDashboardTab.ts   # Admin URL tab ids + path helpers (?tab=, ?returnTab=)
    │   ├── env/
    │   │   └── publicContact.ts   # WhatsApp / support phone from env
    │   ├── firebase/         # Auth, Firestore services (tickets, users, notifications, …)
    │   ├── sellDraft.ts
    │   ├── ticketBuyRequest.ts    # Prefilled WhatsApp purchase message
    │   └── ticketPrivacy.ts       # Seller phone redaction for listings
    ├── pages/                # Route-level screens
    │   ├── Home.tsx
    │   ├── Browse.tsx
    │   ├── Sell.tsx
    │   ├── TicketDetails.tsx
    │   ├── Dashboard.tsx
    │   ├── Alerts.tsx
    │   ├── Contact.tsx
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   ├── VerifyEmail.tsx
    │   ├── ForgotPassword.tsx
    │   ├── AdminLogin.tsx
    │   ├── AdminRegister.tsx
    │   ├── AdminDashboard.tsx
    │   ├── AdminUserProfile.tsx
    │   ├── FAQ.tsx
    │   ├── TermsOfService.tsx
    │   ├── PrivacyPolicy.tsx
    │   ├── CookiePolicy.tsx
    │   ├── NotFound.tsx
    │   └── Unauthorized.tsx
    └── types/
        └── index.ts          # Shared TypeScript types
```

---

TransitSwap is **private** in `package.json`. Adjust licensing or repo visibility as needed.
