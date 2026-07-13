import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileDiff,
  FileStack,
  HelpCircle,
  Landmark,
  PackageCheck,
  Printer,
  ScanLine,
  Search,
  Send,
  Share2,
  Sparkles,
  Table2,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/document-intelligence")({
  component: DocumentIntelligencePage,
});

/* ─────────────────────────  Dummy data (construction)  ───────────────────────── */

type DocType = "rfi" | "change-order" | "daily-log" | "draw-statement" | "submittal" | "lien-waiver";
type Tone = "good" | "warn" | "bad" | "neutral";

interface Field {
  label: string;
  value: string;
  confidence: number; // 0-100
}
interface CostCodeLine {
  description: string;
  code: string;
  debit?: string;
  credit?: string;
}
interface DocRisk {
  severity: "low" | "medium" | "high";
  text: string;
}
interface DocActionItem {
  text: string;
  owner: string;
  due: string;
  done: boolean;
}
interface DocumentItem {
  id: string;
  type: DocType;
  title: string;
  vendor: string;
  category: string;
  status: string;
  statusTone: Tone;
  date: string;
  author: string;
  pages: number;
  sizeKb: number;
  amount: string;
  confidence: number; // overall extraction confidence 0-100
  tags: string[];
  previewLines: string[];
  fields: Field[];
  costCodes?: CostCodeLine[];
  aiSummary: { text: string; bullets: string[] };
  risks: DocRisk[];
  actionItems: DocActionItem[];
  relatedIds: string[];
}

const docTypeMeta: Record<DocType, { label: string; plural: string }> = {
  rfi: { label: "RFI", plural: "RFIs" },
  "change-order": { label: "Change Order", plural: "Change Orders" },
  "daily-log": { label: "Daily Log", plural: "Daily Logs" },
  "draw-statement": { label: "Draw Statement", plural: "Draw Statements" },
  submittal: { label: "Submittal", plural: "Submittals" },
  "lien-waiver": { label: "Lien Waiver", plural: "Lien Waivers" },
};

const docTypeIcon: Record<DocType, LucideIcon> = {
  rfi: HelpCircle,
  "change-order": FileDiff,
  "daily-log": ClipboardCheck,
  "draw-statement": Landmark,
  submittal: PackageCheck,
  "lien-waiver": FileCheck2,
};

const docTypeColor: Record<DocType, string> = {
  rfi: "text-sky-500",
  "change-order": "text-orange-500",
  "daily-log": "text-emerald-500",
  "draw-statement": "text-primary",
  submittal: "text-amber-500",
  "lien-waiver": "text-violet-500",
};

const severityTone: Record<DocRisk["severity"], Tone> = {
  low: "good",
  medium: "warn",
  high: "bad",
};

