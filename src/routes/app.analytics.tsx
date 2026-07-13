import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Cable,
  CheckCircle2,
  Clock,
  FileText,
  MessagesSquare,
  TrendingUp,
  Workflow,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/analytics")({ component: Analytics });

/* ─────────────────────────  Dummy data  ───────────────────────── */

const KPIS: { label: string; value: string; icon: LucideIcon; hint: string; trend?: string }[] = [
  { label: "AI Requests", value: "1,847", icon: MessagesSquare, hint: "this month", trend: "+22%" },
  { label: "Workflow Executions", value: "412", icon: Workflow, hint: "this month", trend: "+8%" },
  { label: "Approvals Completed", value: "356", icon: CheckCircle2, hint: "this month" },
  { label: "Avg. Approval Time", value: "2m 41s", icon: Clock, hint: "down from 45m manual" },
  { label: "Documents Processed", value: "1,284", icon: FileText, hint: "this month", trend: "+18%" },
  { label: "Connector Invocations", value: "6,920", icon: Cable, hint: "this month" },
];

// Workflow status breakdown.
const WF_STATUS: { label: string; value: number }[] = [
  { label: "Completed", value: 356 },
  { label: "Running", value: 34 },
  { label: "Awaiting approval", value: 18 },
  { label: "Failed", value: 4 },
];

// Approvals.
const APPROVED = 338;
const REJECTED = 18;

// 8-week activity trend (AI requests + workflow runs).
const TREND: { week: string; ai: number; wf: number }[] = [
  { week: "W1", ai: 210, wf: 44 },
  { week: "W2", ai: 268, wf: 51 },
  { week: "W3", ai: 245, wf: 47 },
  { week: "W4", ai: 312, wf: 58 },
  { week: "W5", ai: 298, wf: 55 },
  { week: "W6", ai: 356, wf: 62 },
  { week: "W7", ai: 402, wf: 68 },
  { week: "W8", ai: 438, wf: 74 },
];

const RECENT: { action: string; actor: string; time: string }[] = [
  { action: "rfi.response_posted", actor: "RFI Copilot", time: "Jul 13, 2026 10:42" },
  { action: "workflow.approved", actor: "a.reyes@northwind.co", time: "Jul 13, 2026 10:15" },
  { action: "change_order.duplicate_flagged", actor: "RFI Copilot", time: "Jul 13, 2026 09:58" },
  { action: "connector.invoke", actor: "Recon Copilot", time: "Jul 13, 2026 09:30" },
  { action: "daily_log.reviewed", actor: "Safety Copilot", time: "Jul 13, 2026 09:12" },
  { action: "chat.message", actor: "j.lin@northwind.co", time: "Jul 13, 2026 08:47" },
  { action: "subcontractor.onboarded", actor: "r.danforth@northwind.co", time: "Jul 13, 2026 08:20" },
  { action: "report.generated", actor: "Reporting Copilot", time: "Jul 13, 2026 07:35" },
];

/* ─────────────────────────  Page  ───────────────────────── */

function Analytics() {
  const maxStatus = WF_STATUS.reduce((m, s) => Math.max(m, s.value), 0);
  const decided = APPROVED + REJECTED;
  const approvalRate = Math.round((APPROVED / decided) * 100);
  const maxTrend = TREND.reduce((m, t) => Math.max(m, t.ai), 0);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Analytics
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Platform activity
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Usage across AI, workflows, approvals, and connectors over the last 30 days.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {KPIS.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>

      {/* Trend chart */}
      <Panel icon={TrendingUp} title="Activity trend" hint="last 8 weeks">
        <div className="flex h-44 items-end gap-3">
          {TREND.map((t) => (
            <div key={t.week} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div
                  className="brand-gradient w-1/2 rounded-t"
                  style={{ height: `${(t.ai / maxTrend) * 100}%` }}
                  title={`${t.ai} AI requests`}
                />
                <div
                  className="w-1/2 rounded-t bg-primary/25"
                  style={{ height: `${(t.wf / maxTrend) * 100}%` }}
                  title={`${t.wf} workflow runs`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{t.week}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="brand-gradient h-2 w-2 rounded-sm" /> AI requests
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-primary/25" /> Workflow runs
          </span>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Workflow breakdown */}
        <Panel icon={Workflow} title="Workflow breakdown" hint="412 total">
          <div className="space-y-3">
            {WF_STATUS.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{s.label}</span>
                  <span className="tabular-nums text-muted-foreground">{s.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="brand-gradient h-full rounded-full"
                    style={{ width: `${(s.value / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Approvals */}
        <Panel icon={CheckCircle2} title="Approvals" hint="8 connectors on">
          <div className="space-y-5">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold tabular-nums text-foreground">
                {approvalRate}%
              </span>
              <span className="pb-1 text-xs text-muted-foreground">approval rate</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-emerald-500" style={{ width: `${(APPROVED / decided) * 100}%` }} />
              <div className="h-full bg-destructive" style={{ width: `${(REJECTED / decided) * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat icon={CheckCircle2} label="Approved" value={APPROVED} tone="text-emerald-500" />
              <MiniStat icon={XCircle} label="Rejected" value={REJECTED} tone="text-destructive" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Recent activity */}
      <Panel icon={Activity} title="Recent activity" hint="latest audit events">
        <ul className="divide-y divide-border">
          {RECENT.map((e, i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-foreground">{e.action}</span>
                <span className="ml-2 text-xs text-muted-foreground">{e.actor}</span>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{e.time}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ─────────────────────────  Pieces  ───────────────────────── */

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {trend && (
          <span className="inline-flex items-center gap-0.5 font-medium text-emerald-500">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {title}
        </div>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function MiniStat({
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
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone)} />
        {label}
      </div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums", tone)}>{value}</div>
    </div>
  );
}
