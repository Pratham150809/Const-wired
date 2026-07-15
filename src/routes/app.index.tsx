import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Landmark,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuditEvents, useDocuments, useSystemHealth, useWorkflows } from "../api";
import { EmptyState, LoadingState } from "../components/common/states";
import { useSession } from "../lib/session";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

/* ─────────────────────────  Dummy data  ───────────────────────── */

type Tone = "good" | "warn" | "bad" | "neutral";

const KPIS: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint: string;
  trend?: string;
  tone?: Tone;
}[] = [
  { label: "Active Workflows", value: "12", icon: Workflow, hint: "running now", trend: "+3 today" },
  { label: "Pending Approvals", value: "5", icon: ClipboardCheck, hint: "awaiting review", tone: "warn" },
  { label: "Connected Systems", value: "8", icon: Cable, hint: "of 12 available" },
  { label: "Documents Processed", value: "1,284", icon: FileText, hint: "this month", trend: "+18%" },
];

const SECONDARY_KPIS: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint: string;
  tone?: Tone;
}[] = [
  { label: "Contract Value in Progress", value: "$482,190", icon: Landmark, hint: "across 3 active projects" },
  { label: "Avg. Approval Time", value: "2m 41s", icon: Clock, hint: "down from 45m manual", tone: "good" },
  { label: "AI Conversations", value: "347", icon: Activity, hint: "this week" },
];

const CLOSE_TASKS: { label: string; done: number; total: number }[] = [
  { label: "Draw reconciliation", done: 3, total: 3 },
  { label: "Cost accruals & retainage", done: 5, total: 6 },
  { label: "Job cost cutoff", done: 8, total: 10 },
  { label: "WIP schedule review", done: 4, total: 9 },
];

/* Map a free-form backend status string onto the widget's tone palette. */
function statusTone(status: string): Tone {
  if (/approved|processed|operational|healthy|complete|ok|up|active/i.test(status)) return "good";
  if (/pending|await|review|reconcil|processing|degraded|warn/i.test(status)) return "warn";
  if (/fail|reject|error|duplicate|down|outage/i.test(status)) return "bad";
  return "neutral";
}

/* ─────────────────────────  Page  ───────────────────────── */

function Dashboard() {
  const { me } = useSession();
  const name = me?.email ? me.email.split("@")[0] : "there";

  // Real backend sources for the data-backed widgets. Construction-specific
  // widgets with no backend equivalent (secondary KPIs, job-cost closeout) stay
  // on their static defaults below.
  const workflows = useWorkflows();
  const documents = useDocuments();
  const activity = useAuditEvents("dashboard", 6);
  const health = useSystemHealth();

  const wfList = workflows.data ?? [];
  const activeCount = wfList.filter((w) => /run|await|progress|active/i.test(w.status)).length;
  const pendingApprovals = wfList.filter(
    (w) => !w.decision && /pending|await|review/i.test(w.status),
  ).length;

  // Keep the static defaults until real data arrives (avoids a hydration
  // mismatch on the SSR pass, matching the previous null-then-load approach).
  const kpis = KPIS.map((k) => {
    if (!workflows.data) return k;
    if (k.label === "Active Workflows") return { ...k, value: String(activeCount) };
    if (k.label === "Pending Approvals") return { ...k, value: String(pendingApprovals) };
    return k;
  });

  const recentDocs = (documents.data ?? []).slice(0, 5);
  const events = activity.data ?? [];
  const services = health.data ? Object.entries(health.data.services) : [];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Dashboard
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Welcome back, <span className="capitalize">{name}</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your organization's AI construction operations at a glance.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SECONDARY_KPIS.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>

      {/* Month-end close + activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel icon={CheckCircle2} title="Job Cost Closeout" hint="July 2026">
          <div className="space-y-4">
            {CLOSE_TASKS.map((t) => {
              const pct = Math.round((t.done / t.total) * 100);
              return (
                <div key={t.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{t.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.done}/{t.total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "brand-gradient")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel icon={Activity} title="Activity" hint="today">
          {activity.isLoading ? (
            <LoadingState />
          ) : events.length === 0 ? (
            <EmptyState icon={Activity} title="No recent activity" />
          ) : (
            <ul className="divide-y divide-border">
              {events.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{a.action}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.actor_email ?? a.actor_id} · {a.resource_kind}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Recent documents */}
      <Panel icon={FileText} title="Recent documents" hint={`${recentDocs.length} items`}>
        {documents.isLoading ? (
          <LoadingState />
        ) : recentDocs.length === 0 ? (
          <EmptyState icon={FileText} title="No documents yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Document</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentDocs.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-surface-2/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-medium">{d.filename}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{d.content_type ?? "—"}</td>
                    <td className="py-2.5">
                      <StatusPill tone={statusTone(d.status)}>{d.status}</StatusPill>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Connected services */}
      <Panel icon={Cable} title="Connected services" hint="live status">
        {health.isLoading ? (
          <LoadingState />
        ) : services.length === 0 ? (
          <EmptyState icon={Cable} title="No services reporting" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {services.map(([serviceName, status]) => {
              const tone = statusTone(status);
              return (
                <div
                  key={serviceName}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <span className="truncate text-sm">{serviceName}</span>
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      tone === "good" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-muted-foreground",
                    )}
                    title={status}
                  />
                </div>
              );
            })}
          </div>
        )}
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
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  trend?: string;
  tone?: Tone;
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
      <div
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "warn" ? "text-amber-500" : tone === "good" ? "text-emerald-500" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {trend && (
          <span className="inline-flex items-center gap-0.5 font-medium text-emerald-500">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
        <span>{hint}</span>
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

function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
      : tone === "warn"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
        : tone === "bad"
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-muted border-border text-muted-foreground";
  return (
    <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>
      {children}
    </span>
  );
}
