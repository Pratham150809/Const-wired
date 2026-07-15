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

const TYPE_META: Record<string, { label: string; dot: string }> = {
  "connector.call": { label: "CONNECTOR", dot: "bg-amber-500" },
  "document.parse": { label: "EXTRACT", dot: "bg-sky-500" },
  "document.retrieve": { label: "RETRIEVE", dot: "bg-sky-500" },
  "ai.action": { label: "AI", dot: "bg-violet-500" },
  approval: { label: "APPROVE", dot: "bg-fuchsia-500" },
  notify: { label: "NOTIFY", dot: "bg-emerald-500" },
  branch: { label: "BRANCH", dot: "bg-orange-500" },
};
const meta = (t: string) => TYPE_META[t] ?? { label: t.toUpperCase(), dot: "bg-muted-foreground" };

export function WorkflowFlow({ def }: { def: WorkflowDefinitionSpec }) {
  const types = Array.from(new Set(def.steps.map((s) => s.type)));
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Flow
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {def.steps.map((s, i) => {
          const m = meta(s.type);
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className="min-w-[150px] rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </span>
                </div>
              </div>
              {i < def.steps.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          );
        })}
      </div>
      {def.connectors_required.length > 0 && (
        <>
          <div className="mb-1 mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Connectors
          </div>
          <div className="flex flex-wrap gap-2">
            {def.connectors_required.map((c) => (
              <span
                key={c}
                className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground"
              >
                {c.replace("nango.", "")}
              </span>
            ))}
          </div>
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-2">
        {types.map((t) => {
          const m = meta(t);
          return (
            <span
              key={t}
              className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
