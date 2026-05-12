# Project memory

Concise long-term reference for **JatriSwap** (transit ticket marketplace). Full agent/process rules live in `AGENTS.md`, `.agents/rules`, and `.agents/skills`.

## Architecture

- **Client**: React 19 + Vite 6 SPA (`src/main.tsx` → `AuthProvider` → `App` with `react-router-dom` v7).
- **UI**: Tailwind CSS v4 (`@tailwindcss/vite`), shadcn-style primitives under `components/ui/` (Base UI–based where applicable), `@/` alias resolves to **repository root** (not `src/`).
- **Motion / UX**: `motion`, `sonner`, lucide icons; route transitions and scroll-to-top in `App.tsx`.
- **Fonts**: **Space Grotesk** (headings / `font-heading`) ships via **`@fontsource/space-grotesk/latin.css`** imported in [`src/main.tsx`](src/main.tsx) **before** [`src/index.css`](src/index.css). **Inter** and **JetBrains Mono** still load from the Google Fonts **`@import`** in `index.css` only — avoids late swap/reflow on the home hero. **`@fontsource-variable/geist`** remains in `package.json` but is not required for the shipped heading stack.
- **Backend (Firebase)**: Client SDK for Auth, Firestore, Storage (`src/lib/firebase/firebase.ts`).
- **Backend (Vercel serverless `api/`)**:
  - **`/api/contact`** — Contact form → Telegram. Uses Firestore guard collections **`_svcContactDedupe`** / **`_svcContactRate`** (transactional dedupe + rate limit). Validation shared with the UI via **`shared/contactValidation.ts`**.
  - **`/api/admin-delete-auth-user`** — Admin-only POST that verifies a Firebase ID token (RS256 + JWKS) and deletes a target Firebase Authentication user via Identity Toolkit REST. Caller must be `admins/{uid}.role === 'admin'` (or fallback `users/{uid}.role === 'admin'`).
  - Both handlers are **Node-style `(req, res)`** so Vercel commits the response (the Web-style return-a-`Response` shape caused 30s `FUNCTION_INVOCATION_TIMEOUT` when the runtime fell back to Node mode).
- **Server deps stripped to zero npm packages for Firebase**: `firebase-admin` and `@google-cloud/firestore` are both removed. Server-side Firestore goes through a hand-rolled REST client ([`api/lib/contact/firestoreRest.ts`](api/lib/contact/firestoreRest.ts)) mirroring the firebase-admin/firestore surface (`Firestore`, `DocumentReference`, `Timestamp`, `FieldValue.serverTimestamp`, transactions). Service-account JWT → Google OAuth access token is cached at module scope in [`api/lib/firebaseAdmin.ts`](api/lib/firebaseAdmin.ts). The admin route is **fully inlined** (zero `./lib/**` relative imports) because Vercel's serverless tracer repeatedly dropped nested files for that specific entry. **No Firebase Cloud Functions** for any flow.

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
  - **`notifications`**: Creates validate **`alert` \| `info` \| `success`** and optional **`title`** (`createNotification` in [`notifications.ts`](src/lib/firebase/notifications.ts)). **List/get** open to **`isAdmin()`** as well as the owner — needed by admin hard-delete and moderation tooling.
  - **`users`** / **`admins`**: `delete` permitted for `isAdmin()` (admin user wipe) and for the owner of `users/{uid}` (self-delete from profile).
  - **`isVerified()`** in rules is still relaxed (`true`) for preview/email-password ergonomics — tighten intentionally before strict production if desired.

## Important decisions

- **Profile source**: `AuthContext` listens to **`users/{uid}` and `admins/{uid}`**; whichever exists drives `currentUser` (admins are not only in `users`). **Remote-delete sign-out** — when *both* docs were seen at least once this session and then vanish, the context calls `signOut(auth)` and toasts. Guards (`userProfileEverExistedRef`, `adminProfileEverExistedRef`, `remoteSignOutInFlightRef`) prevent signing users out during signup race windows.
- **Errors**: [`handleFirestoreError`](src/lib/firebase/errors.ts) logs a **small structured object** (`operationType`, `path`, `userId`, optional Firebase **`code`**, **`message`**) — **no** provider/email payloads — then throws **`FirestoreServiceError`** with a generic **`message`** for callers/UI. Catch paths should assume **`FirestoreServiceError`** (legacy **`FirestoreErrorInfo`** type may still exist in types but is not what gets logged anymore).
- **Tickets — queries & listeners** ([`tickets.ts`](src/lib/firebase/tickets.ts)):
  - **`subscribeToSellerTickets(sellerId)`**: Dashboard — **`where('sellerId','==', …)`** + **`orderBy('postedAt','desc')`** + **`limit`** (default cap 120).
  - **`subscribeToTickets`**: Home/marketing — optional filters; **`orderBy('postedAt','desc')`** + **`limit`** using **`TICKETS_SUBSCRIPTION_CAP`** (200) unless **`maxDocuments`** overrides (e.g. Home uses a lower cap).
  - **`fetchTicketsPage` / `TICKETS_PAGE_SIZE`**: Browse — paginated **`getDocs`** with **`startAfter`**; refetches when route filters change; **Load more** appends pages.
  - **`getTickets`**: Admin bulk listing — same filter shape, **`orderBy('postedAt','desc')`**, bounded by **`TICKETS_ADMIN_QUERY_LIMIT`** (500).
  - **`ticketPostedAtMs`**: Accepts **`Pick<Ticket,'postedAt'>`** — normalizes Firestore **`Timestamp`** / ISO **`string`** for sorting and admin date display.
  - **`incrementTicketViews`**: Invoked from **`useTicketDetailListing`** after **`auth.authStateReady()`**, only when the viewer is **not** the seller **and** the listing passes `isTicketPubliclyListed` (no bumps on sold / moderation-locked / Dhaka-time–expired listings); **`sessionStorage`** dedupes one bump per browser session per ticket (falls back to attempting bump if storage is unavailable). Anonymous viewers may still bump because rules allow unauthenticated **`views`** increments.
