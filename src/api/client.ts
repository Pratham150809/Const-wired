// API client for the Industry AI OS gateway.
//
// The frontend talks to the GATEWAY ONLY (never a service or Keycloak directly).
// Base URL comes from VITE_API_URL (see .env.example), defaulting to the local
// gateway. On login we store the Keycloak access token and send it as a bearer on
// every subsequent call. One typed method per backend endpoint — no business logic
// lives here, and there are no mock endpoints: a screen with no backend simply has
// no method here and renders an empty state.

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000";

const TOKEN_KEY = "aios.access_token";

// --- Dummy auth -------------------------------------------------------------
// Temporary client-side auth: while the backend OAuth/registration flow is not
// wired, sign up and log in are served entirely from localStorage. Flip this to
// `false` to restore the real gateway-backed auth below.
const DUMMY_AUTH = false;
const USERS_KEY = "aios.dummy_users";
const SESSION_KEY = "aios.dummy_session";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function logout(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const resp = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      // Skip ngrok free-tier's browser-warning interstitial (which strips CORS headers)
      // when the gateway is exposed via an ngrok URL. Harmless on any other host.
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.message ?? body.error ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, resp.status);
  }
  return (resp.status === 204 ? undefined : await resp.json()) as T;
}

// ---------------------------------------------------------------- types
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface Me {
  user_id: string;
  email: string | null;
  tenant_id: string;
  tenant_slug: string | null;
  roles: string[];
}

export interface DocumentItem {
  id: string;
  filename: string;
  content_type: string | null;
  status: string;
  size_bytes: number | null;
  created_at: string;
}

export interface RetrievedChunk {
  document_id: string;
  chunk_index: number;
  content: string;
  score: number;
}

export interface WorkflowItem {
  workflow_id: string;
  type: string;
  status: string;
  document_id: string | null;
  summary?: string | null;
  decision: string | null;
  decided_by: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectorItem {
  key: string;
  name: string;
  kind: string;
  enabled: boolean;
  tool_count: number;
  /** Present on the full catalogue (`?all=true`): whether the tenant is entitled
   *  to use this connector. Absent (undefined) on the entitled-only default list. */
  entitled?: boolean;
}

export interface AccessRequest {
  id: string;
  connector_key: string;
  status: "pending" | "approved" | "rejected";
  requested_by: string;
  note: string | null;
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface AuditEvent {
  id: string;
  tenant_id: string;
  actor_id: string;
  actor_email: string | null;
  action: string;
  resource_kind: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  settings?: Record<string, unknown>;
  created_at?: string;
  note?: string;
}

export interface SystemHealth {
  overall: string;
  services: Record<string, string>;
}

export interface UserItem {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
}

export interface ChatReply {
  session_id: string;
  model: string;
  answer: string;
}

/** The `workflow` SSE frame — emitted when the assistant actually STARTED a workflow
 *  run (poll it with `getRun` / `useRun`). Extra fields are passed through untouched. */
export interface ChatWorkflowFrame {
  run_id: string;
  status?: string;
  [key: string]: unknown;
}

/** One decoded SSE frame from the streaming chat endpoint. */
export interface ChatStreamFrame {
  delta?: string;
  session_id?: string;
  model?: string;
  error?: string;
  workflow?: ChatWorkflowFrame;
}

export interface ChatHistory {
  session_id: string;
  messages: { role: string; content: string }[];
}

/** One row in the Conversations sidebar — a past chat session for this user.
 *  `last_activity` may be null on a session that has a title but no turns yet. */
export interface ChatSessionSummary {
  id: string;
  title: string;
  preview: string;
  created_at: string;
  last_activity: string | null;
}

// ---------------------------------------------------------------- auth
export interface SignupInput {
  name: string;
  email: string;
  company: string;
  password: string;
}

// --- Dummy auth helpers (localStorage-backed) ---
interface DummyUser extends SignupInput {}

function readDummyUsers(): DummyUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]") as DummyUser[];
  } catch {
    return [];
  }
}

function writeDummyUsers(users: DummyUser[]): void {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function meFromDummy(user: DummyUser): Me {
  const slug =
    user.company
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace";
  return {
    user_id: user.email,
    email: user.email,
    tenant_id: slug,
    tenant_slug: slug,
    roles: ["owner", "admin"], // full access for the demo account
  };
}

function startDummySession(user: DummyUser): Me {
  const me = meFromDummy(user);
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(me));
  setToken(`dummy.${btoa(user.email)}`);
  return me;
}

function dummyLogin(email: string, password: string): Me {
  const user = readDummyUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    throw new ApiError("Invalid email or password.", 401);
  }
  return startDummySession(user);
}

function dummySignup(input: SignupInput): Me {
  const users = readDummyUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new ApiError("An account with this email already exists.", 409);
  }
  users.push(input);
  writeDummyUsers(users);
  return startDummySession(input);
}

function dummyMe(): Me {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
  if (!raw) throw new ApiError("Not authenticated", 401);
  return JSON.parse(raw) as Me;
}

export async function login(email: string, password: string): Promise<Me> {
  if (DUMMY_AUTH) return dummyLogin(email, password);
  const token = await request<TokenResponse>("/auth/token", {
    method: "POST",
    body: JSON.stringify({ username: email, password }),
  });
  setToken(token.access_token);
  return getMe();
}

export async function signup(input: SignupInput): Promise<Me> {
  if (DUMMY_AUTH) return dummySignup(input);
  // Real gateway signup. This is the Construction workspace, so every account created
  // here lands in the "construction" industry (login_source). The `company` field is
  // not used — self-service signups join the shared demo tenant (see backend D10).
  const parts = input.name.trim().split(/\s+/);
  const first_name = parts[0] || input.email.split("@")[0];
  const last_name = parts.slice(1).join(" ") || first_name;
  const token = await request<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      first_name,
      last_name,
      login_source: "construction",
    }),
  });
  setToken(token.access_token);
  return getMe();
}

export function getMe(): Promise<Me> {
  if (DUMMY_AUTH) return Promise.resolve(dummyMe());
  return request<Me>("/api/identity/me");
}

// --- Dummy data (documents, tenant, directory, audit) -----------------------
// Same idea as DUMMY_AUTH above: while these backend endpoints aren't wired,
// serve typed responses from localStorage so every screen is clickable and
// stateful standalone. Flip to `false` to restore the real gateway calls below.
const DUMMY_DATA = false;
const DOCS_KEY = "aios.dummy_documents";
const AUDIT_KEY = "aios.dummy_audit";
const DIRECTORY_KEY = "aios.dummy_directory";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readLocal<T>(key: string, seed: () => T): T {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      /* fall through to reseed */
    }
  }
  const value = seed();
  window.localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function writeLocal<T>(key: string, value: T): void {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value));
}

function currentDummyUser(): Me | null {
  try {
    return dummyMe();
  } catch {
    return null;
  }
}

