# Construction AI OS — Frontend

The **Construction** industry frontend for the Industry AI OS platform. One of several
per-industry FEs (Accounting, Legal, …) that all talk to the **same backend**; only the
industry theming, copy, and dummy content differ. Accounts created here sign up into the
`construction` industry.

> Sibling FEs follow this exact structure — use this file as the template (swap the
> industry name, the `login_source` value, and the "wired vs dummy" list).

## Stack
- **TanStack Start** (React 19 + TanStack Router, file-based routes) + **Vite**
- **TypeScript**, **Tailwind CSS** + shadcn/radix UI, **lucide-react** icons
- **TanStack Query** for all server state
- Talks to the **gateway only** — never a service or Keycloak directly

## Structure
```
src/
  routes/            file-based routes (TanStack Router)
    index.tsx        marketing landing page + auth modal (Log in / Sign up)
    app.tsx          authenticated shell (sidebar + header), guards on token
    app.index.tsx    dashboard
    app.<name>.tsx   workspace pages (documents, workflows, approvals, connectors,
                     assistant, analytics, knowledge, admin, settings, …)
  api/
    client.ts        typed gateway client — auth, token storage, and TWO dummy switches:
                     DUMMY_AUTH (auth) + DUMMY_DATA (data). Both now FALSE (real backend).
    index.ts         public API surface — import hooks/types from here, not from query/
    query/*.ts       TanStack Query read hooks (useDocuments, useWorkflows, …)
    mutation/*.ts    write hooks (useDecideWorkflow, useUploadDocument, …)
  components/
    layout/          AppSidebar, AppHeader, nav.ts
    common/          DataTable, StatCard, StatusBadge, states.tsx (Loading/Empty/Error)
    ui/              shadcn primitives
  lib/               session, theme, catalog/industries (static landing content), utils
```

## Backend contract (the important part)
- **Base URL:** `VITE_API_URL` (see `.env` / `.env.example`; defaults to
  `http://localhost:8000`, the gateway). The FE calls the **gateway only**.
- **Dummy switches** in `client.ts` (both **false** = real backend): `DUMMY_AUTH`
  (localStorage auth) and `DUMMY_DATA` (localStorage data). Flip either to `true` to demo
  that layer with no backend.
- **Auth:**
  - Login → `POST /auth/token` `{ username, password }` → stores the Keycloak access
    token; sent as `Authorization: Bearer` on every call.
  - Signup → `POST /auth/register` with **`login_source: "construction"`** (hard-coded —
    this is the construction FE), then auto-logs in. Accounts join the shared `demo` tenant.
- **AI Assistant** (`app.assistant`): streams from `POST /api/orchestrator/chat/stream`
  and sends **`workspace: "construction"`** so the backend assistant is workspace-aware
  (industry-scoped answers, intent detection, Mode-2 reminder). On failure the backend
  sends an SSE `error` frame; the page surfaces it (and empty stream / thrown `ApiError`)
  as a visible error instead of a fake reply — needs a valid LLM key on the backend to answer.
- **ngrok note:** every request sends `ngrok-skip-browser-warning: true`, so pointing
  `VITE_API_URL` at an ngrok URL works (skips ngrok-free's interstitial). Harmless elsewhere.
- **Per-industry workspace config** (optional, backend-driven): `GET /industries` and
  `GET /api/identity/workspace/config` expose the industry's nav/theme/terminology.

## Pages: real backend data vs. dummy
**Wired to the real backend:**

| Page | Endpoint(s) / hook |
|---|---|
| AI Assistant (`app.assistant`) | `chatStream` → `/api/orchestrator/chat/stream` (workspace-aware; surfaces backend errors) |
| Dashboard (`app.index`) | system status → `useSystemHealth`; recent docs → `useDocuments`; activity → `useAuditEvents`; workflow/approval counts → `useWorkflows` |
| Documents (`app.documents`) | `useDocuments` (+ upload) |
| Workflows (`app.workflows`) | runs `useWorkflows`; construction templates + **My workflows** `useWorkflowDefinitions`; **visual builder** at `/app/workflows/builder` (see below) |
| Approvals (`app.approvals`) | pending `useWorkflows` + approve/reject via `useDecideWorkflow` |
| Connectors (`app.connectors`) | `useConnectors` (+ enable/disable via `configureConnector`) |
| Admin (`app.admin`) | `useUsers`, `useAuditEvents` |
| Settings (`app.settings`) | `useTenant`, `useSession` |

**Intentionally still dummy** (no backend source yet — would be faking data):
Analytics KPIs/charts, Knowledge help-articles, Document-Intelligence (OCR/extraction),
and any construction-specific dashboard panels (RFIs/drawings/schedule mock widgets).
Wire these once the backend exposes the corresponding data (e.g. the construction
workflow packs / RFI data).

## Visual workflow builder (`/app/workflows/builder`)
An n8n-style canvas (**`@xyflow/react`**) for building your own flows — no code, no deploy.
The `/app/workflows` subtree is split into three routes: `app.workflows.tsx` (bare `<Outlet />`
layout), `app.workflows.index.tsx` (the list page), and `app.workflows.builder.tsx` (the canvas).
Builder components live in `components/workflow/builder/`: `WorkflowBuilder.tsx` (palette + canvas +
config panel), `nodes.tsx` (trigger/step/branch node renderers), `config-panel.tsx` (per-step
fields), and `serialize.ts` (canvas ⇄ engine contract).
- **List page** (`app.workflows.index.tsx`): the templates row filters
  **`pack_key === "construction"`** (this is the construction FE); a **Create workflow** button links
  to the builder; the **My workflows** section lists user flows (`source === "user"`) with **Run**
  (`useStartWorkflow`, pack `custom`) / **Edit** (`/builder?key=…`) / **Delete**
  (`useDeleteWorkflowDefinition`). The existing KPI tiles + running-workflows table are preserved.
- **Palette:** the tenant's *entitled* connectors only (`listConnectorCatalog` →
  `GET /api/connectors/connectors?all=true`, filtered on the `entitled` flag) + step types
  (AI action, Approval, Branch, Notify, Transform). Drag or click to add nodes.