- **`deleteTicket`**: Deletes **`ticketAdminNotes/{id}`** best-effort **before** the ticket doc (ordering matters for seller-driven cleanup vs rules).
- **Public contact env**: [`src/lib/env/publicContact.ts`](src/lib/env/publicContact.ts) — **`getPublicWhatsAppLink`**, **`getPublicSupportPhone`**, **`phoneDisplayToTelHref`** / **`supportPhoneTelHref`** (`tel:` normalization for admin/contact links). **`VITE_PUBLIC_WHATSAPP_NUMBER`**, **`VITE_PUBLIC_SUPPORT_PHONE`** in `.env.example`.
- **Public site / footer**: **`VITE_PUBLIC_SITE_URL`** — optional production origin for admin mailto listing links (avoids localhost in emails during dev). **`VITE_PUBLIC_TELEGRAM_URL`** — optional full Telegram invite URL; footer **Stay in the loop** shows **Join Telegram** when set (see [`src/App.tsx`](src/App.tsx) `Footer`).
- **Vite**: [`vite.config.ts`](vite.config.ts) uses modular plugins only; **`DISABLE_HMR`** may disable HMR when set.
- **Admin user hard-delete** ([`AdminDashboard`](src/pages/AdminDashboard.tsx) + [`scheduledDeleteUndo`](src/lib/scheduledDeleteUndo.ts) + [`deleteUserData`](src/lib/firebase/users.ts) + [`adminDeleteTargetAuth`](src/lib/firebase/adminDeleteTargetAuth.ts)):
  - 30-second Sonner toast countdown with **Undo**. UI optimistically removes the user row and their listings; restores on undo or commit failure.
  - On commit: **Auth first** via `/api/admin-delete-auth-user`, then Firestore cleanup in parallel batches — `tickets` (+ `ticketAdminNotes`), `purchaseRequests` (seller + buyer), `ticketReports` (seller + reporter), `notifications`, optional `admins/{uid}`, then `users/{uid}`. Auth-first ordering avoids leaving Firestore-wiped accounts with usable login.
  - Reuses the shared `scheduledDeleteUndo` helper with `scheduleTicketDeleteWithUndo` (10s) — single LRU map keyed by `operation:id`.

## Reusable systems