function pushAuditEvent(evt: {
  action: string;
  resource_kind: string;
  resource_id: string;
  metadata?: Record<string, unknown>;
}): void {
  const me = currentDummyUser();
  const events = readLocal(AUDIT_KEY, seedAuditEvents);
  const event: AuditEvent = {
    id: `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tenant_id: me?.tenant_id ?? "demo",
    actor_id: me?.email ?? me?.user_id ?? "system",
    actor_email: me?.email ?? null,
    action: evt.action,
    resource_kind: evt.resource_kind,
    resource_id: evt.resource_id,
    metadata: evt.metadata ?? {},
    created_at: new Date().toISOString(),
  };
  writeLocal(AUDIT_KEY, [event, ...events]);
}

// --- documents ---
function seedDocuments(): DocumentItem[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    {
      id: "doc_lienwaiver_q3",
      filename: "Lien-Waiver-Q3-Retainage-Release.pdf",
      content_type: "application/pdf",
      status: "processing",
      size_bytes: 97_200,
      created_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: "doc_co_2231",
      filename: "CO-2231-Coastal-Glazing-LLC.pdf",
      content_type: "application/pdf",
      status: "processed",
      size_bytes: 391_500,
      created_at: new Date(now - 4 * day).toISOString(),
    },
    {
      id: "doc_rfi_2214",
      filename: "RFI-2214-Apex-Building-Materials.pdf",
      content_type: "application/pdf",
      status: "processed",
      size_bytes: 482_000,
      created_at: new Date(now - 5 * day).toISOString(),
    },
    {
      id: "doc_dailylog_safety",
      filename: "Daily-Log-Riverside-Tower-Site-Safety-Walk.pdf",
      content_type: "application/pdf",
      status: "processed",
      size_bytes: 118_900,
      created_at: new Date(now - 6 * day).toISOString(),
    },
    {
      id: "doc_draw_jun",
      filename: "Draw-Statement-Riverside-Tower-Jun.pdf",
      content_type: "application/pdf",
      status: "processed",
      size_bytes: 254_300,
      created_at: new Date(now - 10 * day).toISOString(),
    },
    {
      id: "doc_sub_4482",
      filename: "SUB-4482-Ironclad-Steel-Supply.pdf",
      content_type: "application/pdf",
      status: "processed",
      size_bytes: 612_800,
      created_at: new Date(now - 12 * day).toISOString(),
    },
  ];
}

function dummyListDocuments(): DocumentItem[] {
  return [...readLocal(DOCS_KEY, seedDocuments)].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

function dummyUploadDocument(file: File): DocumentItem {
  const docs = readLocal(DOCS_KEY, seedDocuments);
  const doc: DocumentItem = {
    id: `doc_${Date.now().toString(36)}`,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    status: "processing",
    size_bytes: file.size,
    created_at: new Date().toISOString(),
  };
  writeLocal(DOCS_KEY, [doc, ...docs]);
  pushAuditEvent({
    action: "document.uploaded",
    resource_kind: "document",
    resource_id: doc.id,
    metadata: { filename: doc.filename },
  });
  // Simulate async processing so the status updates on the next fetch.
  setTimeout(() => {
    const current = readLocal(DOCS_KEY, seedDocuments);
    writeLocal(
      DOCS_KEY,
      current.map((d) => (d.id === doc.id ? { ...d, status: "processed" } : d)),
    );
  }, 4000);
  return doc;
}

// --- tenant ---
function dummyGetTenant(): Tenant {
  const me = currentDummyUser();
  const user = me ? readDummyUsers().find((u) => u.email.toLowerCase() === me.email?.toLowerCase()) : undefined;
  return {
    id: me?.tenant_id ?? "demo",
    slug: me?.tenant_slug ?? me?.tenant_id ?? "demo",
    name: user?.company ?? "Meridian Builders",
    status: "active",
    settings: {},
    created_at: new Date().toISOString(),
  };
}

// --- team directory / users ---
function seedDirectory(): UserItem[] {
  return [
    {
      id: "u_reyes",
      email: "a.reyes@northwind.co",
      first_name: "Alicia",
      last_name: "Reyes",
      roles: ["owner", "admin"],
    },
    {
      id: "u_danforth",
      email: "r.danforth@northwind.co",
      first_name: "Ray",
      last_name: "Danforth",
      roles: ["member"],
    },
    { id: "u_lin", email: "j.lin@northwind.co", first_name: "Jordan", last_name: "Lin", roles: ["viewer"] },
  ];
}

function dummyListUsers(): UserItem[] {
  const users = readLocal(DIRECTORY_KEY, seedDirectory);
  const me = currentDummyUser();
  if (me?.email && !users.some((u) => u.email?.toLowerCase() === me.email!.toLowerCase())) {
    const withMe = [
      { id: me.user_id, email: me.email, first_name: null, last_name: null, roles: me.roles },
      ...users,
    ];
    writeLocal(DIRECTORY_KEY, withMe);
    return withMe;
  }
  return users;
}

function dummyAssignRole(userId: string, role: string): { ok: true } {
  const users = dummyListUsers();
  writeLocal(
    DIRECTORY_KEY,
    users.map((u) => (u.id === userId ? { ...u, roles: [role] } : u)),
  );
  pushAuditEvent({
    action: "user.role_assigned",
    resource_kind: "user",
    resource_id: userId,
    metadata: { role },
  });
  return { ok: true };
}

// --- audit ---
function seedAuditEvents(): AuditEvent[] {
  const now = Date.now();
  const min = 60_000;
  const rows: [string, string, string, string | null][] = [
    ["rfi.response_posted", "document", "doc_rfi_2214", "RFI Copilot"],
    ["change_order.duplicate_flagged", "document", "doc_co_2231", "RFI Copilot"],
    ["workflow.approved", "workflow", "wf_drawrec_jun", "a.reyes@northwind.co"],
    ["daily_log.reviewed", "document", "doc_dailylog_safety", "Safety Copilot"],
    ["subcontractor.onboarded", "connector", "ironclad-steel-supply", "r.danforth@northwind.co"],
    ["connector.invoke", "connector", "procore", "Recon Copilot"],
  ];
  return rows.map(([action, resource_kind, resource_id, actor_email], i) => ({
    id: `evt_seed_${i}`,
    tenant_id: "demo",
    actor_id: actor_email ?? "system",
    actor_email,
    action,
    resource_kind,
    resource_id,
    metadata: {},
    created_at: new Date(now - (rows.length - i) * 45 * min).toISOString(),
  }));
}

function dummyListAuditEvents(limit?: number): AuditEvent[] {
  const sorted = [...readLocal(AUDIT_KEY, seedAuditEvents)].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

// --- workflow runs (Workflows page) & approval items (Approvals page) ------
// Both pages read from these persisted stores instead of hardcoded arrays, so
// a workflow triggered from the AI Assistant actually shows up there.
export type WfStatus = "running" | "awaiting_approval" | "completed" | "failed";
export type StepKind = "trigger" | "extract" | "match" | "validate" | "approve" | "output";
export type WorkflowStep = { label: string; system: string; kind: StepKind; failed?: boolean };
export type WorkflowRun = {
  id: string;
  name: string;
  status: WfStatus;
  waiting: string;
  decision: string | null;
  started: string;
  updated: string;
  flow: WorkflowStep[];
};

const WORKFLOW_RUNS_KEY = "aios.dummy_workflow_runs";

function formatNow(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The 5 official Construction workflows from the POC spec come first, in spec
// order, each with 2 sample runs across different projects/subs. The extra
// (non-spec) workflows follow below.
function seedWorkflowRuns(): WorkflowRun[] {
  return [
    {
      id: "wf_rfi_2214",
      name: "RFI Response & Approval — RFI-2214",
      status: "awaiting_approval",
      waiting: "PM approval",
      decision: null,
      started: "Jul 13, 2026 09:41",
      updated: "Jul 13, 2026 09:44",
      flow: [
        { label: "RFI submitted", system: "Email Inbox", kind: "trigger" },
        { label: "Extract RFI details", system: "Document AI", kind: "extract" },
        { label: "Drawing/spec lookup", system: "Procore", kind: "match" },
        { label: "Cost-code assignment", system: "Rules Engine", kind: "validate" },
        { label: "PM approval", system: "Approvals", kind: "approve" },
        { label: "Post RFI response", system: "Procore", kind: "output" },
      ],
    },
    {
      id: "wf_rfi_1187",
      name: "RFI Response & Approval — RFI-1187",
      status: "completed",
      waiting: "—",
      decision: "approved",
      started: "Jul 09, 2026 11:20",
      updated: "Jul 09, 2026 11:26",
      flow: [
        { label: "RFI submitted", system: "Email Inbox", kind: "trigger" },
        { label: "Extract RFI details", system: "Document AI", kind: "extract" },
        { label: "Drawing/spec lookup", system: "Procore", kind: "match" },
        { label: "Cost-code assignment", system: "Rules Engine", kind: "validate" },
        { label: "PM approval", system: "Approvals", kind: "approve" },
        { label: "Post RFI response", system: "Procore", kind: "output" },
      ],
    },
    {
      id: "wf_changeorder_co2231",
      name: "Change Order Copilot — CO-2231",
      status: "awaiting_approval",
      waiting: "PM approval",
      decision: null,
      started: "Jul 13, 2026 10:05",
      updated: "Jul 13, 2026 10:09",
      flow: [
        { label: "Change request submitted", system: "Procore", kind: "trigger" },
        { label: "Retrieve supporting documents", system: "Email", kind: "extract" },
        { label: "Retrieve budget + schedule", system: "Procore", kind: "match" },
        { label: "Calculate cost/schedule impact", system: "Rules Engine", kind: "validate" },
        { label: "PM approval", system: "Approvals", kind: "approve" },
        { label: "Create change order", system: "Procore", kind: "output" },
      ],
    },
    {
      id: "wf_changeorder_co0842",
      name: "Change Order Copilot — CO-0842",
      status: "completed",
      waiting: "—",
      decision: "approved",
      started: "Jul 08, 2026 09:00",
      updated: "Jul 08, 2026 09:07",
      flow: [
        { label: "Change request submitted", system: "Procore", kind: "trigger" },
        { label: "Retrieve supporting documents", system: "Email", kind: "extract" },
        { label: "Retrieve budget + schedule", system: "Procore", kind: "match" },
        { label: "Calculate cost/schedule impact", system: "Rules Engine", kind: "validate" },
        { label: "PM approval", system: "Approvals", kind: "approve" },
        { label: "Create change order", system: "Procore", kind: "output" },
      ],
    },
    {
      id: "wf_dailysitereport_riverside",
      name: "Daily Site Report — Riverside Tower",
      status: "completed",
      waiting: "—",
      decision: "approved",
      started: "Jul 12, 2026 17:00",
      updated: "Jul 12, 2026 17:04",
      flow: [
        { label: "End of workday", system: "Scheduler", kind: "trigger" },
        { label: "Collect site emails + photos", system: "Email", kind: "extract" },
        { label: "Retrieve task + equipment status", system: "Procore", kind: "match" },
        { label: "Generate daily report", system: "Document AI", kind: "validate" },
        { label: "PM approval", system: "Approvals", kind: "approve" },
        { label: "Email daily report", system: "Email", kind: "output" },
      ],
    },
    {
      id: "wf_dailysitereport_hwy12",
      name: "Daily Site Report — Hwy 12 Bridge",
      status: "running",
      waiting: "—",
      decision: null,
      started: "Jul 13, 2026 17:00",
      updated: "Jul 13, 2026 17:02",
      flow: [
        { label: "End of workday", system: "Scheduler", kind: "trigger" },
        { label: "Collect site emails + photos", system: "Email", kind: "extract" },
        { label: "Retrieve task + equipment status", system: "Procore", kind: "match" },
        { label: "Generate daily report", system: "Document AI", kind: "validate" },
        { label: "PM approval", system: "Approvals", kind: "approve" },
        { label: "Email daily report", system: "Email", kind: "output" },
      ],
    },
    {
      id: "wf_subinvoice_ironclad",
      name: "Subcontractor Invoice Verification — Ironclad Steel Supply",
      status: "awaiting_approval",
      waiting: "Project Accountant review",
      decision: null,
      started: "Jul 13, 2026 08:15",
      updated: "Jul 13, 2026 08:19",
      flow: [
        { label: "Invoice received", system: "Email", kind: "trigger" },
        { label: "OCR invoice", system: "Document AI", kind: "extract" },
        { label: "Retrieve purchase order + completed work", system: "Procore", kind: "match" },
        { label: "Compare invoice, flag discrepancies", system: "Rules Engine", kind: "validate" },
        { label: "Project Accountant approval", system: "Approvals", kind: "approve" },
        { label: "Approve payment", system: "Accounting", kind: "output" },
      ],
    },
    {
      id: "wf_subinvoice_coastal",
      name: "Subcontractor Invoice Verification — Coastal Glazing LLC",
      status: "failed",
      waiting: "—",
      decision: "rejected",
      started: "Jul 11, 2026 13:40",
      updated: "Jul 11, 2026 13:52",
      flow: [
        { label: "Invoice received", system: "Email", kind: "trigger" },
        { label: "OCR invoice", system: "Document AI", kind: "extract" },
        { label: "Retrieve purchase order + completed work", system: "Procore", kind: "match" },
        { label: "Compare invoice, flag discrepancies", system: "Rules Engine", kind: "validate" },
        { label: "Project Accountant approval", system: "Approvals", kind: "approve" },
        { label: "Approve payment", system: "Accounting", kind: "output", failed: true },
      ],
    },
    {
      id: "wf_progressreport_jul",
      name: "Project Progress Report — Riverside Tower",
      status: "completed",
      waiting: "—",
      decision: "approved",
      started: "Jul 06, 2026 07:00",
      updated: "Jul 06, 2026 07:06",
      flow: [
        { label: "Weekly schedule", system: "Scheduler", kind: "trigger" },
        { label: "Pull progress + budget", system: "Procore", kind: "extract" },
        { label: "Pull open RFIs + delays", system: "Primavera P6", kind: "match" },
        { label: "Generate executive report", system: "Document AI", kind: "validate" },
        { label: "Construction Director approval", system: "Approvals", kind: "approve" },
        { label: "Email stakeholders", system: "Email", kind: "output" },
      ],
    },
    {
      id: "wf_progressreport_metro",
      name: "Project Progress Report — Metro Campus",
      status: "running",
      waiting: "—",
      decision: null,
      started: "Jul 13, 2026 07:00",
      updated: "Jul 13, 2026 07:03",
      flow: [
        { label: "Weekly schedule", system: "Scheduler", kind: "trigger" },
        { label: "Pull progress + budget", system: "Procore", kind: "extract" },
        { label: "Pull open RFIs + delays", system: "Primavera P6", kind: "match" },
        { label: "Generate executive report", system: "Document AI", kind: "validate" },
        { label: "Construction Director approval", system: "Approvals", kind: "approve" },
        { label: "Email stakeholders", system: "Email", kind: "output" },
      ],
    },
    {
      id: "wf_drawrec_jun",
      name: "Draw Reconciliation — June",
      status: "running",
      waiting: "—",
      decision: null,
      started: "Jul 13, 2026 09:30",
      updated: "Jul 13, 2026 09:52",
      flow: [
        { label: "Bank feed syncs", system: "Mercury Bank", kind: "trigger" },
        { label: "Pull transactions", system: "Bank Feed", kind: "extract" },
        { label: "Auto-match ledger", system: "Core Banking", kind: "match" },
        { label: "Group exceptions", system: "Recon Engine", kind: "validate" },
        { label: "Project Executive approval", system: "Approvals", kind: "approve" },
        { label: "Draw close", system: "Ledger", kind: "output" },
      ],
    },
    {
      id: "wf_jobcostclose_jul",
      name: "Job Cost Close — July",
      status: "running",
      waiting: "—",
      decision: null,
      started: "Jul 13, 2026 08:00",
      updated: "Jul 13, 2026 09:58",
      flow: [
        { label: "Kick off close", system: "Scheduler", kind: "trigger" },
        { label: "Work checklist", system: "Close Engine", kind: "extract" },
        { label: "Pull cost report", system: "Procore", kind: "match" },
        { label: "Reconcile accounts", system: "Core Banking", kind: "validate" },
        { label: "Project Executive approval", system: "Approvals", kind: "approve" },
        { label: "Job cost ledger lock", system: "Ledger", kind: "output" },
      ],
    },
    {
      id: "wf_ownerbilling",
      name: "Owner Billing & Pay Application",
      status: "completed",
      waiting: "—",
      decision: "approved",
      started: "Jul 12, 2026 16:20",
      updated: "Jul 12, 2026 16:22",
      flow: [
        { label: "Pay application overdue", system: "Procore", kind: "trigger" },
        { label: "Rank by risk", system: "Billing Engine", kind: "extract" },
        { label: "Reconcile payments", system: "Bank Feed", kind: "match" },
        { label: "Draft reminders", system: "Document AI", kind: "validate" },
        { label: "Project Executive approval", system: "Approvals", kind: "approve" },
        { label: "Queue emails to Owner", system: "CRM", kind: "output" },
      ],
    },
    {
      id: "wf_dailylog_riverside",
      name: "Daily Log & Safety Compliance Audit — Riverside Tower",
      status: "awaiting_approval",
      waiting: "PM approval",
      decision: null,
      started: "Jul 13, 2026 09:12",
      updated: "Jul 13, 2026 09:13",
      flow: [
        { label: "Daily log submitted", system: "Field App", kind: "trigger" },
        { label: "Read logs", system: "Document AI", kind: "extract" },
        { label: "Safety policy check", system: "Rules Engine", kind: "validate" },
        { label: "PM approval", system: "Approvals", kind: "approve" },
        { label: "File to Safety Team", system: "Safety Team", kind: "output" },
      ],
    },
    {
      id: "wf_subonboard_ironclad",
      name: "Subcontractor Onboarding & Lien Waiver — Ironclad Steel Supply",
      status: "completed",
      waiting: "—",
      decision: "approved",
      started: "Jun 22, 2026 11:05",
      updated: "Jun 22, 2026 11:18",
      flow: [
        { label: "New subcontractor request", system: "Email", kind: "trigger" },
        { label: "Read COI + W-9", system: "Document AI", kind: "extract" },
        { label: "Validate TIN + insurance", system: "Compliance", kind: "validate" },
        { label: "Project Executive approval", system: "Approvals", kind: "approve" },
        { label: "Create subcontractor record", system: "Procore", kind: "output" },
      ],
    },
    {
      id: "wf_permit_q2",
      name: "Permit & Inspection Compliance — Q2",
      status: "failed",
      waiting: "—",
      decision: "rejected",
      started: "Jul 10, 2026 14:02",
      updated: "Jul 10, 2026 14:20",
      flow: [
        { label: "Filing deadline", system: "Scheduler", kind: "trigger" },
        { label: "Review permit status", system: "Procore", kind: "extract" },
        { label: "Recalculate compliance", system: "Compliance Engine", kind: "match" },
        { label: "Prepare filing", system: "Document AI", kind: "validate" },
        { label: "Project Executive approval", system: "Approvals", kind: "approve" },
        { label: "File permit", system: "Permit Portal", kind: "output", failed: true },
      ],
    },
    {
      id: "wf_jobcostreport_jun",
      name: "Job Cost Reporting — June",
      status: "completed",
      waiting: "—",
      decision: "approved",
      started: "Jul 01, 2026 07:30",
      updated: "Jul 01, 2026 07:35",
      flow: [
        { label: "Select period", system: "Dashboard", kind: "trigger" },
        { label: "Pull actuals + budget", system: "Procore", kind: "extract" },
        { label: "Build WIP/cost reports", system: "Reporting Engine", kind: "match" },
        { label: "Variance commentary", system: "Document AI", kind: "validate" },
        { label: "Project Executive approval", system: "Approvals", kind: "approve" },
        { label: "Publish report", system: "Reporting", kind: "output" },
      ],
    },
  ];
}

export function listWorkflowRuns(): WorkflowRun[] {
  return readLocal(WORKFLOW_RUNS_KEY, seedWorkflowRuns);
}

function addWorkflowRun(run: WorkflowRun): void {
  const runs = readLocal(WORKFLOW_RUNS_KEY, seedWorkflowRuns);
  writeLocal(WORKFLOW_RUNS_KEY, [run, ...runs]);
}

function updateWorkflowRun(id: string, patch: Partial<WorkflowRun>): void {
  const runs = readLocal(WORKFLOW_RUNS_KEY, seedWorkflowRuns);
  writeLocal(
    WORKFLOW_RUNS_KEY,
    runs.map((r) => (r.id === id ? { ...r, ...patch, updated: formatNow() } : r)),
  );
}

export type ApprovalDecision = "approved" | "rejected";
export type ApprovalItem = {
  id: string;
  type: string;
  title: string;
  amount: string;
  requester: string;
  approver: string;
  waited: string;
  priority: "high" | "medium" | "low";
  summary: string;
  checks: { label: string; ok: boolean }[];
};

const APPROVAL_ITEMS_KEY = "aios.dummy_approval_items";

function seedApprovalItems(): ApprovalItem[] {
  return [
    {
      id: "wf_co_2231",
      type: "Change Order Approval",
      title: "Change Order CO-2231 — Coastal Glazing LLC",
      amount: "$14,280.00",
      requester: "Contracts Copilot",
      approver: "Project Executive",
      waited: "18m",
      priority: "medium",
      summary:
        "Scope match against the Riverside Tower glazing contract and approved drawings succeeded. CO-2231 was flagged as a possible duplicate of a change order Coastal Glazing LLC submitted last week — confirm this is a new scope item before approving. Cost-code assignment to the glazing line item looks correct.",
      checks: [
        { label: "Scope match", ok: true },
        { label: "Duplicate check", ok: false },
        { label: "Cost-code assignment", ok: true },
      ],
    },
    {
      id: "wf_dailylog_riverside",
      type: "Daily Log / Safety Incident Report",
      title: "Riverside Tower — Site Safety Walk",
      amount: "$3,914.72",
      requester: "R. Danforth",
      approver: "Project Manager",
      waited: "42m",
      priority: "low",
      summary:
        "18 of 19 daily log entries passed the automated safety policy check. One incident logged during the safety walk carries an associated remediation cost of $312.00 that exceeds the $250 threshold and needs a justification.",
      checks: [
        { label: "Photos attached", ok: true },
        { label: "Duplicate entries", ok: true },
        { label: "Within policy", ok: false },
      ],
    },
    {
      id: "wf_drawrec_jun",
      type: "Draw Reconciliation",
      title: "Mercury Bank — Riverside Tower Draw, June close",
      amount: "$482,190.11",
      requester: "Recon Copilot",
      approver: "Project Executive",
      waited: "1h 05m",
      priority: "high",
      summary:
        "398 of 412 transactions auto-matched (96.6%). Two retainage entries are proposed and 14 exceptions are grouped and explained, ready to clear.",
      checks: [
        { label: "Balance ties out", ok: true },
        { label: "Exceptions grouped", ok: true },
        { label: "Retainage entries proposed", ok: true },
      ],
    },
    {
      id: "wf_subpay_ironclad",
      type: "Subcontractor Payment Approval",
      title: "Ironclad Steel Supply — Progress Payment",
      amount: "$6,540.00",
      requester: "Payments Copilot",
      approver: "Project Executive",
      waited: "2h 12m",
      priority: "high",
      summary:
        "Ironclad Steel Supply's progress payment has been verified against contract terms. The executed lien waiver for this billing period has not yet been received — hold until it's on file, otherwise reject and request resubmission.",
      checks: [
        { label: "Subcontractor verified", ok: true },
        { label: "Lien waiver on file", ok: false },
        { label: "Within contract terms", ok: true },
      ],
    },
  ];
}

export function listApprovalItems(): ApprovalItem[] {
  return readLocal(APPROVAL_ITEMS_KEY, seedApprovalItems);
}

function addApprovalItem(item: ApprovalItem): void {
  const items = readLocal(APPROVAL_ITEMS_KEY, seedApprovalItems);
  writeLocal(APPROVAL_ITEMS_KEY, [item, ...items]);
}

export function decideApprovalItem(id: string, decision: ApprovalDecision): void {
  const items = readLocal(APPROVAL_ITEMS_KEY, seedApprovalItems);
  writeLocal(
    APPROVAL_ITEMS_KEY,
    items.filter((i) => i.id !== id),
  );
  // Approval items and workflow runs share an id where one exists (all 3
  // copilot-triggered flows, plus a couple of the seeded ones) — reflect the
  // decision back onto the matching run. A no-op if there's no matching run.
  updateWorkflowRun(id, {
    status: decision === "approved" ? "completed" : "failed",
    waiting: "—",
    decision,
  });
  pushAuditEvent({ action: `approval.${decision}`, resource_kind: "approval", resource_id: id });
}

// --- copilot triggers — called when the AI Assistant is asked to run one ---
function refNumber(prefix: string): string {
  return `${prefix}-${1000 + Math.floor(Math.random() * 9000)}`;
}

function startRfiCopilot(): WorkflowRun {
  const ref = refNumber("RFI");
  const run: WorkflowRun = {
    id: `wf_rfi_${Date.now().toString(36)}`,
    name: `RFI Response & Approval — ${ref}`,
    status: "running",
    waiting: "—",
    decision: null,
    started: formatNow(),
    updated: formatNow(),
    flow: [
      { label: "RFI submitted", system: "Email Inbox", kind: "trigger" },
      { label: "Extract RFI details", system: "Document AI", kind: "extract" },
      { label: "Drawing/spec lookup", system: "Procore", kind: "match" },
      { label: "Cost-code assignment", system: "Rules Engine", kind: "validate" },
      { label: "PM approval", system: "Approvals", kind: "approve" },
      { label: "Post RFI response", system: "Procore", kind: "output" },
    ],
  };
  addWorkflowRun(run);
  pushAuditEvent({
    action: "workflow.started",
    resource_kind: "workflow",
    resource_id: run.id,
    metadata: { type: "rfi_copilot" },
  });
  setTimeout(() => {
    updateWorkflowRun(run.id, { status: "awaiting_approval", waiting: "PM approval" });
    addApprovalItem({
      id: run.id,
      type: "RFI Approval",
      title: `RFI ${ref} — drafted response ready for review`,
      amount: "—",
      requester: "RFI Copilot",
      approver: "Project Manager",
      waited: "0m",
      priority: "medium",
      summary: `The RFI Copilot extracted the question, matched it to the relevant drawing and spec sections, and checked for duplicates before drafting a response for ${ref}. Review and approve to post it back to Procore.`,
      checks: [
        { label: "Drawing/spec match", ok: true },
        { label: "Duplicate check", ok: true },
        { label: "Cost-code assignment", ok: true },
      ],
    });
  }, 4000);
  return run;
}

function startChangeOrderCopilot(): WorkflowRun {
  const ref = refNumber("CO");
  const run: WorkflowRun = {
    id: `wf_co_${Date.now().toString(36)}`,
    name: `Change Order Copilot — ${ref}`,
    status: "running",
    waiting: "—",
    decision: null,
    started: formatNow(),
    updated: formatNow(),
    flow: [
      { label: "Change request submitted", system: "Procore", kind: "trigger" },
      { label: "Retrieve supporting documents", system: "Email", kind: "extract" },
      { label: "Retrieve budget + schedule", system: "Procore", kind: "match" },
      { label: "Calculate cost/schedule impact", system: "Rules Engine", kind: "validate" },
      { label: "PM approval", system: "Approvals", kind: "approve" },
      { label: "Create change order", system: "Procore", kind: "output" },
    ],
  };
  addWorkflowRun(run);
  pushAuditEvent({
    action: "workflow.started",
    resource_kind: "workflow",
    resource_id: run.id,
    metadata: { type: "change_order_copilot" },
  });
  setTimeout(() => {
    updateWorkflowRun(run.id, { status: "awaiting_approval", waiting: "PM approval" });
    addApprovalItem({
      id: run.id,
      type: "Change Order Approval",
      title: `Change Order ${ref} — drafted for review`,
      amount: "—",
      requester: "Change Order Copilot",
      approver: "Project Manager",
      waited: "0m",
      priority: "medium",
      summary: `The Change Order Copilot compared the request against the approved scope, calculated the budget impact, and estimated the schedule delay for ${ref}. Review the executive summary before it's created in Procore.`,
      checks: [
        { label: "Scope comparison", ok: true },
        { label: "Budget impact calculated", ok: true },
        { label: "Schedule impact estimated", ok: true },
      ],
    });
  }, 4000);
  return run;
}

