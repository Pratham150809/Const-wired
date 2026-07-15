// Custom @xyflow node renderers for the builder canvas. Colors mirror the
// TYPE_META scheme in WorkflowFlow.tsx so previews and the editor read the same.
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";

import { cn } from "../../../lib/utils";
import type { BuilderNodeData } from "./serialize";

export const TYPE_META: Record<string, { label: string; dot: string }> = {
  "connector.call": { label: "CONNECTOR", dot: "bg-amber-500" },
  "document.parse": { label: "EXTRACT", dot: "bg-sky-500" },
  "document.retrieve": { label: "RETRIEVE", dot: "bg-sky-500" },
  "ai.action": { label: "AI", dot: "bg-violet-500" },
  approval: { label: "APPROVE", dot: "bg-fuchsia-500" },
  notify: { label: "NOTIFY", dot: "bg-emerald-500" },
  branch: { label: "BRANCH", dot: "bg-orange-500" },
  transform: { label: "TRANSFORM", dot: "bg-cyan-500" },
  manual: { label: "TRIGGER", dot: "bg-primary" },
};

export const stepMeta = (t: string) =>
  TYPE_META[t] ?? { label: t.toUpperCase(), dot: "bg-muted-foreground" };

// @xyflow passes data typed as Record<string, unknown>; narrow it here.
const asData = (data: unknown): BuilderNodeData => data as BuilderNodeData;

const handleClass =
  "!h-2.5 !w-2.5 !rounded-full !border-2 !border-background !bg-muted-foreground";

export function TriggerNode({ selected }: NodeProps) {
  return (
    <div
      className={cn(
        "min-w-[170px] rounded-lg border bg-card px-3 py-2.5 shadow-sm transition",
        selected ? "border-primary ring-2 ring-primary/25" : "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-primary">
          <Play className="h-3 w-3" />
        </span>
        <div>
          <div className="text-sm font-medium text-foreground">Trigger</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Manual start
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export function StepNode({ data, selected }: NodeProps) {
  const d = asData(data);
  const m = stepMeta(d.stepType);
  return (
    <div
      className={cn(
        "min-w-[180px] rounded-lg border bg-card px-3 py-2.5 shadow-sm transition",
        selected ? "border-primary ring-2 ring-primary/25" : "border-border",
      )}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", m.dot)} />
        <span className="truncate text-sm font-medium text-foreground">
          {d.label || "Untitled step"}
        </span>
      </div>
      <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {m.label}
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export function BranchNode({ data, selected }: NodeProps) {
  const d = asData(data);
  const m = stepMeta("branch");
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border bg-card px-3 py-2.5 shadow-sm transition",
        selected ? "border-primary ring-2 ring-primary/25" : "border-border",
      )}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", m.dot)} />
        <span className="truncate text-sm font-medium text-foreground">
          {d.label || "Branch"}
        </span>
      </div>
      <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {m.label}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
        <span className="text-emerald-500">True</span>
        <span className="text-destructive">False</span>
      </div>
      {/* Two labeled source handles: true (left) / false (right). */}
      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        style={{ left: "25%" }}
        className={cn(handleClass, "!bg-emerald-500")}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{ left: "75%" }}
        className={cn(handleClass, "!bg-destructive")}
      />
    </div>
  );
}

export const nodeTypes = {
  trigger: TriggerNode,
  step: StepNode,
  branch: BranchNode,
};