const SEED_DOCUMENTS: DocumentItem[] = [
  {
    id: "rfi-2214",
    type: "rfi",
    title: "RFI #RFI-2214 — Apex Building Materials",
    vendor: "Apex Building Materials",
    category: "Cost Code Assignment",
    status: "Needs Approval",
    statusTone: "warn",
    date: "Jul 08, 2026",
    author: "Field Engineering Inbox",
    pages: 2,
    sizeKb: 486,
    amount: "$14,280.00",
    confidence: 97,
    tags: ["RFI", "cost impact", "CO-2214"],
    previewLines: [
      "REQUEST FOR INFORMATION",
      "Apex Building Materials · RFI RFI-2214",
      "Project: Riverside Tower · Spec Section: 03 30 00",
      "Reference drawing: S-204 — Level 4 slab pour",
      "RFI ITEMS",
      "Cast-in-place concrete mix substitution — $8,400.00 cost impact",
      "Additional equipment mobilization — $1,180.00 cost impact",
      "Sales tax on materials (8.25%) — $1,200.00",
      "TOTAL COST IMPACT",
      "$14,280.00 — response due Aug 07, 2026",
    ],
    fields: [
      { label: "Requesting sub", value: "Apex Building Materials", confidence: 99 },
      { label: "RFI #", value: "RFI-2214", confidence: 99 },
      { label: "Date submitted", value: "Jul 08, 2026", confidence: 98 },
      { label: "Response due", value: "Aug 07, 2026", confidence: 97 },
      { label: "Related CO", value: "CO-2214", confidence: 96 },
      { label: "Cost impact — materials", value: "$12,900.00", confidence: 99 },
      { label: "Sales tax (8.25%)", value: "$1,200.00", confidence: 94 },
      { label: "Equipment mobilization", value: "$1,180.00", confidence: 71 },
      { label: "Total cost impact", value: "$14,280.00", confidence: 99 },
      { label: "Spec section", value: "03 30 00", confidence: 95 },
    ],
    costCodes: [
      { description: "03 30 00 Cast-in-Place Concrete", code: "1300", debit: "$12,900.00" },
      { description: "01 54 00 Construction Aids & Equipment", code: "5110", debit: "$1,180.00" },
      { description: "Sales Tax Payable", code: "2200", debit: "$1,200.00" },
      { description: "Accounts Payable — Apex Building Materials", code: "2000", credit: "$14,280.00" },
    ],
    aiSummary: {
      text: "This **RFI** from Apex Building Materials requests cost-code assignment for **$14,280.00** in slab-pour changes tied to **CO-2214**. Copilot matched the RFI items to the project cost codes and drafted the coding for review.",
      bullets: [
        "Cost-code match against CO-2214 and the approved budget succeeded on quantity and unit price.",
        "Sales tax of $1,200.00 (8.25%) is consistent with the project jurisdiction.",
        "No duplicate RFI number was found in the last 12 months.",
      ],
    },
    risks: [
      { severity: "medium", text: "Equipment mobilization charge of $1,180.00 was not on the original scope." },
      { severity: "low", text: "RFI arrived 3 days after the field observation date." },
    ],
    actionItems: [
      { text: "Confirm equipment mobilization is billable under the subcontract.", owner: "A. Reyes", due: "Jul 12", done: false },
      { text: "Route to Project Controller for cost-code approval before posting.", owner: "AI Copilot", due: "Jul 12", done: false },
    ],
    relatedIds: ["sub-4482", "co-2231"],
  },
  {
    id: "co-2231",
    type: "change-order",
    title: "Change Order #CO-2231 — Coastal Glazing LLC",
    vendor: "Coastal Glazing LLC",
    category: "Cost Code Assignment",
    status: "Duplicate Flagged",
    statusTone: "bad",
    date: "Jul 09, 2026",
    author: "Field Engineering Inbox",
    pages: 1,
    sizeKb: 312,
    amount: "$6,540.00",
    confidence: 88,
    tags: ["CO", "duplicate", "review"],
    previewLines: [
      "CHANGE ORDER",
      "Coastal Glazing LLC · CO-2231",
      "Project: Riverside Tower · Terms: Net 15",
      "Curtain wall glazing rework — June",
      "TOTAL COST IMPACT",
      "$6,540.00 — due Jul 24, 2026",
    ],
    fields: [
      { label: "Subcontractor", value: "Coastal Glazing LLC", confidence: 98 },
      { label: "Change order #", value: "CO-2231", confidence: 97 },
      { label: "Date submitted", value: "Jul 09, 2026", confidence: 96 },
      { label: "Due date", value: "Jul 24, 2026", confidence: 95 },
      { label: "Work period", value: "June 2026", confidence: 82 },
      { label: "Total cost impact", value: "$6,540.00", confidence: 99 },
      { label: "Terms", value: "Net 15", confidence: 93 },
    ],
    costCodes: [
      { description: "08 44 00 Curtain Wall & Glazing", code: "6400", debit: "$6,540.00" },
      { description: "Accounts Payable — Coastal Glazing LLC", code: "2000", credit: "$6,540.00" },
    ],
    aiSummary: {
      text: "This **change order** from Coastal Glazing LLC for **$6,540.00** closely matches a previously posted change order. Copilot flagged it as a **likely duplicate** and paused it before payment.",
      bullets: [
        "Amount and subcontractor match change order CO-2198 posted on Jun 28, 2026.",
        "Work period overlaps an already-paid glazing scope.",
        "Held from the payment run pending human confirmation.",
      ],
    },
    risks: [{ severity: "high", text: "Potential duplicate payment of $6,540.00 if approved without review." }],
    actionItems: [
      { text: "Compare against CO-2198 and confirm with the subcontractor.", owner: "J. Lin", due: "Jul 11", done: false },
      { text: "Reject or release from the payment hold.", owner: "Project Controller", due: "Jul 11", done: false },
    ],
    relatedIds: ["rfi-2214"],
  },
  {
    id: "dlog-0912",
    type: "daily-log",
    title: "Daily Log — Site Safety Walk, Riverside Tower",
    vendor: "Riverside Tower Site Team",
    category: "Field Documentation",
    status: "Reviewed",
    statusTone: "good",
    date: "Jul 05, 2026",
    author: "M. Okafor",
    pages: 1,
    sizeKb: 92,
    amount: "$340.00",
    confidence: 93,
    tags: ["daily log", "safety", "site walk"],
    previewLines: [
      "DAILY LOG",
      "Riverside Tower · Site Safety Walk",
      "Conducted by M. Okafor · Crew on site: 24",
      "Weather: 78°F, clear",
      "OBSERVATIONS",
      "Guardrail missing at Level 6 stair opening — corrected same day",
      "Two workers without eye protection in Zone C — corrected on site",
      "CORRECTIVE ACTION COST",
      "$340.00 — replacement PPE & guardrail hardware",
    ],
    fields: [
      { label: "Site", value: "Riverside Tower", confidence: 96 },
      { label: "Date", value: "Jul 05, 2026", confidence: 97 },
      { label: "Category", value: "Safety Walk", confidence: 90 },
      { label: "Crew on site", value: "24", confidence: 98 },
      { label: "Weather", value: "78°F, clear", confidence: 95 },
      { label: "Observations logged", value: "2", confidence: 93 },
      { label: "Corrective action cost", value: "$340.00", confidence: 88 },
    ],
    costCodes: [
      { description: "01 35 00 Safety Requirements & Site Protection", code: "6220", debit: "$340.00" },
      { description: "Accounts Payable — Subcontractors", code: "2100", credit: "$340.00" },
    ],
    aiSummary: {
      text: "A **daily log** for a site safety walk at Riverside Tower on Jul 05. Copilot matched the two field observations to corrective actions and estimated the incidental PPE cost.",
      bullets: [
        "Both safety observations were corrected same-day and closed out.",
        "Corrective action cost of $340.00 is within the general conditions safety allowance.",
        "Crew count and weather were captured from the field note.",
      ],
    },
    risks: [{ severity: "low", text: "Guardrail omission at Level 6 stair opening should be tracked for recurrence." }],
    actionItems: [{ text: "Attach photos of corrected conditions for the safety file.", owner: "M. Okafor", due: "Jul 10", done: true }],
    relatedIds: ["lw-118"],
  },
  {
    id: "draw-jun",
    type: "draw-statement",
    title: "Draw Statement — Mercury Bank, Riverside Tower (Jun)",
    vendor: "Mercury Bank",
    category: "Draw Reconciliation",
    status: "Reconciling",
    statusTone: "neutral",
    date: "Jul 01, 2026",
    author: "Bank Feed",
    pages: 6,
    sizeKb: 1180,
    amount: "$482,190.11",
    confidence: 96,
    tags: ["draw", "reconciliation", "June"],
    previewLines: [
      "DRAW STATEMENT",
      "Mercury Bank · Riverside Tower Construction Loan ••4102",
      "Period: Jun 01 – Jun 30, 2026",
      "Opening draw balance — $451,006.55",
      "Draws funded — $198,412.09",
      "Disbursements to subcontractors — $167,228.53",
      "CLOSING BALANCE",
      "$482,190.11",
    ],
    fields: [
      { label: "Account", value: "Construction Loan •••• 4102", confidence: 99 },
      { label: "Period", value: "Jun 01 – Jun 30, 2026", confidence: 98 },
      { label: "Opening balance", value: "$451,006.55", confidence: 99 },
      { label: "Total draws funded", value: "$198,412.09", confidence: 97 },
      { label: "Total disbursements", value: "$167,228.53", confidence: 97 },
      { label: "Closing balance", value: "$482,190.11", confidence: 99 },
      { label: "Line items", value: "412", confidence: 92 },
    ],
    aiSummary: {
      text: "The **June draw statement** for Riverside Tower closed at **$482,190.11**. Copilot auto-matched 96% of disbursements to the project cost codes and grouped the remaining exceptions.",
      bullets: [
        "412 disbursement lines pulled; 398 auto-matched (96.6%).",
        "14 exceptions grouped — mostly bank fees and pending subcontractor draws.",
        "Two fee entries proposed for the project cost code ledger.",
      ],
    },
    risks: [{ severity: "medium", text: "$1,204.00 in unmatched disbursements need a cost code entry before close." }],
    actionItems: [
      { text: "Post proposed fee entries to the cost code ledger.", owner: "S. Patel", due: "Jul 07", done: false },
      { text: "Clear 14 grouped exceptions.", owner: "Recon Copilot", due: "Jul 07", done: false },
    ],
    relatedIds: ["lw-118", "rfi-2214"],
  },
  {
    id: "sub-4482",
    type: "submittal",
    title: "Submittal #SUB-4482 — Ironclad Steel Supply",
    vendor: "Ironclad Steel Supply",
    category: "Procurement",
    status: "Approved",
    statusTone: "good",
    date: "Jun 22, 2026",
    author: "Procurement",
    pages: 2,
    sizeKb: 254,
    amount: "$28,900.00",
    confidence: 98,
    tags: ["submittal", "procurement", "steel"],
    previewLines: [
      "SUBMITTAL",
      "SUB-4482 · Ironclad Steel Supply",
      "Ship to: Riverside Tower Laydown Yard 3",
      "Structural rebar — 40 tons — $26,000.00",
      "Delivery surcharge — $2,900.00",
      "TOTAL COMMITTED",
      "$28,900.00",
    ],
    fields: [
      { label: "Submittal #", value: "SUB-4482", confidence: 99 },
      { label: "Supplier", value: "Ironclad Steel Supply", confidence: 98 },
      { label: "Ship to", value: "Riverside Tower Yard 3", confidence: 94 },
      { label: "Line total", value: "$26,000.00", confidence: 98 },
      { label: "Surcharge", value: "$2,900.00", confidence: 90 },
      { label: "Committed total", value: "$28,900.00", confidence: 99 },
      { label: "Cost code", value: "Structural Steel — 05 12 00", confidence: 91 },
    ],
    costCodes: [
      {
        description: "05 12 00 Structural Steel Framing — Committed Costs / Cost Code Encumbrance",
        code: "1310",
        debit: "$28,900.00",
      },
      { description: "Cost Code Encumbrance", code: "2900", credit: "$28,900.00" },
    ],
    aiSummary: {
      text: "**Approved submittal** committing **$28,900.00** to Ironclad Steel Supply for structural rebar. Copilot linked it to downstream RFIs for cost-code matching.",
      bullets: [
        "Budget check passed against the structural steel cost code.",
        "Delivery surcharge is covered under the master supply agreement.",
        "Linked to RFI-2214 for field receipt matching.",
      ],
    },
    risks: [{ severity: "low", text: "Delivery window overlaps a supplier lead-time extension notice." }],
    actionItems: [{ text: "Confirm receipt once materials arrive at Yard 3.", owner: "Receiving", due: "Jul 15", done: false }],
    relatedIds: ["rfi-2214"],
  },
  {
    id: "lw-118",
    type: "lien-waiver",
    title: "Lien Waiver — Q3 Retainage Release, Coastal Glazing LLC",
    vendor: "Coastal Glazing LLC",
    category: "Retainage",
    status: "Needs Approval",
    statusTone: "warn",
    date: "Jul 06, 2026",
    author: "R. Danforth",
    pages: 4,
    sizeKb: 640,
    amount: "$3,914.72",
    confidence: 91,
    tags: ["lien waiver", "retainage", "conditional"],
    previewLines: [
      "CONDITIONAL LIEN WAIVER",
      "Q3 Retainage Release · Coastal Glazing LLC · Riverside Tower",
      "Retainage held to date — $2,140.00",
      "Retainage released this period — $1,196.32",
      "Outstanding punch-list holdback — $578.40",
      "TOTAL RELEASE REQUESTED",
      "$3,914.72",
    ],
    fields: [
      { label: "Waiver type", value: "Conditional — Q3 Retainage", confidence: 97 },
      { label: "Submitted by", value: "R. Danforth", confidence: 99 },
      { label: "Subcontractor", value: "Coastal Glazing LLC", confidence: 95 },
      { label: "Retainage held to date", value: "$2,140.00", confidence: 96 },
      { label: "Retainage released", value: "$1,196.32", confidence: 78 },
      { label: "Punch-list holdback", value: "$578.40", confidence: 93 },
      { label: "Total release requested", value: "$3,914.72", confidence: 99 },
    ],
    costCodes: [
      { description: "Retainage Payable", code: "2150", debit: "$3,914.72" },
      { description: "Accounts Payable — Coastal Glazing LLC", code: "2000", credit: "$3,914.72" },
    ],
    aiSummary: {
      text: "A **conditional lien waiver** requesting **$3,914.72** in Q3 retainage release from Coastal Glazing LLC. Copilot checked the release against the punch-list holdback and flagged one item.",
      bullets: [
        "18 of 19 punch-list items passed the automated close-out check.",
        "All supporting lien waiver exhibits are attached and legible.",
        "Duplicate-release check across the project returned clean.",
      ],
    },
    risks: [{ severity: "medium", text: "One punch-list item of $312.00 remains open against the $250 holdback threshold." }],
    actionItems: [
      { text: "Request confirmation the open punch-list item is resolved.", owner: "Finance Mgr", due: "Jul 10", done: false },
      { text: "Approve remaining retainage for release.", owner: "Finance Mgr", due: "Jul 10", done: false },
    ],
    relatedIds: ["dlog-0912", "draw-jun"],
  },
];

