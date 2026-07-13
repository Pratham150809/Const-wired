import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Landmark,
  ReceiptText,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  { label: "Cash Position", value: "$482,190", icon: Landmark, hint: "across 3 accounts" },
  { label: "Avg. Approval Time", value: "2m 41s", icon: Clock, hint: "down from 45m manual", tone: "good" },
  { label: "AI Conversations", value: "347", icon: Activity, hint: "this week" },
];

const CLOSE_TASKS: { label: string; done: number; total: number }[] = [
  { label: "Bank reconciliations", done: 3, total: 3 },
  { label: "Accruals & prepaids", done: 5, total: 6 },
  { label: "AP / AR cutoff", done: 8, total: 10 },
  { label: "Balance-sheet review", done: 4, total: 9 },
];

const RECENT_DOCS: { name: string; type: string; status: string; tone: Tone; date: string; icon: LucideIcon }[] = [
  { name: "Invoice #AC-2214 — Acme Supplies", type: "Invoice", status: "Needs Approval", tone: "warn", date: "Jul 08", icon: ReceiptText },
  { name: "Bank Statement — Mercury (Jun)", type: "Statement", status: "Reconciling", tone: "neutral", date: "Jul 01", icon: Landmark },
  { name: "Purchase Order PO-4482 — Nucor", type: "PO", status: "Approved", tone: "good", date: "Jun 22", icon: ClipboardCheck },
  { name: "Invoice #GX-2231 — Globex Corp", type: "Invoice", status: "Duplicate Flagged", tone: "bad", date: "Jul 09", icon: ReceiptText },
  { name: "Expense Report — Q3 Sales Offsite", type: "Expense", status: "Needs Approval", tone: "warn", date: "Jul 06", icon: FileText },
];

const ACTIVITY: { action: string; actor: string; detail: string; time: string }[] = [
  { action: "Invoice posted", actor: "AP Copilot", detail: "AC-2198 → QuickBooks", time: "10:42" },
  { action: "Approval granted", actor: "A. Reyes", detail: "Reconciliation · June", time: "10:15" },
  { action: "Duplicate flagged", actor: "AP Copilot", detail: "Invoice GX-2231", time: "09:58" },
  { action: "Bank feed synced", actor: "System", detail: "Mercury ••4102", time: "09:30" },
  { action: "Expense audited", actor: "Audit Copilot", detail: "Q3 Sales Offsite", time: "09:12" },
  { action: "Vendor onboarded", actor: "R. Danforth", detail: "Nucor Steel · W-9 verified", time: "08:47" },
];

const SERVICES: { name: string; status: string; tone: Tone }[] = [
  { name: "QuickBooks", status: "operational", tone: "good" },
  { name: "Mercury Bank", status: "operational", tone: "good" },
  { name: "Document AI", status: "operational", tone: "good" },
  { name: "Orchestrator", status: "operational", tone: "good" },
  { name: "NetSuite", status: "degraded", tone: "warn" },
  { name: "Audit Log", status: "operational", tone: "good" },
];

/* ─────────────────────────  Page  ───────────────────────── */

function Dashboard() {
  const { me } = useSession();
  const name = me?.email ? me.email.split("@")[0] : "there";

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
          Your organization's AI accounting operations at a glance.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map((k) => (
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
        <Panel icon={CheckCircle2} title="Month-end close" hint="July 2026">
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
          <ul className="divide-y divide-border">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{a.action}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.actor} · {a.detail}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{a.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Recent documents */}
      <Panel icon={FileText} title="Recent documents" hint={`${RECENT_DOCS.length} items`}>
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
              {RECENT_DOCS.map((d) => {
                const Icon = d.icon;
                return (
                  <tr key={d.name} className="transition-colors hover:bg-surface-2/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="font-medium">{d.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{d.type}</td>
                    <td className="py-2.5">
                      <StatusPill tone={d.tone}>{d.status}</StatusPill>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">{d.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Connected services */}
      <Panel icon={Cable} title="Connected services" hint="live status">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SERVICES.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <span className="truncate text-sm">{s.name}</span>
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  s.tone === "good" ? "bg-emerald-500" : s.tone === "warn" ? "bg-amber-500" : "bg-muted-foreground",
                )}
                title={s.status}
              />
            </div>
          ))}
        </div>
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
