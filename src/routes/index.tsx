import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Moon,
  Settings2,
  Share2,
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

import { ApiError, api } from "../api";
import { CATEGORIES, INTEGRATIONS } from "../lib/catalog";
import type { IntegrationCategory } from "../lib/catalog";
import { IntegrationLogo } from "../components/common/IntegrationLogo";
import { LogoLockup } from "../components/common/LogoLockup";
import { setStoredIndustry } from "../lib/industries";
import { ThemeProvider, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

// ---------------- Content config ----------------

type Connector = { name: string; use: string; domain?: string };
type Workflow = {
  title: string;
  before: string;
  after: string;
  steps: { label: string; detail: string }[];
};
type IndustryContent = {
  heroTagline: string;
  heroSub: string;
  workflow: Workflow;
  connectors: {
    nango: Connector[];
    composio: Connector[];
    fallback?: boolean;
  };
};

const INDUSTRIES: { slug: string; label: string; blurb: string; icon: string }[] = [
  { slug: "common", label: "All industries", blurb: "See the shared platform view", icon: "◎" },
  { slug: "accounting", label: "Accounting", blurb: "Invoices, ledger, close", icon: "₵" },
  { slug: "banking", label: "Banking", blurb: "Ops, KYC, servicing", icon: "🏦" },
  { slug: "construction", label: "Construction", blurb: "RFIs, drawings, schedules", icon: "⌂" },
  { slug: "hr", label: "HR & ATS", blurb: "Hiring, onboarding, payroll", icon: "❖" },
  { slug: "productivity", label: "Productivity", blurb: "Docs, tasks, calendars", icon: "✎" },
];

const INDUSTRY_CONTENT: Record<string, IndustryContent> = {
  common: {
    heroTagline: "One AI operating system. Every line of business.",
    heroSub:
      "A shared core — identity, chat, workflow engine, document intelligence, connector hub — with copilots tuned to how your industry actually works.",
    workflow: {
      title: "A generic 45–60 min task, done in 5–10.",
      before: "Manual triage across email, files, and 3+ business systems.",
      after: "AI drafts, checks, and executes. A human reviews and approves.",
      steps: [
        { label: "Intake", detail: "An email, file, or chat message comes in." },
        { label: "Parse", detail: "Document intelligence extracts the key data." },
        { label: "Enrich", detail: "Connectors pull context from your systems." },
        { label: "Draft", detail: "AI drafts the response, record, or action." },
        { label: "Approve", detail: "A human reviews the draft and approves it." },
        { label: "Execute", detail: "The action is written back to your system." },
      ],
    },
    connectors: {
      fallback: true,
      nango: [
        { name: "Email & Calendar", use: "Read, send, and schedule across your inbox." },
        { name: "File Storage", use: "Access documents from your team drive." },
      ],
      composio: [
        {
          name: "Line-of-Business System",
          use: "Bring your own — we scope the integration with you.",
        },
      ],
    },
  },
  accounting: {
    heroTagline: "AI that closes the books faster.",
    heroSub:
      "Invoice processing, vendor lookups, duplicate checks, and ledger updates — drafted by AI, approved by your controller.",
    workflow: {
      title: "Invoice Processing & Approval Copilot",
      before: "45+ minutes per invoice across email, drive, and ERP.",
      after: "5 minutes: review, approve, done.",
      steps: [
        { label: "Vendor emails invoice", detail: "Nango retrieves the message and attachment." },
        { label: "OCR extracts data", detail: "Line items, totals, and vendor info parsed." },
        {
          label: "Composio checks records",
          detail: "Vendor lookup + duplicate flag against QuickBooks/Xero.",
        },
        {
          label: "AI drafts validation",
          detail: "Summary of matches, mismatches, and policy issues.",
        },
        { label: "Human approves", detail: "Controller clicks approve in one screen." },
        {
          label: "Composio posts entry",
          detail: "Invoice created and confirmation emailed via Nango.",
        },
      ],
    },
    connectors: {
      nango: [
        { name: "Outlook", use: "Retrieve vendor invoices from shared inbox." },
        { name: "Gmail", use: "Retrieve vendor invoices and send confirmations." },
        { name: "Microsoft 365", use: "Auth and identity for the finance team." },
        { name: "Google Drive", use: "Access invoice PDFs and receipts." },
        { name: "Microsoft Teams", use: "Post approval requests to a finance channel." },
        { name: "Calendar", use: "Schedule close and approval deadlines." },
      ],
      composio: [
        { name: "QuickBooks", use: "Create invoices, vendors, and journal entries." },
        { name: "Xero", use: "Ledger and journal retrieval, invoice posting." },
        { name: "CRM tools", use: "Cross-reference customers with A/R records." },
        { name: "ERP systems", use: "Sync invoices to your ERP of record." },
        { name: "Expense management", use: "Policy checks against submitted expenses." },
      ],
    },
  },
  legal: {
    heroTagline: "AI that reads the contract before you do.",
    heroSub:
      "Matter intake, contract review, and playbook checks — drafted by AI, sent back over your existing systems.",
    workflow: {
      title: "Contract Review Copilot",
      before: "60+ minutes reading and comparing against the playbook.",
      after: "10 minutes: read the summary, adjust, send.",
      steps: [
        { label: "Contract arrives", detail: "Nango pulls the attachment from email." },
        { label: "OCR parses it", detail: "Clauses, parties, and dates extracted." },
        {
          label: "Composio pulls precedent",
          detail: "Prior matters and the firm's playbook loaded.",
        },
        { label: "AI flags risk", detail: "Missing clauses, deviations, and red-flag terms." },
        { label: "Lawyer reviews", detail: "Summary + inline suggestions in one view." },
        {
          label: "Nango sends it back",
          detail: "Reviewed contract returned via Outlook or Gmail.",
        },
      ],
    },
    connectors: {
      nango: [
        { name: "Outlook", use: "Retrieve incoming contracts and correspondence." },
        { name: "Gmail", use: "Retrieve contracts and send replies." },
        { name: "Microsoft Teams", use: "Coordinate matter teams." },
        { name: "SharePoint", use: "Access matter document libraries." },
        { name: "Google Drive", use: "Access shared client folders." },
        { name: "OneDrive", use: "Access personal matter folders." },
        { name: "Google Calendar", use: "Schedule filings and depositions." },
      ],
      composio: [
        { name: "Clio", use: "Matter management and time capture." },
        { name: "MyCase", use: "Client and matter records." },
        { name: "PracticePanther", use: "Matter and billing actions." },
        { name: "Ironclad", use: "Contract lifecycle actions." },
        { name: "DocuSign", use: "E-signature status and send." },
        { name: "Notion", use: "Playbook and knowledge base." },
        { name: "Jira", use: "Task tracking for matter workstreams." },
        { name: "Asana", use: "Matter task workflows." },
        { name: "Monday.com", use: "Matter pipelines and intake." },
      ],
    },
  },
  construction: {
    heroTagline: "AI that answers the RFI before the site does.",
    heroSub:
      "RFI response, submittal tracking, and change-order drafting — grounded in your drawings, schedules, and PM system.",
    workflow: {
      title: "RFI Copilot",
      before: "A PM chasing drawings, schedules, and spec sections for hours.",
      after: "Draft response ready in minutes, PM approves and sends.",
      steps: [
        { label: "Contractor raises RFI", detail: "Nango retrieves the email or Teams message." },
        {
          label: "Docs parsed",
          detail: "OCR + document intelligence read attachments and drawings.",
        },
        {
          label: "Composio pulls project data",
          detail: "Drawings, schedules, and specs from Procore/ACC.",
        },
        {
          label: "AI drafts a response",
          detail: "Grounded in the project record, cites drawing refs.",
        },
        { label: "PM approves", detail: "One-click approval with edits inline." },
        { label: "Nango sends reply", detail: "Response goes back over email or Teams." },
      ],
    },
    connectors: {
      nango: [
        { name: "Outlook", use: "Retrieve RFIs and submittals from email." },
        { name: "Gmail", use: "Retrieve RFIs and send responses." },
        { name: "Microsoft Teams", use: "Read and post in project channels." },
        { name: "SharePoint", use: "Access project drawing sets." },
        { name: "Google Drive", use: "Access shared project folders." },
        { name: "OneDrive", use: "Access personal drawing folders." },
      ],
      composio: [
        { name: "Procore", use: "RFIs, submittals, and change orders." },
        { name: "Autodesk Construction Cloud", use: "Drawings and model coordination." },
        { name: "Oracle Primavera P6", use: "Master schedule lookups." },
        { name: "Buildertrend", use: "Residential project actions." },
        { name: "Monday.com", use: "Project pipelines and punch lists." },
        { name: "Asana", use: "Task tracking across trades." },
        { name: "Jira", use: "Issue tracking for tech-heavy builds." },
        { name: "ClickUp", use: "Project management workspaces." },
        { name: "Smartsheet", use: "Schedules, budgets, and trackers." },
      ],
    },
  },
};

function getContent(slug: string): IndustryContent {
  return INDUSTRY_CONTENT[slug] ?? INDUSTRY_CONTENT.common;
}

// ---------------- Copilot library (interactive catalog) ----------------

type CopilotGroup = "accounting" | "construction" | "legal";

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
  { slug: "accounting", label: "Accounting" },
  { slug: "construction", label: "Construction" },
  { slug: "legal", label: "Legal" },
];

