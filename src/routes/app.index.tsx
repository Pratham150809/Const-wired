import { createFileRoute } from "@tanstack/react-router";
import { Activity, Cable, ClipboardCheck, FileText, MessagesSquare, Workflow } from "lucide-react";

import {
  useAuditEvents,
  useConnectors,
  useDocuments,
  useSystemHealth,
  useWorkflows,
  type AuditEvent,
  type DocumentItem,
} from "../api";
import { DataTable, type Column } from "../components/common/DataTable";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/states";
import { useSession } from "../lib/session";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { me, isManager } = useSession();

  const workflows = useWorkflows();
  const documents = useDocuments();
  const connectors = useConnectors();
  const health = useSystemHealth();
  // Audit is manager-only on the backend — don't even fire it for members/viewers.
  const audit = useAuditEvents("recent", 8, isManager);

  const wf = workflows.data ?? [];
  const activeCount = wf.filter((w) => w.status === "running").length;
  const pendingCount = wf.filter((w) => w.status === "awaiting_approval").length;
  const connectedCount = (connectors.data ?? []).filter((c) => c.enabled).length;
  const docCount = (documents.data ?? []).length;
  const healthTone =
    health.data?.overall === "ok" ? "success" : health.data ? "warning" : "default";

  const docColumns: Column<DocumentItem>[] = [
    {
      key: "filename",
      header: "Document",
      render: (d) => <span className="font-medium">{d.filename}</span>,
    },
    { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
    {
      key: "created_at",
      header: "Uploaded",
      align: "right",
      render: (d) => new Date(d.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome${me?.email ? `, ${me.email.split("@")[0]}` : ""}`}
        description="Your organization's AI operations at a glance."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active Workflows"
          value={activeCount}
          icon={Workflow}
          loading={workflows.isLoading}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingCount}
          icon={ClipboardCheck}
          loading={workflows.isLoading}
          tone={pendingCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Connected Systems"
          value={connectedCount}
          icon={Cable}
          loading={connectors.isLoading}
        />
        <StatCard
          label="Documents"
          value={docCount}
          icon={FileText}
          loading={documents.isLoading}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="System Health"
          value={health.data?.overall ? health.data.overall.toUpperCase() : "—"}
          icon={Activity}
          loading={health.isLoading}
          tone={healthTone}
          hint={health.data ? `${Object.keys(health.data.services).length} services` : undefined}
        />
        <StatCard
          label="AI Conversations"
          value="—"
          icon={MessagesSquare}
          hint="History API coming soon"
        />
      </div>

      {/* Two-column detail */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Documents</h2>
          <DataTable
            columns={docColumns}
            rows={(documents.data ?? []).slice(0, 6)}
            rowKey={(d) => d.id}
            isLoading={documents.isLoading}
            error={documents.error}
            onRetry={() => documents.refetch()}
            emptyIcon={FileText}
            emptyTitle="No documents yet"
            emptyDescription="Uploaded documents will appear here."
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Audit Activity</h2>
          {!isManager ? (
            <EmptyState
              icon={Activity}
              title="Restricted"
              description="Audit activity is visible to admins and owners."
            />
          ) : (
            <AuditList events={audit.data} loading={audit.isLoading} />
          )}
        </section>
      </div>

      {/* System health detail */}
      {health.data && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Connected Services</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(health.data.services).map(([name, status]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <span className="text-sm capitalize">{name}</span>
                <StatusBadge status={status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AuditList({ events, loading }: { events: AuditEvent[] | undefined; loading: boolean }) {
  if (loading) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (!events || events.length === 0)
    return <EmptyState icon={Activity} title="No recent activity" />;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {events.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <div className="min-w-0">
            <div className="truncate font-medium">{e.action.replace(/\./g, " · ")}</div>
            <div className="truncate text-xs text-muted-foreground">
              {e.actor_email ?? e.actor_id} · {e.resource_kind}
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ul>
  );
}
