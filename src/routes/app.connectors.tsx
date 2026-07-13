import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Layers, Plug, Plus, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { IntegrationLogo } from "../components/common/IntegrationLogo";
import { CATEGORIES, INTEGRATIONS } from "../lib/catalog";
import type { Integration, IntegrationCategory } from "../lib/catalog";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/connectors")({ component: Connectors });

function Connectors() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<IntegrationCategory | "all">("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATIONS.filter((i) => {
      const matchesCat = active === "all" || i.category === active;
      const matchesQuery =
        !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, active]);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Connector Hub
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Connected systems
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {INTEGRATIONS.length} integrations
            </span>{" "}
            across {CATEGORIES.length} categories. Authenticate once, then let your copilots read and
            act across them.
          </p>
        </div>
        <button className="brand-gradient inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90">
          <Plug className="h-3.5 w-3.5" />
          Request a connector
        </button>
      </div>

      {/* Non-replacement callout — mirrors the Build Flow "works with your stack" panel */}
      <section className="flex items-start gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">
            Your copilots work <span className="text-primary">with</span> your existing systems.
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Connect through each system's native API. Your ERP stays the system of record — copilots
            read the data they need and write approved entries back, without asking anyone to change
            how they already work.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            {["No rip-and-replace", "Native read/write connections", "Your system stays the source of truth"].map(
              (t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" /> {t}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Search + category filter */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search integrations…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Chip label="All" active={active === "all"} onClick={() => setActive("all")} />
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} active={active === c} onClick={() => setActive(c)} />
            ))}
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {results.length} of {INTEGRATIONS.length} shown
          </span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No integrations match “{query}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((i) => (
            <IntegrationCard key={i.slug} integration={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  // No live connection state from the backend yet — every card is an
  // available (not-yet-connected) integration the user can request.
  const [requested, setRequested] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/50 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IntegrationLogo
            name={integration.name}
            domain={integration.domain}
            logo={integration.logo}
            className="h-11 w-11 shrink-0"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{integration.name}</div>
            <div className="text-xs text-muted-foreground">{integration.category}</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {integration.auth ? "Auth" : "Action"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          {requested ? "Requested" : "Available"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setRequested((r) => !r)}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
            requested
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-foreground hover:border-primary hover:text-primary",
          )}
        >
          {requested ? (
            <>
              <Check className="h-3.5 w-3.5" /> Requested
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Connect
            </>
          )}
        </button>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Hide details" : "Show details"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
        </button>
      </div>

      {expanded && (
        <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-[11px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium text-foreground">{integration.category}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Connection</dt>
            <dd className="font-medium text-foreground">
              {integration.auth ? "OAuth / credentials" : "Action API"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Provider</dt>
            <dd className="truncate font-mono font-medium text-foreground">{integration.domain}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
