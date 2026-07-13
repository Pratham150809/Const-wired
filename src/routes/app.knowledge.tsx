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
  | "RFIs & Submittals"
  | "Billing & Pay Applications"
  | "Job Costing & Closeout"
  | "Safety & Compliance"
  | "Subcontractor Management";

const CATEGORIES: Category[] = [
  "RFIs & Submittals",
  "Billing & Pay Applications",
  "Job Costing & Closeout",
  "Safety & Compliance",
  "Subcontractor Management",
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
    id: "rfi-response-protocol",
    title: "RFI Response Protocol: routing, review, and sign-off",
    category: "RFIs & Submittals",
    icon: ClipboardCheck,
    excerpt:
      "How a Request for Information is routed to the right reviewer and answered within its SLA — and what to do when a response is late or unclear.",
    readMin: 4,
    updated: "Jul 08, 2026",
    tags: ["RFI", "routing", "controls"],
    sections: [
      {
        heading: "What an RFI is",
        body: "A Request for Information (RFI) is the formal channel the field team or a subcontractor uses to flag a design gap, conflict, or missing detail in the contract documents before work can proceed on that item — for example, a beam connection on Riverside Tower that isn't fully detailed on the structural drawings.",
      },
      {
        heading: "What the copilot checks",
        body: "For each RFI, the copilot verifies it's routed to the right discipline, has a response due date set from the contract SLA, and flags any cost or schedule impact before it's sent.",
        bullets: [
          "Routed to the responsible party — architect, structural engineer, or Project Executive — based on discipline",
          "Response due date set per the contract SLA, typically 5–10 business days",
          "Potential cost or schedule impact flagged for the PM's review",
          "Linked to the affected drawing, spec section, or submittal",
        ],
      },
      {
        heading: "When a response is late or unclear",
        body: "Overdue RFIs are escalated with a plain-language reason: no reviewer assigned, response received but ambiguous, or field work blocked pending the answer. Resolve by having the Superintendent confirm the impact and the PM follow up with the design team, then log the final answer against the RFI before closing it.",
      },
    ],
  },
  {
    id: "job-cost-closeout-checklist",
    title: "Job cost closeout checklist",
    category: "Job Costing & Closeout",
    icon: ScrollText,
    excerpt:
      "The standard sequence for closing out job costs each period, from draw reconciliations through to reporting.",
    readMin: 6,
    updated: "Jul 01, 2026",
    tags: ["closeout", "checklist", "job costing"],
    sections: [
      {
        heading: "Before you start",
        body: "Confirm all subcontractor pay applications have been submitted and the cost codes are cut off for the period. The closeout can't tie out if committed costs are still posting.",
      },
      {
        heading: "The core checklist",
        body: "Work the tasks in order — each depends on the one before it.",
        bullets: [
          "Reconcile all draws and owner billings",
          "Post recurring committed-cost accruals",
          "Review and approve outstanding change order logs",
          "Reconcile the job cost ledger to the general ledger",
          "Flag cost overruns vs. budget and estimated cost at completion",
          "Lock the period and generate the WIP (work-in-progress) report",
        ],
      },
      {
        heading: "Tracking what's outstanding",
        body: "The closeout copilot reports blockers in real time — an unreconciled draw or an unapproved change order — so nothing slips through before the period is locked.",
      },
    ],
  },
  {
    id: "percentage-of-completion",
    title: "Percentage-of-completion revenue recognition",
    category: "Job Costing & Closeout",
    icon: FileText,
    excerpt:
      "The cost-to-cost method for recognizing revenue on long-term construction contracts, in plain language.",
    readMin: 5,
    updated: "Jun 24, 2026",
    tags: ["revenue", "percentage-of-completion", "policy"],
    sections: [
      {
        heading: "The cost-to-cost method",
        body: "Percentage-of-completion recognizes revenue on a long-term contract in proportion to the costs incurred against the total estimated cost, following five steps.",
        bullets: [
          "Determine the total estimated cost to complete the contract",
          "Track costs incurred to date against that estimate",
          "Calculate percent complete: costs incurred ÷ estimated total cost",
          "Apply percent complete to total contract revenue to date",
          "Recognize revenue as the cost estimate is updated each period",
        ],
      },
      {
        heading: "Billings in excess vs. costs in excess",
        body: "When billings to the owner outpace recognized revenue, the difference sits on the balance sheet as billings in excess of costs. When recognized revenue outpaces billings, it's costs in excess of billings. Both should be reviewed every period alongside the WIP schedule.",
      },
      {
        heading: "Common judgment areas",
        body: "Estimated cost at completion, unapproved change orders, and contract modifications need documented judgment. Keep the support with the job file for audit.",
      },
    ],
  },
  {
    id: "draw-reconciliation",
    title: "Draw reconciliation SOP",
    category: "Job Costing & Closeout",
    icon: Landmark,
    excerpt:
      "How to reconcile a construction loan draw to the job cost ledger and clear the exceptions that need a human.",
    readMin: 4,
    updated: "Jul 02, 2026",
    tags: ["reconciliation", "draw", "SOP"],
    sections: [
      {
        heading: "Auto-matching",
        body: "The copilot pulls the draw request and the job cost ledger entries, then matches them by cost code, amount, and period — typically clearing the large majority automatically.",
      },
      {
        heading: "Working the exceptions",
        body: "Unmatched items are grouped and explained. Retention held back and lender-required documentation usually need a proposed adjustment; timing differences (costs incurred but not yet billed) clear on their own next period.",
        bullets: [
          "Post proposed retention and holdback entries",
          "Confirm costs incurred but not yet drawn against",
          "Investigate any unexplained variance before sign-off",
        ],
      },
      {
        heading: "Sign-off",
        body: "Once the adjusted draw ties to the job cost ledger, the Project Executive approves and the reconciliation is closed with a documented match trail.",
      },
    ],
  },
  {
    id: "daily-log-safety-reporting",
    title: "Daily log & site safety reporting policy",
    category: "Safety & Compliance",
    icon: Wallet,
    excerpt: "What belongs in the daily log, the reporting timelines, and how entries are audited against policy.",
    readMin: 3,
    updated: "Jun 30, 2026",
    tags: ["daily log", "safety", "policy"],
    sections: [
      {
        heading: "What belongs in the daily log",
        body: "Weather, crew counts, equipment on site, work performed, deliveries, and any safety incident or near-miss are logged daily by the Superintendent. Delays and disruptions need a documented cause.",
      },
      {
        heading: "Timelines",
        body: "Standard reporting windows apply unless a site condition requires immediate escalation.",
        bullets: [
          "Daily log: submitted by end of shift",
          "Near-miss or first-aid incident: reported within 4 hours",
          "Any recordable incident: Project Executive notified immediately",
        ],
      },
      {
        heading: "How entries are audited",
        body: "The site copilot reads each daily log, cross-checks crew counts and deliveries against schedule and procurement records, and flags anything inconsistent or missing for a human before it's filed.",
      },
    ],
  },
  {
    id: "owner-billing-pay-app",
    title: "Owner billing & pay application playbook",
    category: "Billing & Pay Applications",
    icon: Receipt,
    excerpt: "How outstanding pay applications are prioritized and how follow-up cadence escalates by stage.",
    readMin: 4,
    updated: "Jul 05, 2026",
    tags: ["billing", "pay application", "collections"],
    sections: [
      {
        heading: "Prioritizing accounts",
        body: "Open pay applications are ranked by risk using amount, days past due since submission, and the owner's payment history, so follow-up goes where it matters most.",
      },
      {
        heading: "Billing cadence",
        body: "Follow-up escalates in tone and channel as a pay application ages past its due date.",
        bullets: [
          "Day 1–15 past due: standard AIA G702/G703 submission reminder",
          "Day 16–30: firmer follow-up, copy the Project Manager",
          "Day 31+: escalate to the Project Executive and open a lien-notice review",
        ],
      },
      {
        heading: "Human in the loop",
        body: "The copilot drafts each follow-up per owner and stage; the Project Executive reviews before anything is sent.",
      },
    ],
  },
  {
    id: "permit-inspection-compliance",
    title: "Permit & inspection compliance guide",
    category: "Safety & Compliance",
    icon: ShieldCheck,
    excerpt: "Which permits and inspections are required before work proceeds, and how compliance is tracked.",
    readMin: 5,
    updated: "Jul 10, 2026",
    tags: ["permits", "inspections", "compliance"],
    sections: [
      {
        heading: "What triggers a permit",
        body: "A building permit or a trade-specific permit — electrical, mechanical, fire protection — can be triggered by scope of work, jurisdiction, or a change to the approved plans. Work started without the required permit puts the whole schedule at risk.",
      },
      {
        heading: "Preparing for an inspection",
        body: "The compliance copilot reviews the inspection checklist for the trade, confirms prerequisite inspections have passed, flags missing documentation, and prepares the inspection request with supporting photos and logs.",
      },
      {
        heading: "Review before scheduling",
        body: "Every inspection request is reviewed against the current checklist before it's scheduled with the jurisdiction, with a summary of what's changed since the last inspection attempt.",
      },
    ],
  },
  {
    id: "subcontractor-onboarding-lien-waiver",
    title: "Subcontractor onboarding & lien waiver requirements",
    category: "Subcontractor Management",
    icon: ClipboardCheck,
    excerpt: "The documentation and checks required before a new subcontractor can be paid.",
    readMin: 3,
    updated: "Jun 22, 2026",
    tags: ["subcontractor", "lien waiver", "onboarding"],
    sections: [
      {
        heading: "Required documentation",
        body: "Before the first payment, collect a signed subcontract, a certificate of insurance (COI) meeting the project's coverage limits, a completed W-9, and a conditional lien waiver for the pay period.",
      },
      {
        heading: "Verification checks",
        body: "The copilot validates the COI coverage and expiration, screens license and bonding status against the state registry, and checks for a duplicate subcontractor record before drafting the subcontractor master.",
        bullets: ["COI coverage-limit validation", "License and bonding verification", "Duplicate-subcontractor check"],
      },
      {
        heading: "Approval",
        body: "The drafted subcontractor record is routed to the Project Executive for approval before it becomes payable, and every subsequent pay application requires an updated lien waiver.",
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
          Construction knowledge base
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Policies, SOPs, and how-to guides for your RFIs, billing, and compliance workflows.
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
