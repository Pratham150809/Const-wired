import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, Clock, ShieldCheck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { useSession } from "../lib/session";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/approvals")({ component: Approvals });

/* ─────────────────────────  Dummy data  ───────────────────────── */

type Decision = "approved" | "rejected";

type ApprovalItem = {
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

const INITIAL: ApprovalItem[] = [
  {
    id: "wf_invoice_0417",
    type: "AP Invoice Approval",
    title: "Invoice #AC-2214 — Acme Supplies",
    amount: "$14,280.00",
    requester: "AP Copilot",
    approver: "Controller",
    waited: "18m",
    priority: "medium",
    summary:
      "3-way match against PO-2214 and goods receipt succeeded. Freight of $1,180.00 was not on the original PO and should be confirmed as billable before posting.",
    checks: [
      { label: "3-way match", ok: true },
      { label: "Duplicate check", ok: true },
      { label: "Freight on PO", ok: false },
    ],
  },
  {
    id: "wf_expense_118",
    type: "Expense Report",
    title: "Q3 Sales Offsite — 6 attendees",
    amount: "$3,914.72",
    requester: "R. Danforth",
    approver: "Finance Manager",
    waited: "42m",
    priority: "low",
    summary:
      "18 of 19 line items passed the automated policy check. One lodging night of $312.00 exceeds the $250 nightly cap and needs a justification.",
    checks: [
      { label: "Receipts attached", ok: true },
      { label: "Duplicate claims", ok: true },
      { label: "Within policy", ok: false },
    ],
  },
  {
    id: "wf_bankrec_jun",
    type: "Bank Reconciliation",
    title: "Mercury Operating — June close",
    amount: "$482,190.11",
    requester: "Recon Copilot",
    approver: "Controller",
    waited: "1h 05m",
    priority: "high",
    summary:
      "398 of 412 transactions auto-matched (96.6%). Two fee journal entries are proposed and 14 exceptions are grouped and explained, ready to clear.",
    checks: [
      { label: "Balance ties out", ok: true },
      { label: "Exceptions grouped", ok: true },
      { label: "Fee entries proposed", ok: true },
    ],
  },
  {
    id: "wf_vendor_globex",
    type: "Vendor Payment",
    title: "Invoice #GX-2231 — Globex Corp",
    amount: "$6,540.00",
    requester: "AP Copilot",
    approver: "Controller",
    waited: "2h 12m",
    priority: "high",
    summary:
      "Flagged as a likely duplicate of GX-2198 (paid Jun 28). Held from the payment run — approve only after confirming with the vendor, otherwise reject.",
    checks: [
      { label: "Vendor verified", ok: true },
      { label: "Not a duplicate", ok: false },
      { label: "Within terms", ok: true },
    ],
  },
];

const PRIORITY_META: Record<ApprovalItem["priority"], { label: string; cls: string }> = {
  high: { label: "High", cls: "bg-destructive/10 border-destructive/30 text-destructive" },
  medium: { label: "Medium", cls: "bg-amber-500/10 border-amber-500/30 text-amber-500" },
  low: { label: "Low", cls: "bg-muted border-border text-muted-foreground" },
};

/* ─────────────────────────  Page  ───────────────────────── */

function Approvals() {
  const { isManager } = useSession();
  const [items, setItems] = useState(INITIAL);
  const [decided, setDecided] = useState<{ item: ApprovalItem; decision: Decision }[]>([]);

  const decide = (item: ApprovalItem, decision: Decision) => {
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    setDecided((cur) => [{ item, decision }, ...cur]);
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
          Approvals
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Approval queue
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Items awaiting a human decision. Review the AI summary and control checks, then approve or
          reject before anything posts.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile icon={Clock} label="Pending" value={items.length} tone="text-amber-500" />
        <Tile
          icon={CheckCircle2}
          label="Approved today"
          value={decided.filter((d) => d.decision === "approved").length}
          tone="text-emerald-500"
        />
        <Tile
          icon={XCircle}
          label="Rejected today"
          value={decided.filter((d) => d.decision === "rejected").length}
          tone="text-destructive"
        />
      </div>

      {!isManager && (
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
          You can view the queue, but only owners/admins may approve or reject.
        </div>
      )}

      {/* Queue */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">You're all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing is waiting for approval.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <ApprovalCard key={item.id} item={item} canDecide={isManager} onDecide={decide} />
          ))}
        </div>
      )}

      {/* Recently decided */}
      {decided.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Recently decided
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {decided.map(({ item, decision }, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.type} · {item.amount}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                    decision === "approved"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                  )}
                >
                  {decision === "approved" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {decision}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

function ApprovalCard({
  item,
  canDecide,
  onDecide,
}: {
  item: ApprovalItem;
  canDecide: boolean;
  onDecide: (item: ApprovalItem, decision: Decision) => void;
}) {
  const [comment, setComment] = useState("");
  const pr = PRIORITY_META[item.priority];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
              {item.type}
            </span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                pr.cls,
              )}
            >
              {pr.label}
            </span>
          </div>
          <div className="mt-1 text-base font-semibold text-foreground">{item.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-sm font-semibold text-foreground">{item.amount}</span>
            <span>·</span>
            <span>Requested by {item.requester}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> waiting {item.waited}
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
          <Clock className="h-3 w-3" /> Awaiting {item.approver}
        </span>
      </div>

      {/* AI summary */}
      <div className="mb-3 rounded-xl border border-border bg-surface-2/50 p-3 text-sm text-foreground/90">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> AI summary
        </div>
        <p>{item.summary}</p>
      </div>

      {/* Control checks */}
      <div className="mb-4 flex flex-wrap gap-2">
        {item.checks.map((c) => (
          <span
            key={c.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              c.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-amber-500/30 bg-amber-500/10 text-amber-500",
            )}
          >
            {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {c.label}
          </span>
        ))}
      </div>

      {canDecide ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)…"
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onDecide(item, "approved")}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => onDecide(item, "rejected")}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-1.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Awaiting {item.approver} sign-off.</p>
      )}
    </div>
  );
}
