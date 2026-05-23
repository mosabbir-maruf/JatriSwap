# JatriSwap

Marketplace web app for **buying and selling unused train and bus tickets**. Sellers list tickets from their dashboard; buyers browse, open listings, and contact your platform via WhatsApp for purchase requests. Built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Firebase** (Authentication + Firestore).

**Repository:** [github.com/mosabbir-maruf/JatriSwap](https://github.com/mosabbir-maruf/JatriSwap)

## Features

- Public browse/home feeds with filters and ticket detail pages  
- Seller dashboard: listings, drafts, edit profile, alerts (notifications + purchase/admin signals)  
- Admin dashboard for tickets, users, reports, logs, and roles — **active tab is stored in the URL** (`/admin?tab=…`) so refresh and deep links keep context  
- Admin view of a user profile (`/admin/users/:id`) with **Back to dashboard** respecting the prior tab via query params  
- Firebase Auth with email verification flow  
- Firestore-backed tickets, users, notifications, ticket reports  
- Navbar waits on auth initialization (no flash of **Log In / Register** while the session restores); admins see a slimmer account menu (no Alerts / edit-profile shortcuts in the dropdown)  
- Footer **Stay in the loop**: optional **Join Facebook** button when `VITE_PUBLIC_FACEBOOK_URL` is set  
- Optional public contact fields: platform WhatsApp and support phone via environment variables  
- Heading font (**Space Grotesk**) bundled locally for smoother first paint on the home hero  

## Tech stack

| Area | Choice |
|------|--------|
| UI | React 19, React Router 7, shadcn-style UI components (Base UI–based) |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 + `tw-animate-css` |
| Fonts | Inter + JetBrains Mono (Google Fonts CSS); Space Grotesk (`@fontsource/space-grotesk`) for headings |
| Motion | Motion (Framer Motion v12) |
| Backend | Firebase Auth, Firestore, App Check |
| Serverless API | Vercel Functions (`api/contact`, `api/admin-delete-auth-user`, `api/health`) |
| Hosting | Vercel / any static host |

## Prerequisites

- **Node.js** (LTS recommended, e.g. 20+)  
- A **Firebase** project with **Authentication** (email/password), **Firestore**, and (optional) **App Check** enabled  
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
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | No | reCAPTCHA v3 site key for App Check (bootstrapped lazily via `requestIdleCallback`) |
| `VITE_PUBLIC_WHATSAPP_NUMBER` | Recommended | Platform WhatsApp (any formatting); used on Contact and **Request to buy** prefilled messages |
| `VITE_PUBLIC_SUPPORT_PHONE` | No | Optional phone line shown on Contact |
| `VITE_PUBLIC_SITE_URL` | Recommended | Production site origin (no trailing slash); used for canonicals, `robots.txt`, and `sitemap-main.xml` |
| `VITE_PUBLIC_GA_MEASUREMENT_ID` | No | Google Analytics 4 Measurement ID (injected at **build time** into `index.html`; missing tag shows a `<!-- jatriswap-ga:missing -->` comment) |
| `VITE_PUBLIC_FACEBOOK_URL` | No | Full Facebook page/group URL (e.g. `https://facebook.com/yourpage`); powers the footer **Join Facebook** button |
| `VITE_CONTACT_API_URL` | No | Override for `/api/*` URLs when frontend and API are deployed separately (e.g. local Vite with deployed API) |

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

### Collections used

`users`, `admins`, `tickets`, `notifications`, `purchaseRequests`, `ticketReports`, `adminSettings` (doc: `global`), `adminLogs`, `ticketAdminNotes`, `_svcContactDedupe`, `_svcContactRate`.

### Serverless API endpoints

- **`/api/contact`** — Contact form submission → Telegram notification. Dedup + rate-limit via Firestore guard collections.
- **`/api/admin-delete-auth-user`** — Admin-only POST. Verifies Firebase ID token (RS256 + JWKS), deletes target Firebase Auth user via Identity Toolkit REST.
- **`/api/health`** — Simple health check endpoint.

### Vercel

Import the repo with **Vite** (build output **`dist/`**). Root [`vercel.json`](vercel.json) serves **`index.html`** when no static file matches the URL so **refresh** on client routes (e.g. `/browse`, `/admin`) does not return **404**. That happens **only on the CDN/router** for document requests — it does **not** slow down the client app or cause extra React rendering beyond a normal page load. Set the same **`VITE_*`** env vars in the Vercel project before deploy.

Additional `vercel.json` behavior:
- **`/admin/*`** pages get `X-Robots-Tag: noindex, nofollow, noarchive` headers.
- **`/sitemap-main.xml`** and **`/robots.txt`** get explicit `Content-Type` and `Cache-Control` headers.
- Serverless functions (`api/contact.ts`, `api/admin-delete-auth-user.ts`) have `maxDuration: 30`.
- **`buildCommand`**: `npm run build`. **`outputDirectory`**: `dist`.

Server-side env vars for Vercel (not `VITE_*`):
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — contact form → Telegram.
- `FIRESTORE_DATABASE_ID` — same logical DB as `VITE_FIREBASE_FIRESTORE_DATABASE_ID`.
- `FIREBASE_SERVICE_ACCOUNT_JSON` — full JSON string for server-side Firestore REST access.
- `GOOGLE_APPLICATION_CREDENTIALS` — path to `.json` file (for local `vercel dev`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server (port 3000, `--host=0.0.0.0`) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run clean` | Remove `dist/` |
| `npm run lint` | TypeScript check only (`tsc --noEmit`) |

## Repository structure

Paths below match what lives in this repo (excluding `node_modules/`, `dist/`, and local-only files such as `.env.local`). UI primitives live under `components/`; feature code under `src/`.

```
JatriSwap/
├── .env.example                 # Template for Vite + Firebase env (copy → .env.local)
├── .env.local                   # Local env (gitignored — never commit)
├── .firebaserc                  # Firebase CLI default project
├── .gitignore
├── AGENTS.md                    # AI agent instructions
├── MEMORY.md                    # Long-term project reference
├── README.md
├── vercel.json                  # Vercel config: SPA rewrites, headers, functions
├── components.json              # shadcn-style UI config
├── firebase.json                # Firestore rules + indexes targets
├── firestore.indexes.json
├── firestore.rules
├── index.html                   # Vite HTML shell with GA4 injection
├── lib/
│   └── utils.ts                 # Shared helpers (e.g. cn())
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── .agents/                     # AI agent rules and skills
│   ├── plans/
│   ├── rules/                   # codequality.mdc, react.mdc, typescript.mdc
│   └── skills/                  # firebase, firebase-basics, api-design, seo, etc.
├── api/                         # Vercel serverless functions
│   ├── contact.ts               # Contact form → Telegram
│   ├── admin-delete-auth-user.ts# Admin hard-delete Firebase Auth user
│   ├── health.ts                # Health check endpoint
│   └── lib/
│       ├── firebaseAdmin.ts     # Server-side Firestore REST client (JWT → OAuth)
│       ├── serverLogging.ts     # Server-side structured logging
│       └── contact/             # Contact form server modules
│           ├── firestoreRest.ts     # Hand-rolled Firestore REST surface
│           ├── firestoreGuards.ts   # Dedupe + rate limit guards
│           ├── guardsConstants.ts   # Guard collection config
│           ├── httpError.ts
│           ├── httpPost.ts
│           ├── identity.ts
│           ├── logUnexpectedContact.ts
│           ├── sanitize.ts
│           └── telegram.ts
├── shared/
│   └── contactValidation.ts     # Shared contact form validation
├── public/
│   ├── avatar/                  # ~80 public avatar PNGs
│   ├── brand/                   # Brand assets
│   ├── favicon.png
│   ├── favicon.svg
│   ├── meta-og.png              # Open Graph fallback image
│   └── robots.txt
├── components/
│   └── ui/                      # shadcn-style primitives (Base UI based)
│       ├── accordion.tsx, avatar.tsx, badge.tsx, button.tsx
│       ├── calendar.tsx, card.tsx, dialog.tsx, dropdown-menu.tsx
│       ├── input.tsx, label.tsx, popover.tsx, scroll-area.tsx
│       ├── select.tsx, separator.tsx, sheet.tsx, skeleton.tsx
│       ├── slider.tsx, sonner.tsx, spinner.tsx, switch.tsx
│       ├── tabs.tsx, textarea.tsx
└── src/
    ├── main.tsx                 # App bootstrap + lazy App Check init
    ├── App.tsx                  # Router shell, layout, footer, Navbar
    ├── index.css                # Global styles / Tailwind / scrollbar-gutter
    ├── vite-env.d.ts            # Vite + ImportMetaEnv typings
    ├── constants.ts             # Shared constants (STATIONS, TRAIN_NAMES, BUS_NAMES, seat classes)
    ├── contexts/
    │   └── AuthContext.tsx      # Firebase auth + user/admin profile listeners
    ├── hooks/
    │   ├── useAvatarPickerFromProfile.ts
    │   ├── useCalendarPopoverSelect.ts
    │   ├── useRouteDocumentMeta.ts
    │   ├── useSellerNotificationsSubscription.ts
    │   ├── useSignupAvatarDraft.ts
    │   ├── useTicketDetailAdminLinkState.ts
    │   ├── useTicketDetailListing.ts
    │   └── useTicketSellerPrivacy.ts
    ├── components/
    │   ├── ErrorBoundary.tsx
    │   ├── branding/
    │   │   └── JatriSwapLogo.tsx
    │   └── common/
    │       ├── AdminUserFirestoreAvatar.tsx
    │       ├── AuthLoadingPlaceholder.tsx
    │       ├── Autocomplete.tsx
    │       ├── AvatarChoiceTrigger.tsx
    │       ├── BuyerPurchaseRequestCard.tsx
    │       ├── DashboardAlertRow.tsx
    │       ├── EditProfileDialog.tsx
    │       ├── EditTicketDialog.tsx
    │       ├── FloatingWhatsAppHelp.tsx
    │       ├── MarkAllNotificationsReadButton.tsx
    │       ├── ProfileAvatarPickerDialog.tsx
    │       ├── TicketCard.tsx
    │       └── TimePicker.tsx
    ├── lib/
    │   ├── adminDashboardTab.ts       # Admin URL tab ids & path helpers
    │   ├── adminDisplay.ts            # Admin display formatters
    │   ├── adminSearchText.ts         # Full-text search builder
    │   ├── adminTableUi.ts            # Admin table pagination/UI state
    │   ├── adminTicketReportSearch.ts # Report search/sort
    │   ├── adminUserSearch.ts         # User search/filter
    │   ├── aggregateSellerTicketStats.ts
    │   ├── analytics/
    │   │   └── googleAnalytics.ts     # GA4 gtag snippet injection
    │   ├── avatar/                    # Full avatar system (catalog, picker, upload, resolve)
    │   ├── branding/                  # Brand utilities (favicon, ticket mark SVG)
    │   ├── brutalistSingleDayCalendar.ts
    │   ├── contact/
    │   │   └── contactForm.ts         # Client-side contact submission
    │   ├── copyTextWithToast.ts
    │   ├── env/
    │   │   └── publicContact.ts       # WhatsApp / support phone from env
    │   ├── firebase/                  # All Firestore services
    │   │   ├── adminDeleteTargetAuth.ts, adminSettings.ts
    │   │   ├── authErrors.ts, authVerification.ts
    │   │   ├── errors.ts, firebase.ts, web-config.ts
    │   │   ├── notifications.ts, purchaseRequests.ts
    │   │   ├── queryPageSlice.ts, sellerTicketNotifications.ts
    │   │   ├── submitContactMessage.ts, ticketAdminNotes.ts
    │   │   ├── ticketReports.ts, tickets.ts
    │   │   ├── userModeration.ts, users.ts
    │   ├── formatAdminTripLine.ts, formatDepartureTime.ts
    │   ├── formatLocaleDateTime.ts, formatPurchaseRequest.ts
    │   ├── initialsFromDisplayName.ts, isAdminAppRoute.ts
    │   ├── listingSaveFeedback.ts, listingWriteGuard.ts
    │   ├── moderationNotifications.ts, scheduledDeleteUndo.ts
    │   ├── runtime/
    │   │   ├── clientLogger.ts        # DEV-only console suppression
    │   │   └── requestCache.ts        # Async request dedup
    │   ├── sellDraft.ts, sellerListingControls.ts
    │   ├── seo/                       # Runtime meta, OG tags, canonicals
    │   ├── ticketBuyRequest.ts        # Prefilled WhatsApp purchase message
    │   ├── ticketDetailAdminReturn.ts # Admin back-link helpers
    │   ├── ticketDetailVisibility.ts  # Detail page visibility gates
    │   ├── ticketExpiration.ts        # Dhaka-time derived expiry
    │   ├── ticketPrivacy.ts           # Seller phone redaction
    │   ├── ui/
    │   │   └── authShellClasses.ts    # Auth page CSS classes
    │   ├── userAccountStatus.ts
    │   └── vercelDeployApiUrl.ts      # API URL resolver
    ├── pages/
    │   ├── AdminDashboard.tsx, AdminLogin.tsx, AdminRegister.tsx
    │   ├── AdminUserProfile.tsx, Alerts.tsx, Browse.tsx
    │   ├── Contact.tsx, CookiePolicy.tsx, Dashboard.tsx
    │   ├── FAQ.tsx, ForgotPassword.tsx, Home.tsx, Login.tsx
    │   ├── NotFound.tsx, PrivacyPolicy.tsx, Register.tsx
    │   ├── Sell.tsx, TermsOfService.tsx, TicketDetails.tsx
    │   ├── Transit.tsx, Unauthorized.tsx, VerifyEmail.tsx
    └── types/
        └── index.ts                   # Shared TypeScript types
```

---

JatriSwap is **private** in `package.json`. Adjust licensing or repo visibility as needed.
