import { createFileRoute } from "@tanstack/react-router";
import { Workflow as WorkflowIcon } from "lucide-react";

import { useWorkflows, type WorkflowItem } from "../api";
import { DataTable, type Column } from "../components/common/DataTable";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";

export const Route = createFileRoute("/app/workflows")({ component: Workflows });

function prettyType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Workflows() {
  const workflows = useWorkflows();

  const columns: Column<WorkflowItem>[] = [
    {
      key: "type",
      header: "Workflow",
      render: (w) => (
        <div>
          <div className="font-medium text-foreground">{prettyType(w.type)}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {w.workflow_id.slice(0, 24)}…
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (w) => <StatusBadge status={w.status} /> },
    {
      key: "waiting",
      header: "Waiting For",
      render: (w) => (w.status === "awaiting_approval" ? "Human approval" : "—"),
    },
    {
      key: "decision",
      header: "Decision",
      render: (w) =>
        w.decision ? (
          <span className="capitalize">{w.decision}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "created_at",
      header: "Started",
      align: "right",
      render: (w) => new Date(w.created_at).toLocaleString(),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      align: "right",
      render: (w) => new Date(w.updated_at).toLocaleString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Every durable workflow running across your organization."
      />
      <DataTable
        columns={columns}
        rows={workflows.data}
        rowKey={(w) => w.workflow_id}
        isLoading={workflows.isLoading}
        error={workflows.error}
        onRetry={() => workflows.refetch()}
        emptyIcon={WorkflowIcon}
        emptyTitle="No workflows yet"
        emptyDescription="Workflows started from documents or copilots will appear here."
      />
    </div>
  );
}
