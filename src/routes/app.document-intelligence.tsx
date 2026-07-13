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
  FileStack,
  Landmark,
  Printer,
  Receipt,
  ReceiptText,
  ScanLine,
  Search,
  Send,
  Share2,
  Sparkles,
  Table2,
  User,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/document-intelligence")({
  component: DocumentIntelligencePage,
});

/* ─────────────────────────  Dummy data (accounting)  ───────────────────────── */

type DocType = "invoice" | "receipt" | "bank-statement" | "purchase-order" | "expense-report";
type Tone = "good" | "warn" | "bad" | "neutral";

interface Field {
  label: string;
  value: string;
  confidence: number; // 0-100
}
interface GlLine {
  account: string;
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
  gl?: GlLine[];
  aiSummary: { text: string; bullets: string[] };
  risks: DocRisk[];
  actionItems: DocActionItem[];
  relatedIds: string[];
}

const docTypeMeta: Record<DocType, { label: string; plural: string }> = {
  invoice: { label: "Invoice", plural: "Invoices" },
  receipt: { label: "Receipt", plural: "Receipts" },
  "bank-statement": { label: "Bank Statement", plural: "Statements" },
  "purchase-order": { label: "Purchase Order", plural: "POs" },
  "expense-report": { label: "Expense Report", plural: "Expenses" },
};

const docTypeIcon: Record<DocType, LucideIcon> = {
  invoice: ReceiptText,
  receipt: Receipt,
  "bank-statement": Landmark,
  "purchase-order": ClipboardCheck,
  "expense-report": Wallet,
};

const docTypeColor: Record<DocType, string> = {
  invoice: "text-sky-500",
  receipt: "text-emerald-500",
  "bank-statement": "text-primary",
  "purchase-order": "text-amber-500",
  "expense-report": "text-violet-500",
};

const severityTone: Record<DocRisk["severity"], Tone> = {
  low: "good",
  medium: "warn",
  high: "bad",
};

