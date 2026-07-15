// Right-hand configuration panel, bound to the selected canvas node. Each step type
// exposes fields matching the engine config contract exactly (see serialize.ts).
import { Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";

import type { ConnectorItem } from "../../../api";
import { cn } from "../../../lib/utils";
import type { BuilderNodeData } from "./serialize";
import { stepMeta } from "./nodes";

type FlowNode = Node<BuilderNodeData>;

const s = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

/** Returns an error message if the non-empty text is not a JSON object, else null. */
function jsonError(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const parsed = JSON.parse(t);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "Must be a JSON object.";
    }
    return null;
  } catch {
    return "Invalid JSON.";
  }
}

export function ConfigPanel({
  node,
  connectors,
  onChangeLabel,
  onChangeConfig,
  onDelete,
}: {
  node: FlowNode | null;
  connectors: ConnectorItem[];
  onChangeLabel: (label: string) => void;
  onChangeConfig: (config: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Select a node to configure it, or drag a block from the palette onto the canvas.
      </div>
    );
  }

  const data = node.data;
  const cfg = data.config ?? {};
  const stepType = data.stepType;
  const m = stepMeta(stepType);
  const set = (key: string, value: unknown) => onChangeConfig({ ...cfg, [key]: value });

  if (stepType === "manual") {
    return (
      <div className="p-4">
        <PanelHeader label={m.label} dot={m.dot} />
        <p className="mt-3 text-sm text-muted-foreground">
          This is the start of your flow. It runs manually (or when the assistant starts it by
          name). It has no configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <PanelHeader label={m.label} dot={m.dot} />
        <Field label="Step name">
          <input
            value={s(data.label)}
            onChange={(e) => onChangeLabel(e.target.value)}
            placeholder="Name this step"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {stepType === "connector.call" && (
          <>
            <ConnectorSelect
              value={s(cfg.connector)}
              connectors={connectors}
              onChange={(v) => set("connector", v)}
            />
            <Field label="Tool / HTTP method" hint="e.g. GET, POST, or a named tool">
              <input
                value={s(cfg.tool) || ""}
                onChange={(e) => set("tool", e.target.value)}
                placeholder="GET"
                className={inputCls}
              />
            </Field>
            <Field label="Endpoint">
              <input
                value={s(cfg.endpoint)}
                onChange={(e) => set("endpoint", e.target.value)}
                placeholder="/messages"
                className={inputCls}
              />
            </Field>
            <JsonField label="Query (optional)" value={s(cfg.query)} onChange={(v) => set("query", v)} />
            <JsonField label="Body (optional)" value={s(cfg.body)} onChange={(v) => set("body", v)} />
          </>
        )}

        {stepType === "notify" && (
          <>
            <ConnectorSelect
              value={s(cfg.connector)}
              connectors={connectors}
              onChange={(v) => set("connector", v)}
            />
            <Field label="Endpoint">
              <input
                value={s(cfg.endpoint)}
                onChange={(e) => set("endpoint", e.target.value)}
                placeholder="/send"
                className={inputCls}
              />
            </Field>
            <JsonField label="Body (optional)" value={s(cfg.body)} onChange={(v) => set("body", v)} />
            <p className="text-[11px] text-muted-foreground">Tool is fixed to “send”.</p>
          </>
        )}

        {stepType === "ai.action" && (
          <>
            <Field label="Prompt" hint="Written inline — supports {{ }} references to prior steps">
              <textarea
                value={s(cfg.prompt_text)}
                onChange={(e) => set("prompt_text", e.target.value)}
                rows={6}
                placeholder="Summarize the invoice and extract the total…"
                className={cn(inputCls, "resize-y font-normal")}
              />
            </Field>
            <Field label="Output">
              <select
                value={s(cfg.output) || "text"}
                onChange={(e) => set("output", e.target.value)}
                className={inputCls}
              >
                <option value="text">text</option>
                <option value="json">json</option>
              </select>
            </Field>
            <Field label="Model (optional)">
              <input
                value={s(cfg.model)}
                onChange={(e) => set("model", e.target.value)}
                placeholder="Leave blank for the default"
                className={inputCls}
              />
            </Field>
          </>
        )}

        {stepType === "approval" && (
          <Field label="Approver persona" hint="Who must approve before the flow continues">
            <input
              value={s(cfg.approver_persona) || "owner"}
              onChange={(e) => set("approver_persona", e.target.value)}
              placeholder="owner"
              className={inputCls}
            />
          </Field>
        )}

        {stepType === "branch" && (
          <Field label="Condition" hint="A {{ }} expression — true takes the green path, false the red">
            <input
              value={s(cfg.condition)}
              onChange={(e) => set("condition", e.target.value)}
              placeholder="{{ steps.classify.out.amount > 1000 }}"
              className={cn(inputCls, "font-mono text-xs")}
            />
          </Field>
        )}

        {stepType === "transform" && (
          <JsonField
            label="Config (JSON object)"
            value={s(cfg.json)}
            onChange={(v) => set("json", v)}
            rows={8}
          />
        )}
      </div>

      <div className="border-t border-border p-4">
        <button
          onClick={onDelete}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete step
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  Small building blocks  ───────────────────────── */

const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function PanelHeader({ label, dot }: { label: string; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-3 block first:mt-0">
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function ConnectorSelect({
  value,
  connectors,
  onChange,
}: {
  value: string;
  connectors: ConnectorItem[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Connector">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">Select a connector…</option>
        {connectors.map((c) => (
          <option key={c.key} value={c.key}>
            {c.name} ({c.key})
          </option>
        ))}
      </select>
    </Field>
  );
}

function JsonField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const err = jsonError(value);
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder="{ }"
        className={cn(
          inputCls,
          "resize-y font-mono text-xs",
          err && "border-destructive focus:border-destructive focus:ring-destructive/20",
        )}
      />
      {err && <span className="mt-1 block text-[11px] text-destructive">{err}</span>}
    </Field>
  );
}
