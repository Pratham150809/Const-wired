import { useQuery } from "@tanstack/react-query";
import { Plug } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { api, type WorkflowDefinitionSpec } from "../../api";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

/* ─────────────────────────  Type palette  ─────────────────────────
   Mirrors WorkflowFlow's per-type hues, plus a matching SVG `stroke-*` for the
   connector curves and `text` for the type label. */

type TypeMeta = { label: string; dot: string; badge: string; accent: string; stroke: string };

const TYPE_META: Record<string, TypeMeta> = {
  "connector.call": { label: "CONNECTOR", dot: "bg-amber-500", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400", accent: "border-t-amber-500", stroke: "stroke-amber-500" },
  "document.parse": { label: "EXTRACT", dot: "bg-sky-500", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400", accent: "border-t-sky-500", stroke: "stroke-sky-500" },
  "document.retrieve": { label: "RETRIEVE", dot: "bg-sky-500", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400", accent: "border-t-sky-500", stroke: "stroke-sky-500" },
  "ai.action": { label: "AI", dot: "bg-violet-500", badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400", accent: "border-t-violet-500", stroke: "stroke-violet-500" },
  approval: { label: "APPROVAL", dot: "bg-fuchsia-500", badge: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400", accent: "border-t-fuchsia-500", stroke: "stroke-fuchsia-500" },
  notify: { label: "NOTIFY", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", accent: "border-t-emerald-500", stroke: "stroke-emerald-500" },
  branch: { label: "BRANCH", dot: "bg-orange-500", badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400", accent: "border-t-orange-500", stroke: "stroke-orange-500" },
  transform: { label: "TRANSFORM", dot: "bg-teal-500", badge: "bg-teal-500/15 text-teal-600 dark:text-teal-400", accent: "border-t-teal-500", stroke: "stroke-teal-500" },
};

const meta = (t: string): TypeMeta =>
  TYPE_META[t] ?? {
    label: t.toUpperCase(),
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground",
    accent: "border-t-border",
    stroke: "stroke-border",
  };

/** A connector name with the `nango.` provider prefix stripped for display + matching. */
const clean = (c: string): string => c.replace(/^nango\./, "");

/* ─────────────────────────  Full-definition shapes  ─────────────────────────
   `getWorkflowDefinition` returns the raw stored JSON; read it defensively. */

type FullStep = {
  id: string;
  type: string;
  name: string;
  config?: Record<string, unknown>;
};

const str = (v: unknown): string => (v == null ? "" : String(v));

function stepConnector(s: FullStep): string {
  if (s.type !== "connector.call" && s.type !== "notify") return "";
  return clean(str(s.config?.connector));
}

/** Tooltip detail line(s) for a step, per its type. */
function stepDetail(s: FullStep): string | null {
  const cfg = s.config ?? {};
  if (s.type === "connector.call" || s.type === "notify") {
    const tool = str(cfg.tool);
    const args = (cfg.arguments ?? {}) as Record<string, unknown>;
    const endpoint = str(args.endpoint);
    const parts = [tool && `${tool}`, endpoint && `${endpoint}`].filter(Boolean);
    return parts.length ? parts.join("  ·  ") : null;
  }
  if (s.type === "ai.action") {
    const prompt = str(cfg.prompt_text).trim();
    if (!prompt) return null;
    return prompt.length > 160 ? `${prompt.slice(0, 160)}…` : prompt;
  }
  return null;
}

/* ─────────────────────────  Dialog wrapper  ───────────────────────── */

export function WorkflowFlowDialog({
  def,
  children,
}: {
  def: WorkflowDefinitionSpec;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl overflow-hidden lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{def.name}</DialogTitle>
          {def.description && <DialogDescription>{def.description}</DialogDescription>}
        </DialogHeader>
        <WorkflowGraph def={def} open={open} />
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────  n8n-style graph  ───────────────────────── */

function WorkflowGraph({ def, open }: { def: WorkflowDefinitionSpec; open: boolean }) {
  // Full def carries per-step config (connector/tool/endpoint/prompt) needed for the
  // curves + tooltips. Until it loads we render the list spec so the graph shows instantly.
  const { data: full } = useQuery({
    queryKey: ["workflow-definition", def.pack_key, def.workflow_key],
    queryFn: () => api.getWorkflowDefinition(def.workflow_key, def.pack_key),
    enabled: open,
  });

  const steps: FullStep[] =
    (full?.steps as FullStep[] | undefined) ??
    def.steps.map((s) => ({ id: s.id, type: s.type, name: s.name }));
  const connectors: string[] = (
    (full?.connectors_required as string[] | undefined) ?? def.connectors_required
  ).map(clean);

  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Record<string, HTMLElement | null>>({});
  const connRefs = useRef<Record<string, HTMLElement | null>>({});
  const [paths, setPaths] = useState<{ key: string; d: string; stroke: string }[]>([]);

  // Keep the latest steps in a ref so `measure` stays referentially stable — otherwise
  // it (and the effect that installs the ResizeObserver) would re-create every render.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  // Measure node positions relative to the container and derive a quadratic-bezier S
  // curve from each connector step down to the connector chip it calls.
  const measure = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const cr = cont.getBoundingClientRect();
    if (cr.width === 0) return;
    const next: { key: string; d: string; stroke: string }[] = [];
    for (const s of stepsRef.current) {
      const conn = stepConnector(s);
      if (!conn) continue;
      const sEl = stepRefs.current[s.id];
      const cEl = connRefs.current[conn];
      if (!sEl || !cEl) continue;
      const sr = sEl.getBoundingClientRect();
      const dr = cEl.getBoundingClientRect();
      const x1 = sr.left - cr.left + sr.width / 2;
      const y1 = sr.bottom - cr.top;
      const x2 = dr.left - cr.left + dr.width / 2;
      const y2 = dr.top - cr.top;
      const midY = y1 + (y2 - y1) / 2;
      // Two quadratic segments → a smooth vertical S with exact endpoints.
      const d = `M ${x1} ${y1} Q ${x1} ${midY} ${(x1 + x2) / 2} ${midY} Q ${x2} ${midY} ${x2} ${y2}`;
      next.push({ key: s.id, d, stroke: meta(s.type).stroke });
    }
    // Bail out when nothing changed so the ResizeObserver can't drive a render loop.
    setPaths((prev) =>
      prev.length === next.length &&
      prev.every((p, i) => p.key === next[i].key && p.d === next[i].d)
        ? prev
        : next,
    );
  }, []);

  // Re-measure once the dialog's open animation settles, on any container resize, and
  // whenever the full def arrives (so curves attach to the right connectors).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(measure, 250); // after the zoom-in transition
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, measure, full]);

  const typesPresent = Array.from(new Set(steps.map((s) => s.type)));

  return (
    <TooltipProvider delayDuration={120}>
      <div className="rounded-xl border border-border bg-surface p-4">
        {/* Graph: step row on top, connector row below, curves linking them. */}
        <div ref={containerRef} className="relative">
          {/* Curve overlay — behind the nodes, non-interactive. */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {paths.map((p) => (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                strokeWidth={1.5}
                className={cn("opacity-70", p.stroke)}
              />
            ))}
          </svg>

          {/* Step nodes — flex row that SHRINKS to fit the dialog (no horizontal scroll). */}
          <div className="relative z-10 flex items-stretch gap-2">
            {steps.map((s, i) => {
              const m = meta(s.type);
              const detail = stepDetail(s);
              return (
                <Tooltip key={s.id}>
                  <TooltipTrigger asChild>
                    <div
                      ref={(el) => {
                        stepRefs.current[s.id] = el;
                      }}
                      className={cn(
                        "min-w-0 flex-1 cursor-default rounded-lg border border-t-[3px] border-border bg-card px-2.5 py-2 transition hover:border-primary/50 hover:shadow-sm",
                        m.accent,
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                            m.badge,
                          )}
                        >
                          {i + 1}
                        </span>
                        <span className="truncate text-[12px] font-medium text-foreground">
                          {s.name}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 pl-[1.625rem]">
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", m.dot)} />
                        <span className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {m.label}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="font-semibold">{s.name}</div>
                    <div className="mt-0.5 opacity-80">{m.label}</div>
                    {detail && (
                      <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] opacity-90">
                        {detail}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Gap for the curves to travel through. */}
          <div className="h-16" />

          {/* Connectors required by the flow. */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2">
            {connectors.length === 0 ? (
              <span className="text-xs text-muted-foreground">No connectors required</span>
            ) : (
              connectors.map((c) => (
                <span
                  key={c}
                  ref={(el) => {
                    connRefs.current[c] = el;
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground"
                >
                  <Plug className="h-3 w-3 text-muted-foreground" />
                  {c}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Type legend — only the types this flow actually uses. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3">
          {typesPresent.map((t) => {
            const m = meta(t);
            return (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