function startDailySiteReportCopilot(): WorkflowRun {
  const today = formatNow().split(",")[0];
  const run: WorkflowRun = {
    id: `wf_dsr_${Date.now().toString(36)}`,
    name: `Daily Site Report — ${today}`,
    status: "running",
    waiting: "—",
    decision: null,
    started: formatNow(),
    updated: formatNow(),
    flow: [
      { label: "End of workday", system: "Scheduler", kind: "trigger" },
      { label: "Collect site emails + photos", system: "Email", kind: "extract" },
      { label: "Retrieve task + equipment status", system: "Procore", kind: "match" },
      { label: "Generate daily report", system: "Document AI", kind: "validate" },
      { label: "PM approval", system: "Approvals", kind: "approve" },
      { label: "Email daily report", system: "Email", kind: "output" },
    ],
  };
  addWorkflowRun(run);
  pushAuditEvent({
    action: "workflow.started",
    resource_kind: "workflow",
    resource_id: run.id,
    metadata: { type: "daily_site_report_copilot" },
  });
  setTimeout(() => {
    updateWorkflowRun(run.id, { status: "awaiting_approval", waiting: "PM approval" });
    addApprovalItem({
      id: run.id,
      type: "Daily Site Report",
      title: `Daily Site Report — ${today} — ready for review`,
      amount: "—",
      requester: "Daily Site Report Copilot",
      approver: "Project Manager",
      waited: "0m",
      priority: "low",
      summary:
        "The Daily Site Report Copilot collected today's site emails and photos, summarized work completed against the schedule, and checked equipment usage and safety notes.",
      checks: [
        { label: "Work summary generated", ok: true },
        { label: "Equipment status pulled", ok: true },
        { label: "No safety issues flagged", ok: true },
      ],
    });
  }, 4000);
  return run;
}

