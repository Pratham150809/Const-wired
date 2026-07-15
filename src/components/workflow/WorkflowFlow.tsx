import { Plug } from "lucide-react";

import { cn } from "../../lib/utils";

export type StepSpec = { id: string; type: string; name: string };
export type WorkflowDefinitionSpec = {
  pack_key: string;
  workflow_key: string;
  name: string;
  trigger: string;
  connectors_required: string[];
  steps: StepSpec[];
  latest_status?: string | null;
  latest_run_id?: string | null;
};

type Meta = { label: string; dot: string; badge: string; accent: string };

// One palette per step type — the numbered badge, the type dot, and the card's left
// accent all share the hue so the graph reads at a glance.
const TYPE_META: Record<string, Meta> = {
  "connector.call": { label: "CONNECTOR", dot: "bg-amber-500", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400", accent: "border-l-amber-500" },
  "document.parse": { label: "EXTRACT", dot: "bg-sky-500", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400", accent: "border-l-sky-500" },
  "document.retrieve": { label: "RETRIEVE", dot: "bg-sky-500", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400", accent: "border-l-sky-500" },
  "ai.action": { label: "AI", dot: "bg-violet-500", badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400", accent: "border-l-violet-500" },
  approval: { label: "APPROVAL", dot: "bg-fuchsia-500", badge: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400", accent: "border-l-fuchsia-500" },
  notify: { label: "NOTIFY", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", accent: "border-l-emerald-500" },
  branch: { label: "BRANCH", dot: "bg-orange-500", badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400", accent: "border-l-orange-500" },
  transform: { label: "TRANSFORM", dot: "bg-teal-500", badge: "bg-teal-500/15 text-teal-600 dark:text-teal-400", accent: "border-l-teal-500" },
};

const meta = (t: string): Meta =>
  TYPE_META[t] ?? {
    label: t.toUpperCase(),
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    accent: "border-l-border",
  };

export function WorkflowFlow({ def }: { def: WorkflowDefinitionSpec }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Flow
      </div>

      {/* Step chain — compact nodes that WRAP (no horizontal scrollbar); hover a node
          for its full title. */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2.5">
        {def.steps.map((s, i) => {
          const m = meta(s.type);
          return (
            <div key={s.id} className="flex items-center">
              <div
                title={`${s.name} · ${m.label}`}
                className={cn(
                  "group w-[172px] shrink-0 rounded-lg border border-l-[3px] border-border bg-card px-3 py-2.5 transition hover:border-primary/50 hover:shadow-sm",
                  m.accent,
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      m.badge,
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {s.name}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 pl-7">
                  <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </span>
                </div>
              </div>
              {i < def.steps.length - 1 && (
                <div className="mx-1.5 h-px w-6 shrink-0 bg-gradient-to-r from-border via-border to-transparent" />
              )}
            </div>
          );
        })}
      </div>

      {/* Connectors used by the flow. */}
      {def.connectors_required.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Connectors
          </span>
          {def.connectors_required.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground"
            >
              <Plug className="h-3 w-3 text-muted-foreground" />
              {c.replace("nango.", "")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
