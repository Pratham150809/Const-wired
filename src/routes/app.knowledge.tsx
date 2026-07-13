import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Clock,
  FileText,
  Landmark,
  Receipt,
  ScrollText,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/knowledge")({ component: Knowledge });

/* ─────────────────────────  Knowledge base (dummy data)  ───────────────────────── */

type Category =
  | "Accounts Payable"
  | "Accounts Receivable"
  | "Close & Reporting"
  | "Tax & Compliance"
  | "Policies & Controls";

const CATEGORIES: Category[] = [
  "Accounts Payable",
  "Accounts Receivable",
  "Close & Reporting",
  "Tax & Compliance",
  "Policies & Controls",
];

type Section = { heading: string; body: string; bullets?: string[] };

type Article = {
  id: string;
  title: string;
  category: Category;
  icon: LucideIcon;
  excerpt: string;
  readMin: number;
  updated: string;
  tags: string[];
  sections: Section[];
};

const ARTICLES: Article[] = [
  {
    id: "three-way-match",
    title: "3-Way Match: how AP validates invoices",
    category: "Accounts Payable",
    icon: ClipboardCheck,
    excerpt:
      "How an invoice is matched to its purchase order and goods receipt before it can post — and what to do when a line doesn't match.",
    readMin: 4,
    updated: "Jul 08, 2026",
    tags: ["AP", "matching", "controls"],
    sections: [
      {
        heading: "What a 3-way match is",
        body: "A 3-way match compares three documents before an invoice is approved for payment: the vendor invoice, the purchase order (PO) that authorized the spend, and the goods receipt confirming what was delivered.",
      },
      {
        heading: "What the copilot checks",
        body: "For each invoice line, the copilot verifies quantity, unit price, and total against the PO and receipt, and flags anything outside tolerance.",
        bullets: [
          "Quantity billed ≤ quantity received",
          "Unit price matches the PO within tolerance",
          "No duplicate invoice number for the vendor",
          "Tax and freight are expected for the ship-to location",
        ],
      },
      {
        heading: "When a line doesn't match",
        body: "Mismatches are grouped as exceptions with a plain-language reason. Common cases: freight not on the PO, a partial delivery, or a price change. Resolve by confirming with procurement or the vendor, then re-run the match.",
      },
    ],
  },
  {
    id: "month-end-close",
    title: "Month-end close checklist",
    category: "Close & Reporting",
    icon: ScrollText,
    excerpt:
      "The standard sequence for closing the books each month, from bank reconciliations through to reporting.",
    readMin: 6,
    updated: "Jul 01, 2026",
    tags: ["close", "checklist", "reporting"],
    sections: [
      {
        heading: "Before you start",
        body: "Confirm all bank feeds have synced and the sub-ledgers (AP and AR) are cut off for the period. The close can't tie out if transactions are still posting.",
      },
      {
        heading: "The core checklist",
        body: "Work the tasks in order — each depends on the one before it.",
        bullets: [
          "Reconcile all bank and credit-card accounts",
          "Post recurring accruals and prepaid schedules",
          "Review and approve manual journal entries",
          "Reconcile key balance-sheet accounts",
          "Flag variances vs. prior period and budget",
          "Lock the period and generate statements",
        ],
      },
      {
        heading: "Tracking what's outstanding",
        body: "The close copilot reports blockers in real time — an unreconciled account or an unsigned journal entry — so nothing slips through before the period is locked.",
      },
    ],
  },
  {
    id: "asc-606",
    title: "Revenue recognition under ASC 606",
    category: "Policies & Controls",
    icon: FileText,
    excerpt:
      "The five-step model for recognizing revenue from customer contracts, in plain language.",
    readMin: 5,
    updated: "Jun 24, 2026",
    tags: ["revenue", "ASC 606", "policy"],
    sections: [
      {
        heading: "The five-step model",
        body: "ASC 606 recognizes revenue when control of a good or service transfers to the customer, following five steps.",
        bullets: [
          "Identify the contract with the customer",
          "Identify the performance obligations",
          "Determine the transaction price",
          "Allocate the price to each obligation",
          "Recognize revenue as each obligation is satisfied",
        ],
      },
      {
        heading: "Point-in-time vs. over-time",
        body: "Some obligations are satisfied at a single point (a product shipped), others over time (a subscription). The pattern of recognition should match how control transfers.",
      },
      {
        heading: "Common judgment areas",
        body: "Variable consideration, bundled deliverables, and contract modifications need documented judgment. Keep the support with the contract for audit.",
      },
    ],
  },
  {
    id: "bank-reconciliation",
    title: "Bank reconciliation SOP",
    category: "Close & Reporting",
    icon: Landmark,
    excerpt:
      "How to reconcile a bank statement to the ledger and clear the exceptions that need a human.",
    readMin: 4,
    updated: "Jul 02, 2026",
    tags: ["reconciliation", "bank", "SOP"],
    sections: [
      {
        heading: "Auto-matching",
        body: "The copilot pulls bank transactions and ledger entries, then matches them by amount, date, and reference — typically clearing the large majority automatically.",
      },
      {
        heading: "Working the exceptions",
        body: "Unmatched items are grouped and explained. Bank fees and interest usually need a proposed journal entry; timing differences (deposits in transit) clear on their own next period.",
        bullets: [
          "Post proposed fee and interest entries",
          "Confirm deposits in transit and outstanding checks",
          "Investigate any unexplained variance before sign-off",
        ],
      },
      {
        heading: "Sign-off",
        body: "Once the adjusted balance ties to the statement, the controller approves and the reconciliation is closed with a documented match trail.",
      },
    ],
  },
  {
    id: "expense-policy",
    title: "Expense policy & reimbursement",
    category: "Policies & Controls",
    icon: Wallet,
    excerpt: "What's reimbursable, the approval limits, and how receipts are audited against policy.",
    readMin: 3,
    updated: "Jun 30, 2026",
    tags: ["expense", "T&E", "policy"],
    sections: [
      {
        heading: "Reimbursable expenses",
        body: "Business travel, client meals, and approved software are reimbursable with an itemized receipt and a business purpose. Personal expenses and unapproved upgrades are not.",
      },
      {
        heading: "Limits",
        body: "Standard caps apply unless pre-approved.",
        bullets: [
          "Meals: up to $75 per person",
          "Lodging: up to $250 per night",
          "Any single item over $500 needs manager pre-approval",
        ],
      },
      {
        heading: "How claims are audited",
        body: "The expense copilot reads each receipt, verifies merchant and amount, checks for duplicate or split claims, and flags anything outside policy for a human before reimbursement.",
      },
    ],
  },
  {
    id: "ar-collections",
    title: "AR collections & dunning playbook",
    category: "Accounts Receivable",
    icon: Receipt,
    excerpt: "How overdue receivables are prioritized and how reminder cadence escalates by stage.",
    readMin: 4,
    updated: "Jul 05, 2026",
    tags: ["AR", "collections", "dunning"],
    sections: [
      {
        heading: "Prioritizing accounts",
        body: "Open invoices are ranked by risk using amount, days past due, and payment history, so effort goes where it matters most.",
      },
      {
        heading: "Dunning cadence",
        body: "Reminders escalate in tone and channel as an invoice ages.",
        bullets: [
          "Day 1–7 past due: friendly reminder email",
          "Day 8–30: firmer follow-up, copy the account owner",
          "Day 31+: escalate to a call and a hold review",
        ],
      },
      {
        heading: "Human in the loop",
        body: "The copilot drafts each reminder per customer and stage; the controller reviews before anything is sent.",
      },
    ],
  },
  {
    id: "sales-tax",
    title: "Sales tax nexus & filing guide",
    category: "Tax & Compliance",
    icon: ShieldCheck,
    excerpt: "When you owe sales tax in a jurisdiction, and how returns are prepared and reviewed.",
    readMin: 5,
    updated: "Jul 10, 2026",
    tags: ["tax", "nexus", "compliance"],
    sections: [
      {
        heading: "What creates nexus",
        body: "Nexus — the obligation to collect and remit tax — can be created by physical presence or by exceeding an economic threshold of sales or transactions in a state.",
      },
      {
        heading: "Preparing a return",
        body: "The tax copilot reviews transactions for taxability, recalculates tax by jurisdiction, flags mis-charged or exempt items, and prepares the return with supporting detail.",
      },
      {
        heading: "Review before filing",
        body: "Every prepared return is reviewed against the recalculated tax before submission, with a summary of what changed since the prior period.",
      },
    ],
  },
  {
    id: "vendor-onboarding",
    title: "Vendor onboarding & W-9 requirements",
    category: "Accounts Payable",
    icon: ClipboardCheck,
    excerpt: "The documentation and checks required before a new vendor can be paid.",
    readMin: 3,
    updated: "Jun 22, 2026",
    tags: ["AP", "vendor", "onboarding"],
    sections: [
      {
        heading: "Required documentation",
        body: "Before the first payment, collect a completed W-9 (or W-8 for foreign vendors) and verified banking details.",
      },
      {
        heading: "Verification checks",
        body: "The copilot validates the TIN, screens against sanctions and denied-party lists, and checks for a duplicate vendor record before drafting the vendor master.",
        bullets: ["TIN validation", "Sanctions / denied-party screening", "Duplicate-vendor check"],
      },
      {
        heading: "Approval",
        body: "The drafted vendor record is routed to Finance for approval before it becomes payable.",
      },
    ],
  },
];

