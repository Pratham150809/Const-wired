import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Landmark,
  Mail,
  Moon,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Wand2,
  Workflow,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError, api } from "../api";
import { IntegrationLogo } from "../components/common/IntegrationLogo";
import { LogoLockup } from "../components/common/LogoLockup";
import { setStoredIndustry } from "../lib/industries";
import { ThemeProvider, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

// ---------------- Content config ----------------

type WorkflowStep = { label: string; detail: string };
type WorkflowContent = {
  title: string;
  before: string;
  after: string;
  steps: WorkflowStep[];
};

const HERO = {
  tagline: "The AI operating system for construction.",
  sub: "Automate RFIs, submittals, change orders, and job cost closeout. AI does the busywork and drafts every response — your PM reviews and approves before anything posts.",
};

// The single, construction-specific workflow shown in the before/after section.
const CLOSE_WORKFLOW: WorkflowContent = {
  title: "RFI-to-response, done in minutes.",
  before: "45+ minutes per RFI, digging through drawings, specs, and email threads.",
  after: "5 minutes: AI extracts, matches, and validates — you review and approve.",
  steps: [
    { label: "RFI arrives", detail: "A subcontractor submits an RFI on Riverside Tower." },
    { label: "Extract", detail: "OCR reads the attachments — drawings, photos, and spec callouts." },
    { label: "Match", detail: "Looks up the relevant drawings and specs; checks for a duplicate RFI." },
    { label: "Validate", detail: "Cost-code assignment, routing, and policy checks applied." },
    { label: "Approve", detail: "Your PM reviews the draft response and approves in one click." },
    { label: "Post", detail: "Response synced back to Procore, Autodesk, or Buildertrend." },
  ],
};

// ---------------- Copilot library (interactive catalog) ----------------

type CopilotGroup = "apar" | "close" | "compliance";

type Copilot = {
  group: CopilotGroup;
  label: string;
  title: string;
  goal: string;
  persona: string;
  approver: string;
  trigger: string;
  actions: string[];
  value: string[];
  // The live trace shown in the modal — each line mirrors what the copilot does.
  trace: { kind: "run" | "ok" | "wait" | "done"; text: string }[];
  runtime: string;
};

const COPILOT_GROUPS: { slug: CopilotGroup | "all"; label: string }[] = [
  { slug: "all", label: "All" },
  { slug: "apar", label: "RFIs / Submittals" },
  { slug: "close", label: "Billing & Job Costing" },
  { slug: "compliance", label: "Compliance & Safety" },
];

const GROUP_META: Record<CopilotGroup, { label: string; accent: string }> = {
  // Restrained, construction-appropriate accents so each family reads distinctly
  // without leaving the neutral theme.
  apar: { label: "RFIs / Submittals", accent: "#4f9dde" },
  close: { label: "Billing & Job Costing", accent: "#3f9a7f" },
  compliance: { label: "Compliance & Safety", accent: "#8a7fd0" },
};

const COPILOTS: Copilot[] = [
  {
    group: "apar",
    label: "RFIs / Submittals",
    title: "RFI Response & Routing Copilot",
    goal: "Look up the relevant drawings and specs, catch duplicate RFIs, and route them for approval.",
    persona: "Project Engineer",
    approver: "Project Manager (PM)",
    trigger: "A subcontractor submits an RFI on Riverside Tower.",
    actions: [
      "Extracts the question, drawings, and attachments automatically",
      "Looks up the relevant drawing sheets and spec sections",
      "Flags duplicate RFIs and out-of-scope requests",
      "Applies cost-code assignment and routes for approval",
      "Writes a plain-language response summary",
    ],
    value: [
      "No manual drawing lookups",
      "Duplicate and out-of-scope RFIs caught early",
      "Faster response cycles",
      "A clean, defensible audit trail",
    ],
    runtime: "2m 41s",
    trace: [
      { kind: "run", text: "connecting to Procore RFI log…" },
      { kind: "ok", text: "reading rfi_0417.pdf" },
      { kind: "ok", text: "matched subcontractor: Coastal Glazing LLC" },
      { kind: "ok", text: "drawing lookup: A-402 ✓ spec 08 44 00 ✓" },
      { kind: "ok", text: "no duplicate RFI found" },
      { kind: "ok", text: "cost-code assigned · response drafted" },
      { kind: "wait", text: "waiting on approval (Project Manager)" },
      { kind: "ok", text: "approved by A. Reyes" },
      { kind: "ok", text: "posted to Procore · confirmation sent" },
      { kind: "done", text: "done in 2m 41s" },
    ],
  },
  {
    group: "apar",
    label: "RFIs / Submittals",
    title: "Submittal Tracking & Review Copilot",
    goal: "Track the submittal log, chase overdue reviews, and draft reminders for your review.",
    persona: "Project Engineer",
    approver: "Project Manager (PM)",
    trigger: "A submittal passes its due date, or on your weekly log review.",
    actions: [
      "Pulls the submittal log and ranks items by risk",
      "Checks status against the approved schedule",
      "Drafts a tailored reminder per reviewer and stage",
      "Suggests next steps for at-risk submittals",
      "Logs every touch against the submittal record",
    ],
    value: [
      "Lower submittal cycle time",
      "Consistent, on-time follow-up",
      "Less time chasing reviewers",
      "Earlier warning on at-risk submittals",
    ],
    runtime: "1m 48s",
    trace: [
      { kind: "run", text: "connecting to Autodesk Construction Cloud…" },
      { kind: "ok", text: "submittal log pulled · 37 open items" },
      { kind: "ok", text: "schedule status checked" },
      { kind: "ok", text: "12 reminders drafted by stage" },
      { kind: "ok", text: "2 submittals flagged high-risk" },
      { kind: "wait", text: "waiting on approval (Project Manager)" },
      { kind: "ok", text: "approved · reminders queued to send" },
      { kind: "done", text: "done in 1m 48s" },
    ],
  },
  {
    group: "apar",
    label: "RFIs / Submittals",
    title: "Subcontractor Onboarding & Lien Waiver Copilot",
    goal: "Collect and verify new-subcontractor details, insurance, and lien waivers before the first pay app.",
    persona: "Project Engineer",
    approver: "Project Executive",
    trigger: "A team member requests a new subcontractor be set up.",
    actions: [
      "Requests and reads the COI and insurance certificates",
      "Validates TIN and checks for duplicate subcontractors",
      "Collects and verifies conditional and unconditional lien waivers",
      "Drafts the subcontractor master record for review",
    ],
    value: [
      "Fewer payment errors and lien risk",
      "No duplicate subcontractor records",
      "Faster, compliant onboarding",
      "Complete documentation on file",
    ],
    runtime: "2m 12s",
    trace: [
      { kind: "run", text: "connecting to email + Procore…" },
      { kind: "ok", text: "COI received and parsed" },
      { kind: "ok", text: "TIN validated · no duplicate subcontractor" },
      { kind: "ok", text: "insurance limits meet contract requirements" },
      { kind: "ok", text: "lien waiver collected · subcontractor record drafted" },
      { kind: "wait", text: "waiting on approval (Project Executive)" },
      { kind: "done", text: "done in 2m 12s" },
    ],
  },
  {
    group: "close",
    label: "Billing & Job Costing",
    title: "Draw & Pay Application Reconciliation Copilot",
    goal: "Match draw requests and pay applications to job cost detail and surface only the exceptions that need you.",
    persona: "Project Accountant",
    approver: "Project Manager (PM)",
    trigger: "A draw request is submitted, or you start a pay application reconciliation.",
    actions: [
      "Pulls the Mercury draw account activity and job cost detail",
      "Auto-matches pay applications by cost code, amount, and period",
      "Groups and explains the unmatched exceptions",
      "Proposes retainage journal entries",
      "Writes a reconciliation summary with the balance",
    ],
    value: [
      "Reconciliations in minutes, not hours",
      "Only true exceptions reach your desk",
      "Fewer surprises at draw time",
      "A documented, reviewable match trail",
    ],
    runtime: "2m 20s",
    trace: [
      { kind: "run", text: "connecting to Mercury draw account…" },
      { kind: "ok", text: "412 line items pulled" },
      { kind: "ok", text: "398 auto-matched (96.6%)" },
      { kind: "ok", text: "14 exceptions grouped" },
      { kind: "ok", text: "2 retainage entries proposed" },
      { kind: "wait", text: "waiting on approval (Project Manager)" },
      { kind: "ok", text: "approved · draw reconciliation closed" },
      { kind: "done", text: "done in 2m 20s" },
    ],
  },
  {
    group: "close",
    label: "Billing & Job Costing",
    title: "Job Cost Close Copilot",
    goal: "Run the cost-code reconciliation checklist, prepare the WIP schedule, and track what's outstanding.",
    persona: "Project Accountant",
    approver: "Project Executive",
    trigger: "You kick off job cost close for the period.",
    actions: [
      "Works the cost-code reconciliation checklist task by task",
      "Prepares cost accruals and retainage schedules",
      "Reconciles key cost codes against committed cost",
      "Flags variances against budget and prior period",
      "Reports what's blocking the close in real time",
    ],
    value: [
      "A faster, more predictable job cost close",
      "Nothing falls through the cracks",
      "Fewer late cost adjustments",
      "Clear status for the whole project team",
    ],
    runtime: "4m 02s",
    trace: [
      { kind: "run", text: "loading cost-code checklist…" },
      { kind: "ok", text: "18 of 24 tasks automated" },
      { kind: "ok", text: "accruals + retainage prepared" },
      { kind: "ok", text: "cost codes reconciled to committed cost" },
      { kind: "ok", text: "3 variances flagged" },
      { kind: "wait", text: "waiting on approval (Project Executive)" },
      { kind: "done", text: "done in 4m 02s" },
    ],
  },
  {
    group: "close",
    label: "Billing & Job Costing",
    title: "Job Cost & WIP Reporting Copilot",
    goal: "Turn job cost data into an executive-ready cost report with variance commentary.",
    persona: "Project Accountant",
    approver: "Project Executive",
    trigger: "You choose a reporting period from the dashboard.",
    actions: [
      "Pulls the latest actuals and budget data by cost code",
      "Builds the WIP schedule, cost report, and cash flow",
      "Compares actuals against budget and prior period",
      "Flags unusual cost trends automatically",
      "Writes an executive summary in plain language",
    ],
    value: [
      "Faster owner and leadership reporting",
      "Consistent, ready-to-send insights",
      "Less time in spreadsheets",
      "Earlier visibility into cost variances",
    ],
    runtime: "3m 05s",
    trace: [
      { kind: "run", text: "connecting to Procore…" },
      { kind: "ok", text: "actuals + budget pulled by cost code" },
      { kind: "ok", text: "WIP schedule, cost report, cash flow built" },
      { kind: "ok", text: "3 variances flagged with commentary" },
      { kind: "ok", text: "executive summary drafted" },
      { kind: "wait", text: "waiting on approval (Project Executive)" },
      { kind: "ok", text: "approved by J. Lin" },
      { kind: "done", text: "done in 3m 05s" },
    ],
  },
  {
    group: "compliance",
    label: "Compliance & Safety",
    title: "Daily Log & Safety Compliance Copilot",
    goal: "Read daily field logs and check them against your safety policy before issues pile up.",
    persona: "Superintendent",
    approver: "Project Executive",
    trigger: "A foreman submits a daily log or safety observation.",
    actions: [
      "Reads daily logs and safety observations automatically",
      "Verifies crew count, weather, and work performed",
      "Flags missing safety checks and incomplete entries",
      "Checks each entry against site safety policy",
      "Writes a short compliance summary",
    ],
    value: [
      "Lower safety incident risk",
      "Policy applied the same way every time",
      "Faster visibility into site conditions",
      "Cleaner records for audit",
    ],
    runtime: "1m 22s",
    trace: [
      { kind: "run", text: "connecting to Fieldwire…" },
      { kind: "ok", text: "reading daily_log_0713.jpg" },
      { kind: "ok", text: "crew count + weather extracted" },
      { kind: "ok", text: "no gaps · safety policy check passed" },
      { kind: "ok", text: "compliance summary ready" },
      { kind: "wait", text: "waiting on approval (Project Executive)" },
      { kind: "ok", text: "approved · log published" },
      { kind: "done", text: "done in 1m 22s" },
    ],
  },
  {
    group: "compliance",
    label: "Compliance & Safety",
    title: "Audit & Closeout Preparation Copilot",
    goal: "Assemble the punch list, pull closeout documents, and tie cost detail to source before handover.",
    persona: "Project Engineer",
    approver: "Project Manager (PM)",
    trigger: "You start closeout prep or an internal cost audit.",
    actions: [
      "Builds the closeout document checklist from the punch list",
      "Gathers warranties, O&M manuals, and as-builts as support",
      "Ties job cost balances back to source documents",
      "Flags gaps and missing documentation",
      "Packages everything into an auditor-ready workpaper set",
    ],
    value: [
      "Weeks of closeout compressed into days",
      "No last-minute document scrambles",
      "Every cost traceable to support",
      "A smoother handover to the Owner",
    ],
    runtime: "5m 30s",
    trace: [
      { kind: "run", text: "loading punch list…" },
      { kind: "ok", text: "closeout checklist generated · 46 items" },
      { kind: "ok", text: "warranty binders gathered for 41 items" },
      { kind: "ok", text: "cost balances tied to source" },
      { kind: "ok", text: "5 gaps flagged for follow-up" },
      { kind: "wait", text: "waiting on approval (Project Manager)" },
      { kind: "done", text: "done in 5m 30s" },
    ],
  },
  {
    group: "compliance",
    label: "Compliance & Safety",
    title: "Permit & Inspection Compliance Copilot",
    goal: "Track permit status and inspection schedules, and prepare filings for your review.",
    persona: "Project Engineer",
    approver: "Project Manager (PM)",
    trigger: "On an inspection deadline, or when a new permit is issued.",
    actions: [
      "Reviews permits for jurisdiction and expiration",
      "Schedules required inspections against the project timeline",
      "Flags missed or upcoming inspection windows",
      "Prepares the filing with supporting detail",
      "Summarizes what changed since last period",
    ],
    value: [
      "Lower risk of stop-work orders",
      "Consistent treatment across jurisdictions",
      "Filings prepared, not just tracked",
      "A documented compliance trail",
    ],
    runtime: "3m 14s",
    trace: [
      { kind: "run", text: "connecting to Procore…" },
      { kind: "ok", text: "permits reviewed for jurisdiction" },
      { kind: "ok", text: "inspections scheduled against timeline" },
      { kind: "ok", text: "4 upcoming inspection windows flagged" },
      { kind: "ok", text: "filing prepared with detail" },
      { kind: "wait", text: "waiting on approval (Project Manager)" },
      { kind: "done", text: "done in 3m 14s" },
    ],
  },
];

// ---------------- Integrations (construction-focused) ----------------

type LandingIntegrationCategory =
  | "PM & Field Systems"
  | "Payments & Banking"
  | "Design & Docs"
  | "Docs & Comms";

type LandingIntegration = {
  slug: string;
  name: string;
  domain: string;
  category: LandingIntegrationCategory;
  logo?: string;
};

const INTEGRATION_CATEGORIES: LandingIntegrationCategory[] = [
  "PM & Field Systems",
  "Payments & Banking",
  "Design & Docs",
  "Docs & Comms",
];

const LANDING_INTEGRATIONS: LandingIntegration[] = [
  // PM & Field Systems
  { slug: "procore", name: "Procore", domain: "procore.com", category: "PM & Field Systems" },
  { slug: "autodesk-construction-cloud", name: "Autodesk Construction Cloud", domain: "autodesk.com", category: "PM & Field Systems" },
  { slug: "oracle-primavera-p6", name: "Oracle Primavera P6", domain: "oracle.com", category: "PM & Field Systems" },
  { slug: "buildertrend", name: "Buildertrend", domain: "buildertrend.com", category: "PM & Field Systems" },
  { slug: "fieldwire", name: "Fieldwire", domain: "fieldwire.com", category: "PM & Field Systems" },
  { slug: "bluebeam-pm", name: "Bluebeam", domain: "bluebeam.com", category: "PM & Field Systems" },
  { slug: "sage-300-cre", name: "Sage 300 CRE", domain: "sage.com", category: "PM & Field Systems" },

  // Payments & Banking
  { slug: "mercury", name: "Mercury", domain: "mercury.com", category: "Payments & Banking" },

  // Design & Docs
  { slug: "plangrid", name: "PlanGrid", domain: "plangrid.com", category: "Design & Docs" },
  { slug: "e-builder", name: "e-Builder", domain: "e-builder.net", category: "Design & Docs" },

  // Docs & Comms
  { slug: "salesforce", name: "Salesforce", domain: "salesforce.com", category: "Docs & Comms" },
  { slug: "microsoft-365-excel", name: "Microsoft 365 / Excel", domain: "microsoft.com", category: "Docs & Comms" },
];

// ---------------- Page ----------------

function Index() {
  // The landing page owns its own theme state (light/dark) via the shared
  // ThemeProvider, so the toggle in the nav can switch the whole marketing page.
  return (
    <ThemeProvider>
      <IndexContent />
    </ThemeProvider>
  );
}

function IndexContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const onAuthenticated = () => {
    // The app is scoped to construction.
    setStoredIndustry("construction");
    navigate({ to: "/app" });
  };

  const onBookDemo = () => navigate({ to: "/demo" });

  return (
    <div
      className={cn(
        "landing-root min-h-screen bg-background text-foreground",
        theme === "dark" && "dark",
      )}
    >
      <Nav onLogin={() => setAuthOpen(true)} onBookDemo={onBookDemo} />
      <Hero onBookDemo={onBookDemo} />
      <IntegrationCatalog />
      <CopilotLibrary />
      <CoreDiagram />
      <WorkflowSection content={CLOSE_WORKFLOW} />
      <PlatformGrid />
      <CTASection onBookDemo={onBookDemo} />
      <Footer />
      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={onAuthenticated} />
      )}
    </div>
  );
}