- **Config panel:** per-step fields (connector + endpoint, inline AI prompt, approver, branch
  condition, …). Name the flow, then **Save**.
- **Serialize** (`serialize.ts`): the canvas is a **linear chain with optional single/nested
  branches**, NOT a free DAG. It is flattened to the engine's **ordered step list with `when`
  guards** — DFS from the trigger, branch guards derived (`true`/`false` handles) and propagated
  down each arm, stopping at merge points (in-degree ≥ 2, which run unconditionally), and friendly
  config mapped to the exact engine config per step type. Saved via `createWorkflowDefinition` →
  `POST /api/workflows/packs/definitions` (stored under the reserved `custom` pack). `deserialize`
  reconstructs an editable linear chain for the Edit flow.
- **Editing:** `/builder?key=…` fetches the FULL definition via `getWorkflowDefinition` →
  `GET /api/workflows/packs/definitions/{key}?pack_key=custom` (the list spec only carries
  id/type/name per step, so config would be lost on round-trip), then `deserialize`s it.
- **Client fns** (all in `client.ts`, on the `api` object): `listConnectorCatalog`,
  `createWorkflowDefinition`, `updateWorkflowDefinition`, `deleteWorkflowDefinition`,
  `getWorkflowDefinition`, `startWorkflow`. **Hooks:** `useConnectorCatalog`,
  `useSaveWorkflowDefinition` (POST/PUT by key), `useDeleteWorkflowDefinition`, `useStartWorkflow`.
- Requires `@xyflow/react` installed (`npm install`; also `@nangohq/frontend`, imported by
  `app.connectors`, is now declared) and the backend with the workflow-packs endpoints + the tenant
  granted connector entitlements. `<Toaster />` is mounted globally in `__root.tsx`.

## Theming note (post-login dark mode)
The app shell and landing page share the construction **safety-orange / caution-yellow** identity.
The post-login dark theme (`.app-shell.dark` in `styles.css`) previously kept the old **blue** brand
on `--primary`/`--primary-2`/`--accent`/`--accent-foreground`/`--ring`; those now use the same orange
values as `.landing-root.dark`, so dark mode matches the landing page. Light shell and both landing
modes were already on the orange palette.

## Run
The backend must be running (gateway on `:8000`), and for the assistant to answer, a valid
LLM key must be set in the backend `.env` (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`). Then:
```bash
cp .env.example .env          # Windows: copy .env.example .env  (a .env is already present)
npm install
npm run dev                   # http://localhost:8080
```
Sign up (e.g. `con1@acme.com` / `Passw0rd!`) → you land in the Construction workspace with
real backend data on the wired pages. If the backend has no LLM key, the assistant shows a
clear "temporarily unavailable" error (not a fake answer).

## Conventions
- Add a backend call: add one typed function in `client.ts`, wrap it in a hook under
  `api/query` or `api/mutation`, export from `api/index.ts`, consume in the page.
- Every data view uses the shared `LoadingState` / `EmptyState` / `ErrorState`
  (`components/common/states.tsx`) — don't hand-roll these.
- Never call a service or Keycloak directly; always go through the gateway.