- **`src/lib/firebase/`**: `web-config`, `firebase` bootstrap, modular **`tickets`**, **`users`**, **`notifications`**, **`ticketReports`**, **`adminSettings`**, **`ticketAdminNotes`**, **`sellerTicketNotifications`**, **`adminDeleteTargetAuth`**, **`errors`**, **`authErrors`**, **`authVerification`**.
- **`src/types/index.ts`**: Shared domain types (`User`, **`AdminUserRow`**, **`PendingAdminRow`**, `Ticket`, `Notification`, etc.) and `OperationType` / legacy **`FirestoreErrorInfo`**.
- **`src/constants.ts`**: Bangladesh-focused `STATIONS` (166 stations/cities) + `TRAIN_NAMES` (69 trains) and `BUS_NAMES` (14 buses) — all frozen `as const`. Helper `transportNamesForMode(mode)` returns the right autocomplete list; `TRANSPORTS` is derived from the two name lists (`{ name, type, mode }`) so Sell / EditTicketDialog `mode` lookups still resolve for every autocomplete option. Also exports `TRAIN_SEAT_CLASSES` / `BUS_SEAT_CLASSES`.
- **[`src/components/common/Autocomplete.tsx`](src/components/common/Autocomplete.tsx)**: Free-text typeahead used by Home / Browse / Sell / EditTicketDialog for both From/To (`station.from` / `station.to`) and transport name (`transport.train` / `transport.bus`). Suggestion rules — empty: scope's recent picks; 1–2 chars: matching recents only (catalog hidden); 3+ chars: startsWith → contains → recents-first. Recents persisted in `localStorage` under `jatriswap.recent.<scope>` (LRU, `RECENT_MAX = 5`); `lastSavedLcRef` skips redundant writes when commit + blur cover the same value. ARIA combobox + keyboard nav.
- **[`src/lib/ticketExpiration.ts`](src/lib/ticketExpiration.ts)**: Single source of truth for **ticket auto-expiration** — derived, no Firestore writes. Pins all trip date/time math to **`Asia/Dhaka` (UTC+6, no DST)** so `date + departureTime` mean the same instant for every viewer. Exports **`ticketDepartureDhakaMs`**, **`isTicketExpired`** (honors stored `status === 'expired'`; **sold beats expired**), **`ticketDisplayStatus`** (badge label), **`isTicketPubliclyListed`** + **`filterPubliclyListedTickets`** (Home / Browse / discovery gate). Detail-page gate **`isTicketDetailHiddenFromPublicBuyer`** also routes through `isTicketExpired` so anonymous buyers never reach expired URLs; sellers + admins still see expired listings for management/history (Dashboard, AdminDashboard, AdminUserProfile, TicketDetails). **`Sell.tsx`** uses the same Dhaka math to block past-departure submissions; **`useTicketDetailListing`** skips the `views` bump on expired listings.
- **[`src/lib/scheduledDeleteUndo.ts`](src/lib/scheduledDeleteUndo.ts)**: Single shared LRU-keyed delete-with-undo helper backing both ticket (10s) and admin-user (30s) flows. No duplicate timers / toast logic.
- **[`src/lib/vercelDeployApiUrl.ts`](src/lib/vercelDeployApiUrl.ts)**: Single resolver used by **`submitContactMessage`** and **`adminDeleteTargetAuth`** for `VITE_CONTACT_API_URL`-aware `/api/*` URLs.
- **`ErrorBoundary`**: Class boundary around routes with fallback UI.
- **[`FloatingWhatsAppHelp`](src/components/common/FloatingWhatsAppHelp.tsx)**: Fixed-position WhatsApp CTA mounted in `AppLayout`; honors `getPublicWhatsAppLink()` (renders nothing when env unset).
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
- **Server cold starts** are minimal: no `firebase-admin` / `@google-cloud/firestore` / gRPC; only native `fetch` + `node:crypto`. JWKS public keys cached per Google's `Cache-Control: max-age`; service-account → OAuth access token cached at module scope until 60s before expiry; Firestore REST client cached after first init (warm-lambda reuse).
- **`deleteUserData`** parallelizes all six independent Firestore reads with `Promise.all`, then the three independent batched delete chains (`ticketReports` / `purchaseRequests` / `notifications`) before the ordered `ticketAdminNotes`→`tickets` batch.
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

## Hosting (Vercel)

- **[`vercel.json`](vercel.json)**: SPA fallback rewrite (paths **not** under **`/api/*`**) → `index.html` so React Router handles paths client-side (fixes refresh **404** on `/browse`, `/admin`, etc.). Function entries register `maxDuration: 30` for both `api/contact.ts` and `api/admin-delete-auth-user.ts`. **No `memory` setting** (ignored on Active CPU billing). **No `includeFiles`** — both handlers ship only `node:*` + small handler-local imports; the heavy `firebase-admin` / `@google-cloud/firestore` / `google-gax` subtrees that used to need `includeFiles` for NFT tracing are gone.
- **`package.json` `engines`**: pinned to **`"node": "22.x"`** (was `">=20"`) to silence Vercel's auto-upgrade warning and lock the runtime to current LTS.
- That logic runs **only at the edge/router** when the browser requests a document — **not** in your JS bundle. It does **not** add components, listeners, or extra React reconciliation versus any other static host SPA setup.
- Vercel serves **existing files under `dist/` first** (e.g. **`/assets/*`** hashed chunks from Vite, files from **`public/`**). The rewrite applies when there is **no** such file; keeping a single **`/(.*)` → `/index.html`** rule is standard and avoids misrouting **`/favicon.ico`** or root **`public`** assets that a narrower regex might accidentally capture.

## Current project state

- **Maturity**: Single frontend app with Firebase backend; admin flows and marketplace pages under `src/pages/`.
- **Tooling**: `npm run lint` → `tsc --noEmit` only (no ESLint script in `package.json`).
- **Product naming**: UI branding **JatriSwap**; [`index.html`](index.html) title **JatriSwap**.
- **Dependencies**: **No** Google Gemini SDK (**`@google/genai`** was removed). **No** `firebase-admin`, **no** `@google-cloud/firestore` — server uses a custom Firestore REST client + native `node:crypto`. `npm audit` shows **0 vulnerabilities** with the **only** override being `uuid` (unrelated to security).
- **Gaps**: Chat/messaging in rules but not in client; App Check not enabled; admin screen is a candidate for hook/component splits per `.agents/rules/react.mdc`.