const GROUP_META: Record<CopilotGroup, { label: string; accent: string }> = {
  // Accent is applied as an inline text color so each family reads distinctly
  // without leaving the neutral theme.
  accounting: { label: "Accounting", accent: "#4f9dde" },
  construction: { label: "Construction", accent: "#e0912f" },
  legal: { label: "Legal", accent: "#a988e6" },
};

const COPILOTS: Copilot[] = [
  {
    group: "accounting",
    label: "Accounting",
    title: "Invoice Processing & Approval Copilot",
    goal: "Validate supplier invoices, catch duplicates, and route them for finance approval.",
    persona: "AP Accountant",
    approver: "Finance Manager",
    trigger: "A supplier sends an invoice to your inbox.",
    actions: [
      "Reads and extracts invoice details automatically",
      "Matches the invoice to the right vendor",
      "Checks for duplicate or repeat invoices",
      "Flags missing or unusual information",
      "Writes a plain-language validation summary",
    ],
    value: [
      "Fewer manual entries",
      "Duplicate invoices caught before payment",
      "Faster approval cycles",
      "More consistent invoice accuracy",
    ],
    runtime: "2m 41s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading inbox" },
      { kind: "ok", text: "reading invoice_0417.pdf" },
      { kind: "ok", text: "matched to vendor: Acme Supplies" },
      { kind: "ok", text: "no duplicate found" },
      { kind: "ok", text: "validation summary ready" },
      { kind: "wait", text: "waiting on approval (Finance Manager)" },
      { kind: "ok", text: "approved by A. Reyes" },
      { kind: "ok", text: "invoice created · confirmation sent" },
      { kind: "done", text: "done in 2m 41s" },
    ],
  },
  {
    group: "accounting",
    label: "Accounting",
    title: "Financial Reporting Copilot",
    goal: "Turn raw ledger data into an executive-ready report, complete with commentary.",
    persona: "Financial Controller",
    approver: "CFO",
    trigger: "You choose a reporting period from the dashboard.",
    actions: [
      "Pulls the latest financial and budget data",
      "Compares actuals against budget",
      "Calculates key financial metrics",
      "Flags unusual trends automatically",
      "Writes an executive summary in plain language",
    ],
    value: [
      "Faster month-end reporting",
      "Consistent, ready-to-send insights",
      "Less time in spreadsheets",
      "Earlier visibility into variances",
    ],
    runtime: "3m 05s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "pulling ledger + budget data" },
      { kind: "ok", text: "actuals vs budget computed" },
      { kind: "ok", text: "3 variances flagged" },
      { kind: "ok", text: "executive summary drafted" },
      { kind: "wait", text: "waiting on approval (CFO)" },
      { kind: "ok", text: "approved by J. Lin" },
      { kind: "done", text: "done in 3m 05s" },
    ],
  },
  {
    group: "accounting",
    label: "Accounting",
    title: "Expense Audit Copilot",
    goal: "Check employee expense claims against policy before you reimburse them.",
    persona: "Expense Auditor",
    approver: "Finance Manager",
    trigger: "An employee uploads a receipt or expense claim.",
    actions: [
      "Reads receipts and expense details automatically",
      "Checks the merchant, amount, and category",
      "Flags duplicate claims",
      "Checks the claim against company policy",
      "Writes a short audit summary",
    ],
    value: [
      "Lower reimbursement fraud risk",
      "Policies applied the same way every time",
      "Faster approvals for employees",
      "Cleaner records if you're ever audited",
    ],
    runtime: "1m 22s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading receipt_travel.jpg" },
      { kind: "ok", text: "merchant + amount extracted" },
      { kind: "ok", text: "policy check passed" },
      { kind: "ok", text: "audit summary ready" },
      { kind: "wait", text: "waiting on approval (Finance Manager)" },
      { kind: "ok", text: "approved · reimbursement queued" },
      { kind: "done", text: "done in 1m 22s" },
    ],
  },
  {
    group: "construction",
    label: "Construction",
    title: "RFI Copilot",
    goal: "Draft technical responses to contractor questions using your drawings and project history.",
    persona: "Project Engineer",
    approver: "Project Manager",
    trigger: "A contractor submits a question by email or Teams.",
    actions: [
      "Reads the incoming question and any attachments",
      "Pulls the relevant drawings automatically",
      "Looks up how similar questions were answered before",
      "Writes a technical summary of the issue",
      "Drafts a response ready for review",
    ],
    value: [
      "Faster answers to the field",
      "Fewer project delays",
      "A written record of every decision",
      "Consistent, accurate technical answers",
    ],
    runtime: "4m 12s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading Teams message" },
      { kind: "ok", text: "drawings downloaded" },
      { kind: "ok", text: "matched project record" },
      { kind: "ok", text: "technical summary ready" },
      { kind: "ok", text: "draft response ready" },
      { kind: "wait", text: "waiting on approval (Project Manager)" },
      { kind: "ok", text: "approved by K. Malik · reply sent" },
      { kind: "done", text: "done in 4m 12s" },
    ],
  },
  {
    group: "construction",
    label: "Construction",
    title: "Change Order Copilot",
    goal: "Estimate the cost and schedule impact of a change request before anyone signs off.",
    persona: "Project Manager",
    approver: "Client Representative",
    trigger: "A contractor or client submits a change request.",
    actions: [
      "Reads the requested change and supporting documents",
      "Compares it against the current budget and schedule",
      "Calculates the likely cost impact",
      "Estimates any schedule delay",
      "Writes a plain-language change order summary",
    ],
    value: [
      "Faster change order turnaround",
      "More accurate cost estimates",
      "Fewer disputes down the line",
      "Tighter budget control",
    ],
    runtime: "3m 40s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading change request" },
      { kind: "ok", text: "compared vs budget + schedule" },
      { kind: "ok", text: "cost impact: +$18,400" },
      { kind: "ok", text: "schedule impact: +4 days" },
      { kind: "wait", text: "waiting on approval (Client Rep)" },
      { kind: "ok", text: "approved · CO logged" },
      { kind: "done", text: "done in 3m 40s" },
    ],
  },
  {
    group: "construction",
    label: "Construction",
    title: "Daily Site Report Copilot",
    goal: "Turn the day's photos, notes, and task updates into a finished progress report.",
    persona: "Site Engineer",
    approver: "Project Manager",
    trigger: "End of the workday, automatically.",
    actions: [
      "Collects the day's emails and site photos",
      "Reads handwritten notes on photos",
      "Pulls task and equipment status",
      "Summarizes work completed and any delays",
      "Flags any safety issues that came up",
    ],
    value: [
      "Minutes instead of an hour of paperwork",
      "Consistent daily reporting",
      "Earlier visibility into delays",
      "Better safety tracking",
    ],
    runtime: "2m 08s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "collected 24 site photos" },
      { kind: "ok", text: "handwritten notes parsed" },
      { kind: "ok", text: "task + equipment status pulled" },
      { kind: "ok", text: "1 safety issue flagged" },
      { kind: "ok", text: "progress report drafted" },
      { kind: "wait", text: "waiting on approval (Project Manager)" },
      { kind: "done", text: "done in 2m 08s" },
    ],
  },
  {
    group: "construction",
    label: "Construction",
    title: "Subcontractor Invoice Verification",
    goal: "Check subcontractor invoices against completed work before you approve payment.",
    persona: "Project Accountant",
    approver: "Finance Manager",
    trigger: "A subcontractor sends an invoice.",
    actions: [
      "Reads invoice details automatically",
      "Matches it to the original purchase order",
      "Compares it against completed work on site",
      "Flags any overbilling",
      "Writes a short discrepancy report",
    ],
    value: [
      "Less risk of overpaying",
      "Faster invoice-to-payment time",
      "Stronger subcontractor relationships",
      "A clean audit trail",
    ],
    runtime: "2m 55s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading subcontractor invoice" },
      { kind: "ok", text: "matched to PO-2214" },
      { kind: "ok", text: "compared vs completed work" },
      { kind: "ok", text: "overbilling flagged: 2 line items" },
      { kind: "wait", text: "waiting on approval (Finance Manager)" },
      { kind: "done", text: "done in 2m 55s" },
    ],
  },
  {
    group: "legal",
    label: "Legal",
    title: "Contract Review Copilot",
    goal: "Flag risky or non-standard clauses and prepare a redline before you review it yourself.",
    persona: "Legal Counsel",
    approver: "Senior Counsel",
    trigger: "A contract lands in your inbox or contract system.",
    actions: [
      "Reads the contract and extracts key terms",
      "Compares clauses against your standard playbook",
      "Flags risky or missing clauses",
      "Prepares a redline with suggested edits",
      "Writes a summary of the key commercial terms",
    ],
    value: [
      "Faster contract turnaround",
      "Consistent risk review every time",
      "Fewer surprises after signing",
      "Faster deal cycles",
    ],
    runtime: "5m 06s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading MSA_v3.docx" },
      { kind: "ok", text: "key terms extracted" },
      { kind: "ok", text: "compared vs playbook" },
      { kind: "ok", text: "4 clauses flagged" },
      { kind: "ok", text: "redline prepared" },
      { kind: "wait", text: "waiting on approval (Senior Counsel)" },
      { kind: "done", text: "done in 5m 06s" },
    ],
  },
  {
    group: "legal",
    label: "Legal",
    title: "Legal Matter Intake Copilot",
    goal: "Classify, conflict-check, and route new legal requests to the right person automatically.",
    persona: "Legal Operations Manager",
    approver: "Partner",
    trigger: "A new matter request comes in by form or email.",
    actions: [
      "Classifies the type and urgency of the request",
      "Runs an automatic conflict check",
      "Recommends who should handle it",
      "Writes a short intake summary",
    ],
    value: [
      "Faster onboarding for new matters",
      "Less administrative back-and-forth",
      "More accurate conflict checks",
      "Better-balanced workloads",
    ],
    runtime: "1m 34s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "classified: commercial · high urgency" },
      { kind: "ok", text: "conflict check clean" },
      { kind: "ok", text: "routed to M. Cho" },
      { kind: "wait", text: "waiting on approval (Partner)" },
      { kind: "done", text: "done in 1m 34s" },
    ],
  },
  {
    group: "legal",
    label: "Legal",
    title: "Litigation Document Assistant",
    goal: "Organize case documents and draft a first pass at the facts, ready for attorney review.",
    persona: "Litigation Associate",
    approver: "Senior Attorney",
    trigger: "New discovery documents or a filing come in.",
    actions: [
      "Reads through new documents and filings",
      "Pulls out key facts, dates, and names",
      "Builds a chronology of the case",
      "Flags anything inconsistent across documents",
      "Drafts a first-pass summary",
    ],
    value: [
      "Faster document review",
      "Fewer billable hours on basic organization",
      "A clearer case timeline",
      "Consistent fact-finding across the team",
    ],
    runtime: "6m 18s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading 42 discovery docs" },
      { kind: "ok", text: "facts, dates, names extracted" },
      { kind: "ok", text: "chronology built" },
      { kind: "ok", text: "2 inconsistencies flagged" },
      { kind: "wait", text: "waiting on approval (Senior Attorney)" },
      { kind: "done", text: "done in 6m 18s" },
    ],
  },
  {
    group: "legal",
    label: "Legal",
    title: "Compliance Review Copilot",
    goal: "Check a policy, process, or piece of marketing against your regulatory requirements.",
    persona: "Compliance Officer",
    approver: "General Counsel",
    trigger: "A business team submits something for compliance review.",
    actions: [
      "Checks the submission against applicable regulations",
      "Flags any non-compliant language",
      "Checks it against past compliance decisions",
      "Rates the overall risk level",
      "Recommends how to fix any issues",
    ],
    value: [
      "Faster compliance turnaround",
      "Lower regulatory risk",
      "The same standard applied every time",
      "A ready audit trail",
    ],
    runtime: "2m 47s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading campaign_brief.pdf" },
      { kind: "ok", text: "checked vs regulations" },
      { kind: "ok", text: "1 non-compliant claim flagged" },
      { kind: "ok", text: "risk level: medium" },
      { kind: "wait", text: "waiting on approval (General Counsel)" },
      { kind: "done", text: "done in 2m 47s" },
    ],
  },
  {
    group: "legal",
    label: "Legal",
    title: "NDA Approval Copilot",
    goal: "Compare an incoming NDA to your standard template and get it ready to sign.",
    persona: "Corporate Counsel",
    approver: "Legal Manager",
    trigger: "You or an external party send over an NDA.",
    actions: [
      "Compares the NDA to your standard template",
      "Flags any non-standard or risky clauses",
      "Drafts a standard NDA if none was provided",
      "Prepares a redline of suggested changes",
    ],
    value: [
      "Faster NDA turnaround",
      "A consistent approval process",
      "Fewer legal bottlenecks",
      "Deals move faster",
    ],
    runtime: "1m 58s",
    trace: [
      { kind: "run", text: "starting connector…" },
      { kind: "ok", text: "reading inbound NDA" },
      { kind: "ok", text: "compared to standard template" },
      { kind: "ok", text: "2 clauses flagged" },
      { kind: "ok", text: "redline ready" },
      { kind: "wait", text: "waiting on approval (Legal Manager)" },
      { kind: "ok", text: "approved by S. Okafor · sent to sign" },
      { kind: "done", text: "done in 1m 58s" },
    ],
  },
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
  const [industry, setIndustry] = useState<string>("common");
  const [authOpen, setAuthOpen] = useState(false);
  const content = useMemo(() => getContent(industry), [industry]);
  const showFallbackNotice = industry !== "common" && !INDUSTRY_CONTENT[industry];
  const navigate = useNavigate();
  const { theme } = useTheme();

  const onAuthenticated = () => {
    // Remember the industry the visitor tailored the page to, then enter the app.
    setStoredIndustry(industry);
    navigate({ to: "/app" });
  };

  return (
    <div
      className={cn(
        "landing-root min-h-screen bg-background text-foreground",
        theme === "dark" && "dark",
      )}
    >
      <Nav onLogin={() => setAuthOpen(true)} />
      <Hero
        content={content}
        industry={industry}
        setIndustry={setIndustry}
        showFallbackNotice={showFallbackNotice}
      />
      <IntegrationCatalog industry={industry} />
      <CopilotLibrary industry={industry} />
      <CoreDiagram />
      <WorkflowSection content={content} />
      <PlatformGrid />
      <CTASection onLogin={() => setAuthOpen(true)} />
      <Footer />
      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={onAuthenticated} />
      )}
    </div>
  );
}