// --- AI assistant (keyword-matched canned answers over the dummy platform data) ---
function dummyAssistantAnswer(message: string, useRag?: boolean): string {
  const q = message.toLowerCase();

  // Action intent — "call/run/start/trigger the X Copilot" actually spawns a
  // workflow run instead of just describing it.
  const triggerVerb = /\b(call|run|start|trigger|kick off|kick-off|launch|invoke|fire)\b/.test(q);
  if (triggerVerb) {
    if (q.includes("rfi")) {
      const run = startRfiCopilot();
      return (
        `Started the **RFI Copilot** (\`${run.id}\`). It's extracting the RFI, looking up the relevant ` +
        `drawings and spec sections, and checking for duplicates — it'll land in **Workflows**, then move ` +
        `to **Approvals** for a Project Manager to sign off in a few seconds.`
      );
    }
    if (q.includes("change order")) {
      const run = startChangeOrderCopilot();
      return (
        `Started the **Change Order Copilot** (\`${run.id}\`). It's calculating the budget and schedule ` +
        `impact against the approved scope — it'll land in **Workflows**, then move to **Approvals** for a ` +
        `Project Manager to sign off in a few seconds.`
      );
    }
    if (q.includes("daily site report") || q.includes("site report")) {
      const run = startDailySiteReportCopilot();
      return (
        `Started the **Daily Site Report Copilot** (\`${run.id}\`). It's collecting today's site emails and ` +
        `photos and pulling task and equipment status — it'll land in **Workflows**, then move to ` +
        `**Approvals** for a Project Manager to sign off in a few seconds.`
      );
    }
  }

  const docs = dummyListDocuments();
  const latest = docs[0];

  let answer: string;
  if (q.includes("summar") && (q.includes("document") || q.includes("doc"))) {
    answer =
      `Here's a quick summary of your most recent document, **${latest.filename}**: it's currently ` +
      `${latest.status === "processing" ? "still being processed — extraction will finish shortly" : "fully processed and ready for review"}. ` +
      `Once you open it in Document Intelligence you'll get extracted fields, cost-code coding, and any flagged risks.`;
  } else if (q.includes("what can") || q.includes("platform do") || q.includes("capabilit")) {
    answer =
      "This platform runs copilots across your project lifecycle: RFI response & routing, submittal tracking, " +
      "change-order review, draw & pay-application reconciliation, job cost close and WIP reporting, daily log & " +
      "safety compliance, subcontractor onboarding & lien waivers, and permit & inspection compliance. Every " +
      "action drafted by a copilot is reviewed by a person before anything posts, and it's all logged to your audit trail.";
  } else if (q.includes("status update") || (q.includes("draft") && q.includes("update"))) {
    answer =
      "**Weekly status update — Riverside Tower**\n\n" +
      "- RFI-2214 (Apex Building Materials): response drafted and posted to Procore.\n" +
      "- CO-2231 (Coastal Glazing LLC): flagged as a possible duplicate — awaiting Project Executive review.\n" +
      "- Draw Reconciliation (June, Mercury Bank): approved, 398/412 transactions auto-matched.\n" +
      "- Daily Log — Site Safety Walk: reviewed, one incident above the remediation-cost threshold needs sign-off.\n" +
      "- Ironclad Steel Supply: onboarding complete, COI verified.";
  } else if (q.includes("approval") || q.includes("approve")) {
    answer =
      "Approvals queue up for a Project Manager or Project Executive to review before anything is finalized. " +
      "Right now the queue covers Change Order Approval, Daily Log / Safety Incident Report, Draw Reconciliation, " +
      "and Subcontractor Payment Approval — each shows the automated checks (duplicate check, cost-code assignment, " +
      "lien waiver on file, etc.) so the reviewer can approve or reject in one click.";
  } else if (q.includes("rfi")) {
    answer =
      "The RFI Response & Routing Copilot reads an incoming RFI, pulls the relevant drawings and spec sections from " +
      "Procore, drafts a grounded response, and routes it to a PM for one-click approval before it's sent back to the field.";
  } else if (q.includes("submittal")) {
    answer =
      "The Submittal Tracking & Review Copilot keeps the submittal log current, flags overdue reviews, and reminds " +
      "the responsible party as the cycle-time clock runs — for example SUB-4482 from Ironclad Steel Supply.";
  } else if (q.includes("change order")) {
    answer =
      "Change orders are matched against the approved contract scope and checked for duplicates before they reach " +
      "approvals — CO-2231 from Coastal Glazing LLC is a live example currently held on a duplicate-check flag.";
  } else if (q.includes("job cost") || q.includes("wip") || q.includes("budget")) {
    answer =
      "Job Cost Close and WIP Reporting copilots pull actuals and budget from Procore, reconcile the cost codes, and " +
      "draft the variance commentary — Contract Value in Progress is currently $482,190 across 3 active projects.";
  } else if (q.includes("safety") || q.includes("daily log")) {
    answer =
      "The Daily Log & Safety Compliance Copilot reads field daily logs and checks them against safety policy — " +
      "the most recent one is the Riverside Tower Site Safety Walk, with one incident flagged above the remediation-cost threshold.";
  } else if (q.includes("permit") || q.includes("inspection") || q.includes("compliance")) {
    answer =
      "The Permit & Inspection Compliance Copilot tracks permit renewals and inspection schedules and prepares filings — " +
      "the Q2 permit review is currently marked failed and needs manual follow-up.";
  } else if (q.includes("subcontractor") || q.includes("lien waiver") || q.includes("onboard")) {
    answer =
      "Subcontractor onboarding collects a COI, a signed subcontract, a W-9, and a conditional lien waiver before the " +
      "first payment — Ironclad Steel Supply was onboarded most recently.";
  } else if (q.includes("connector") || q.includes("procore") || q.includes("integrat")) {
    answer =
      "The Connector Hub links your existing systems — Procore, Autodesk Construction Cloud, Buildertrend, Mercury " +
      "Bank, and more — so copilots can read and write directly into the tools your team already uses.";
  } else {
    answer =
      "I can help with RFIs, submittals, change orders, job costing, safety compliance, and permits — try asking " +
      '"Summarize my most recent document" or "Explain how approvals work here" to see it in action.';
  }

  if (useRag) {
    const cited = docs.slice(0, 2).map((d) => d.filename).join(", ");
    answer += `\n\n*(Grounded in your documents: ${cited})*`;
  }
  return answer;
}

