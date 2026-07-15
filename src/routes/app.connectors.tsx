import { createFileRoute } from "@tanstack/react-router";
import Nango from "@nangohq/frontend";
import { Check, Clock, Link2, Plug, Plus, ShieldCheck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useQueryClient } from "@tanstack/react-query";

import {
  api,
  useAccessRequests,
  useConnectorCatalog,
  useDecideAccessRequest,
  useRequestAccess,
  useSetEntitlement,
  type AccessRequest,
  type ConnectorItem,
} from "../api";
import { EmptyState, LoadingState } from "../components/common/states";
import { IntegrationLogo } from "../components/common/IntegrationLogo";
import { useSession } from "../lib/session";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/connectors")({ component: Connectors });

function Connectors() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState("");

  const { isManager: isAdmin } = useSession();
  const { data: catalog = [], isLoading } = useConnectorCatalog();
  const { data: requests = [] } = useAccessRequests();

  const categories = useMemo(
    () => Array.from(new Set(catalog.map((c) => c.kind))),
    [catalog],
  );

  // Three enterprise buckets derived from the full catalogue's `entitled`/`enabled` flags.
  const connected = catalog.filter((c) => c.entitled && c.enabled);
  const available = catalog.filter((c) => c.entitled && !c.enabled);
  const pending = catalog.filter((c) => !c.entitled);

  const submitRequest = () => {
    const name = requestName.trim();
    if (!name) return;
    toast.success(`Request submitted for "${name}"`, {
      description: "Our integrations team will follow up on availability.",
    });
    setRequestName("");
    setRequestOpen(false);
  };

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
              {catalog.length} integrations
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

      {isLoading ? (
        <LoadingState label="Loading connectors…" />
      ) : catalog.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No connectors yet"
          description="Once a system is connected it will appear here for your copilots to use."
        />
      ) : (
        <div className="space-y-8">
          {/* 1 — Connected Systems */}
          {connected.length > 0 && (
            <Section title="Connected systems" count={connected.length}>
              {connected.map((c) => (
                <ConnectedCard key={c.key} connector={c} />
              ))}
            </Section>
          )}

          {/* 2 — Available Connectors */}
          {available.length > 0 && (
            <Section title="Available connectors" count={available.length}>
              {available.map((c) => (
                <AvailableCard key={c.key} connector={c} />
              ))}
            </Section>
          )}

          {/* 3 — Pending Permissions */}
          <Section title="Pending permissions" count={pending.length || undefined}>
            {pending.length > 0 ? (
              pending.map((c) => (
                <PendingCard
                  key={c.key}
                  connector={c}
                  request={requests.find(
                    (r) => r.connector_key === c.key && r.status === "pending",
                  )}
                  isAdmin={isAdmin}
                />
              ))
            ) : (
              <p className="col-span-full text-xs text-muted-foreground">
                No connectors are pending — your workspace has access to the full catalog.
              </p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────  Layout  ─────────────────────────── */

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

/** Shared connector card visual. Each section swaps the badge + action area. */
function ConnectorShell({
  connector,
  badge,
  children,
}: {
  connector: ConnectorItem;
  badge: ReactNode;
  children: ReactNode;
}) {
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

      <div className="mt-3 flex items-center gap-2">{badge}</div>

      <div className="mt-4 flex items-center gap-2">{children}</div>
    </div>
  );
}

/* ───────────────────────────  Badges  ─────────────────────────── */

function ConnectedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Connected
    </span>
  );
}

function AvailableBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      Available
    </span>
  );
}

function AwaitingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
      <Clock className="h-3 w-3" />
      Awaiting approval
    </span>
  );
}

function RestrictedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      Restricted
    </span>
  );
}

/* ───────────────────────────  Cards  ─────────────────────────── */

/** Existing Nango Connect flow, preserved verbatim. In sandbox / tokenless mode it
 *  just enables the connector; otherwise it opens Nango's Connect UI and stores the
 *  resulting connection id. */
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