const documents: DocumentItem[] = [
  {
    id: "inv-2214",
    type: "invoice",
    title: "Invoice #AC-2214 — Acme Supplies",
    vendor: "Acme Supplies",
    category: "Accounts Payable",
    status: "Needs Approval",
    statusTone: "warn",
    date: "Jul 08, 2026",
    author: "AP Inbox",
    pages: 2,
    sizeKb: 486,
    amount: "$14,280.00",
    confidence: 97,
    tags: ["AP", "3-way match", "PO-2214"],
    previewLines: [
      "INVOICE",
      "Acme Supplies · Invoice AC-2214",
      "Bill to: Northwind LLP · Terms: Net 30",
      "PO reference: PO-2214",
      "LINE ITEMS",
      "Steel fasteners — 1,200 units — $8,400.00",
      "Freight & handling — $1,180.00",
      "Sales tax (8.25%) — $1,200.00",
      "TOTAL DUE",
      "$14,280.00 — due Aug 07, 2026",
    ],
    fields: [
      { label: "Vendor", value: "Acme Supplies", confidence: 99 },
      { label: "Invoice #", value: "AC-2214", confidence: 99 },
      { label: "Invoice date", value: "Jul 08, 2026", confidence: 98 },
      { label: "Due date", value: "Aug 07, 2026", confidence: 97 },
      { label: "PO number", value: "PO-2214", confidence: 96 },
      { label: "Subtotal", value: "$12,900.00", confidence: 99 },
      { label: "Tax (8.25%)", value: "$1,200.00", confidence: 94 },
      { label: "Freight", value: "$1,180.00", confidence: 71 },
      { label: "Total due", value: "$14,280.00", confidence: 99 },
      { label: "Terms", value: "Net 30", confidence: 95 },
    ],
    gl: [
      { account: "Inventory — Materials", code: "1300", debit: "$12,900.00" },
      { account: "Freight In", code: "5110", debit: "$1,180.00" },
      { account: "Sales Tax Payable", code: "2200", debit: "$1,200.00" },
      { account: "Accounts Payable — Acme", code: "2000", credit: "$14,280.00" },
    ],
    aiSummary: {
      text: "This **invoice** from Acme Supplies bills **$14,280.00** against **PO-2214** under Net 30 terms. Copilot ran a 3-way match and extracted line items, freight, and tax for review.",
      bullets: [
        "3-way match against PO-2214 and goods receipt succeeded on quantity and price.",
        "Sales tax of $1,200.00 (8.25%) is consistent with the ship-to jurisdiction.",
        "No duplicate invoice number was found in the last 12 months.",
      ],
    },
    risks: [
      { severity: "medium", text: "Freight charge of $1,180.00 was not on the original purchase order." },
      { severity: "low", text: "Invoice arrived 3 days after the goods receipt date." },
    ],
    actionItems: [
      { text: "Confirm freight is billable under the vendor agreement.", owner: "A. Reyes", due: "Jul 12", done: false },
      { text: "Route to Controller for approval before posting.", owner: "AP Copilot", due: "Jul 12", done: false },
    ],
    relatedIds: ["po-4482", "inv-2231"],
  },
  {
    id: "inv-2231",
    type: "invoice",
    title: "Invoice #GX-2231 — Globex Corp",
    vendor: "Globex Corp",
    category: "Accounts Payable",
    status: "Duplicate Flagged",
    statusTone: "bad",
    date: "Jul 09, 2026",
    author: "AP Inbox",
    pages: 1,
    sizeKb: 312,
    amount: "$6,540.00",
    confidence: 88,
    tags: ["AP", "duplicate", "review"],
    previewLines: [
      "INVOICE",
      "Globex Corp · Invoice GX-2231",
      "Bill to: Northwind LLP · Terms: Net 15",
      "Consulting services — June",
      "TOTAL DUE",
      "$6,540.00 — due Jul 24, 2026",
    ],
    fields: [
      { label: "Vendor", value: "Globex Corp", confidence: 98 },
      { label: "Invoice #", value: "GX-2231", confidence: 97 },
      { label: "Invoice date", value: "Jul 09, 2026", confidence: 96 },
      { label: "Due date", value: "Jul 24, 2026", confidence: 95 },
      { label: "Service period", value: "June 2026", confidence: 82 },
      { label: "Total due", value: "$6,540.00", confidence: 99 },
      { label: "Terms", value: "Net 15", confidence: 93 },
    ],
    gl: [
      { account: "Consulting Expense", code: "6400", debit: "$6,540.00" },
      { account: "Accounts Payable — Globex", code: "2000", credit: "$6,540.00" },
    ],
    aiSummary: {
      text: "This **invoice** from Globex Corp for **$6,540.00** closely matches a previously posted invoice. Copilot flagged it as a **likely duplicate** and paused it before payment.",
      bullets: [
        "Amount and vendor match invoice GX-2198 posted on Jun 28, 2026.",
        "Service period overlaps an already-paid engagement.",
        "Held from the payment run pending human confirmation.",
      ],
    },
    risks: [{ severity: "high", text: "Potential duplicate payment of $6,540.00 if approved without review." }],
    actionItems: [
      { text: "Compare against GX-2198 and confirm with the vendor.", owner: "J. Lin", due: "Jul 11", done: false },
      { text: "Reject or release from the payment hold.", owner: "Controller", due: "Jul 11", done: false },
    ],
    relatedIds: ["inv-2214"],
  },
  {
    id: "rcpt-0912",
    type: "receipt",
    title: "Receipt — Client Dinner, Meridian Grill",
    vendor: "Meridian Grill",
    category: "T&E",
    status: "Matched",
    statusTone: "good",
    date: "Jul 05, 2026",
    author: "M. Okafor",
    pages: 1,
    sizeKb: 92,
    amount: "$218.40",
    confidence: 93,
    tags: ["expense", "meals", "policy"],
    previewLines: [
      "RECEIPT",
      "Meridian Grill · Table 14",
      "Party of 4 · Business meal",
      "Subtotal — $182.00",
      "Tip (20%) — $36.40",
      "TOTAL",
      "$218.40 — card ending 4417",
    ],
    fields: [
      { label: "Merchant", value: "Meridian Grill", confidence: 96 },
      { label: "Date", value: "Jul 05, 2026", confidence: 97 },
      { label: "Category", value: "Meals & Entertainment", confidence: 90 },
      { label: "Subtotal", value: "$182.00", confidence: 98 },
      { label: "Tip", value: "$36.40", confidence: 88 },
      { label: "Total", value: "$218.40", confidence: 99 },
      { label: "Card", value: "•••• 4417", confidence: 95 },
    ],
    gl: [
      { account: "Meals & Entertainment", code: "6220", debit: "$218.40" },
      { account: "Corporate Card Clearing", code: "2100", credit: "$218.40" },
    ],
    aiSummary: {
      text: "A **business meal receipt** for **$218.40** charged to the corporate card. Copilot matched it to the card transaction and checked it against the meals policy.",
      bullets: [
        "Matched to card transaction on Jul 05 ending 4417.",
        "Per-head amount of $54.60 is within the $75 meals policy limit.",
        "Attendees and business purpose captured from the expense note.",
      ],
    },
    risks: [{ severity: "low", text: "Tip of 20% is at the upper edge of the reimbursable range." }],
    actionItems: [{ text: "Attach attendee list for audit trail.", owner: "M. Okafor", due: "Jul 10", done: true }],
    relatedIds: ["exp-118"],
  },
  {
    id: "stmt-oct",
    type: "bank-statement",
    title: "Bank Statement — Mercury Operating (Jun)",
    vendor: "Mercury Bank",
    category: "Reconciliation",
    status: "Reconciling",
    statusTone: "neutral",
    date: "Jul 01, 2026",
    author: "Bank Feed",
    pages: 6,
    sizeKb: 1180,
    amount: "$482,190.11",
    confidence: 96,
    tags: ["bank", "reconciliation", "June"],
    previewLines: [
      "STATEMENT",
      "Mercury Bank · Operating ••4102",
      "Period: Jun 01 – Jun 30, 2026",
      "Opening balance — $451,006.55",
      "Deposits — $198,412.09",
      "Withdrawals — $167,228.53",
      "CLOSING BALANCE",
      "$482,190.11",
    ],
    fields: [
      { label: "Account", value: "Operating •••• 4102", confidence: 99 },
      { label: "Period", value: "Jun 01 – Jun 30, 2026", confidence: 98 },
      { label: "Opening balance", value: "$451,006.55", confidence: 99 },
      { label: "Total deposits", value: "$198,412.09", confidence: 97 },
      { label: "Total withdrawals", value: "$167,228.53", confidence: 97 },
      { label: "Closing balance", value: "$482,190.11", confidence: 99 },
      { label: "Transactions", value: "412", confidence: 92 },
    ],
    aiSummary: {
      text: "The **June operating statement** closed at **$482,190.11**. Copilot auto-matched 96% of transactions to the ledger and grouped the remaining exceptions.",
      bullets: [
        "412 transactions pulled; 398 auto-matched (96.6%).",
        "14 exceptions grouped — mostly bank fees and pending deposits.",
        "Two fee entries proposed for the general ledger.",
      ],
    },
    risks: [{ severity: "medium", text: "$1,204.00 in unmatched withdrawals need a ledger entry before close." }],
    actionItems: [
      { text: "Post proposed fee journal entries.", owner: "S. Patel", due: "Jul 07", done: false },
      { text: "Clear 14 grouped exceptions.", owner: "Recon Copilot", due: "Jul 07", done: false },
    ],
    relatedIds: ["exp-118", "inv-2214"],
  },
  {
    id: "po-4482",
    type: "purchase-order",
    title: "Purchase Order PO-4482 — Nucor Steel",
    vendor: "Nucor Steel",
    category: "Procurement",
    status: "Approved",
    statusTone: "good",
    date: "Jun 22, 2026",
    author: "Procurement",
    pages: 2,
    sizeKb: 254,
    amount: "$28,900.00",
    confidence: 98,
    tags: ["PO", "procurement", "steel"],
    previewLines: [
      "PURCHASE ORDER",
      "PO-4482 · Nucor Steel",
      "Ship to: Northwind Yard 3",
      "Rebar — 40 tons — $26,000.00",
      "Delivery surcharge — $2,900.00",
      "TOTAL COMMITTED",
      "$28,900.00",
    ],
    fields: [
      { label: "PO number", value: "PO-4482", confidence: 99 },
      { label: "Vendor", value: "Nucor Steel", confidence: 98 },
      { label: "Ship to", value: "Northwind Yard 3", confidence: 94 },
      { label: "Line total", value: "$26,000.00", confidence: 98 },
      { label: "Surcharge", value: "$2,900.00", confidence: 90 },
      { label: "Committed total", value: "$28,900.00", confidence: 99 },
      { label: "Cost center", value: "Materials — CC-300", confidence: 91 },
    ],
    gl: [
      { account: "Committed — Materials", code: "1310", debit: "$28,900.00" },
      { account: "PO Encumbrance", code: "2900", credit: "$28,900.00" },
    ],
    aiSummary: {
      text: "**Approved purchase order** committing **$28,900.00** to Nucor Steel for rebar. Copilot linked it to downstream invoices for 3-way matching.",
      bullets: [
        "Budget check passed against the materials cost center.",
        "Delivery surcharge is covered under the master supply agreement.",
        "Linked to invoice AC-2214 for receipt matching.",
      ],
    },
    risks: [{ severity: "low", text: "Delivery window overlaps a supplier lead-time extension notice." }],
    actionItems: [{ text: "Confirm receipt once materials arrive at Yard 3.", owner: "Receiving", due: "Jul 15", done: false }],
    relatedIds: ["inv-2214"],
  },
  {
    id: "exp-118",
    type: "expense-report",
    title: "Expense Report — Q3 Sales Offsite",
    vendor: "Sales Team",
    category: "T&E",
    status: "Needs Approval",
    statusTone: "warn",
    date: "Jul 06, 2026",
    author: "R. Danforth",
    pages: 4,
    sizeKb: 640,
    amount: "$3,914.72",
    confidence: 91,
    tags: ["expense", "travel", "policy"],
    previewLines: [
      "EXPENSE REPORT",
      "Q3 Sales Offsite · 6 attendees",
      "Airfare — $2,140.00",
      "Lodging — $1,196.32",
      "Meals — $578.40",
      "TOTAL CLAIMED",
      "$3,914.72",
    ],
    fields: [
      { label: "Report", value: "Q3 Sales Offsite", confidence: 97 },
      { label: "Submitted by", value: "R. Danforth", confidence: 99 },
      { label: "Attendees", value: "6", confidence: 95 },
      { label: "Airfare", value: "$2,140.00", confidence: 96 },
      { label: "Lodging", value: "$1,196.32", confidence: 78 },
      { label: "Meals", value: "$578.40", confidence: 93 },
      { label: "Total claimed", value: "$3,914.72", confidence: 99 },
    ],
    gl: [
      { account: "Travel — Airfare", code: "6210", debit: "$2,140.00" },
      { account: "Travel — Lodging", code: "6215", debit: "$1,196.32" },
      { account: "Meals & Entertainment", code: "6220", debit: "$578.40" },
      { account: "Employee Reimbursements", code: "2150", credit: "$3,914.72" },
    ],
    aiSummary: {
      text: "An **expense report** claiming **$3,914.72** for the Q3 sales offsite. Copilot audited each line against policy and flagged one out-of-policy item.",
      bullets: [
        "18 of 19 line items passed the automated policy check.",
        "All receipts are attached and legible.",
        "Duplicate-claim check across the team returned clean.",
      ],
    },
    risks: [{ severity: "medium", text: "One lodging night of $312.00 exceeds the $250 nightly cap." }],
    actionItems: [
      { text: "Request justification for the over-cap lodging night.", owner: "Finance Mgr", due: "Jul 10", done: false },
      { text: "Approve remaining in-policy lines for reimbursement.", owner: "Finance Mgr", due: "Jul 10", done: false },
    ],
    relatedIds: ["rcpt-0912", "stmt-oct"],
  },
];