// ---------------------------------------------------------------- orchestrator
export function chat(input: {
  message: string;
  session_id?: string;
  use_rag?: boolean;
  model?: string;
  workspace?: string; // active industry workspace, so the assistant is workspace-aware
}): Promise<ChatReply> {
  if (DUMMY_DATA) {
    return Promise.resolve({
      session_id: input.session_id ?? `sess_${Date.now().toString(36)}`,
      model: "dummy-assistant",
      answer: dummyAssistantAnswer(input.message, input.use_rag),
    });
  }
  return request<ChatReply>("/api/orchestrator/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Streaming chat via SSE. Yields decoded frames (caller concatenates `delta`s).
 *  The FIRST frame carries `session_id` (send it back on the next request to CONTINUE
 *  the session); a `workflow` frame means the assistant STARTED a run. Both are also
 *  surfaced through the optional `onSession` / `onWorkflow` callbacks. */
export async function* chatStream(input: {
  message: string;
  session_id?: string;
  use_rag?: boolean;
  model?: string;
  workspace?: string; // active industry workspace, so the assistant is workspace-aware
  onSession?: (sessionId: string) => void;
  onWorkflow?: (workflow: ChatWorkflowFrame) => void;
}): AsyncGenerator<ChatStreamFrame> {
  const { onSession, onWorkflow, ...payload } = input;
  if (DUMMY_DATA) {
    const sessionId = payload.session_id ?? `sess_${Date.now().toString(36)}`;
    onSession?.(sessionId);
    yield { session_id: sessionId, model: "dummy-assistant" };
    const answer = dummyAssistantAnswer(payload.message, payload.use_rag);
    for (const word of answer.split(/(\s+)/)) {
      if (!word) continue;
      await sleep(16 + Math.random() * 24);
      yield { delta: word };
    }
    pushAuditEvent({
      action: "assistant.reply",
      resource_kind: "chat",
      resource_id: sessionId,
      metadata: { use_rag: !!input.use_rag },
    });
    return;
  }
  const resp = await fetch(`${API_URL}/api/orchestrator/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok || !resp.body) throw new ApiError("Stream failed", resp.status);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.replace(/^data: /, "").trim();
      if (!data || data === "[DONE]") continue;
      try {
        const frame = JSON.parse(data) as ChatStreamFrame;
        // FIRST frame carries the session_id; a `workflow` frame means a run started.
        if (frame.session_id) onSession?.(frame.session_id);
        if (frame.workflow) onWorkflow?.(frame.workflow);
        yield frame;
      } catch {
        /* ignore partial frames */
      }
    }
  }
}

/** Fetch a stored chat session's transcript so it can be rehydrated after a reload
 *  or a tab switch. Pass the persisted `session_id`. */
export function getChatHistory(sessionId: string): Promise<ChatHistory> {
  return request<ChatHistory>(
    `/api/orchestrator/chat/history?session_id=${encodeURIComponent(sessionId)}`,
  );
}

/** This user's past chat sessions for the Conversations sidebar — most-recent
 *  first, empty sessions omitted by the gateway. */
export function listChatSessions(): Promise<ChatSessionSummary[]> {
  return request<ChatSessionSummary[]>("/api/orchestrator/chat/sessions");
}

/** Rename a chat session (sidebar pencil / main-header pencil). */
export function renameChatSession(id: string, title: string): Promise<{ id: string; title: string }> {
  return request<{ id: string; title: string }>(
    `/api/orchestrator/chat/sessions/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ title }) },
  );
}