function ActionButton({
  onClick,
  disabled,
  variant = "outline",
  icon: Icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: "outline" | "primary" | "danger";
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-primary/40 bg-primary/10 text-primary hover:border-primary hover:bg-primary/15",
        variant === "danger" &&
          "border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive",
        variant === "outline" &&
          "border-border bg-background text-foreground hover:border-primary hover:text-primary",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** Connected: green badge + Disconnect. */
function ConnectedCard({ connector }: { connector: ConnectorItem }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const disconnect = async () => {
    setPending(true);
    try {
      await api.configureConnector(connector.key, { enabled: false });
      await queryClient.invalidateQueries({ queryKey: ["connector-catalog"] });
      toast.success(`Disconnected ${connector.name}`);
    } catch (err) {
      toast.error("Couldn't disconnect", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <ConnectorShell connector={connector} badge={<ConnectedBadge />}>
      <ActionButton onClick={disconnect} disabled={pending} variant="outline">
        Disconnect
      </ActionButton>
    </ConnectorShell>
  );
}

/** Available: entitled but not enabled — run the Nango Connect flow. */
function AvailableCard({ connector }: { connector: ConnectorItem }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const connect = async () => {
    setPending(true);
    try {
      await handleConnect(connector.key, queryClient);
      await queryClient.invalidateQueries({ queryKey: ["connector-catalog"] });
      toast.success(`Connected ${connector.name}`);
    } catch (err) {
      toast.error("Couldn't connect", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <ConnectorShell connector={connector} badge={<AvailableBadge />}>
      <ActionButton onClick={connect} disabled={pending} variant="primary" icon={Plus}>
        Connect
      </ActionButton>
    </ConnectorShell>
  );
}

/** Pending: not entitled. Members request access; admins grant directly or
 *  approve/reject an outstanding request. */
function PendingCard({
  connector,
  request,
  isAdmin,
}: {
  connector: ConnectorItem;
  request?: AccessRequest;
  isAdmin: boolean;
}) {
  const requestAccess = useRequestAccess();
  const decide = useDecideAccessRequest();
  const setEntitlement = useSetEntitlement();

  const busy = requestAccess.isPending || decide.isPending || setEntitlement.isPending;

  const onRequest = () =>
    requestAccess.mutate(
      { key: connector.key },
      {
        onSuccess: () =>
          toast.success(`Access requested for ${connector.name}`, {
            description: "An admin will review your request.",
          }),
        onError: (err) =>
          toast.error("Couldn't request access", {
            description: err instanceof Error ? err.message : "Please try again.",
          }),
      },
    );

  const onGrant = () =>
    setEntitlement.mutate(
      { key: connector.key, allowed: true },
      {
        onSuccess: () => toast.success(`Granted access to ${connector.name}`),
        onError: (err) =>
          toast.error("Couldn't grant access", {
            description: err instanceof Error ? err.message : "Please try again.",
          }),
      },
    );

  const onDecide = (decision: "approve" | "reject") => {
    if (!request) return;
    decide.mutate(
      { id: request.id, decision },
      {
        onSuccess: () =>
          toast.success(
            decision === "approve"
              ? `Approved access to ${connector.name}`
              : `Rejected request for ${connector.name}`,
          ),
        onError: (err) =>
          toast.error("Couldn't update request", {
            description: err instanceof Error ? err.message : "Please try again.",
          }),
      },
    );
  };

  return (
    <ConnectorShell
      connector={connector}
      badge={request ? <AwaitingBadge /> : <RestrictedBadge />}
    >
      {request ? (
        isAdmin ? (
          <>
            <ActionButton onClick={() => onDecide("approve")} disabled={busy} variant="primary" icon={Check}>
              Approve
            </ActionButton>
            <ActionButton onClick={() => onDecide("reject")} disabled={busy} variant="danger" icon={X}>
              Reject
            </ActionButton>
          </>
        ) : (
          <span className="flex-1 text-center text-xs text-muted-foreground">
            Awaiting an admin's approval.
          </span>
        )
      ) : isAdmin ? (
        <ActionButton onClick={onGrant} disabled={busy} variant="primary" icon={ShieldCheck}>
          Grant access
        </ActionButton>
      ) : (
        <ActionButton onClick={onRequest} disabled={busy} variant="outline" icon={Link2}>
          Request access
        </ActionButton>
      )}
    </ConnectorShell>
  );
}