function getDocumentsByIds(ids: string[]): DocumentItem[] {
  return ids.map((id) => documents.find((d) => d.id === id)).filter((d): d is DocumentItem => Boolean(d));
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
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | DocType>("all");
  const [selectedId, setSelectedId] = useState<string>(documents[0].id);

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
  }, [query, typeFilter]);

  const selected = documents.find((d) => d.id === selectedId) ?? filtered[0] ?? documents[0];

  const totalValue = documents.length;
  const needApproval = documents.filter((d) => d.status.includes("Approval")).length;
  const avgConf = Math.round(documents.reduce((s, d) => s + d.confidence, 0) / documents.length);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Document Intelligence
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Document workspace</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            AI reads invoices, receipts, statements, and expenses — extracting clean, ledger-ready
            data with a confidence score on every field.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 rounded-lg border border-border bg-surface px-3.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary">
            Upload document
          </button>
          <button className="brand-gradient inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90">
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
          {selected.gl && <GlCodingCard doc={selected} />}
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
  const types: DocType[] = ["invoice", "receipt", "bank-statement", "purchase-order", "expense-report"];

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
            {[Download, Printer, Share2].map((Btn, i) => (
              <button
                key={i}
                className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
              >
                <Btn className="h-3.5 w-3.5" />
              </button>
            ))}
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

/* ─────────────────────────  GL Coding  ───────────────────────── */

function GlCodingCard({ doc }: { doc: DocumentItem }) {
  if (!doc.gl) return null;
  return (
    <section className={cn(PANEL, "overflow-hidden")}>
      <SectionHeader icon={Table2} title="Suggested GL Coding" hint="Draft journal entry — review before posting" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2 font-medium">Account</th>
              <th className="px-5 py-2 font-medium">Code</th>
              <th className="px-5 py-2 text-right font-medium">Debit</th>
              <th className="px-5 py-2 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.gl.map((l, i) => (
              <tr key={i}>
                <td className="px-5 py-2 font-medium">{l.account}</td>
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
    if (p.includes("gl") || p.includes("coding") || p.includes("journal") || p.includes("account"))
      return doc.gl
        ? `Suggested GL coding: ${doc.gl
            .map((l) => `${l.account} (${l.code}) ${l.debit ? `Dr ${l.debit}` : `Cr ${l.credit}`}`)
            .join("; ")}.`
        : "No GL coding was suggested for this document type.";
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

  const suggestions = ["Summarize this", "Any risks?", "Show the GL coding", "How confident are you?"];

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