/** Delete a chat session (sidebar trash). */
export function deleteChatSession(id: string): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(
    `/api/orchestrator/chat/sessions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

// ---------------------------------------------------------------- knowledge
export function listDocuments(): Promise<DocumentItem[]> {
  if (DUMMY_DATA) return Promise.resolve(dummyListDocuments());
  return request<DocumentItem[]>("/api/knowledge/documents");
}

export function getDocument(id: string): Promise<DocumentItem> {
  if (DUMMY_DATA) {
    const doc = dummyListDocuments().find((d) => d.id === id);
    if (!doc) return Promise.reject(new ApiError("Document not found", 404));
    return Promise.resolve(doc);
  }
  return request<DocumentItem>(`/api/knowledge/documents/${id}`);
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  if (DUMMY_DATA) return dummyUploadDocument(file);
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_URL}/api/knowledge/documents`, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: form, // browser sets multipart boundary
  });
  if (!resp.ok) throw new ApiError("Upload failed", resp.status);
  return resp.json();
}

export function retrieve(
  query: string,
  topK = 5,
): Promise<{ query: string; results: RetrievedChunk[] }> {
  if (DUMMY_DATA) {
    const docs = dummyListDocuments().slice(0, topK);
    return Promise.resolve({
      query,
      results: docs.map((d, i) => ({
        document_id: d.id,
        chunk_index: 0,
        content: `Excerpt from ${d.filename} relevant to "${query}".`,
        score: Math.max(0.5, 0.95 - i * 0.08),
      })),
    });
  }
  return request("/api/knowledge/retrieve", {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK }),
  });
}

