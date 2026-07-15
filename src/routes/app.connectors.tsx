import { createFileRoute } from "@tanstack/react-router";
import Nango from "@nangohq/frontend";
import { Check, ChevronRight, Layers, Plug, Plus, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useQueryClient } from "@tanstack/react-query";

import { api, useConnectors, type ConnectorItem } from "../api";
import { EmptyState, LoadingState } from "../components/common/states";
import { IntegrationLogo } from "../components/common/IntegrationLogo";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/connectors")({ component: Connectors });

function Connectors() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState("");

  const { data: connectors = [], isLoading } = useConnectors();

  const categories = useMemo(
    () => Array.from(new Set(connectors.map((c) => c.kind))),
    [connectors],
  );

  const submitRequest = () => {
    const name = requestName.trim();
    if (!name) return;
    toast.success(`Request submitted for "${name}"`, {
      description: "Our integrations team will follow up on availability.",
    });
    setRequestName("");
    setRequestOpen(false);
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connectors.filter((c) => {
      const matchesCat = active === "all" || c.kind === active;
      const matchesQuery =
        !q || c.name.toLowerCase().includes(q) || c.kind.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [connectors, query, active]);

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
              {connectors.length} integrations
            </span>{" "}
            across {categories.length} categories. Authenticate once, then let your copilots read and
            act across them.
          </p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="brand-gradient inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90"
        >
          <Plug className="h-3.5 w-3.5" />
          Request a connector
        </button>
      </div>

      {requestOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setRequestOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-foreground">Request a connector</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tell us which system you'd like your copilots to work with.
            </p>
            <input
              autoFocus
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRequest()}
              placeholder="e.g. Trimble, Viewpoint Vista…"
              className="mt-3 h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRequestOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submitRequest}
                disabled={!requestName.trim()}
                className="brand-gradient rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

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
            {categories.map((c) => (
              <Chip key={c} label={c} active={active === c} onClick={() => setActive(c)} />
            ))}
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {results.length} of {connectors.length} shown
          </span>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading connectors…" />
      ) : connectors.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No connectors yet"
          description="Once a system is connected it will appear here for your copilots to use."
        />
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No integrations match “{query}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((c) => (
            <IntegrationCard key={c.key} connector={c} />
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

async function handleConnect(key: string, queryClient: ReturnType<typeof useQueryClient>) {
  const session = await api.getConnectSession(key);
  if (session.status === "sandbox" || !session.session_token) {
    await api.configureConnector(key, { enabled: true });
    queryClient.invalidateQueries({ queryKey: ["connectors"] });
    return;
  }
  const nango = new Nango();
  // NOTE: confirm this call/return against your installed @nangohq/frontend version.
  const result: any = await nango.openConnectUI({ sessionToken: session.session_token });
  const connectionId =
    result?.connectionId ?? result?.payload?.connectionId ?? result?.connection?.connectionId;
  await api.configureConnector(key, {
    enabled: true,
    config: connectionId ? { connection_id: connectionId } : {},
  });
  queryClient.invalidateQueries({ queryKey: ["connectors"] });
}

function IntegrationCard({ connector }: { connector: ConnectorItem }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    setPending(true);
    try {
      if (connector.enabled) {
        await api.configureConnector(connector.key, { enabled: false });
        await queryClient.invalidateQueries({ queryKey: ["connectors"] });
      } else {
        await handleConnect(connector.key, queryClient);
      }
    } catch (err) {
      toast.error("Couldn't update connector", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/50 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IntegrationLogo name={connector.name} className="h-11 w-11 shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{connector.name}</div>
            <div className="text-xs text-muted-foreground">{connector.kind}</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {connector.tool_count} tools
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          {connector.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={toggle}
          disabled={pending}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
            connector.enabled
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-foreground hover:border-primary hover:text-primary",
          )}
        >
          {connector.enabled ? (
            <>
              <Check className="h-3.5 w-3.5" /> Enabled
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
            <dd className="font-medium text-foreground">{connector.kind}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Tools</dt>
            <dd className="font-medium text-foreground">{connector.tool_count}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="truncate font-mono font-medium text-foreground">
              {connector.enabled ? "Enabled" : "Disabled"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