/* ─────────────────────────  Page  ───────────────────────── */

function Knowledge() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      const matchesCat = category === "all" || a.category === category;
      const matchesQ =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesQ;
    });
  }, [query, category]);

  const open = openId ? ARTICLES.find((a) => a.id === openId) ?? null : null;

  if (open) {
    const related = ARTICLES.filter((a) => a.category === open.category && a.id !== open.id).slice(0, 3);
    return <ArticleReader article={open} related={related} onBack={() => setOpenId(null)} onOpen={setOpenId} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          Knowledge Base
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Accounting knowledge base
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Policies, SOPs, and how-to guides for your close, AP/AR, and compliance workflows.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, policies, and SOPs…"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <Chip label="All" active={category === "all"} onClick={() => setCategory("all")} />
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No articles found</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing matches “{query}”.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((a) => (
            <ArticleCard key={a.id} article={a} onOpen={() => setOpenId(a.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ArticleCard({ article, onOpen }: { article: Article; onOpen: () => void }) {
  const Icon = article.icon;
  return (
    <button
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {article.category}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug text-foreground">{article.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{article.excerpt}</p>
      <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {article.readMin} min read
        </span>
        <span>Updated {article.updated}</span>
      </div>
    </button>
  );
}

/* ─────────────────────────  Article reader  ───────────────────────── */

function ArticleReader({
  article,
  related,
  onBack,
  onOpen,
}: {
  article: Article;
  related: Article[];
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const Icon = article.icon;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to knowledge base
      </button>

      {/* Article header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          <Icon className="h-3.5 w-3.5" />
          {article.category}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {article.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {article.readMin} min read
          </span>
          <span>Updated {article.updated}</span>
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((t) => (
              <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <article className="space-y-6 rounded-2xl border border-border bg-card p-6">
        {article.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-sm font-semibold text-foreground">{s.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{s.body}</p>
            {s.bullets && (
              <ul className="mt-3 space-y-1.5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-foreground/90">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      {/* Related */}
      {related.length > 0 && (
        <div>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Related in {article.category}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {related.map((r) => {
              const RIcon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => onOpen(r.id)}
                  className="rounded-xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <RIcon className="h-4 w-4 text-primary" />
                  <div className="mt-2 text-sm font-medium leading-snug text-foreground">{r.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{r.readMin} min read</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