// ---------------------------------------------------------------- workflows
const DUMMY_WORKFLOWS: WorkflowItem[] = [
  {
    workflow_id: "wf_rfi_2214",
    type: "rfi_response",
    status: "awaiting_approval",
    document_id: "doc_rfi_2214",
    summary: "RFI Response & Approval — Apex Building Materials",
    decision: null,
    decided_by: null,
    comment: null,
    created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3_600_000).toISOString(),
  },
  {
    workflow_id: "wf_drawrec_jun",
    type: "draw_reconciliation",
    status: "completed",
    document_id: "doc_draw_jun",
    summary: "Draw Reconciliation — June",
    decision: "approved",
    decided_by: "a.reyes@northwind.co",
    comment: null,
    created_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    updated_at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
  },
];

export function listWorkflows(): Promise<WorkflowItem[]> {
  if (DUMMY_DATA) return Promise.resolve(DUMMY_WORKFLOWS);
  return request<WorkflowItem[]>("/api/workflows/workflows");
}

export interface WorkflowDefinitionSpec {
  pack_key: string;
  workflow_key: string;
  name: string;
  description?: string;
  trigger: string;
  connectors_required: string[];
  steps: { id: string; type: string; name: string }[];
  latest_status?: string | null;
  latest_run_id?: string | null;
  /** "seed" = shipped template, "user" = builder-authored (pack_key === "custom"). */
  source?: "seed" | "user";
}

export function listWorkflowDefinitions(): Promise<WorkflowDefinitionSpec[]> {
  if (DUMMY_DATA) return Promise.resolve([]);
  return request<WorkflowDefinitionSpec[]>("/api/workflows/packs/definitions");
}

/** Create/upsert a user workflow definition. `pack` is forced to "custom" server-side;
 *  the definition's `key` is the workflow id (upsert by key). */
export function createWorkflowDefinition(definition: unknown): Promise<WorkflowDefinitionSpec> {
  return request<WorkflowDefinitionSpec>("/api/workflows/packs/definitions", {
    method: "POST",
    body: JSON.stringify({ definition }),
  });
}

/** Update an existing user workflow definition (user flows only). */
export function updateWorkflowDefinition(
  key: string,
  definition: unknown,
): Promise<WorkflowDefinitionSpec> {
  return request<WorkflowDefinitionSpec>(`/api/workflows/packs/definitions/${key}`, {
    method: "PUT",
    body: JSON.stringify({ definition }),
  });
}

/** Delete a user workflow definition. */
export function deleteWorkflowDefinition(key: string): Promise<unknown> {
  return request(`/api/workflows/packs/definitions/${key}`, { method: "DELETE" });
}

/** The FULL stored WorkflowDefinition JSON (with per-step config) — needed to edit a flow
 *  in the builder (the list spec carries only id/type/name per step). Defaults to the
 *  reserved "custom" pack (user flows). */
export function getWorkflowDefinition(
  key: string,
  packKey = "custom",
): Promise<Record<string, unknown>> {
  const q = encodeURIComponent(packKey);
  return request<Record<string, unknown>>(`/api/workflows/packs/definitions/${key}?pack_key=${q}`);
}

/** Start a run of a workflow definition by key. */
export function startWorkflow(
  packKey: string,
  workflowKey: string,
  inputs?: Record<string, unknown>,
): Promise<{ run_id?: string; status?: string }> {
  return request(`/api/workflows/packs/${workflowKey}/run`, {
    method: "POST",
    body: JSON.stringify({ pack_key: packKey, inputs: inputs ?? {} }),
  });
}

/** Live view of a single workflow run — polled while a run is in flight. Run status
 *  is "running" | "awaiting_approval" | "completed" | "rejected"; step status is
 *  "completed" | "awaiting_approval" | "running" | "skipped" | "pending". */
