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
const DUMMY_AUTH = true;
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
  throw new ApiError("Self-serve signup is not available yet.", 501);
}

export function getMe(): Promise<Me> {
  if (DUMMY_AUTH) return Promise.resolve(dummyMe());
  return request<Me>("/api/identity/me");
}

// --- Dummy data (documents, tenant, directory, audit) -----------------------
// Same idea as DUMMY_AUTH above: while these backend endpoints aren't wired,
// serve typed responses from localStorage so every screen is clickable and
// stateful standalone. Flip to `false` to restore the real gateway calls below.
const DUMMY_DATA = true;
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

// --- AI assistant (keyword-matched canned answers over the dummy platform data) ---
function dummyAssistantAnswer(message: string, useRag?: boolean): string {
  const q = message.toLowerCase();
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

/** Streaming chat via SSE. Yields text deltas; caller concatenates. */
export async function* chatStream(input: {
  message: string;
  session_id?: string;
  use_rag?: boolean;
  model?: string;
}): AsyncGenerator<{ delta?: string; session_id?: string; model?: string }> {
  if (DUMMY_DATA) {
    const sessionId = input.session_id ?? `sess_${Date.now().toString(36)}`;
    yield { session_id: sessionId, model: "dummy-assistant" };
    const answer = dummyAssistantAnswer(input.message, input.use_rag);
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
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: JSON.stringify(input),
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
        yield JSON.parse(data);
      } catch {
        /* ignore partial frames */
      }
    }
  }
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
    headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
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
  listDocuments,
  getDocument,
  uploadDocument,
  retrieve,
  listWorkflows,
  getWorkflow,
  startDocumentReview,
  approveWorkflow,
  rejectWorkflow,
  listConnectors,
  configureConnector,
  listAuditEvents,
  getTenant,
  updateTenantSettings,
  systemHealth,
  listUsers,
  assignRole,
};
