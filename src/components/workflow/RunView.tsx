import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { useDecideRun, useRun } from "../../api";
import { LoadingState } from "../common/states";
import { cn } from "../../lib/utils";

/* ─────────────────────────  Run-status badge  ─────────────────────────
   Tolerant of unknown status strings — an unrecognized status renders a
   neutral badge rather than crashing. */

type RunStatusMeta = { label: string; cls: string; spinner?: boolean };

const RUN_STATUS_META: Record<string, RunStatusMeta> = {
  running: { label: "Running…", cls: "bg-sky-500/10 border-sky-500/30 text-sky-500", spinner: true },
  awaiting_approval: {
    label: "Awaiting approval",
    cls: "bg-amber-500/10 border-amber-500/30 text-amber-500",
  },
  completed: { label: "Completed", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" },
  rejected: { label: "Rejected", cls: "bg-destructive/10 border-destructive/30 text-destructive" },
};

const runStatusMeta = (status: string): RunStatusMeta =>
  RUN_STATUS_META[status] ?? {
    label: status || "Unknown",
    cls: "bg-muted border-border text-muted-foreground",
  };

/* ─────────────────────────  Per-step styling  ─────────────────────────
   The node's accent, numbered badge, and status icon all track the step's
   live status so the graph reads at a glance as it executes. */

type StepStatusMeta = {
  icon: LucideIcon;
  iconCls: string;
  accent: string;
  badge: string;
  node: string;
  spin?: boolean;
  pulse?: boolean;
};

const STEP_STATUS_META: Record<string, StepStatusMeta> = {
  completed: {
    icon: CheckCircle2,
    iconCls: "text-emerald-500",
    accent: "border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    node: "",
  },
  running: {
    icon: Loader2,
    iconCls: "text-sky-500",
    accent: "border-l-sky-500",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    node: "",
    spin: true,
  },
  awaiting_approval: {
    icon: Clock,
    iconCls: "text-amber-500",
    accent: "border-l-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    node: "",
    pulse: true,
  },
  skipped: {
    icon: XCircle,
    iconCls: "text-muted-foreground",
    accent: "border-l-border",
    badge: "bg-muted text-muted-foreground",
    node: "opacity-50",
  },
  pending: {
    icon: Clock,
    iconCls: "text-muted-foreground",
    accent: "border-l-border",
    badge: "bg-muted text-muted-foreground",
    node: "opacity-60",
  },
};

const stepStatusMeta = (status: string): StepStatusMeta =>
  STEP_STATUS_META[status] ?? STEP_STATUS_META.pending;

/* ─────────────────────────  Component  ───────────────────────── */

export function RunView({ runId }: { runId: string }) {
  const { data: run, isLoading } = useRun(runId);
  const decide = useDecideRun();

  const onDecide = (decision: "approve" | "reject") =>
    decide.mutate(
      { runId, decision },
      {
        onSuccess: () =>
          toast.success(decision === "approve" ? "Run approved." : "Run rejected."),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not record your decision."),
      },
    );

  if (isLoading) return <LoadingState label="Loading run…" />;
  if (!run) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        We couldn't find this run.{" "}
        <Link to="/app/workflows" className="text-primary hover:underline">
          Back to workflows
        </Link>
      </div>
    );
  }

  const meta = runStatusMeta(run.status);

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/app/workflows"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Workflows
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {run.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{run.run_id}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
            meta.cls,
          )}
        >
          {meta.spinner && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {meta.label}
        </span>
      </div>

      {/* Flow graph */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Steps
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2.5">
          {run.steps.map((s, i) => {
            const sm = stepStatusMeta(s.status);
            const Icon = sm.icon;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  title={`${s.name} · ${s.status}`}
                  className={cn(
                    "w-[172px] shrink-0 rounded-lg border border-l-[3px] border-border bg-card px-3 py-2.5 transition",
                    sm.accent,
                    sm.node,
                    sm.pulse && "animate-pulse",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                        sm.badge,
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate text-[13px] font-medium text-foreground">
                      {s.name}
                    </span>
                    <Icon
                      className={cn(
                        "ml-auto h-3.5 w-3.5 shrink-0",
                        sm.iconCls,
                        sm.spin && "animate-spin",
                      )}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 pl-7">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.type}
                    </span>
                    {s.status === "skipped" && (
                      <span className="text-[9px] font-medium lowercase text-muted-foreground">
                        · skipped
                      </span>
                    )}
                  </div>
                </div>
                {i < run.steps.length - 1 && (
                  <div className="mx-1.5 h-px w-6 shrink-0 bg-gradient-to-r from-border via-border to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval panel */}
      {run.status === "awaiting_approval" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserCheck className="h-4 w-4 text-amber-500" />
            Waiting for your approval
          </div>
          {run.summary && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {run.summary}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onDecide("approve")}
              disabled={decide.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-60 dark:text-emerald-400"
            >
              {decide.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
              Approve
            </button>
            <button
              onClick={() => onDecide("reject")}
              disabled={decide.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-1.5 text-sm font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
            >
              {decide.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsDown className="h-4 w-4" />
              )}
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Result panel */}
      {run.status === "completed" && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <div className="text-sm font-semibold text-foreground">Workflow completed</div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {run.summary ?? "Workflow completed."}
            </p>
          </div>
        </div>
      )}
      {run.status === "rejected" && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <div className="text-sm font-semibold text-foreground">Run rejected</div>
            <p className="mt-1 text-sm text-muted-foreground">This run was rejected.</p>
          </div>
        </div>
      )}
    </>
  );
}
