# Project memory

Concise long-term reference for **JatriSwap** (transit ticket marketplace). Full agent/process rules live in `AGENTS.md`, `.agents/rules`, and `.agents/skills`.

## Architecture

- **Client**: React 19 + Vite 6 SPA (`src/main.tsx` → `AuthProvider` → `App` with `react-router-dom` v7).
- **UI**: Tailwind CSS v4 (`@tailwindcss/vite`), shadcn-style primitives under `components/ui/` (Base UI–based where applicable), `@/` alias resolves to **repository root** (not `src/`).
- **Motion / UX**: `motion`, `sonner`, lucide icons; route transitions and scroll-to-top in `App.tsx`.
- **Fonts**: **Space Grotesk** (headings / `font-heading`) ships via **`@fontsource/space-grotesk/latin.css`** imported in [`src/main.tsx`](src/main.tsx) **before** [`src/index.css`](src/index.css). **Inter** and **JetBrains Mono** still load from the Google Fonts **`@import`** in `index.css` only — avoids late swap/reflow on the home hero. **`@fontsource-variable/geist`** remains in `package.json` but is not required for the shipped heading stack.
- **Backend (Firebase)**: Client SDK for Auth, Firestore, Storage (`src/lib/firebase/firebase.ts`). App Check is bootstrapped lazily via `requestIdleCallback` in [`src/main.tsx`](src/main.tsx) — gated by `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
- **SEO**: [`src/lib/seo/`](src/lib/seo/) — runtime document meta via `useRouteDocumentMeta` hook, listing-specific meta for ticket detail pages, public origin resolver, and static route SEO descriptors.
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
- **Errors/logging hardening**:
  - Client-side logs now go through [`clientLogger`](src/lib/runtime/clientLogger.ts), which is **DEV-only** (`import.meta.env.DEV` gate). Production browser builds suppress debug/info/warn/error console output from app code paths migrated to this logger.
  - User-visible messages should use `userVisibleErrorMessage(error, fallback)` so production keeps sanitized fallback copy while development can still show actionable detail.
  - [`handleFirestoreError`](src/lib/firebase/errors.ts) logs structured metadata (`operationType`, `path`, `userId`, optional Firebase `code`) then throws `FirestoreServiceError` with a production-safe message.
  - Server-side logs are centralized in [`api/lib/serverLogging.ts`](api/lib/serverLogging.ts): production logs keep terse error shape (name/type), while detailed message/stack stays development-only.
- **Tickets — queries & listeners** ([`tickets.ts`](src/lib/firebase/tickets.ts)):
  - **`subscribeToSellerTickets(sellerId)`**: Dashboard — **`where('sellerId','==', …)`** + **`orderBy('postedAt','desc')`** + **`limit`** (default cap 120).
  - **`subscribeToTickets`**: Home/marketing — optional filters; **`orderBy('postedAt','desc')`** + **`limit`** using **`TICKETS_SUBSCRIPTION_CAP`** (200) unless **`maxDocuments`** overrides (e.g. Home uses a lower cap).
  - **`fetchTicketsPage` / `TICKETS_PAGE_SIZE`**: Browse — paginated **`getDocs`** with **`startAfter`**; refetches when route filters change; **Load more** appends pages.
  - **`getTickets`**: Admin bulk listing — same filter shape, **`orderBy('postedAt','desc')`**, bounded by **`TICKETS_ADMIN_QUERY_LIMIT`** (500).
  - **`ticketPostedAtMs`**: Accepts **`Pick<Ticket,'postedAt'>`** — normalizes Firestore **`Timestamp`** / ISO **`string`** for sorting and admin date display.
  - **`incrementTicketViews`**: Invoked from **`useTicketDetailListing`** after **`auth.authStateReady()`**, only when the viewer is **not** the seller **and** the listing passes `isTicketPubliclyListed` (no bumps on sold / moderation-locked / Dhaka-time–expired listings); **`sessionStorage`** dedupes one bump per browser session per ticket (falls back to attempting bump if storage is unavailable). Anonymous viewers may still bump because rules allow unauthenticated **`views`** increments.
- **`deleteTicket`**: Deletes **`ticketAdminNotes/{id}`** best-effort **before** the ticket doc (ordering matters for seller-driven cleanup vs rules).
- **Public contact env**: [`src/lib/env/publicContact.ts`](src/lib/env/publicContact.ts) — **`getPublicWhatsAppLink`**, **`getPublicSupportPhone`**, **`phoneDisplayToTelHref`** / **`supportPhoneTelHref`** (`tel:` normalization for admin/contact links). **`VITE_PUBLIC_WHATSAPP_NUMBER`**, **`VITE_PUBLIC_SUPPORT_PHONE`** in `.env.example`.
- **Public site / footer**: **`VITE_PUBLIC_SITE_URL`** — optional production origin for admin mailto listing links (avoids localhost in emails during dev). **`VITE_PUBLIC_FACEBOOK_URL`** — optional full Facebook page/group URL; footer **Stay in the loop** shows **Join Facebook** when set (see [`src/App.tsx`](src/App.tsx) `Footer`).
- **Vite**: [`vite.config.ts`](vite.config.ts) uses modular plugins only; production build explicitly sets `build.sourcemap = false`; **`DISABLE_HMR`** may disable HMR when set.
- **Admin user hard-delete** ([`AdminDashboard`](src/pages/AdminDashboard.tsx) + [`scheduledDeleteUndo`](src/lib/scheduledDeleteUndo.ts) + [`deleteUserData`](src/lib/firebase/users.ts) + [`adminDeleteTargetAuth`](src/lib/firebase/adminDeleteTargetAuth.ts)):
  - 30-second Sonner toast countdown with **Undo**. UI optimistically removes the user row and their listings; restores on undo or commit failure.
  - On commit: **Auth first** via `/api/admin-delete-auth-user`, then Firestore cleanup in parallel batches — `tickets` (+ `ticketAdminNotes`), `purchaseRequests` (seller + buyer), `ticketReports` (seller + reporter), `notifications`, optional `admins/{uid}`, then `users/{uid}`. Auth-first ordering avoids leaving Firestore-wiped accounts with usable login.
  - Reuses the shared `scheduledDeleteUndo` helper with `scheduleTicketDeleteWithUndo` (10s) — single LRU map keyed by `operation:id`.

## Reusable systems

- **`src/lib/firebase/`**: `web-config`, `firebase` bootstrap, modular **`tickets`**, **`users`**, **`notifications`**, **`purchaseRequests`**, **`ticketReports`**, **`adminSettings`**, **`ticketAdminNotes`**, **`sellerTicketNotifications`**, **`adminDeleteTargetAuth`**, **`userModeration`**, **`submitContactMessage`**, **`queryPageSlice`**, **`errors`**, **`authErrors`**, **`authVerification`**.
- **`src/types/index.ts`**: Shared domain types (`User`, **`AdminUserRow`**, **`PendingAdminRow`**, `Ticket`, `Notification`, `PurchaseRequest`, `TicketReport`, `AdminLog`, `AdminSettings`, etc.) and `OperationType` / legacy **`FirestoreErrorInfo`**.
- **`src/constants.ts`**: Bangladesh-focused `STATIONS` (166 stations/cities) + `TRAIN_NAMES` (69 trains) and `BUS_NAMES` (14 buses) — all frozen `as const`. Helper `transportNamesForMode(mode)` returns the right autocomplete list; `TRANSPORTS` is derived from the two name lists (`{ name, type, mode }`) so Sell / EditTicketDialog `mode` lookups still resolve for every autocomplete option. Also exports `TRAIN_SEAT_CLASSES` / `BUS_SEAT_CLASSES`.
- **[`src/components/common/Autocomplete.tsx`](src/components/common/Autocomplete.tsx)**: Free-text typeahead used by Home / Browse / Sell / EditTicketDialog for both From/To (`station.from` / `station.to`) and transport name (`transport.train` / `transport.bus`). Suggestion rules — empty: scope's recent picks; 1–2 chars: matching recents only (catalog hidden); 3+ chars: startsWith → contains → recents-first. Recents persisted in `localStorage` under `jatriswap.recent.<scope>` (LRU, `RECENT_MAX = 5`); `lastSavedLcRef` skips redundant writes when commit + blur cover the same value. ARIA combobox + keyboard nav.
- **[`src/lib/ticketExpiration.ts`](src/lib/ticketExpiration.ts)**: Single source of truth for **ticket auto-expiration** — derived, no Firestore writes. Pins all trip date/time math to **`Asia/Dhaka` (UTC+6, no DST)** so `date + departureTime` mean the same instant for every viewer. Exports **`ticketDepartureDhakaMs`**, **`isTicketExpired`** (honors stored `status === 'expired'`; **sold beats expired**), **`ticketDisplayStatus`** (badge label), **`isTicketPubliclyListed`** + **`filterPubliclyListedTickets`** (Home / Browse / discovery gate). Detail-page gate **`isTicketDetailHiddenFromPublicBuyer`** also routes through `isTicketExpired` so anonymous buyers never reach expired URLs; sellers + admins still see expired listings for management/history (Dashboard, AdminDashboard, AdminUserProfile, TicketDetails). **`Sell.tsx`** uses the same Dhaka math to block past-departure submissions; **`useTicketDetailListing`** skips the `views` bump on expired listings.
- **[`src/lib/scheduledDeleteUndo.ts`](src/lib/scheduledDeleteUndo.ts)**: Single shared LRU-keyed delete-with-undo helper backing both ticket (10s) and admin-user (30s) flows. No duplicate timers / toast logic.
- **[`src/lib/seo/`](src/lib/seo/)**: Module for **runtime document metadata** — `applyDocumentMeta` sets `<title>` & `<meta>`, `listingDocumentMeta` builds ticket-specific OG tags, `publicOrigin` resolves `VITE_PUBLIC_SITE_URL`, and `routeSeo` provides static route descriptors. Used by `useRouteDocumentMeta` hook in page components.
- **[`src/lib/analytics/googleAnalytics.ts`](src/lib/analytics/googleAnalytics.ts)**: GA4 gtag snippet injection. `injectGoogleAnalytics` is called from `index.html` at build time if `VITE_PUBLIC_GA_MEASUREMENT_ID` is set. Not bundled in the JS app bundle.
- **[`src/lib/avatar/`](src/lib/avatar/)**: Full avatar system — `catalog.ts` (public avatar path list), `pickRandomPublicAvatarPath`, `resolveDisplayAvatarUrl` (resolves public path or Firestore URL), `profileFirestore` (collection/ref helpers), `buildAvatarProfilePatch`, `persistProfileDisplayAvatar`, `googleSignupProfile` (Google SSO profile fields). Re-exported via barrel `index.ts`.
- **[`src/lib/branding/`](src/lib/branding/)**: Branding utilities — `jatriSwapFaviconSvg` (SVG favicon data URI), `jatriSwapTicketMarkGeometry` (ticket icon SVG path).
- **[`src/lib/runtime/`](src/lib/runtime/)**: `clientLogger` (DEV-only console suppression gate), `requestCache` (in-memory async request deduplication).
- **[`src/lib/contact/contactForm.ts`](src/lib/contact/contactForm.ts)**: Client-side contact form submission via `submitContactMessage` — calls `/api/contact`.
- **[`src/lib/initialsFromDisplayName.ts`](src/lib/initialsFromDisplayName.ts)**: Extracts initials from a display name for avatar fallback.
- **[`src/lib/listingSaveFeedback.ts`](src/lib/listingSaveFeedback.ts)**: Toast/sonner helpers for save/publish actions.
- **[`src/lib/listingWriteGuard.ts`](src/lib/listingWriteGuard.ts)**: Pre-submission validation for ticket listings (departure not in past).
- **[`src/lib/moderationNotifications.ts`](src/lib/moderationNotifications.ts)**: Creates admin notifications for moderation events.
- **[`src/lib/sellerListingControls.ts`](src/lib/sellerListingControls.ts)**: Seller-side mark-as-sold / delete ticket controls.
- **[`src/lib/userAccountStatus.ts`](src/lib/userAccountStatus.ts)**: Derives user account status (verified, banned, etc.) from Firestore doc.
- **[`src/lib/adminSearchText.ts`](src/lib/adminSearchText.ts)**: Full-text search builder for admin ticket/user queries.
- **[`src/lib/adminTableUi.ts`](src/lib/adminTableUi.ts)**: Shared admin table pagination/UI state helpers.
- **[`src/lib/adminDisplay.ts`](src/lib/adminDisplay.ts)**: Admin display formatters.
- **[`src/lib/adminTicketReportSearch.ts`](src/lib/adminTicketReportSearch.ts)**: Admin ticket report search/sort logic.
- **[`src/lib/adminUserSearch.ts`](src/lib/adminUserSearch.ts)**: Admin user search/filter helpers.
- **[`src/lib/aggregateSellerTicketStats.ts`](src/lib/aggregateSellerTicketStats.ts)**: Aggregates ticket stats by seller for admin overview.
- **[`src/lib/brutalistSingleDayCalendar.ts`](src/lib/brutalistSingleDayCalendar.ts)**: Single-day date picker using `react-day-picker` with neo-brutalist styling.
- **[`src/lib/copyTextWithToast.ts`](src/lib/copyTextWithToast.ts)**: Clipboard copy with toast feedback.
- **[`src/lib/formatAdminTripLine.ts`](src/lib/formatAdminTripLine.ts)**: Formats trip line for admin display (mode + route + time).
- **[`src/lib/formatDepartureTime.ts`](src/lib/formatDepartureTime.ts)**: Formats departure time string for listing cards.
- **[`src/lib/formatLocaleDateTime.ts`](src/lib/formatLocaleDateTime.ts)**: Locale-aware date/time formatting.
- **[`src/lib/formatPurchaseRequest.ts`](src/lib/formatPurchaseRequest.ts)**: Formats purchase request data for display.
- **[`src/lib/isAdminAppRoute.ts`](src/lib/isAdminAppRoute.ts)**: Route guard — checks if current path is under `/admin`.
- **[`src/lib/ticketDetailAdminReturn.ts`](src/lib/ticketDetailAdminReturn.ts)**: Builds "Back to admin" return links for ticket detail pages.
- **[`src/lib/ticketDetailVisibility.ts`](src/lib/ticketDetailVisibility.ts)**: Visibility gate logic for ticket detail page (public vs seller vs admin views).
- **[`src/lib/ui/authShellClasses.ts`](src/lib/ui/authShellClasses.ts)**: Shared CSS class sets for auth pages (login, register, etc.).
- **[`src/lib/vercelDeployApiUrl.ts`](src/lib/vercelDeployApiUrl.ts)**: Single resolver used by **`submitContactMessage`** and **`adminDeleteTargetAuth`** for `VITE_CONTACT_API_URL`-aware `/api/*` URLs.
- **`ErrorBoundary`**: Class boundary around routes with fallback UI.
- **[`FloatingWhatsAppHelp`](src/components/common/FloatingWhatsAppHelp.tsx)**: Fixed-position WhatsApp CTA mounted in `AppLayout`; honors `getPublicWhatsAppLink()` (renders nothing when env unset).
- **`src/lib/adminDashboardTab.ts`**: Single source for admin UI tab ids (`overview`, `tickets`, `users`, `reports`, `logs`, `admins`), URL helpers **`adminDashboardPath`**, **`adminUserProfilePath`**, and query params **`tab`** (on `/admin`) / **`returnTab`** (on `/admin/users/:id` for **Back to dashboard**).

## Hooks

- **`useRouteDocumentMeta`**: Sets `<title>` and `<meta>` tags per route using `src/lib/seo/`. Used by page components.
- **`useTicketDetailListing`**: Fetches a single ticket doc + optional admin note; increments views via `incrementTicketViews`; gates expired/hidden listings.
- **`useTicketSellerPrivacy`**: Controls seller phone reveal on ticket detail page.
- **`useTicketDetailAdminLinkState`**: Persists admin return-tab state for ticket detail back-links.
- **`useAvatarPickerFromProfile`**: Avatar picker dialog state for profile editing.
- **`useCalendarPopoverSelect`**: Calendar popover open/close + selection state for date pickers.
- **`useSellerNotificationsSubscription`**: Realtime subscription to seller notifications (`notifications` collection filtered by userId).
- **`useSignupAvatarDraft`**: Draft avatar selection state during signup.

## Common components

- **[`Autocomplete`](src/components/common/Autocomplete.tsx)**: Free-text typeahead for stations/transport, with `localStorage` recents (LRU, max 5) and ARIA combobox + keyboard nav.
- **[`TicketCard`](src/components/common/TicketCard.tsx)**: Listing card for grid/feed views.
- **[`EditTicketDialog`](src/components/common/EditTicketDialog.tsx)**: Dialog for editing a ticket listing.
- **[`EditProfileDialog`](src/components/common/EditProfileDialog.tsx)**: Profile editing dialog with avatar picker.
- **[`TimePicker`](src/components/common/TimePicker.tsx)**: Time selector input.
- **[`FloatingWhatsAppHelp`](src/components/common/FloatingWhatsAppHelp.tsx)**: Fixed-position WhatsApp CTA.
- **[`AuthLoadingPlaceholder`](src/components/common/AuthLoadingPlaceholder.tsx)**: Neo-brutalist session placeholder shown while auth initializes.
- **[`AdminUserFirestoreAvatar`](src/components/common/AdminUserFirestoreAvatar.tsx)**: Admin UI avatar display using Firestore avatar URL.
- **[`AvatarChoiceTrigger`](src/components/common/AvatarChoiceTrigger.tsx)**: Avatar selection trigger button.
- **[`ProfileAvatarPickerDialog`](src/components/common/ProfileAvatarPickerDialog.tsx)**: Avatar picker dialog (public avatars + upload).
- **[`BuyerPurchaseRequestCard`](src/components/common/BuyerPurchaseRequestCard.tsx)**: Admin card showing a purchase request.
- **[`DashboardAlertRow`](src/components/common/DashboardAlertRow.tsx)**: Notification row for seller dashboard alerts.
- **[`MarkAllNotificationsReadButton`](src/components/common/MarkAllNotificationsReadButton.tsx)**: Button to mark all notifications as read.
- **[`JatriSwapLogo`](src/components/branding/JatriSwapLogo.tsx)**: Brand SVG logo component.
- **`ErrorBoundary`**: Class boundary around routes with fallback UI.

## Transit page ([`src/pages/Transit.tsx`](src/pages/Transit.tsx))

- A **discovery hub** page (`/transit`) that presents an interactive directory of Bangladesh's train stations, trains, and bus services.
- Features a manifest-card UI with search/filter by query, entity counts (stations/trains/buses), and links to Browse with pre-filled filters.
- Uses `STATIONS`, `TRAIN_NAMES`, `BUS_NAMES` from `src/constants.ts`. No Firestore dependency.

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
- **Firebase App Check** is wired in client bootstrap via `initializeFirebaseAppCheck()` and gated by `VITE_FIREBASE_APP_CHECK_SITE_KEY`; absent key keeps behavior unchanged.

## Repo / agent tooling

- **`.agents/`**: Rules (`typescript`, `react`, `codequality`) and skills (`firebase`, `firebase-basics`, `api-design`, `debugging-strategies`, `performance-investigation`) live **in-repo**; **`performance-investigation`** SKILL text references generic bench scripts — adapt to this stack (Firestore reads, bundle, React Profiler) when doing perf work.
- **`.cursorignore`** (optional): Typically excludes `node_modules/`, `dist/`, logs, `.env.local` from Cursor indexing — **does not** exclude `.agents/`.

## App shell (`App.tsx`)

- **Navbar auth**: Uses **`loading`** from **`AuthContext`** — while **`authLoading`**, shows a neo-brutalist **session placeholder** (equalizer bars + optional **`Ticket`** glyph on mobile) instead of **Log In / Register**, so logged-in users do not flash guest CTAs on refresh. After resolve: dropdown for signed-in users; **admins** do **not** see **Alerts** or **Edit profile** in desktop dropdown or mobile sheet (sellers keep both).
- **Footer**: Brand column + **Stay in the loop** Facebook block (no email capture). Neutral fallback copy when **`VITE_PUBLIC_FACEBOOK_URL`** is unset.

## Dashboard / profile UI

- **[`src/pages/Dashboard.tsx`](src/pages/Dashboard.tsx)** + **[`EditProfileDialog`](src/components/common/EditProfileDialog.tsx)**: Optional **`dialogTitle`** — **`Profile`** vs **`Edit Profile`** label when **`currentUser.role === 'admin'`** vs seller (navbar no longer exposes profile entry for admins).

## Global CSS notes

- **`index.css`**: **`html { scrollbar-gutter: stable }`** reduces horizontal reflow when scrollbars appear (helps hero typography stability).
- **`Home.tsx`**: Hero **`h1`** uses **`text-balance`** alongside bundled Space Grotesk.

## Hosting (Vercel)

- **[`vercel.json`](vercel.json)**: SPA fallback rewrite (paths not under `/api/*`, `*.xml`, `robots.txt`) → `index.html` so React Router handles paths client-side (fixes refresh **404** on `/browse`, `/admin`, etc.). Function entries register `maxDuration: 30` for both `api/contact.ts` and `api/admin-delete-auth-user.ts`. Headers set `X-Robots-Tag: noindex, nofollow, noarchive` on `/admin/*` paths, and explicit `Content-Type`/`Cache-Control` for `/sitemap-main.xml` and `/robots.txt`. `buildCommand`: `npm run build`. `outputDirectory`: `dist`. **No `memory` setting** (ignored on Active CPU billing). **No `includeFiles`** — both handlers ship only `node:*` + small handler-local imports; the heavy `firebase-admin` / `@google-cloud/firestore` / `google-gax` subtrees that used to need `includeFiles` for NFT tracing are gone.
- **`package.json`**: **no `engines.node`** — the Node version comes from **Vercel → Project → Settings** (use **24.x** LTS there). A pinned `engines` value was overriding the dashboard and triggered “Project Setting overridden by package.json.”
- **Google Analytics (GA4)**: **`VITE_PUBLIC_GA_MEASUREMENT_ID`** must be set **before** `vite run build` (e.g. Vercel env for Production + **Redeploy**). Without it, gtag never loads. Built `index.html` includes `<!-- jatriswap-ga:… -->` (View Source) to confirm. Incognito does not change that.
- That logic runs **only at the edge/router** when the browser requests a document — **not** in your JS bundle. It does **not** add components, listeners, or extra React reconciliation versus any other static host SPA setup.
- Vercel serves **existing files under `dist/` first** (e.g. **`/assets/*`** hashed chunks from Vite, files from **`public/`**). The rewrite applies when there is **no** such file; keeping a single **`/(.*)` → `/index.html`** rule is standard and avoids misrouting **`/favicon.ico`** or root **`public`** assets that a narrower regex might accidentally capture.

## Current project state

- **Maturity**: Single frontend app with Firebase backend; admin flows and marketplace pages under `src/pages/`.
- **Tooling**: `npm run lint` → `tsc --noEmit` only (no ESLint script in `package.json`).
- **Product naming**: UI branding **JatriSwap**; [`index.html`](index.html) title **JatriSwap**.
- **Dependencies**: Firebase v12, React 19, React Router v7.14, Motion v12, Sonner v2, date-fns v4, Tailwind CSS v4, Base UI v1. **No** Google Gemini SDK (**`@google/genai`** was removed). **No** `firebase-admin`, **no** `@google-cloud/firestore` — server uses a custom Firestore REST client + native `node:crypto`. `npm audit` shows **0 vulnerabilities** with the **only** override being `uuid` (unrelated to security).
- **Gaps**: Chat/messaging in rules but not in client; admin screen is a candidate for hook/component splits per `.agents/rules/react.mdc`.
