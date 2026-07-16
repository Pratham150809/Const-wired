import { useQuery } from "@tanstack/react-query";
import {
  Circle,
  GitBranch,
  Play,
  Plug,
  ScanLine,
  Search,
  Send,
  Shuffle,
  Sparkles,
  UserCheck,
  Workflow as WorkflowIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { api, type WorkflowDefinitionSpec } from "../../api";
import { IntegrationLogo } from "../common/IntegrationLogo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "../../lib/utils";

/* ─────────────────────────  Type palette  ─────────────────────────
   Mirrors WorkflowFlow's per-type hues (numbered badge, type dot, icon tile) so the
   vertical flow reads at a glance. */

type TypeMeta = { label: string; dot: string; badge: string };

const TYPE_META: Record<string, TypeMeta> = {
  "connector.call": { label: "CONNECTOR", dot: "bg-amber-500", badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  "document.parse": { label: "EXTRACT", dot: "bg-sky-500", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  "document.retrieve": { label: "RETRIEVE", dot: "bg-sky-500", badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  "ai.action": { label: "AI", dot: "bg-violet-500", badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  approval: { label: "APPROVAL", dot: "bg-fuchsia-500", badge: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400" },
  notify: { label: "NOTIFY", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  branch: { label: "BRANCH", dot: "bg-orange-500", badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  transform: { label: "TRANSFORM", dot: "bg-teal-500", badge: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
};

const meta = (t: string): TypeMeta =>
  TYPE_META[t] ?? {
    label: t.toUpperCase(),
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  };

// Per-type lucide glyph shown in the rounded tile beside each step.
const TYPE_ICON: Record<string, LucideIcon> = {
  "connector.call": Plug,
  "document.parse": ScanLine,
  "document.retrieve": Search,
  "ai.action": Sparkles,
  approval: UserCheck,
  branch: GitBranch,
  notify: Send,
  transform: Shuffle,
  trigger: Play,
  manual: Play,
};

const iconFor = (t: string): LucideIcon => TYPE_ICON[t] ?? Circle;

/* ─────────────────────────  Connector → brand  ─────────────────────────
   Maps the required `nango.*` connector keys to a display name (and, where a shared
   Google favicon would be ambiguous, an explicit product logo — same approach as the
   integrations catalog). Unknown keys fall back to the stripped key + monogram tile. */

type Brand = { name: string; domain?: string; logo?: string };

const CONNECTOR_BRANDS: Record<string, Brand> = {
  "nango.google-mail": {
    name: "Gmail",
    domain: "mail.google.com",
    logo: "https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png",
  },
  "nango.google-sheet": {
    name: "Google Sheets",
    domain: "sheets.google.com",
    logo: "https://ssl.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png",
  },
  "nango.google-drive": {
    name: "Google Drive",
    domain: "drive.google.com",
    logo: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png",
  },
  "nango.quickbooks": { name: "QuickBooks", domain: "quickbooks.intuit.com" },
};

const brandFor = (key: string): Brand =>
  CONNECTOR_BRANDS[key] ?? { name: key.replace(/^nango\./, "") };

/* ─────────────────────────  Full-definition shapes  ─────────────────────────
   `getWorkflowDefinition` returns the raw stored JSON; read it defensively. */

type FullStep = {
  id: string;
  type: string;
  name: string;
  config?: Record<string, unknown>;
};

type Approval = { step: string; approver_persona: string };

const str = (v: unknown): string => (v == null ? "" : String(v));

/** One or more `{ label, value }` detail rows for a step, keyed off its type. Pulls
 *  the approver from the top-level `approvals[]` gate (approval step config is empty). */
function stepDetails(s: FullStep, approvals: Approval[]): { label: string; value: string }[] {
  const cfg = s.config ?? {};
  const out: { label: string; value: string }[] = [];

  if (s.type === "connector.call" || s.type === "notify") {
    const tool = str(cfg.tool);
    const args = (cfg.arguments ?? {}) as Record<string, unknown>;
    const endpoint = str(args.endpoint);
    if (tool) out.push({ label: "Tool", value: tool });
    if (endpoint) out.push({ label: "Endpoint", value: endpoint });
  } else if (s.type === "ai.action") {
    const prompt = str(cfg.prompt_text).trim();
    if (prompt) out.push({ label: "Prompt", value: prompt.length > 200 ? `${prompt.slice(0, 200)}…` : prompt });
  } else if (s.type === "approval") {
    const gate = approvals.find((a) => a.step === s.id);
    const approver = gate?.approver_persona || str(cfg.approver_persona);
    if (approver) out.push({ label: "Approver", value: approver });
  } else if (s.type === "branch") {
    const condition = str(cfg.condition);
    if (condition) out.push({ label: "Condition", value: condition });
  }

  return out;
}

/* ─────────────────────────  Preview sheet  ─────────────────────────
   A right-side Sheet (shadcn) that slides in with a clean VERTICAL step list.
   `spec` is kept while the sheet animates closed, so pass the last active template. */

export function WorkflowPreview({
  open,
  onOpenChange,
  spec,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spec: WorkflowDefinitionSpec | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        {spec && <PreviewBody spec={spec} open={open} />}
      </SheetContent>
    </Sheet>
  );
}

function PreviewBody({ spec, open }: { spec: WorkflowDefinitionSpec; open: boolean }) {
  // Full def carries per-step config (tool/endpoint/prompt/approver/condition) +
  // approvals. Until it loads we fall back to the list spec (id/type/name only) so the
  // flow renders instantly.
  const { data: full } = useQuery({
    queryKey: ["workflow-definition", spec.pack_key, spec.workflow_key],
    queryFn: () => api.getWorkflowDefinition(spec.workflow_key, spec.pack_key),
    enabled: open,
  });

  const steps: FullStep[] =
    (full?.steps as FullStep[] | undefined) ??
    spec.steps.map((s) => ({ id: s.id, type: s.type, name: s.name }));
  const approvals: Approval[] = (full?.approvals as Approval[] | undefined) ?? [];
  const connectors: string[] =
    (full?.connectors_required as string[] | undefined) ?? spec.connectors_required;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <SheetHeader className="space-y-0 border-b border-border p-5 pr-10 text-left">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <WorkflowIcon className="h-3.5 w-3.5 text-primary" />
          Workflow preview
        </div>
        <SheetTitle className="mt-2 text-lg font-semibold tracking-tight">{spec.name}</SheetTitle>
        {spec.description && (
          <SheetDescription className="mt-1 leading-relaxed">{spec.description}</SheetDescription>
        )}
      </SheetHeader>

      {/* Tabs */}
      <Tabs defaultValue="flow" className="flex min-h-0 flex-1 flex-col">
        <div className="px-5 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="flow" className="flex-1">
              Flow
            </TabsTrigger>
            <TabsTrigger value="details" className="flex-1">
              Details
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Flow — clean vertical step list. */}
        <TabsContent value="flow" className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ol className="relative">
            {steps.map((s, i) => {
              const m = meta(s.type);
              const Icon = iconFor(s.type);
              const isLast = i === steps.length - 1;
              return (
                <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {/* Vertical connector line down to the next step. */}
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
                    />
                  )}
                  {/* Numbered, type-colored badge. */}
                  <span
                    className={cn(
                      "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                      m.badge,
                    )}
                  >
                    {i + 1}
                  </span>
                  {/* Step card. */}
                  <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
                          m.badge,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug text-foreground">
                          {s.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {m.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </TabsContent>

        {/* Details — description + per-step config. */}
        <TabsContent value="details" className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {spec.description && (
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{spec.description}</p>
          )}
          <div className="space-y-2.5">
            {steps.map((s, i) => {
              const m = meta(s.type);
              const details = stepDetails(s, approvals);
              return (
                <div key={s.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                        m.badge,
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {s.name}
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {m.label}
                    </span>
                  </div>
                  {details.length > 0 && (
                    <dl className="mt-2 space-y-1 border-t border-border pt-2">
                      {details.map((d) => (
                        <div key={d.label} className="flex gap-2 text-xs">
                          <dt className="shrink-0 font-medium text-muted-foreground">{d.label}</dt>
                          <dd className="min-w-0 break-words font-mono text-[11px] text-foreground">
                            {d.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer — connections used, as compact brand-logo chips. */}
      <div className="border-t border-border p-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Connections used
        </div>
        {connectors.length === 0 ? (
          <span className="text-xs text-muted-foreground">No connections required</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {connectors.map((key) => {
              const b = brandFor(key);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 text-xs text-foreground"
                >
                  <IntegrationLogo
                    name={b.name}
                    domain={b.domain}
                    logo={b.logo}
                    className="h-5 w-5 text-[9px]"
                  />
                  {b.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