export interface WorkflowRunView {
  run_id: string;
  pack_key: string;
  workflow_key: string;
  name: string;
  status: string;
  current_step: string | null;
  steps: { id: string; type: string; name: string; status: string }[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch the live detail of a workflow run (poll this while a run is in flight). */
export function getRun(runId: string): Promise<WorkflowRunView> {
  return request<WorkflowRunView>(`/api/workflows/packs/runs/${runId}`);
}

/** Approve the pending human gate of a run; the remaining steps then execute. */
export function approveRun(runId: string, comment = ""): Promise<unknown> {
  return request(`/api/workflows/packs/runs/${runId}/approve`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

/** Reject the pending human gate of a run. */
export function rejectRun(runId: string, comment = ""): Promise<unknown> {
  return request(`/api/workflows/packs/runs/${runId}/reject`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export function getWorkflow(id: string): Promise<WorkflowItem> {
  if (DUMMY_DATA) {
    const wf = DUMMY_WORKFLOWS.find((w) => w.workflow_id === id);
    if (!wf) return Promise.reject(new ApiError("Workflow not found", 404));
    return Promise.resolve(wf);
  }
  return request<WorkflowItem>(`/api/workflows/workflows/${id}`);
}

export function startDocumentReview(
  documentId: string,
): Promise<{ workflow_id: string; status: string }> {
  if (DUMMY_DATA) {
    return Promise.resolve({ workflow_id: `wf_${Date.now().toString(36)}`, status: "queued" });
  }
  return request("/api/workflows/workflows/document-review", {
    method: "POST",
    body: JSON.stringify({ document_id: documentId }),
  });
}

export function approveWorkflow(id: string, comment = ""): Promise<unknown> {
  if (DUMMY_DATA) {
    pushAuditEvent({ action: "workflow.approved", resource_kind: "workflow", resource_id: id, metadata: { comment } });
    return Promise.resolve({ ok: true });
  }
  return request(`/api/workflows/workflows/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export function rejectWorkflow(id: string, comment = ""): Promise<unknown> {
  if (DUMMY_DATA) {
    pushAuditEvent({ action: "workflow.rejected", resource_kind: "workflow", resource_id: id, metadata: { comment } });
    return Promise.resolve({ ok: true });
  }
  return request(`/api/workflows/workflows/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

// ---------------------------------------------------------------- connectors
const DUMMY_CONNECTORS: ConnectorItem[] = [
  { key: "procore", name: "Procore", kind: "pm", enabled: true, tool_count: 6 },
  { key: "autodesk-construction-cloud", name: "Autodesk Construction Cloud", kind: "pm", enabled: true, tool_count: 4 },
  { key: "mercury", name: "Mercury Bank", kind: "banking", enabled: true, tool_count: 3 },
];

export function listConnectors(): Promise<ConnectorItem[]> {
  if (DUMMY_DATA) return Promise.resolve(DUMMY_CONNECTORS);
  return request<ConnectorItem[]>("/api/connectors/connectors");
}

/** Full connector catalogue with an `entitled` flag on each item (vs. the default
 *  entitled-only list). Used by the workflow builder palette. */
export function listConnectorCatalog(): Promise<ConnectorItem[]> {
  return request<ConnectorItem[]>("/api/connectors/connectors?all=true");
}

export interface ConnectSession {
  status: "ok" | "sandbox";
  session_token?: string;
  provider?: string;
  message?: string;
}

/** Create a Nango Connect session so the current tenant's user can authorize the provider
 * from inside our app (feed session_token to Nango's Connect UI). */
export function getConnectSession(key: string): Promise<ConnectSession> {
  if (DUMMY_DATA) return Promise.resolve({ status: "sandbox", message: "Dummy data mode." });
  return request<ConnectSession>(`/api/connectors/connectors/${key}/connect-session`, {
    method: "POST",
  });
}

export function configureConnector(
  key: string,
  body: { enabled: boolean; config?: Record<string, unknown> },
): Promise<unknown> {
  if (DUMMY_DATA) {
    pushAuditEvent({ action: "connector.configured", resource_kind: "connector", resource_id: key, metadata: body });
    return Promise.resolve({ ok: true });
  }
  return request(`/api/connectors/connectors/${key}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Grant or revoke a tenant's entitlement to a connector (admin-only). */
export function setConnectorEntitlement(key: string, allowed: boolean): Promise<unknown> {
  return request(`/api/connectors/connectors/entitlements/${key}`, {
    method: "PUT",
    body: JSON.stringify({ allowed }),
  });
}

/** Request access to a connector the tenant is not yet entitled to. Creates a
 *  pending access request for an admin to approve or reject. */
export function requestConnectorAccess(
  key: string,
  note?: string,
): Promise<{ connector_key: string; status: string }> {
  return request(`/api/connectors/connectors/${key}/request-access`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
  });
}

/** List connector access requests (defaults to pending). */
export function listAccessRequests(status = "pending"): Promise<AccessRequest[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<AccessRequest[]>(`/api/connectors/connectors/access-requests${q}`);
}

/** Approve a pending access request (admin). Grants the entitlement server-side. */
export function approveAccessRequest(
  id: string,
): Promise<{ id: string; connector_key: string; status: string }> {
  return request(`/api/connectors/connectors/access-requests/${id}/approve`, {
    method: "POST",
  });
}

/** Reject a pending access request (admin). */
export function rejectAccessRequest(id: string): Promise<{ id: string; status: string }> {
  return request(`/api/connectors/connectors/access-requests/${id}/reject`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------- audit
export function listAuditEvents(params?: { limit?: number }): Promise<AuditEvent[]> {
  if (DUMMY_DATA) return Promise.resolve(dummyListAuditEvents(params?.limit));
  const q = params?.limit ? `?limit=${params.limit}` : "";
  return request<AuditEvent[]>(`/api/audit/events${q}`);
}

// ---------------------------------------------------------------- admin
export function getTenant(): Promise<Tenant> {
  if (DUMMY_DATA) return Promise.resolve(dummyGetTenant());
  return request<Tenant>("/api/admin/tenant");
}

export function updateTenantSettings(settings: Record<string, unknown>): Promise<unknown> {
  if (DUMMY_DATA) return Promise.resolve({ ok: true, settings });
  return request("/api/admin/tenant/settings", {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
}

export function systemHealth(): Promise<SystemHealth> {
  if (DUMMY_DATA) {
    return Promise.resolve({
      overall: "operational",
      services: {
        procore: "operational",
        "autodesk-construction-cloud": "operational",
        "mercury-bank": "operational",
        "document-ai": "operational",
      },
    });
  }
  return request<SystemHealth>("/api/admin/system/health");
}

export function listUsers(): Promise<UserItem[]> {
  if (DUMMY_DATA) return Promise.resolve(dummyListUsers());
  return request<UserItem[]>("/api/identity/users");
}

export function assignRole(userId: string, role: string): Promise<unknown> {
  if (DUMMY_DATA) return Promise.resolve(dummyAssignRole(userId, role));
  return request(`/api/identity/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

export const api = {
  apiUrl: API_URL,
  getToken,
  logout,
  login,
  signup,
  getMe,
  chat,
  chatStream,
  getChatHistory,
  listChatSessions,
  renameChatSession,
  deleteChatSession,
  listDocuments,
  getDocument,
  uploadDocument,
  retrieve,
  listWorkflows,
  listWorkflowDefinitions,
  getWorkflowDefinition,
  createWorkflowDefinition,
  updateWorkflowDefinition,
  deleteWorkflowDefinition,
  startWorkflow,
  getRun,
  approveRun,
  rejectRun,
  getWorkflow,
  startDocumentReview,
  approveWorkflow,
  rejectWorkflow,
  listConnectors,
  listConnectorCatalog,
  configureConnector,
  getConnectSession,
  setConnectorEntitlement,
  requestConnectorAccess,
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  listAuditEvents,
  getTenant,
  updateTenantSettings,
  systemHealth,
  listUsers,
  assignRole,
};
