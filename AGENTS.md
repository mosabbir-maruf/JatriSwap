# AI Agent Instructions

Always read and follow:

* All rules under **`.agents/rules/`** (e.g. `typescript.mdc`, `react.mdc`, `codequality.mdc`)
* All skills under **`.agents/skills/`** (activate by task — see below)
* **`MEMORY.md`** for a concise architecture and Firestore snapshot
* Existing project layout and patterns in **`src/`** before making changes

## Project overview

* **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind CSS v4
* **Backend (client-only in repo)**: Firebase Auth + Firestore (+ Storage where used); modular SDK under **`src/lib/firebase/`**
* **`@/`** path alias → **repository root** (not `src/`)

## Core rules

* Never use mock or fake data for product behavior
* Keep code production-ready and typed; prefer **`unknown`** over **`any`** (see `.agents/rules/typescript.mdc`)
* Preserve existing coding style and architecture; avoid drive-by refactors
* Keep modules focused and reusable; avoid duplicate logic and unnecessary dependencies
* Optimize Firestore reads/writes and avoid gratuitous realtime listeners

## Firebase

* Use **modular** Firestore helpers in **`src/lib/firebase/`**; extend **`firestore.rules`** whenever schema or writes change
* Use secure defaults: staff-only data belongs in separate collections or constrained rules (e.g. **`ticketAdminNotes`**, not public ticket payloads)
* Never expose secrets; **`VITE_*`** is build-time public — only non-sensitive config there (**`.env.example`** is the template)

## Skills — when to use which

| Skill | Use when |
|-------|-----------|
| **firebase** / **firebase-basics** | Auth, Firestore, rules, SDK patterns, deploy/emulator |
| **debugging-strategies** | Reproducing bugs, narrowing causes, production regressions (**before** deep fixes) |
| **api-design** | Designing or reviewing **HTTP REST** APIs (e.g. future Cloud Functions) — not the primary model for raw Firestore access patterns |
| **performance-investigation** | Perf regressions; **adapt** to this repo (Firestore/query costs, bundle size, React re-renders) — the bundled SKILL may reference unrelated benchmark scripts |

## Development workflow

* Inspect related files and **`MEMORY.md`** / **`firestore.rules`** before editing
* Keep fixes scoped and safe; align **`src/types/`** with Firestore usage
* For elusive failures, follow **debugging-strategies** systematically

## Tooling / repo notes

* **`npm run lint`** runs **`tsc --noEmit`**
* Optional **`.cursorignore`** may exclude `node_modules/`, `dist/`, etc. from indexing — do **not** exclude **`.agents/`** if rules/skills should stay visible to the agent
