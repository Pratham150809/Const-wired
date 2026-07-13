import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Plug,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Fragment, useState } from "react";

import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/workflows")({ component: Workflows });

/* ─────────────────────────  Types + dummy data  ───────────────────────── */

type WfStatus = "running" | "awaiting_approval" | "completed" | "failed";
type StepKind = "trigger" | "extract" | "match" | "validate" | "approve" | "output";

type Step = { label: string; system: string; kind: StepKind; failed?: boolean };

type Row = {
  id: string;
  name: string;
  status: WfStatus;
  waiting: string;
  decision: string | null;
  started: string;
  updated: string;
  flow: Step[];
};

const ROWS: Row[] = [
  {
    id: "wf_rfi_2214",
    name: "RFI Response & Approval",
    status: "awaiting_approval",
    waiting: "PM approval",
    decision: null,
    started: "Jul 13, 2026 09:41",
    updated: "Jul 13, 2026 09:44",
    flow: [
      { label: "RFI submitted", system: "Email Inbox", kind: "trigger" },
      { label: "Extract RFI details", system: "Document AI", kind: "extract" },
      { label: "Drawing/spec lookup", system: "Procore", kind: "match" },
      { label: "Cost-code assignment", system: "Rules Engine", kind: "validate" },
      { label: "PM approval", system: "Approvals", kind: "approve" },
      { label: "Post RFI response", system: "Procore", kind: "output" },
    ],
  },
  {
    id: "wf_drawrec_jun",
    name: "Draw Reconciliation — June",
    status: "running",
    waiting: "—",
    decision: null,
    started: "Jul 13, 2026 09:30",
    updated: "Jul 13, 2026 09:52",
    flow: [
      { label: "Bank feed syncs", system: "Mercury Bank", kind: "trigger" },
      { label: "Pull transactions", system: "Bank Feed", kind: "extract" },
      { label: "Auto-match ledger", system: "Core Banking", kind: "match" },
      { label: "Group exceptions", system: "Recon Engine", kind: "validate" },
      { label: "Project Executive approval", system: "Approvals", kind: "approve" },
      { label: "Draw close", system: "Ledger", kind: "output" },
    ],
  },
  {
    id: "wf_jobcostclose_jul",
    name: "Job Cost Close — July",
    status: "running",
    waiting: "—",
    decision: null,
    started: "Jul 13, 2026 08:00",
    updated: "Jul 13, 2026 09:58",
    flow: [
      { label: "Kick off close", system: "Scheduler", kind: "trigger" },
      { label: "Work checklist", system: "Close Engine", kind: "extract" },
      { label: "Pull cost report", system: "Procore", kind: "match" },
      { label: "Reconcile accounts", system: "Core Banking", kind: "validate" },
      { label: "Project Executive approval", system: "Approvals", kind: "approve" },
      { label: "Job cost ledger lock", system: "Ledger", kind: "output" },
    ],
  },
  {
    id: "wf_ownerbilling",
    name: "Owner Billing & Pay Application",
    status: "completed",
    waiting: "—",
    decision: "approved",
    started: "Jul 12, 2026 16:20",
    updated: "Jul 12, 2026 16:22",
    flow: [
      { label: "Pay application overdue", system: "Procore", kind: "trigger" },
      { label: "Rank by risk", system: "Billing Engine", kind: "extract" },
      { label: "Reconcile payments", system: "Bank Feed", kind: "match" },
      { label: "Draft reminders", system: "Document AI", kind: "validate" },
      { label: "Project Executive approval", system: "Approvals", kind: "approve" },
      { label: "Queue emails to Owner", system: "CRM", kind: "output" },
    ],
  },
  {
    id: "wf_dailylog_riverside",
    name: "Daily Log & Safety Compliance Audit — Riverside Tower",
    status: "awaiting_approval",
    waiting: "PM approval",
    decision: null,
    started: "Jul 13, 2026 09:12",
    updated: "Jul 13, 2026 09:13",
    flow: [
      { label: "Daily log submitted", system: "Field App", kind: "trigger" },
      { label: "Read logs", system: "Document AI", kind: "extract" },
      { label: "Safety policy check", system: "Rules Engine", kind: "validate" },
      { label: "PM approval", system: "Approvals", kind: "approve" },
      { label: "File to Safety Team", system: "Safety Team", kind: "output" },
    ],
  },
  {
    id: "wf_subonboard_ironclad",
    name: "Subcontractor Onboarding & Lien Waiver — Ironclad Steel Supply",
    status: "completed",
    waiting: "—",
    decision: "approved",
    started: "Jun 22, 2026 11:05",
    updated: "Jun 22, 2026 11:18",
    flow: [
      { label: "New subcontractor request", system: "Email", kind: "trigger" },
      { label: "Read COI + W-9", system: "Document AI", kind: "extract" },
      { label: "Validate TIN + insurance", system: "Compliance", kind: "validate" },
      { label: "Project Executive approval", system: "Approvals", kind: "approve" },
      { label: "Create subcontractor record", system: "Procore", kind: "output" },
    ],
  },
  {
    id: "wf_permit_q2",
    name: "Permit & Inspection Compliance — Q2",
    status: "failed",
    waiting: "—",
    decision: "rejected",
    started: "Jul 10, 2026 14:02",
    updated: "Jul 10, 2026 14:20",
    flow: [
      { label: "Filing deadline", system: "Scheduler", kind: "trigger" },
      { label: "Review permit status", system: "Procore", kind: "extract" },
      { label: "Recalculate compliance", system: "Compliance Engine", kind: "match" },
      { label: "Prepare filing", system: "Document AI", kind: "validate" },
      { label: "Project Executive approval", system: "Approvals", kind: "approve" },
      { label: "File permit", system: "Permit Portal", kind: "output", failed: true },
    ],
  },
  {
    id: "wf_jobcostreport_jun",
    name: "Job Cost Reporting — June",
    status: "completed",
    waiting: "—",
    decision: "approved",
    started: "Jul 01, 2026 07:30",
    updated: "Jul 01, 2026 07:35",
    flow: [
      { label: "Select period", system: "Dashboard", kind: "trigger" },
      { label: "Pull actuals + budget", system: "Procore", kind: "extract" },
      { label: "Build WIP/cost reports", system: "Reporting Engine", kind: "match" },
      { label: "Variance commentary", system: "Document AI", kind: "validate" },
      { label: "Project Executive approval", system: "Approvals", kind: "approve" },
      { label: "Publish report", system: "Reporting", kind: "output" },
    ],
  },
  {
    id: "wf_changeorder_co2231",
    name: "Change Order Copilot — CO-2231",
    status: "awaiting_approval",
    waiting: "PM approval",
    decision: null,
    started: "Jul 13, 2026 10:05",
    updated: "Jul 13, 2026 10:09",
    flow: [
      { label: "Change request submitted", system: "Procore", kind: "trigger" },
      { label: "Retrieve supporting documents", system: "Email", kind: "extract" },
      { label: "Retrieve budget + schedule", system: "Procore", kind: "match" },
      { label: "Calculate cost/schedule impact", system: "Rules Engine", kind: "validate" },
      { label: "PM approval", system: "Approvals", kind: "approve" },
      { label: "Create change order", system: "Procore", kind: "output" },
    ],
  },
  {
    id: "wf_dailysitereport_riverside",
    name: "Daily Site Report — Riverside Tower",
    status: "completed",
    waiting: "—",
    decision: "approved",
    started: "Jul 12, 2026 17:00",
    updated: "Jul 12, 2026 17:04",
    flow: [
      { label: "End of workday", system: "Scheduler", kind: "trigger" },
      { label: "Collect site emails + photos", system: "Email", kind: "extract" },
      { label: "Retrieve task + equipment status", system: "Procore", kind: "match" },
      { label: "Generate daily report", system: "Document AI", kind: "validate" },
      { label: "PM approval", system: "Approvals", kind: "approve" },
      { label: "Email daily report", system: "Email", kind: "output" },
    ],
  },
  {
    id: "wf_subinvoice_ironclad",
    name: "Subcontractor Invoice Verification — Ironclad Steel Supply",
    status: "awaiting_approval",
    waiting: "Project Accountant review",
    decision: null,
    started: "Jul 13, 2026 08:15",
    updated: "Jul 13, 2026 08:19",
    flow: [
      { label: "Invoice received", system: "Email", kind: "trigger" },
      { label: "OCR invoice", system: "Document AI", kind: "extract" },
      { label: "Retrieve purchase order + completed work", system: "Procore", kind: "match" },
      { label: "Compare invoice, flag discrepancies", system: "Rules Engine", kind: "validate" },
      { label: "Project Accountant approval", system: "Approvals", kind: "approve" },
      { label: "Approve payment", system: "Accounting", kind: "output" },
    ],
  },
  {
    id: "wf_progressreport_jul",
    name: "Project Progress Report — Riverside Tower",
    status: "completed",
    waiting: "—",
    decision: "approved",
    started: "Jul 06, 2026 07:00",
    updated: "Jul 06, 2026 07:06",
    flow: [
      { label: "Weekly schedule", system: "Scheduler", kind: "trigger" },
      { label: "Pull progress + budget", system: "Procore", kind: "extract" },
      { label: "Pull open RFIs + delays", system: "Primavera P6", kind: "match" },
      { label: "Generate executive report", system: "Document AI", kind: "validate" },
      { label: "Construction Director approval", system: "Approvals", kind: "approve" },
      { label: "Email stakeholders", system: "Email", kind: "output" },
    ],
  },
];

