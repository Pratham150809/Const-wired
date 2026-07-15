import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteWorkflowDefinition,
  useStartWorkflow,
  useWorkflowDefinitions,
  useWorkflows,
  type WorkflowDefinitionSpec,
} from "../api";
import { EmptyState, LoadingState } from "../components/common/states";
import { WorkflowFlow } from "../components/workflow/WorkflowFlow";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/workflows/")({ component: Workflows });

/* ─────────────────────────  Status styling  ─────────────────────────
   Tolerant of unknown status strings coming from the backend — an
   unrecognized status falls back to a neutral style rather than crashing. */

const STATUS_META: Record<string, { label: string; cls: string }> = {
  running: { label: "Running", cls: "bg-sky-500/10 border-sky-500/30 text-sky-500" },
  awaiting_approval: { label: "Awaiting Approval", cls: "bg-amber-500/10 border-amber-500/30 text-amber-500" },
  completed: { label: "Completed", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" },
  failed: { label: "Failed", cls: "bg-destructive/10 border-destructive/30 text-destructive" },
};

const statusMeta = (status: string) =>
  STATUS_META[status] ?? { label: status || "Unknown", cls: "bg-muted border-border text-muted-foreground" };

/* ─────────────────────────  Page  ───────────────────────── */

function Workflows() {
  const { data: workflows = [], isLoading } = useWorkflows();
  const { data: definitions = [] } = useWorkflowDefinitions();
  const templates = definitions.filter((d) => d.pack_key === "construction");
  const myWorkflows = definitions.filter((d) => d.source === "user");

  const running = workflows.filter((w) => w.status === "running").length;
  const pending = workflows.filter((w) => w.status === "awaiting_approval").length;
  const completed = workflows.filter((w) => w.status === "completed").length;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
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
        <Link
          to="/app/workflows/builder"
          className="brand-gradient inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Create workflow
        </Link>
      </div>

      {/* My workflows (builder-authored) */}
      {myWorkflows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">My workflows</h2>
          {myWorkflows.map((d) => (
            <MyWorkflowCard key={d.workflow_key} def={d} />
          ))}
        </div>
      )}

      {/* Workflow templates */}
      {templates.length > 0 && (
        <div className="mb-6 space-y-3">
          {templates.map((d) => (
            <TemplateCard key={d.workflow_key} def={d} />
          ))}
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Loader2} label="Running" value={running} tone="text-sky-500" />
        <Kpi icon={ClipboardCheck} label="Awaiting Approval" value={pending} tone="text-amber-500" />
        <Kpi icon={CheckCircle2} label="Completed" value={completed} tone="text-emerald-500" />
        <Kpi icon={WorkflowIcon} label="Total" value={workflows.length} tone="text-foreground" />
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState label="Loading workflows…" />
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows yet"
          description="Workflows triggered from the AI Assistant or your connectors will show up here."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Workflow</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Waiting For</th>
                  <th className="px-5 py-3 font-medium">Decision</th>
                  <th className="px-5 py-3 text-right font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workflows.map((w) => {
                  const meta = statusMeta(w.status);
                  return (
                    <tr key={w.workflow_id} className="transition-colors hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{w.type}</div>
                        <div className="font-mono text-xs text-muted-foreground">{w.workflow_id}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            meta.cls,
                          )}
                        >
                          {w.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {w.summary ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {w.decision ? (
                          <span className="capitalize">{w.decision}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">
                        {new Date(w.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  My workflow card  ───────────────────────── */

function MyWorkflowCard({ def }: { def: WorkflowDefinitionSpec }) {
  const navigate = useNavigate();
  const start = useStartWorkflow();
  const remove = useDeleteWorkflowDefinition();

  const onRun = () =>
    start.mutate(
      { packKey: "custom", workflowKey: def.workflow_key, inputs: {} },
      {
        onSuccess: (res) => {
          toast.success(`Started “${def.name}”.`);
          if (res.run_id)
            navigate({ to: "/app/workflows/runs/$runId", params: { runId: res.run_id } });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start the workflow."),
      },
    );

  const onDelete = () => {
    if (!window.confirm(`Delete “${def.name}”? This can't be undone.`)) return;
    remove.mutate(def.workflow_key, {
      onSuccess: () => toast.success(`Deleted “${def.name}”.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete the workflow."),
    });
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{def.name}</h3>
        {def.latest_status && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {def.latest_status}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onRun}
            disabled={start.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20 disabled:opacity-60"
          >
            {start.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run
          </button>
          <Link
            to="/app/workflows/builder"
            search={{ key: def.workflow_key }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          <button
            onClick={onDelete}
            disabled={remove.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
          >
            {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </div>
      </div>
      <WorkflowFlow def={def} />
    </div>
  );
}

/* ─────────────────────────  Template card (construction)  ───────────────────────── */

function TemplateCard({ def }: { def: WorkflowDefinitionSpec }) {
  const navigate = useNavigate();
  const start = useStartWorkflow();

  const onRun = () =>
    start.mutate(
      { packKey: def.pack_key, workflowKey: def.workflow_key, inputs: {} },
      {
        onSuccess: (res) => {
          if (res.run_id)
            navigate({ to: "/app/workflows/runs/$runId", params: { runId: res.run_id } });
          else toast.error("The run started but returned no id.");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start the workflow."),
      },
    );

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{def.name}</h2>
        {def.latest_status && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {def.latest_status}
          </span>
        )}
        <button
          onClick={onRun}
          disabled={start.isPending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20 disabled:opacity-60"
        >
          {start.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {start.isPending ? "Starting…" : "Run"}
        </button>
      </div>
      {def.description && (
        <p className="mb-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {def.description}
        </p>
      )}
      <WorkflowFlow def={def} />
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