// ---------------- Nav ----------------

function Nav({ onLogin, onBookDemo }: { onLogin: () => void; onBookDemo: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <a href="#" className="flex items-center">
          <LogoLockup className="ml-2" />
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#copilots" className="transition hover:text-foreground">
            Copilots
          </a>
          <a href="#platform" className="transition hover:text-foreground">
            Platform
          </a>
          <a href="#workflow" className="transition hover:text-foreground">
            How it works
          </a>
          <a href="#integrations" className="transition hover:text-foreground">
            Integrations
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={onLogin}
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Log in
          </button>
          <button
            onClick={onBookDemo}
            className="brand-gradient rounded-lg px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition hover:opacity-90"
          >
            Book a demo
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------------- Hero ----------------

const HERO_TRUST: { icon: LucideIcon; label: string }[] = [
  { icon: Landmark, label: "Works with Procore, Autodesk Construction Cloud & Buildertrend" },
  { icon: ShieldCheck, label: "Human approval before anything posts" },
  { icon: ScrollText, label: "Full audit trail on every action" },
];

function Hero({ onBookDemo }: { onBookDemo: () => void }) {
  return (
    <section className="relative border-b border-border/60">
      {/* Decorative layer is clipped on its own so it never overflows the section. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-44 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -top-10 right-0 h-80 w-80 rounded-full bg-primary-2/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-5 py-20 md:py-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Built for project executives, PMs & superintendents
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          {HERO.tagline}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{HERO.sub}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <button
            onClick={onBookDemo}
            className="brand-gradient inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:opacity-95"
          >
            Book a demo
          </button>
          <a
            href="#copilots"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:border-primary hover:text-primary"
          >
            See the copilots
          </a>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
          {HERO_TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {t.label}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------- Core diagram ----------------

type CoreCapability = {
  name: string;
  icon: LucideIcon;
  desc: string;
  detail: string;
  points: string[];
};

const CORE_CAPABILITIES: CoreCapability[] = [
  {
    name: "Document Intelligence",
    icon: FileText,
    desc: "Reads RFIs, submittals, and daily logs, then extracts clean, structured data.",
    detail:
      "Turns any inbound document — PDFs, scans, or phone photos from the field — into structured, project-ready data without manual keying. Every field comes with a confidence score, so low-confidence extractions are flagged for a human instead of posted blindly.",
    points: [
      "OCR for RFIs, submittals, and daily logs",
      "Drawing sheet, spec section, and cost-code parsing",
      "Subcontractor and cost-code recognition",
      "Confidence scoring with human review on exceptions",
    ],
  },
  {
    name: "Project Sync",
    icon: Landmark,
    desc: "Two-way sync with Procore, Autodesk Construction Cloud, and Buildertrend — status and entries write back.",
    detail:
      "A live, two-way connection to your project management system of record. Copilots read your RFI logs, submittal registers, and cost codes, then write approved responses straight back — no CSV exports, no re-keying, no drift between systems.",
    points: [
      "Two-way sync with Procore, Autodesk & Buildertrend",
      "Automatic cost-code assignment from your budget",
      "RFI response and submittal status write-back",
      "Subcontractor, drawing, and cost-code mapping",
    ],
  },
  {
    name: "Job Costing Engine",
    icon: Workflow,
    desc: "Auto-matches draws, pay applications, and job cost activity and surfaces only the exceptions.",
    detail:
      "Matches transactions across your draw account, job cost ledger, and subcontractor pay applications automatically, then groups and explains only the exceptions that actually need a human — so reconciliations take minutes, not hours.",
    points: [
      "Auto-matching by cost code, amount, and reference",
      "Draw, pay application, and inter-project reconciliation",
      "Exceptions grouped and explained in plain language",
      "Suggested adjusting entries for retainage and fees",
    ],
  },
  {
    name: "Approvals & Controls",
    icon: ShieldCheck,
    desc: "Segregation of duties, policy checks, and human sign-off before anything posts.",
    detail:
      "Every action a copilot proposes runs through your controls before it touches the project record. Approval routing, spend thresholds, and policy checks are enforced automatically, and nothing posts without the right person signing off.",
    points: [
      "Configurable approval routing and thresholds",
      "Segregation of duties enforced by role",
      "Company policy checks on every transaction",
      "Human sign-off required before anything posts",
    ],
  },
  {
    name: "Audit Trail",
    icon: ScrollText,
    desc: "Every extraction, match, and approval is logged and traceable back to source.",
    detail:
      "A complete, tamper-evident record of everything the platform does. Each extraction, match, edit, and approval is logged with the user and timestamp and linked back to its source document — audit-ready by default.",
    points: [
      "Every action logged with user and timestamp",
      "One-click trace from entry back to source document",
      "Immutable history of edits and approvals",
      "Exportable workpaper set for closeout and audit",
    ],
  },
  {
    name: "Reporting & Insights",
    icon: BarChart3,
    desc: "Cost reports, WIP schedules, and cash flow with variance commentary written for you.",
    detail:
      "Turns your job cost data into owner-ready reporting on demand. Cost reports and WIP schedules are built, actuals compared against budget and prior period, and variances explained in plain language — ready for you to review and send.",
    points: [
      "Cost reports, WIP schedules, and cash flow statements",
      "Budget vs actual and prior-period comparisons",
      "Automatic variance commentary",
      "Owner- and leadership-ready exports",
    ],
  },
];

function CoreDiagram() {
  const [selected, setSelected] = useState<CoreCapability | null>(null);
  return (
    <section id="platform" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-12 flex max-w-2xl flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            The construction core
          </span>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Every copilot runs on the same project operating system.
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Instead of rebuilding the basics for every task, each copilot inherits the same six
            building blocks — document intelligence, project sync, job costing, controls, audit
            trail, and reporting — already wired together and tuned for construction. Click any block
            to see what it does.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {CORE_CAPABILITIES.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelected(s)}
                aria-label={`Learn more about ${s.name}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <div className="text-base font-semibold md:text-[17px]">{s.name}</div>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  Learn more
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {selected && <CoreModal capability={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CoreModal({ capability, onClose }: { capability: CoreCapability; onClose: () => void }) {
  const Icon = capability.icon;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="core-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="nice-scroll max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex items-center gap-4">
            <span className="brand-gradient grid h-12 w-12 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-md shadow-primary/25">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                Construction core
              </span>
              <h3 id="core-title" className="mt-0.5 text-xl font-semibold tracking-tight">
                {capability.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <p className="text-sm leading-relaxed text-foreground/90">{capability.detail}</p>
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              What it does
            </div>
            <ul className="space-y-2">
              {capability.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <a
            href="#copilots"
            onClick={onClose}
            className="brand-gradient inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:opacity-95"
          >
            See the copilots that use it
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------- Workflow ----------------

// Adds an `in-view` class the first time the element scrolls into the viewport,
// so CSS-driven reveal/draw animations fire on scroll. No-op re-observes after.
function useInView<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin, threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

function WorkflowSection({ content }: { content: WorkflowContent }) {
  const workflow = content;
  const heading = useInView<HTMLDivElement>();
  const before = useInView<HTMLDivElement>();
  const after = useInView<HTMLDivElement>();
  const timeline = useInView<HTMLDivElement>();

  return (
    <section
      id="workflow"
      className="relative overflow-hidden border-b border-border/60 bg-surface-2 py-20"
    >
      {/* soft ambient glow behind the section */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-5">
        <div
          ref={heading.ref}
          className={cn(
            "reveal mb-12 flex flex-col items-center gap-3 text-center",
            heading.inView && "in-view",
          )}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> How it works
          </span>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            {workflow.title}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            The same six steps every time — AI does the work, your team stays in control.
          </p>
        </div>

        {/* Before → After contrast */}
        <div className="relative mb-16 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div
            ref={before.ref}
            className={cn(
              "reveal rounded-2xl border border-border bg-surface/40 p-6 transition duration-300 hover:-translate-y-1 hover:border-border/80",
              before.inView && "in-view",
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Before
              </span>
            </div>
            <p className="text-sm text-foreground/80">{workflow.before}</p>
          </div>
          <div className="flex items-center justify-center py-2 md:py-0">
            {/* dashed connector + arrow node */}
            <span
              aria-hidden
              className="absolute left-1/2 hidden h-px w-24 -translate-x-1/2 border-t border-dashed border-border md:block"
            />
            <div className="relative z-10 grid h-11 w-11 place-items-center rounded-full border border-primary/40 bg-background text-primary shadow-[0_0_0_5px_var(--surface-2)]">
              <ArrowRight className="arrow-float h-5 w-5" />
            </div>
          </div>
          <div
            ref={after.ref}
            className={cn(
              "reveal rounded-2xl border border-primary/40 bg-primary/5 p-6 shadow-[0_0_30px_-8px_var(--primary)] transition duration-300 hover:-translate-y-1",
              after.inView && "in-view",
            )}
            style={{ transitionDelay: after.inView ? "120ms" : "0ms" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                After
              </span>
            </div>
            <p className="text-sm text-foreground/90">{workflow.after}</p>
          </div>
        </div>

        {/* Connected step timeline */}
        <div ref={timeline.ref} className="relative">
          {/* far-left vertical rail + terminating arrow */}
          <span
            aria-hidden
            className={cn(
              "rail-draw absolute left-[19px] top-5 bottom-8 w-0.5 bg-gradient-to-b from-primary/50 via-border to-border",
              timeline.inView && "in-view",
            )}
          />

          <ol className="relative space-y-3">
            {workflow.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? Sparkles;
              return (
                <li key={s.label} className="relative flex items-center gap-3">
                  {/* numbered badge sitting on the rail */}
                  <div className="relative z-10 flex w-10 shrink-0 justify-center">
                    <span
                      className={cn(
                        "reveal grid h-8 w-8 place-items-center rounded-full border border-primary/50 bg-background text-xs font-semibold text-primary shadow-[0_0_0_4px_var(--surface-2),0_0_12px_-2px_var(--primary)]",
                        timeline.inView && "in-view",
                      )}
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  {/* connector dot */}
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  {/* step card */}
                  <div
                    className={cn(
                      "reveal grid flex-1 grid-cols-1 overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-surface/70 to-surface-2/50 transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 sm:grid-cols-[minmax(180px,240px)_1fr]",
                      timeline.inView && "in-view",
                    )}
                    style={{ transitionDelay: `${i * 80 + 60}ms` }}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-[15px] font-semibold text-foreground">{s.label}</span>
                    </div>
                    <div className="flex items-center border-t border-border/60 px-5 py-4 text-sm text-muted-foreground sm:border-l sm:border-t-0">
                      {s.detail}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

// Icons for the six-step flow, assigned by position (intake → extract → match →
// validate → approve → post).
const STEP_ICONS: LucideIcon[] = [Mail, FileText, Workflow, Wand2, User, CheckCircle2];

// ---------------- Copilot library (interactive catalog + modal) ----------------

function CopilotLibrary() {
  const [active, setActive] = useState<CopilotGroup | "all">("all");
  const [selected, setSelected] = useState<Copilot | null>(null);

  const items = useMemo(
    () => (active === "all" ? COPILOTS : COPILOTS.filter((c) => c.group === active)),
    [active],
  );

  return (
    <section id="copilots" className="border-b border-border/60 bg-surface-2/40 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-8 flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            Copilot library
          </span>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Pick the copilot for the work you want off your plate.
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every copilot follows the same shape: it starts on a trigger, handles the busywork with
            AI, and stops for your approval before anything posts. Click any card to see how it
            runs.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
          <div className="flex flex-wrap gap-1.5">
            {COPILOT_GROUPS.map((g) => (
              <CatalogChip
                key={g.slug}
                label={g.label}
                active={active === g.slug}
                onClick={() => setActive(g.slug)}
              />
            ))}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Showing <b className="font-medium text-primary">{items.length}</b> of {COPILOTS.length}{" "}
            copilots
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <button
              key={c.title}
              onClick={() => setSelected(c)}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: GROUP_META[c.group].accent }}
                >
                  {c.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{c.title}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{c.goal}</p>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-3 font-mono text-[11px] text-muted-foreground">
                <span>{c.persona}</span>
                <span className="flex items-center gap-1 text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  {c.approver}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && <CopilotModal copilot={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CopilotModal({ copilot, onClose }: { copilot: Copilot; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const accent = GROUP_META[copilot.group].accent;

  // Reveal the run trace line by line so the flow reads as something that
  // actually executes, not a static list.
  useEffect(() => {
    setStep(0);
    if (reduceMotion) {
      setStep(copilot.trace.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= copilot.trace.length) clearInterval(id);
    }, 340);
    return () => clearInterval(id);
  }, [copilot, reduceMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="nice-scroll max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <span
              className="font-mono text-[10px] font-medium uppercase tracking-wider"
              style={{ color: accent }}
            >
              {copilot.label}
            </span>
            <h3 id="copilot-title" className="mt-1.5 text-2xl font-semibold tracking-tight">
              {copilot.title}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{copilot.goal}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[1fr_320px]">
          {/* Left: explanation */}
          <div className="space-y-6 p-6">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3.5 w-3.5" style={{ color: accent }} /> Starts when
              </div>
              <p className="text-sm text-foreground/90">{copilot.trigger}</p>
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                What the AI does
              </div>
              <ul className="space-y-2">
                {copilot.actions.map((a) => (
                  <li key={a} className="flex gap-2.5 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground/90">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              You stay in control — <b className="font-semibold text-primary">
                {copilot.approver}
              </b>{" "}
              approves before anything posts.
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                What you get
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {copilot.value.map((v) => (
                  <li key={v} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: live run trace */}
          <div className="border-t border-border bg-surface-2/60 p-6 md:border-l md:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Live run
              </span>
              <span className="font-mono text-[11px] text-primary">{copilot.runtime}</span>
            </div>
            <div className="space-y-2 font-mono text-[12.5px] leading-relaxed">
              {copilot.trace.map((line, i) => {
                const shown = i < step;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2 transition-opacity duration-300",
                      shown ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <TraceIcon kind={line.kind} />
                    <span
                      className={cn(
                        line.kind === "wait" && "text-amber-500 dark:text-amber-400",
                        line.kind === "done" && "font-semibold text-foreground",
                        line.kind === "run" && "text-muted-foreground",
                        line.kind === "ok" && "text-foreground/80",
                      )}
                    >
                      {line.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href="#cta"
                onClick={onClose}
                className="brand-gradient inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:opacity-95"
              >
                Get this copilot
              </a>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/50"
              >
                Browse more
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TraceIcon({ kind }: { kind: Copilot["trace"][number]["kind"] }) {
  if (kind === "wait")
    return <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />;
  if (kind === "done") return <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />;
  if (kind === "run")
    return <span className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground">▸</span>;
  return <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />;
}

// ---------------- Integration catalog ----------------

function IntegrationCatalog() {
  const [active, setActive] = useState<LandingIntegrationCategory | "all">("all");

  const items = useMemo(
    () =>
      active === "all"
        ? LANDING_INTEGRATIONS
        : LANDING_INTEGRATIONS.filter((i) => i.category === active),
    [active],
  );

  return (
    <section id="integrations" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            Integrations
          </span>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            12+ project & field systems your copilots can talk to.
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Authenticate once. Read and act everywhere.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-1.5">
          <CatalogChip label="All" active={active === "all"} onClick={() => setActive("all")} />
          {INTEGRATION_CATEGORIES.map((c) => (
            <CatalogChip key={c} label={c} active={active === c} onClick={() => setActive(c)} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((i) => (
            <div
              key={i.slug}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 text-center transition hover:border-primary/50 hover:shadow-sm"
            >
              <IntegrationLogo
                name={i.name}
                domain={i.domain}
                logo={i.logo}
                className="h-12 w-12"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium break-words">{i.name}</div>
                <div className="text-[11px] text-muted-foreground">{i.category}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CatalogChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------- Platform grid ----------------

function PlatformGrid() {
  const rows = [
    { k: "Document Intelligence", v: "OCR for RFIs, submittals, and daily logs with structured extraction." },
    { k: "Project Sync", v: "Two-way sync with Procore, Autodesk Construction Cloud, and Buildertrend." },
    { k: "Job Costing", v: "Auto-matching for draws, pay applications, and cost-code activity." },
    { k: "Controls", v: "Segregation of duties, approval routing, and policy checks." },
    { k: "Audit Trail", v: "Every action logged and traceable back to source." },
    { k: "Security", v: "SSO, role-based access, encryption, and data residency controls." },
  ];
  return (
    <section className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-10">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            Under the hood
          </span>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Enterprise-grade, built for the controls construction requires.
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          {rows.map((r, i) => (
            <div
              key={r.k}
              className={`grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[220px_1fr] ${
                i !== rows.length - 1 ? "border-b border-border" : ""
              } bg-surface`}
            >
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {r.k}
              </div>
              <div className="text-sm text-foreground/90">{r.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- CTA ----------------

function CTASection({ onBookDemo }: { onBookDemo: () => void }) {
  return (
    <section id="cta" className="py-20">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Give your project teams back their afternoons.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          See how RFI, submittal, and job-costing copilots run on your own project stack. Book a
          demo, or sign in to your workspace.
        </p>
        <button
          onClick={onBookDemo}
          className="brand-gradient mt-6 inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:opacity-95"
        >
          Book a demo
        </button>
      </div>
    </section>
  );
}

// ---------------- Footer ----------------

type FooterLink = { label: string; href?: string; comingSoon?: boolean };

function Footer() {
  const navigate = useNavigate();
  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Copilots", href: "#copilots" },
        { label: "Platform", href: "#platform" },
        { label: "Integrations", href: "#integrations" },
        { label: "Security", href: "#platform" },
      ],
    },
    {
      title: "Solutions",
      links: [
        { label: "RFIs & submittals", href: "#copilots" },
        { label: "Billing & pay applications", href: "#copilots" },
        { label: "Job cost closeout", href: "#copilots" },
        { label: "General contractors", href: "#copilots" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", comingSoon: true },
        { label: "Customers", comingSoon: true },
        { label: "Careers", comingSoon: true },
        { label: "Contact", href: "/demo" },
      ],
    },
  ];
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center">
              <LogoLockup />
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The AI operating system for construction — RFIs, submittals, job costing, and
              closeout, with a human in control of every entry.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.comingSoon ? (
                      <button
                        type="button"
                        onClick={() => toast(`${l.label} — coming soon`)}
                        className="text-left transition hover:text-foreground"
                      >
                        {l.label}
                      </button>
                    ) : l.href?.startsWith("#") ? (
                      <a href={l.href} className="transition hover:text-foreground">
                        {l.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate({ to: l.href! })}
                        className="text-left transition hover:text-foreground"
                      >
                        {l.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Industry AI OS. All rights reserved.</div>
          <div className="font-mono">The AI operating system for construction</div>
        </div>
      </div>
    </footer>
  );
}

// ---------------- Auth modal ----------------

function AuthModal({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [status, setStatus] = useState<null | string>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    firstFieldRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    firstFieldRef.current?.focus();
    setStatus(null);
  }, [tab]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="auth-title" className="text-lg font-semibold">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tab === "login"
                ? "Sign in to your workspace."
                : "Get access to your construction copilots."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-background p-1">
          <button
            onClick={() => setTab("login")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "login" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "signup" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        {status ? (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
            {status}
            <div className="mt-4">
              <button
                onClick={onClose}
                className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        ) : tab === "login" ? (
          <LoginForm firstFieldRef={firstFieldRef} onAuthenticated={onAuthenticated} />
        ) : (
          <SignupForm firstFieldRef={firstFieldRef} onAuthenticated={onAuthenticated} />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function LoginForm({
  firstFieldRef,
  onAuthenticated,
}: {
  firstFieldRef: React.RefObject<HTMLInputElement | null>;
  onAuthenticated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email) errs.email = "Email is required";
    else if (!isEmail(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.login(email, password);
      onAuthenticated(); // navigates into the workspace (/app)
    } catch (err) {
      let msg = "Could not reach the platform. Is the backend running?";
      if (err instanceof ApiError) {
        // The backend replied — show why (bad credentials, no tenant/org, etc.).
        msg = err.status === 401 ? "Invalid email or password." : err.message;
      }
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Work email" error={errors.email}>
        <input
          ref={firstFieldRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </Field>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setErrors({
              form: "Password reset isn't available in this demo — sign in with the account you signed up with.",
            })
          }
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </button>
      </div>
      {errors.form && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.form}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Log in"}
      </button>
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="h-px w-full bg-border" />
        </div>
        <div className="relative text-center">
          <span className="bg-surface px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            or
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setErrors({ form: "SSO isn't wired yet — sign in with email + password." })}
        className="w-full rounded-md border border-border bg-background py-2 text-sm font-medium hover:border-primary"
      >
        Continue with SSO
      </button>
    </form>
  );
}

function SignupForm({
  firstFieldRef,
  onAuthenticated,
}: {
  firstFieldRef: React.RefObject<HTMLInputElement | null>;
  onAuthenticated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!isEmail(email)) errs.email = "Enter a valid work email";
    if (!company.trim()) errs.company = "Company is required";
    if (!password || password.length < 8) errs.password = "Password must be at least 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.signup({ name, email, company, password });
      onAuthenticated(); // account created + signed in — go straight into /app
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not create your account. Try again.";
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Full name" error={errors.name}>
        <input
          ref={firstFieldRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Ada Lovelace"
        />
      </Field>
      <Field label="Work email" error={errors.email}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>
      <Field label="Company" error={errors.company}>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={inputCls}
          placeholder="Meridian Builders"
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </Field>
      {errors.form && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.form}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
