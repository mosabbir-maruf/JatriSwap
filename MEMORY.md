# Project memory

Concise long-term reference for **TransitSwap** (transit ticket marketplace). Full agent/process rules live in `AGENTS.md`, `.agents/rules`, and `.agents/skills`.

## Architecture

- **Client**: React 19 + Vite 6 SPA (`src/main.tsx` → `AuthProvider` → `App` with `react-router-dom` v7).
- **UI**: Tailwind CSS v4 (`@tailwindcss/vite`), shadcn-style primitives under `components/ui/` (Base UI–based where applicable), `@/` alias resolves to **repository root** (not `src/`).
- **Motion / UX**: `motion`, `sonner`, lucide icons; route transitions and scroll-to-top in `App.tsx`.
- **Fonts**: **Space Grotesk** (headings / `font-heading`) ships via **`@fontsource/space-grotesk/latin.css`** imported in [`src/main.tsx`](src/main.tsx) **before** [`src/index.css`](src/index.css). **Inter** and **JetBrains Mono** still load from the Google Fonts **`@import`** in `index.css` only — avoids late swap/reflow on the home hero. **`@fontsource-variable/geist`** remains in `package.json` but is not required for the shipped heading stack.
- **Backend**: Firebase **client SDK only** in-repo — Auth, Firestore, Storage (`src/lib/firebase/firebase.ts`). No Firebase Cloud Functions (or other server) source tree in this project; `express` / `dotenv` are dependencies but unused under `src/` today.

## Backend structure (Firestore)

- **Initialization**: Single app instance; Firestore **must** use the named database id from env (`getFirestore(app, firestoreDatabaseId)` via [`src/lib/firebase/web-config.ts`](src/lib/firebase/web-config.ts)).
- **Config**: Firebase Web SDK options come from `VITE_FIREBASE_*` in `.env.local` (see [`.env.example`](.env.example)); validated at bootstrap by `loadFirebaseWebConfig()`. Treat hosting/API restrictions like any client app; never commit populated env files.
- **CLI layout**: [`firebase.json`](firebase.json) maps Firestore rules to [`firestore.rules`](firestore.rules). Deploy/dry-run still requires `firebase use` or `--project <id>` once authenticated.
- **Collections used in code**: `users`, `admins`, `tickets`, `notifications`, `ticketReports`, `adminSettings` (e.g. doc `global`), `adminLogs`, **`ticketAdminNotes`** (one doc per listing id — **staff-only** notes, not merged into public ticket documents).
- **Schema intent**: Domain shapes live in [`src/types/index.ts`](src/types/index.ts) and [`firestore.rules`](firestore.rules) validators. Admin-oriented extras include **`AdminUserRow`** and **`PendingAdminRow`**. **Chat/Message are not implemented in `src/` yet**; rules still define validators for them.
- **Security (recent posture)**:
  - **`tickets`**: Updates enforce **`sellerId`** and **`postedAt`** unchanged vs existing doc; merged document must satisfy validators aligned with seller/admin UI (`EditTicketDialog`, admin ticket moderation fields permitted by **`incoming().diff`** allowlists).
  - **`tickets` — `views`**: Rules allow a **third path**: **`views`**-only update with **`incoming().views == existing().views + 1`** (**no auth required**) so anonymous impressions can count if the client sends them.
  - **`tickets` reads**: **`get`** and **`list`** remain broadly allowed for marketplace discovery (scraping/billing tradeoff); not tightened yet.
  - **`ticketAdminNotes`**: **`read` / `create` / `update`** — admins only; **`delete`** — admin **or** listing owner while the ticket doc still exists (supports cleanup ordering with ticket delete).
  - **`notifications`**: Creates validate **`alert` \| `info` \| `success`** and optional **`title`** (`createNotification` in [`notifications.ts`](src/lib/firebase/notifications.ts)).
  - **`isVerified()`** in rules is still relaxed (`true`) for preview/email-password ergonomics — tighten intentionally before strict production if desired.

## Important decisions