function getDocumentsByIds(ids: string[]): DocumentItem[] {
  return ids
    .map((id) => SEED_DOCUMENTS.find((d) => d.id === id))
    .filter((d): d is DocumentItem => Boolean(d));
}

function createUploadedDocument(file: File): DocumentItem {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return {
    id: `doc_${Date.now().toString(36)}`,
    type: "rfi",
    title: file.name,
    vendor: "—",
    category: "Uploaded",
    status: "Processing",
    statusTone: "neutral",
    date: today,
    author: "You",
    pages: 1,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
    amount: "—",
    confidence: 0,
    tags: ["uploaded"],
    previewLines: ["Extraction in progress — this document was just uploaded."],
    fields: [],
    aiSummary: {
      text: `**${file.name}** was just uploaded and is being processed. Extracted fields and a summary will appear here shortly.`,
      bullets: [],
    },
    risks: [],
    actionItems: [],
    relatedIds: [],
  };
}

/* ─────────────────────────  Shared helpers  ───────────────────────── */

const PANEL = "rounded-2xl border border-border bg-surface";

function toneBadgeCls(tone: Tone) {
  switch (tone) {
    case "good":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-500";
    case "warn":
      return "bg-amber-500/10 border-amber-500/30 text-amber-500";
    case "bad":
      return "bg-destructive/10 border-destructive/30 text-destructive";
    default:
      return "bg-muted border-border text-foreground";
  }
}

