import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, Clock, ShieldCheck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { useWorkflows, useDecideWorkflow } from "../api";
import type { WorkflowItem } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/common/states";
import { useSession } from "../lib/session";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/approvals")({ component: Approvals });

/* ─────────────────────────  Data  ───────────────────────── */
// Approvals are workflows awaiting a human decision, derived from the live
// workflows list so an item drafted by a workflow triggered from the AI
// Assistant shows up in this queue too.

type Decision = "approved" | "rejected";

/* ─────────────────────────  Page  ───────────────────────── */

function Approvals() {
  const { isManager } = useSession();
  const workflows = useWorkflows();
  const decide = useDecideWorkflow();

  const all = workflows.data ?? [];
  const pending = all.filter((w) => !w.decision && /pending|await|review/i.test(w.status));
  const decided = all
    .filter((w) => w.decision)
    .map((w) => ({
      w,
      decision: (w.decision === "approved" ? "approved" : "rejected") as Decision,
    }));

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
        <Tile icon={Clock} label="Pending" value={pending.length} tone="text-amber-500" />
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
      {workflows.isLoading ? (
        <LoadingState />
      ) : workflows.isError ? (
        <ErrorState onRetry={() => workflows.refetch()} />
      ) : pending.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No pending approvals" />
      ) : (
        <div className="grid gap-3">
          {pending.map((w) => (
            <ApprovalCard
              key={w.workflow_id}
              w={w}
              canDecide={isManager}
              isPending={decide.isPending}
              onDecide={(approve, comment) =>
                decide.mutate({ workflowId: w.workflow_id, approve, comment })
              }
            />
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
            {decided.map(({ w, decision }) => (
              <li key={w.workflow_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{w.summary ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.type} · —
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
  w,
  canDecide,
  isPending,
  onDecide,
}: {
  w: WorkflowItem;
  canDecide: boolean;
  isPending: boolean;
  onDecide: (approve: boolean, comment: string) => void;
}) {
  const [comment, setComment] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
              {w.type}
            </span>
            <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              —
            </span>
          </div>
          <div className="mt-1 text-base font-semibold text-foreground">{w.summary ?? "—"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-sm font-semibold text-foreground">—</span>
            <span>·</span>
            <span>Requested by —</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(w.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
          <Clock className="h-3 w-3" /> {w.status}
        </span>
      </div>

      {/* AI summary */}
      <div className="mb-3 rounded-xl border border-border bg-surface-2/50 p-3 text-sm text-foreground/90">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> AI summary
        </div>
        <p>{w.summary ?? "—"}</p>
      </div>

      {/* Control checks */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          —
        </span>
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
              onClick={() => onDecide(true, comment)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => onDecide(false, comment)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-1.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Awaiting sign-off.</p>
      )}
    </div>
  );
}