const STATUS_META: Record<WfStatus, { label: string; cls: string }> = {
  running: { label: "Running", cls: "bg-sky-500/10 border-sky-500/30 text-sky-500" },
  awaiting_approval: { label: "Awaiting Approval", cls: "bg-amber-500/10 border-amber-500/30 text-amber-500" },
  completed: { label: "Completed", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" },
  failed: { label: "Failed", cls: "bg-destructive/10 border-destructive/30 text-destructive" },
};

const KIND_META: Record<StepKind, { label: string; dot: string; ring: string; text: string }> = {
  trigger: { label: "Trigger", dot: "bg-amber-400", ring: "border-amber-400/50", text: "text-amber-400" },
  extract: { label: "Extract", dot: "bg-sky-400", ring: "border-sky-400/50", text: "text-sky-400" },
  match: { label: "Match", dot: "bg-cyan-400", ring: "border-cyan-400/50", text: "text-cyan-400" },
  validate: { label: "Validate", dot: "bg-violet-400", ring: "border-violet-400/50", text: "text-violet-400" },
  approve: { label: "Approve", dot: "bg-indigo-400", ring: "border-indigo-400/50", text: "text-indigo-400" },
  output: { label: "Output", dot: "bg-emerald-400", ring: "border-emerald-400/50", text: "text-emerald-400" },
};

/* ─────────────────────────  Page  ───────────────────────── */

function Workflows() {
  const [expanded, setExpanded] = useState<string | null>(ROWS[0].id);

  const running = ROWS.filter((r) => r.status === "running").length;
  const pending = ROWS.filter((r) => r.status === "awaiting_approval").length;
  const completed = ROWS.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <WorkflowIcon className="h-3.5 w-3.5 text-primary" />
          Workflows
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Running workflows
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Every durable workflow running across your organization — click one to see its flow and the
          systems it connects.
        </p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Loader2} label="Running" value={running} tone="text-sky-500" />
        <Kpi icon={ClipboardCheck} label="Awaiting Approval" value={pending} tone="text-amber-500" />
        <Kpi icon={CheckCircle2} label="Completed" value={completed} tone="text-emerald-500" />
        <Kpi icon={WorkflowIcon} label="Total" value={ROWS.length} tone="text-foreground" />
      </div>

      {/* Table with expandable flow graphs */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="w-8 px-5 py-3" />
                <th className="px-2 py-3 font-medium">Workflow</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Waiting For</th>
                <th className="px-5 py-3 font-medium">Decision</th>
                <th className="px-5 py-3 text-right font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROWS.map((r) => {
                const meta = STATUS_META[r.status];
                const open = expanded === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                      className={cn("cursor-pointer transition-colors hover:bg-surface-2/50", open && "bg-surface-2/40")}
                    >
                      <td className="px-5 py-3">
                        <ChevronRight
                          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <div className="font-medium text-foreground">{r.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{r.id}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            meta.cls,
                          )}
                        >
                          {r.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{r.waiting}</td>
                      <td className="px-5 py-3">
                        {r.decision ? (
                          <span className="capitalize">{r.decision}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">
                        {r.updated}
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-surface-2/20">
                        <td colSpan={6} className="p-0">
                          <WorkflowGraph flow={r.flow} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  Per-workflow flow graph  ───────────────────────── */

const STEP_W = 138;
const STEP_H = 48;
const SYS_W = 116;
const SYS_H = 34;
const STEP_Y = 70;
const SYS_Y = 214;
const PAD = 24;
const STEP_GAP = 168;

function WorkflowGraph({ flow }: { flow: Step[] }) {
  // Step x-centers along the top lane.
  const stepX = flow.map((_, i) => PAD + STEP_W / 2 + i * STEP_GAP);
  const canvasW = PAD * 2 + STEP_W + (flow.length - 1) * STEP_GAP;

  // Unique systems along the bottom lane.
  const systems = Array.from(new Set(flow.map((s) => s.system)));
  const sysX = (name: string) => {
    const i = systems.indexOf(name);
    if (systems.length === 1) return canvasW / 2;
    const usable = canvasW - PAD * 2 - SYS_W;
    return PAD + SYS_W / 2 + (i * usable) / (systems.length - 1);
  };

  const seqPath = (i: number) => {
    const x1 = stepX[i] + STEP_W / 2;
    const x2 = stepX[i + 1] - STEP_W / 2;
    const dx = (x2 - x1) / 2;
    return `M ${x1} ${STEP_Y} C ${x1 + dx} ${STEP_Y}, ${x2 - dx} ${STEP_Y}, ${x2} ${STEP_Y}`;
  };
  const downPath = (i: number, name: string) => {
    const x1 = stepX[i];
    const y1 = STEP_Y + STEP_H / 2;
    const x2 = sysX(name);
    const y2 = SYS_Y - SYS_H / 2;
    const dy = (y2 - y1) / 2;
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
  };

  const CANVAS_H = SYS_Y + SYS_H / 2 + 28;

  return (
    <div className="overflow-x-auto px-5 py-5">
      <div className="relative" style={{ width: canvasW, height: CANVAS_H + 24 }}>
        {/* lane labels */}
        <div className="absolute left-0 top-0 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Flow
        </div>
        <div
          className="absolute left-0 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
          style={{ top: SYS_Y - SYS_H / 2 - 42 }}
        >
          Connectors
        </div>

        {/* edges */}
        <svg className="absolute inset-0" width={canvasW} height={CANVAS_H + 24} fill="none">
          {flow.slice(0, -1).map((_, i) => (
            <path key={`seq-${i}`} d={seqPath(i)} className="stroke-amber-400/70" strokeWidth={1.75} />
          ))}
          {flow.map((s, i) => (
            <path key={`down-${i}`} d={downPath(i, s.system)} className="stroke-amber-400/25" strokeWidth={1.25} />
          ))}
        </svg>

        {/* step nodes */}
        {flow.map((s, i) => {
          const meta = KIND_META[s.kind];
          return (
            <div
              key={`step-${i}`}
              style={{ left: stepX[i] - STEP_W / 2, top: STEP_Y - STEP_H / 2, width: STEP_W, height: STEP_H }}
              className={cn(
                "absolute flex flex-col justify-center rounded-md border bg-card px-2.5 shadow-sm",
                s.failed ? "border-destructive/60" : meta.ring,
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-background", meta.dot)}>
                  {i + 1}
                </span>
                <span className="truncate text-[11px] font-semibold text-foreground">{s.label}</span>
              </div>
              <span className={cn("mt-0.5 pl-[22px] text-[9px] font-medium uppercase tracking-wide", s.failed ? "text-destructive" : meta.text)}>
                {s.failed ? "failed" : meta.label}
              </span>
            </div>
          );
        })}

        {/* system (connector) nodes */}
        {systems.map((name) => (
          <div
            key={`sys-${name}`}
            style={{ left: sysX(name) - SYS_W / 2, top: SYS_Y - SYS_H / 2, width: SYS_W, height: SYS_H }}
            className="absolute flex items-center gap-1.5 rounded-md border border-orange-400/50 bg-card px-2.5 shadow-sm"
          >
            <Plug className="h-3 w-3 shrink-0 text-orange-400" />
            <span className="truncate text-[11px] font-medium text-foreground">{name}</span>
          </div>
        ))}
      </div>

      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {(Object.keys(KIND_META) as StepKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", KIND_META[k].dot)} />
            {KIND_META[k].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          Connector
        </span>
      </div>
    </div>
  );
}

function Kpi({
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