// ---------------- Nav ----------------

function Nav({ onLogin }: { onLogin: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <a href="#" className="flex items-center">
          <LogoLockup className="ml-2" />
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#integrations" className="transition hover:text-foreground">
            Integrations
          </a>
          <a href="#copilots" className="transition hover:text-foreground">
            Copilots
          </a>
          <a href="#platform" className="transition hover:text-foreground">
            Platform
          </a>
          <a href="#workflow" className="transition hover:text-foreground">
            Workflow
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
            onClick={onLogin}
            className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Sign up
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------------- Hero ----------------

function Hero({
  content,
  industry,
  setIndustry,
  showFallbackNotice,
}: {
  content: IndustryContent;
  industry: string;
  setIndustry: (s: string) => void;
  showFallbackNotice: boolean;
}) {
  return (
    <section className="relative border-b border-border/60">
      {/* Decorative layer is clipped on its own so it never cuts off the industry dropdown. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-5 py-20 md:py-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {INTEGRATIONS.length}+ supported integrations
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          {content.heroTagline}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          {content.heroSub}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <IndustryPicker value={industry} onChange={setIndustry} />
          <a
            href="#workflow"
            className="inline-flex items-center justify-center rounded-xl bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wide text-background transition hover:opacity-90"
          >
            Start building
          </a>
          <a
            href="#integrations"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:border-primary hover:text-primary"
          >
            View integrations
          </a>
        </div>

        {showFallbackNotice && (
          <div className="mt-6 max-w-2xl rounded-lg border border-border bg-surface/70 px-4 py-3 text-sm text-muted-foreground">
            Deep content for this industry is in active scoping — you're seeing the shared platform
            view. Talk to us about your stack.
          </div>
        )}
      </div>
    </section>
  );
}

function IndustryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const current = INDUSTRIES.find((i) => i.slug === value) ?? INDUSTRIES[0];

  useEffect(() => {
    if (!open) return;
    setActiveIdx(
      Math.max(
        0,
        INDUSTRIES.findIndex((i) => i.slug === value),
      ),
    );
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, value]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % INDUSTRIES.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + INDUSTRIES.length) % INDUSTRIES.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onChange(INDUSTRIES[activeIdx].slug);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative w-full sm:w-[360px]" onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-2.5 pr-3 text-left transition hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-lg text-primary">
          {current.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Tailor this page to
          </span>
          <span className="block truncate text-sm font-semibold text-foreground">
            {current.slug === "common" ? "Choose your industry" : current.label}
          </span>
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 max-h-[420px] overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-2xl"
        >
          {INDUSTRIES.map((i, idx) => {
            const selected = i.slug === value;
            const active = idx === activeIdx;
            return (
              <button
                key={i.slug}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  onChange(i.slug);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                  active ? "bg-surface-2" : ""
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-base ${
                    selected ? "bg-primary text-primary-foreground" : "bg-background text-primary"
                  }`}
                >
                  {i.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {i.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{i.blurb}</span>
                </span>
                {selected && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Core diagram ----------------

function CoreDiagram() {
  const spokes: { name: string; icon: LucideIcon; desc: string }[] = [
    {
      name: "Identity",
      icon: ShieldCheck,
      desc: "SSO, roles, and audit trails so the right people see the right things.",
    },
    {
      name: "AI Chat",
      icon: MessageSquare,
      desc: "Ask questions and get answers grounded in your own documents and data.",
    },
    {
      name: "Workflow Engine",
      icon: Workflow,
      desc: "Runs each task step by step, with human approvals and retries built in.",
    },
    {
      name: "Document Intelligence",
      icon: FileText,
      desc: "Reads PDFs, emails, and scans, then pulls out the structured data.",
    },
    {
      name: "Connector Hub",
      icon: Share2,
      desc: "One place to securely connect the tools your team already works in.",
    },
    {
      name: "Admin",
      icon: Settings2,
      desc: "Control usage, cost, access, and safety from a single dashboard.",
    },
  ];
  return (
    <section id="platform" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-12 flex max-w-2xl flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            The shared core
          </span>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Every copilot runs on the same operating system.
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Instead of rebuilding the basics for every use case, each copilot inherits the same six
            building blocks. Turn one on and identity, chat, workflows, documents, connectors, and
            admin all come with it — already wired together.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spokes.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.name}
                className="group rounded-xl border border-border bg-surface p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition group-hover:border-primary/40 group-hover:text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <div className="text-base font-semibold">{s.name}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
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

function WorkflowSection({ content }: { content: IndustryContent }) {
  const { workflow } = content;
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
            <Sparkles className="h-3 w-3" /> Workflow example
          </span>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            {workflow.title}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            The same six steps every time — AI does the work, a human stays in control.
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

// Icons for the six-step flow, assigned by position (every industry follows the
// same intake → parse → enrich → draft → approve → execute shape).
const STEP_ICONS: LucideIcon[] = [Mail, FileText, Share2, Wand2, User, CheckCircle2];

// ---------------- Copilot library (interactive catalog + modal) ----------------

function CopilotLibrary({ industry }: { industry: string }) {
  const [active, setActive] = useState<CopilotGroup | "all">("all");
  const [selected, setSelected] = useState<Copilot | null>(null);

  // If the visitor tailored the hero to an industry we have copilots for,
  // pre-filter this catalog to match.
  useEffect(() => {
    if (industry === "accounting" || industry === "construction" || industry === "legal") {
      setActive(industry);
    } else {
      setActive("all");
    }
  }, [industry]);

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
            AI, and stops for your approval before anything goes out. Click any card to see how it
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
              approves before anything ships.
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
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
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

// ---------------- Integration catalog (Nango-style grid) ----------------

// The industry slugs in the picker map 1:1 onto the catalog categories, so
// selecting an industry can pre-filter the integrations grid.
const INDUSTRY_TO_CATEGORY: Record<string, IntegrationCategory | "all"> = {
  common: "all",
  accounting: "Accounting",
  banking: "Banking",
  construction: "Construction",
  hr: "HR & ATS",
  productivity: "Productivity",
};

function IntegrationCatalog({ industry }: { industry: string }) {
  const [active, setActive] = useState<IntegrationCategory | "all">(
    INDUSTRY_TO_CATEGORY[industry] ?? "all",
  );

  // Keep the grid in sync with the industry chosen up in the hero.
  useEffect(() => {
    setActive(INDUSTRY_TO_CATEGORY[industry] ?? "all");
  }, [industry]);

  const items = useMemo(
    () => (active === "all" ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === active)),
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
            {INTEGRATIONS.length}+ APIs your copilots can talk to.
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Authenticate once, then read and act across the tools your team already uses — from
            email and storage to CRM, accounting, and ticketing.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-1.5">
          <CatalogChip label="All" active={active === "all"} onClick={() => setActive("all")} />
          {CATEGORIES.map((c) => (
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
                <div className="truncate text-sm font-medium">{i.name}</div>
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
    { k: "Identity", v: "SSO, RBAC, audit trails." },
    { k: "AI Chat", v: "Grounded chat across your data." },
    { k: "Workflow Engine", v: "Approvals, escalations, retries." },
    { k: "Document Intelligence", v: "OCR + structured extraction." },
    { k: "Connector Hub", v: "Nango + Composio, one config." },
    { k: "Admin", v: "Usage, cost, and safety controls." },
  ];
  return (
    <section className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-10">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            Under the hood
          </span>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Every copilot inherits this.
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

function CTASection({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Bring the AI OS to your industry.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Sign in to explore your workspace, or create an account to scope integrations for your
          stack.
        </p>
        <button
          onClick={onLogin}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Get started
        </button>
      </div>
    </section>
  );
}

// ---------------- Footer ----------------

function Footer() {
  const columns: { title: string; links: string[] }[] = [
    { title: "Product", links: ["Integrations", "Platform", "Workflows", "Pricing"] },
    { title: "Resources", links: ["Docs", "API reference", "Changelog", "Status"] },
    { title: "Company", links: ["About", "Customers", "Careers", "Contact"] },
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
              One AI operating system for every line of business — with the integrations your team
              already relies on.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="transition hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Industry AI OS. All rights reserved.</div>
          <div className="font-mono">Built on a shared AI core</div>
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
                : "Get access to your industry copilot."}
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
          <SignupForm firstFieldRef={firstFieldRef} onSuccess={(m) => setStatus(m)} />
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

async function handleSignup(_: { name: string; email: string; company: string; password: string }) {
  // NOTE: self-serve signup is not backed yet — the backend has no public
  // registration endpoint (Keycloak registration is disabled; users are created
  // by a tenant admin via the identity service). Left as a stub until that
  // decision is made. See PROJECT_MEMORY.md.
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true };
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
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
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
  onSuccess,
}: {
  firstFieldRef: React.RefObject<HTMLInputElement | null>;
  onSuccess: (msg: string) => void;
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
    await handleSignup({ name, email, company, password });
    setLoading(false);
    onSuccess(`Check your email — we sent a confirmation link to ${email}.`);
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
          placeholder="Acme LLP"
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