- **Profile source**: `AuthContext` listens to **`users/{uid}` and `admins/{uid}`**; whichever exists drives `currentUser` (admins are not only in `users`).
- **Errors**: [`handleFirestoreError`](src/lib/firebase/errors.ts) logs a **small structured object** (`operationType`, `path`, `userId`, optional Firebase **`code`**, **`message`**) — **no** provider/email payloads — then throws **`FirestoreServiceError`** with a generic **`message`** for callers/UI. Catch paths should assume **`FirestoreServiceError`** (legacy **`FirestoreErrorInfo`** type may still exist in types but is not what gets logged anymore).
- **Tickets — queries & listeners** ([`tickets.ts`](src/lib/firebase/tickets.ts)):
  - **`subscribeToSellerTickets(sellerId)`**: Dashboard — **`where('sellerId','==', …)`** + **`orderBy('postedAt','desc')`** + **`limit`** (default cap 120).
  - **`subscribeToTickets`**: Home/marketing — optional filters; **`orderBy('postedAt','desc')`** + **`limit`** using **`TICKETS_SUBSCRIPTION_CAP`** (200) unless **`maxDocuments`** overrides (e.g. Home uses a lower cap).
  - **`fetchTicketsPage` / `TICKETS_PAGE_SIZE`**: Browse — paginated **`getDocs`** with **`startAfter`**; refetches when route filters change; **Load more** appends pages.
  - **`getTickets`**: Admin bulk listing — same filter shape, **`orderBy('postedAt','desc')`**, bounded by **`TICKETS_ADMIN_QUERY_LIMIT`** (500).
  - **`ticketPostedAtMs`**: Accepts **`Pick<Ticket,'postedAt'>`** — normalizes Firestore **`Timestamp`** / ISO **`string`** for sorting and admin date display.
  - **`incrementTicketViews`**: Invoked from **`useTicketDetailListing`** after **`auth.authStateReady()`**, only when the viewer is **not** the seller; **`sessionStorage`** dedupes one bump per browser session per ticket (falls back to attempting bump if storage is unavailable). Anonymous viewers may still bump because rules allow unauthenticated **`views`** increments.
- **`deleteTicket`**: Deletes **`ticketAdminNotes/{id}`** best-effort **before** the ticket doc (ordering matters for seller-driven cleanup vs rules).
- **Public contact env**: [`src/lib/env/publicContact.ts`](src/lib/env/publicContact.ts) — **`getPublicWhatsAppLink`**, **`getPublicSupportPhone`**, **`phoneDisplayToTelHref`** / **`supportPhoneTelHref`** (`tel:` normalization for admin/contact links). **`VITE_PUBLIC_WHATSAPP_NUMBER`**, **`VITE_PUBLIC_SUPPORT_PHONE`** in `.env.example`.
- **Public site / footer**: **`VITE_PUBLIC_SITE_URL`** — optional production origin for admin mailto listing links (avoids localhost in emails during dev). **`VITE_PUBLIC_TELEGRAM_URL`** — optional full Telegram invite URL; footer **Stay in the loop** shows **Join Telegram** when set (see [`src/App.tsx`](src/App.tsx) `Footer`).
- **Vite**: [`vite.config.ts`](vite.config.ts) uses modular plugins only; **`DISABLE_HMR`** may disable HMR when set.

## Reusable systems

- **`src/lib/firebase/`**: `web-config`, `firebase` bootstrap, modular **`tickets`**, **`users`**, **`notifications`**, **`ticketReports`**, **`adminSettings`**, **`ticketAdminNotes`**, **`sellerTicketNotifications`**, **`errors`**, **`authErrors`**, **`authVerification`**.
- **`src/types/index.ts`**: Shared domain types (`User`, **`AdminUserRow`**, **`PendingAdminRow`**, `Ticket`, `Notification`, etc.) and `OperationType` / legacy **`FirestoreErrorInfo`**.
- **`src/constants.ts`**: Bangladesh-focused `STATIONS`, `TRANSPORTS`, `SEAT_CLASSES` for forms/filters.
- **`ErrorBoundary`**: Class boundary around routes with fallback UI.
- **`src/lib/adminDashboardTab.ts`**: Single source for admin UI tab ids (`overview`, `tickets`, `users`, `reports`, `logs`, `admins`), URL helpers **`adminDashboardPath`**, **`adminUserProfilePath`**, and query params **`tab`** (on `/admin`) / **`returnTab`** (on `/admin/users/:id` for **Back to dashboard**).

## Admin dashboard (high level)

- Large single page [`src/pages/AdminDashboard.tsx`](src/pages/AdminDashboard.tsx): typed **`Ticket`**, **`AdminUserRow`**, **`PendingAdminRow`**, **`AdminLog`**; manage-tickets **Listing detail** shows posted time, views, trip line, **`tel:`** seller links via **`phoneDisplayToTelHref`**, staff notes in **`ticketAdminNotes`**, and ticket ID in the first column links to the public listing (fetch keyed by ticket id set; merge preserves unsaved drafts).
- **Recent Ticket Posts** (overview): latest three listings by **`postedAt`**, seller phone when present.
- **Tab persistence**: Active tab is driven by **`useSearchParams`** — e.g. **`/admin?tab=tickets`**; **`overview`** omits **`tab`**. Survives refresh and external navigation. **`BuyerPurchaseRequestCard`** (admin) and in-dashboard profile links use **`adminUserProfilePath`** / paths with **`returnTab`** instead of React Router **`location.state`**. Non–Super Admin users hitting **`?tab=admins`** fall back to overview and the param is cleared.
- **Admin user profile**: [`src/pages/AdminUserProfile.tsx`](src/pages/AdminUserProfile.tsx) — **Back to dashboard** uses **`adminDashboardPath`** from **`returnTab`** query.

