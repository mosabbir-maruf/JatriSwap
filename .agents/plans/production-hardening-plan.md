# Production Hardening Plan

## Goal
Ship a safe, incremental pass across performance, security, SEO, Firebase cost efficiency, and cleanup without changing finalized UI/UX or core product behavior.

## Scope Guardrails
- No redesign, no feature churn, no schema-breaking changes.
- Prefer low-risk, high-impact changes first.
- Keep Firestore reads/writes bounded and explicit.
- Preserve route structure and existing user flows.

## Findings (categorized)

### 1) Performance & Cost (Firestore / Runtime)
**Priority: P0**

1. **Boot-time Firestore read on every app load**
   - `src/lib/firebase/firebase.ts` calls `testConnection()` unconditionally.
   - Impact: guaranteed extra read + startup latency for every visitor.
   - Risk: unnecessary billed reads and avoidable failure noise.

2. **Home preview subscription reads too many docs**
   - `src/pages/Home.tsx` uses `subscribeToTickets(..., { maxDocuments: 120 })` for a 6-card preview.
   - Impact: high realtime read churn for a small visible surface.
   - Risk: sustained free-tier pressure and unnecessary listener traffic.

3. **Viewport check in render path**
   - `src/pages/Browse.tsx` uses `window.innerWidth` directly in JSX condition.
   - Impact: render-time global read, brittle responsive logic.
   - Risk: inconsistent behavior across resize and reduced render predictability.

### 2) SEO / Metadata Correctness
**Priority: P0**

1. **Canonical URLs currently include hash fragments**
   - `src/hooks/useRouteDocumentMeta.ts`
   - `src/pages/TicketDetails.tsx`
   - Impact: fragmented canonical signals and duplicate URL variants.

2. **Potential stale OG URL if canonical is absent**
   - `src/lib/seo/applyDocumentMeta.ts` sets `og:url` only when canonical exists, but does not remove stale value.
   - Impact: stale social metadata across route transitions.

3. **Brand inconsistency in ticket share copy**
   - `src/pages/TicketDetails.tsx` uses `"RailSwap"` in share title.
   - Impact: SEO/brand inconsistency and lower trust.

### 3) Security Hardening
**Priority: P0**

1. **Missing optional Firebase App Check wiring**
   - No `initializeAppCheck` bootstrap in client.
   - Impact: weaker abuse resistance for public write surfaces.
   - Strategy: opt-in rollout via env key (non-breaking default).

2. **`window.open` without explicit noopener in share action**
   - `src/pages/TicketDetails.tsx` share actions call `window.open(url, "_blank")`.
   - Impact: opener-reference risk.

### 4) Cleanup / Dead or Redundant Logic
**Priority: P1**

1. **Legacy connection-test helper**
   - `testConnection` in `src/lib/firebase/firebase.ts` becomes dead after boot-time read removal.

2. **Repeated filter reset blocks in Browse**
   - `src/pages/Browse.tsx` duplicates reset logic in multiple callbacks.
   - Low risk to centralize into one helper.

### 5) Scalability / Index / Query Shape
**Priority: P1**

1. Current key indexes exist in `firestore.indexes.json` for `tickets`, `notifications`, `purchaseRequests`.
2. Seller/admin limits are mostly bounded; continue preserving caps and cursor pagination.
3. No immediate schema change required; focus on reducing unnecessary listeners and startup reads first.

## Safe Implementation Order

1. **P0 – Remove guaranteed boot-time Firestore read**
   - Files: `src/lib/firebase/firebase.ts`
   - Verification focus: app boots normally; no functional flow change.

2. **P0 – SEO canonical/meta correctness**
   - Files: `src/hooks/useRouteDocumentMeta.ts`, `src/pages/TicketDetails.tsx`, `src/lib/seo/applyDocumentMeta.ts`
   - Verification focus: route metadata updates remain intact; no UI changes.

3. **P0 – Security hardening (safe client-side)**
   - Files: `src/pages/TicketDetails.tsx` (`window.open` flags), Firebase bootstrap files (App Check opt-in).
   - Add env typing/docs for App Check.

4. **P0 – Firestore cost reduction for Home preview**
   - File: `src/pages/Home.tsx`
   - Strategy: tighten listener document cap (retain realtime UX).

5. **P1 – Browse responsive/render cleanup**
   - File: `src/pages/Browse.tsx`
   - Strategy: replace direct `window.innerWidth` render check with stateful media-query tracking.

6. **P1 – Targeted cleanup**
   - Files: `src/pages/Browse.tsx`, `src/lib/firebase/firebase.ts`
   - Remove dead helpers and duplicate callback blocks where safe.

## Firebase Cost Risks (current + mitigation)
- **Risk:** background listener over-read for tiny previews.
  - **Mitigation:** reduce Home listener cap.
- **Risk:** guaranteed startup read per session.
  - **Mitigation:** remove boot-time connectivity probe.
- **Risk:** unnecessary read amplification from broad realtime use.
  - **Mitigation:** keep current bounded caps; avoid expanding listener surfaces.

## Security Concerns (current + mitigation)
- **Risk:** no App Check bootstrap currently.
  - **Mitigation:** optional App Check initialization via env key.
- **Risk:** `_blank` popup opener exposure.
  - **Mitigation:** enforce `noopener,noreferrer`.
- **Risk to monitor (no immediate unsafe change):** permissive CORS on some API routes is partially offset by auth checks; review with deployment-origin allowlist in a dedicated pass to avoid breaking local workflows.

## SEO Improvements
- Canonical URLs should ignore hash fragments.
- Ensure OG URL does not remain stale across SPA route transitions.
- Correct brand name in share strings to keep metadata consistent.

## Caching Opportunities
- Keep existing local/session storage dedupe behavior.
- Avoid introducing stale data caches for realtime-sensitive views.
- Future safe extension (P2): short-lived in-memory cache for non-sensitive read-mostly docs with explicit invalidation.

## Scalability Concerns
- Continue cursor-based pagination for browse/admin lists.
- Keep hard caps on subscriptions and admin queries.
- Preserve index-aligned Firestore query shapes; avoid new unindexed compound queries.

## Safe Refactor Strategy
- Prefer isolated, file-local edits with no schema migration.
- No route/path changes.
- No API contract changes.
- No UI component restructuring.
- Keep behavior backward-compatible; only tighten metadata/security/read efficiency.

## Planned Deliverables in this pass
1. App bootstrap/read-cost hardening.
2. Canonical/meta and share hardening.
3. Optional Firebase App Check scaffolding.
4. Home/Browse safe performance improvements.
5. Type-safe env updates and docs update.