function confColor(c: number) {
  return c >= 90 ? "text-emerald-500" : c >= 75 ? "text-amber-500" : "text-destructive";
}
function confBar(c: number) {
  return c >= 90 ? "bg-emerald-500" : c >= 75 ? "bg-amber-500" : "bg-destructive";
}

function SectionHeader({
  icon: Icon,
  title,
  hint,
  right,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-4">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}

function ConfidenceRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  const stroke = value >= 90 ? "stroke-emerald-500" : value >= 75 ? "stroke-amber-500" : "stroke-destructive";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} className="stroke-surface-2" strokeWidth={3} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={cn(stroke, "transition-all")}
          strokeWidth={3}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <span className={cn("absolute text-[11px] font-semibold tabular-nums", confColor(value))}>{value}</span>
    </div>
  );
}

/* ─────────────────────────  Page  ───────────────────────── */

function DocumentIntelligencePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>(SEED_DOCUMENTS);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DocType>("all");
  const [selectedId, setSelectedId] = useState<string>(SEED_DOCUMENTS[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = documents;
    if (typeFilter !== "all") list = list.filter((d) => d.type === typeFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.vendor.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [documents, query, typeFilter]);

  const selected = documents.find((d) => d.id === selectedId) ?? filtered[0] ?? documents[0];

  const totalValue = documents.length;
  const needApproval = documents.filter((d) => d.status.includes("Approval")).length;
  const avgConf = Math.round(documents.reduce((s, d) => s + d.confidence, 0) / documents.length);

  const handleUpload = (file: File) => {
    const doc = createUploadedDocument(file);
    setDocuments((prev) => [doc, ...prev]);
    setSelectedId(doc.id);
    toast.success(`Uploaded ${file.name}`, { description: "Extraction is running — check back in a moment." });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Document Intelligence
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Document workspace</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            AI reads RFIs, submittals, daily logs, and draw statements — extracting clean, project-ready
            data with a confidence score on every field.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 rounded-lg border border-border bg-surface px-3.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
          >
            Upload document
          </button>
          <button
            onClick={() => {
              document.getElementById("ask-ai-input")?.focus();
              document
                .getElementById("ask-ai-input")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="brand-gradient inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask AI Copilot
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniKpi icon={FileStack} label="Indexed" value={String(totalValue)} />
        <MiniKpi icon={ClipboardCheck} label="Need approval" value={String(needApproval)} tone="text-amber-500" />
        <MiniKpi icon={ScanLine} label="Avg. confidence" value={`${avgConf}%`} tone={confColor(avgConf)} />
        <MiniKpi icon={CheckCircle2} label="Auto-coded" value="96%" tone="text-emerald-500" />
      </div>

      {/* Split-screen workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-5">
        <div className="col-span-12 min-h-0 lg:col-span-3">
          <DocumentBrowser
            query={query}
            setQuery={setQuery}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            documentsList={filtered}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
        </div>
        <div className="nice-scroll col-span-12 min-h-0 space-y-5 overflow-y-auto pr-1 lg:col-span-6">
          <DocumentViewer doc={selected} />
          <ExtractedFieldsCard doc={selected} />
          {selected.costCodes && <CostCodeCodingCard doc={selected} />}
          <AiSummaryCard doc={selected} />
          <ExtractedRisksCard doc={selected} />
          <ActionItemsCard doc={selected} />
          <RelatedDocumentsCard doc={selected} onSelect={setSelectedId} />
        </div>
        <div className="col-span-12 min-h-0 lg:col-span-3">
          <AskAiPanel doc={selected} />
        </div>
      </div>
    </div>
  );
}

function MiniKpi({
  icon: Icon,
  label,
  value,
  tone = "text-foreground",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={cn(PANEL, "flex items-center gap-3 p-3")}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Left: Smart Search + Browser  ───────────────────────── */

function DocumentBrowser({
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  documentsList,
  selectedId,
  onSelect,
}: {
  query: string;
  setQuery: (v: string) => void;
  typeFilter: "all" | DocType;
  setTypeFilter: (v: "all" | DocType) => void;
  documentsList: DocumentItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const types: DocType[] = ["rfi", "change-order", "daily-log", "draw-statement", "submittal", "lien-waiver"];

  return (
    <section className={cn(PANEL, "flex h-full flex-col overflow-hidden")}>
      <div className="space-y-3 border-b border-border p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Smart search — vendor, type, tag…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
            All
          </FilterChip>
          {types.map((t) => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {docTypeMeta[t].plural}
            </FilterChip>
          ))}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {documentsList.length} result{documentsList.length === 1 ? "" : "s"}
        </div>
      </div>
      <ul className="nice-scroll flex-1 divide-y divide-border overflow-y-auto">
        {documentsList.map((d) => {
          const Icon = docTypeIcon[d.type];
          const active = d.id === selectedId;
          return (
            <li key={d.id}>
              <button
                onClick={() => onSelect(d.id)}
                className={cn(
                  "flex w-full gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                  active ? "border-l-primary bg-surface-2" : "border-l-transparent hover:bg-surface-2/60",
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", docTypeColor[d.type])} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{d.vendor}</span>
                    <span>·</span>
                    <span className="font-mono">{d.amount}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-block rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                        toneBadgeCls(d.statusTone),
                      )}
                    >
                      {d.status}
                    </span>
                    <span className={cn("text-[9px] font-semibold tabular-nums", confColor(d.confidence))}>
                      {d.confidence}%
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {documentsList.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            No documents match this search.
          </li>
        )}
      </ul>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────  Center: Document Viewer  ───────────────────────── */

function DocumentViewer({ doc }: { doc: DocumentItem }) {
  const Icon = docTypeIcon[doc.type];

  const handleDownload = () => {
    const blob = new Blob(
      [`${doc.title}\n${doc.vendor}\n${doc.date}\n\n${doc.previewLines.join("\n")}`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9]+/gi, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${doc.title}`);
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/app/document-intelligence#${doc.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface-2">
            <Icon className={cn("h-5 w-5", docTypeColor[doc.type])} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug">{doc.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {doc.vendor}
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {doc.author}
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {doc.date}
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <FileStack className="h-3 w-3" /> {doc.pages}pg · {(doc.sizeKb / 1024).toFixed(1)}MB
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <ConfidenceRing value={doc.confidence} />
            <div className="hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Extraction</div>
              <div className={cn("text-xs font-semibold", confColor(doc.confidence))}>confidence</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownload}
              title="Download"
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => window.print()}
              title="Print"
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleShare}
              title="Copy link"
              className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-surface-2/40 p-6">
        <TextPreview doc={doc} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-5 py-2.5">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
            toneBadgeCls(doc.statusTone),
          )}
        >
          {doc.status}
        </span>
        {doc.tags.map((t) => (
          <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

function TextPreview({ doc }: { doc: DocumentItem }) {
  return (
    <div className="mx-auto min-h-[240px] max-w-2xl rounded-md border border-border bg-card p-8 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {docTypeMeta[doc.type].label} · {doc.id.toUpperCase()}
        </div>
        <div className="font-mono text-sm font-semibold text-primary">{doc.amount}</div>
      </div>
      <div className="space-y-3">
        {doc.previewLines.map((line, i) => {
          const isHeading = line === line.toUpperCase() && line.length < 40;
          return (
            <p
              key={i}
              className={
                isHeading
                  ? "pt-2 text-xs font-semibold tracking-wider text-primary"
                  : "text-sm leading-relaxed text-foreground/90"
              }
            >
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────  Extracted Fields  ───────────────────────── */

function ExtractedFieldsCard({ doc }: { doc: DocumentItem }) {
  const low = doc.fields.filter((f) => f.confidence < 80).length;
  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <SectionHeader
        icon={ScanLine}
        title="Extracted Fields"
        hint={`${doc.fields.length} fields · ${low} need review`}
        right={
          <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            OCR + AI
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-x-5 gap-y-3 p-5 sm:grid-cols-2">
        {doc.fields.map((f) => (
          <div key={f.label} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</span>
              <span className={cn("text-[10px] font-semibold tabular-nums", confColor(f.confidence))}>
                {f.confidence}%
              </span>
            </div>
            <div className="mt-0.5 truncate text-sm font-medium text-foreground">{f.value}</div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
              <div className={cn("h-full rounded-full", confBar(f.confidence))} style={{ width: `${f.confidence}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────  Cost Code Coding  ───────────────────────── */

function CostCodeCodingCard({ doc }: { doc: DocumentItem }) {
  if (!doc.costCodes) return null;
  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <SectionHeader icon={Table2} title="Suggested Cost Code Coding" hint="Draft cost code entry — review before posting" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-medium">Description</th>
              <th className="px-5 py-2 font-medium">Code</th>
              <th className="px-5 py-2 text-right font-medium">Debit</th>
              <th className="px-5 py-2 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.costCodes.map((l, i) => (
              <tr key={i}>
                <td className="px-5 py-2 font-medium">{l.description}</td>
                <td className="px-5 py-2 font-mono text-xs text-muted-foreground">{l.code}</td>
                <td className="px-5 py-2 text-right font-mono tabular-nums">{l.debit ?? "—"}</td>
                <td className="px-5 py-2 text-right font-mono tabular-nums">{l.credit ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ─────────────────────────  AI Summary  ───────────────────────── */

function renderBold(text: string) {
  return text.split(/(\*\*.+?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function AiSummaryCard({ doc }: { doc: DocumentItem }) {
  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <SectionHeader icon={Sparkles} title="AI Summary" hint="Synthesized directly from this document" />
      <div className="p-5">
        <p className="text-sm leading-relaxed">{renderBold(doc.aiSummary.text)}</p>
        <ul className="mt-3 space-y-1.5">
          {doc.aiSummary.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/90">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────  Extracted Risks  ───────────────────────── */

function ExtractedRisksCard({ doc }: { doc: DocumentItem }) {
  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <SectionHeader
        icon={AlertTriangle}
        title="Extracted Risks"
        hint={`${doc.risks.length} risk signal(s) found by Copilot`}
      />
      <ul className="divide-y divide-border">
        {doc.risks.map((r, i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-3">
            <span
              className={cn(
                "mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
                toneBadgeCls(severityTone[r.severity]),
              )}
            >
              {r.severity}
            </span>
            <p className="text-xs leading-relaxed text-foreground/90">{r.text}</p>
          </li>
        ))}
        {doc.risks.length === 0 && (
          <li className="px-5 py-6 text-center text-xs text-muted-foreground">
            No risks were extracted from this document.
          </li>
        )}
      </ul>
    </section>
  );
}

/* ─────────────────────────  Action Items  ───────────────────────── */

function ActionItemsCard({ doc }: { doc: DocumentItem }) {
  const [done, setDone] = useState<Set<number>>(
    () => new Set(doc.actionItems.map((a, i) => (a.done ? i : -1)).filter((i) => i >= 0)),
  );

  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <SectionHeader icon={CheckCircle2} title="Action Items" hint="Tracked to closure by Copilot" />
      <ul className="divide-y divide-border">
        {doc.actionItems.map((a, i) => {
          const isDone = done.has(i);
          return (
            <li key={i} className="flex items-start gap-3 px-5 py-3">
              <button
                onClick={() =>
                  setDone((s) => {
                    const next = new Set(s);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
                className="mt-0.5 shrink-0"
                aria-label={isDone ? "Mark as not done" : "Mark as done"}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", isDone ? "text-muted-foreground line-through" : "text-foreground/90")}>
                  {a.text}
                </p>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.owner} · Due {a.due}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─────────────────────────  Related Documents  ───────────────────────── */

function RelatedDocumentsCard({ doc, onSelect }: { doc: DocumentItem; onSelect: (id: string) => void }) {
  const related = getDocumentsByIds(doc.relatedIds);
  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <SectionHeader icon={FileStack} title="Related Documents" hint="Linked by vendor and category" />
      <div className="grid grid-cols-1 gap-2.5 p-4 md:grid-cols-3">
        {related.map((r) => {
          const Icon = docTypeIcon[r.type];
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="rounded-lg border border-border bg-surface-2/40 p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <Icon className={cn("h-4 w-4", docTypeColor[r.type])} />
              <div className="mt-2 line-clamp-2 text-xs font-medium leading-snug">{r.title}</div>
              <div className="mt-1 truncate text-[10px] text-muted-foreground">{r.vendor}</div>
            </button>
          );
        })}
        {related.length === 0 && (
          <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
            No related documents found for this item.
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────  Right: Ask AI About This Document  ───────────────────────── */

interface AssistantMsg {
  role: "user" | "assistant";
  text: string;
}

function AskAiPanel({ doc }: { doc: DocumentItem }) {
  const [messages, setMessages] = useState<AssistantMsg[]>([]);
  const [input, setInput] = useState("");

  const reply = (q: string): string => {
    const p = q.toLowerCase();
    if (p.includes("risk"))
      return doc.risks.length
        ? `${doc.risks.length} risk(s) found: ${doc.risks.map((r) => r.text).join(" ")}`
        : "No risks were extracted from this document.";
    if (p.includes("action") || p.includes("todo") || p.includes("next"))
      return `${doc.actionItems.length} action item(s): ${doc.actionItems
        .map((a) => `${a.text} (owner: ${a.owner}, due ${a.due})`)
        .join(" ")}`;
    if (p.includes("cost code") || p.includes("coding") || p.includes("account"))
      return doc.costCodes
        ? `Suggested cost code coding: ${doc.costCodes
            .map((l) => `${l.description} (${l.code}) ${l.debit ? `Dr ${l.debit}` : `Cr ${l.credit}`}`)
            .join("; ")}.`
        : "No cost code coding was suggested for this document type.";
    if (p.includes("amount") || p.includes("total") || p.includes("how much"))
      return `The total on this ${docTypeMeta[doc.type].label.toLowerCase()} is ${doc.amount}.`;
    if (p.includes("confidence") || p.includes("sure") || p.includes("accurate"))
      return `Overall extraction confidence is ${doc.confidence}%. Lowest-confidence field: ${
        doc.fields.reduce((a, b) => (b.confidence < a.confidence ? b : a)).label
      }.`;
    if (p.includes("summary") || p.includes("about") || p.includes("what is"))
      return doc.aiSummary.text.replace(/\*\*/g, "");
    if (p.includes("related") || p.includes("similar"))
      return `Related documents: ${
        getDocumentsByIds(doc.relatedIds)
          .map((r) => r.title)
          .join(", ") || "none found"
      }.`;
    if (p.includes("status"))
      return `This document is currently "${doc.status}", last touched ${doc.date} by ${doc.author}.`;
    return doc.aiSummary.text.replace(/\*\*/g, "");
  };

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: reply(q) }]);
    setInput("");
  };

  const suggestions = ["Summarize this", "Any risks?", "Show the cost code coding", "How confident are you?"];

  return (
    <section className={cn(PANEL, "flex h-full flex-col overflow-hidden")}>
      <SectionHeader icon={Sparkles} title="Ask AI About This Document" hint={doc.title} />
      <div className="nice-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ask Copilot anything about{" "}
              <span className="font-medium text-foreground">{doc.title}</span> — try one of these:
            </p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-surface-2"
              >
                {s}
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                m.role === "user"
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm border border-border bg-surface-2",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          id="ask-ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this document…"
          className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-xs outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-md text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </section>
  );
}