## Constraints

- **No mock/fake data** for product behavior; production-minded code (per `AGENTS.md`).
- **Firestore**: Minimize reads/writes and avoid gratuitous listeners; composite indexes may be required for filtered + ordered queries — notably **`notifications`** (`where('userId')` + `orderBy('createdAt')`), **`tickets`** (`sellerId` / `mode` / `from` / `to` + **`orderBy('postedAt')`**).
- **Secrets**: Never expose keys or embed them in docs; **`.env.example`** documents **`VITE_FIREBASE_*`** and public **`VITE_PUBLIC_*`** vars only.
- **Types/rules vs code**: Extend Firestore usage and rules together; unused rule surfaces (chat) drift from shipped features.

## Optimization notes

- Prefer **one-shot** `getDocs` / `getDoc` where realtime is unnecessary; use `subscribeTo*` only when the UI needs live updates (Browse uses pagination, not a global ticket listener).
- Admin **staff notes**: batched **`getDoc`** per ticket id chunk — refetches when ticket **id set** changes, not on every field edit (see inline exhaustive-deps note in `AdminDashboard`).
- Ticket queries assume a **`postedAt`** field for **`orderBy`**; legacy docs without it may be omitted from listings until backfilled.
- Auth session uses **two** Firestore listeners while signed in; changing role resolution may affect listener count and billing.
- **Firebase App Check** is not wired in the client bootstrap yet — optional hardening for abuse-prone writes beyond rule checks.

## Repo / agent tooling

- **`.agents/`**: Rules (`typescript`, `react`, `codequality`) and skills (`firebase`, `firebase-basics`, `api-design`, `debugging-strategies`, `performance-investigation`) live **in-repo**; **`performance-investigation`** SKILL text references generic bench scripts — adapt to this stack (Firestore reads, bundle, React Profiler) when doing perf work.
- **`.cursorignore`** (optional): Typically excludes `node_modules/`, `dist/`, logs, `.env.local` from Cursor indexing — **does not** exclude `.agents/`.

## App shell (`App.tsx`)

- **Navbar auth**: Uses **`loading`** from **`AuthContext`** — while **`authLoading`**, shows a neo-brutalist **session placeholder** (equalizer bars + optional **`Ticket`** glyph on mobile) instead of **Log In / Register**, so logged-in users do not flash guest CTAs on refresh. After resolve: dropdown for signed-in users; **admins** do **not** see **Alerts** or **Edit profile** in desktop dropdown or mobile sheet (sellers keep both).
- **Footer**: Brand column + **Stay in the loop** Telegram block (no email capture). Neutral fallback copy when **`VITE_PUBLIC_TELEGRAM_URL`** is unset.

## Dashboard / profile UI

- **[`src/pages/Dashboard.tsx`](src/pages/Dashboard.tsx)** + **[`EditProfileDialog`](src/components/common/EditProfileDialog.tsx)**: Optional **`dialogTitle`** — **`Profile`** vs **`Edit Profile`** label when **`currentUser.role === 'admin'`** vs seller (navbar no longer exposes profile entry for admins).

## Global CSS notes

- **`index.css`**: **`html { scrollbar-gutter: stable }`** reduces horizontal reflow when scrollbars appear (helps hero typography stability).
- **`Home.tsx`**: Hero **`h1`** uses **`text-balance`** alongside bundled Space Grotesk.

## Current project state

- **Maturity**: Single frontend app with Firebase backend; admin flows and marketplace pages under `src/pages/`.
- **Tooling**: `npm run lint` → `tsc --noEmit` only (no ESLint script in `package.json`).
- **Product naming**: UI branding **TransitSwap**; [`index.html`](index.html) title **TransitSwap**.
- **Dependencies**: **No** Google Gemini SDK — **`@google/genai`** was removed; no **`GEMINI_*`** env for this app.
- **Gaps**: Chat/messaging in rules but not in client; optional server deps unused; App Check not enabled; admin screen is a candidate for hook/component splits per `.agents/rules/react.mdc`.
