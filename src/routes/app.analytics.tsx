import { createFileRoute } from "@tanstack/react-router";
import { Cable, CheckCircle2, Clock, FileText, MessagesSquare, Workflow } from "lucide-react";

import { useAuditEvents, useConnectors, useDocuments, useWorkflows } from "../api";
import { PageHeader } from "../components/common/PageHeader";
import { StatCard } from "../components/common/StatCard";
import { useSession } from "../lib/session";

export const Route = createFileRoute("/app/analytics")({ component: Analytics });

function Analytics() {
  const { isManager } = useSession();
  const workflows = useWorkflows();
  const documents = useDocuments();
  const connectors = useConnectors();
  const audit = useAuditEvents("all", 500, isManager);

  const wf = workflows.data ?? [];
  const decided = wf.filter((w) => w.decision);
  const avgApprovalMins =
    decided.length > 0
      ? Math.round(
          decided.reduce(
            (sum, w) =>
              sum + (new Date(w.updated_at).getTime() - new Date(w.created_at).getTime()) / 60000,
            0,
          ) / decided.length,
        )
      : null;

  const docsProcessed = (documents.data ?? []).filter((d) => d.status === "processed").length;
  const connectorUsage = (audit.data ?? []).filter((e) => e.action === "connector.invoke").length;
  const aiRequests = (audit.data ?? []).filter((e) => e.action === "chat.message").length;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Usage across AI, workflows, approvals, and connectors — derived from live platform activity."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="AI Requests"
          value={isManager ? aiRequests : "—"}
          icon={MessagesSquare}
          loading={isManager && audit.isLoading}
          hint={isManager ? "from audit log" : "admins only"}
        />
        <StatCard
          label="Workflow Executions"
          value={wf.length}
          icon={Workflow}
          loading={workflows.isLoading}
        />
        <StatCard
          label="Approvals Completed"
          value={decided.length}
          icon={CheckCircle2}
          loading={workflows.isLoading}
        />
        <StatCard
          label="Avg. Approval Time"
          value={avgApprovalMins != null ? `${avgApprovalMins}m` : "—"}
          icon={Clock}
          loading={workflows.isLoading}
        />
        <StatCard
          label="Documents Processed"
          value={docsProcessed}
          icon={FileText}
          loading={documents.isLoading}
        />
        <StatCard
          label="Connector Invocations"
          value={isManager ? connectorUsage : "—"}
          icon={Cable}
          loading={isManager && audit.isLoading}
          hint={isManager ? "from audit log" : "admins only"}
        />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Metrics are computed from the workflows, documents, connectors, and audit endpoints. A
        dedicated time-series analytics API is not yet available on the backend.
      </p>
    </div>
  );
}
