import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAssignRole, useAuditEvents, useUsers, type AuditEvent, type UserItem } from "../api";
import { DataTable, type Column } from "../components/common/DataTable";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/states";
import { useSession } from "../lib/session";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app/admin")({ component: Admin });

type Tab = "users" | "audit" | "prompts";
const ROLES = ["owner", "admin", "member", "viewer"];

function Admin() {
  const { isManager, isLoading } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    if (!isLoading && !isManager) navigate({ to: "/app" });
  }, [isLoading, isManager, navigate]);

  if (!isManager) return null;

  return (
    <div>
      <PageHeader title="Admin" description="Users, roles, and the tenant audit trail." />

      <div className="mb-5 flex gap-1 border-b border-border">
        {(["users", "audit", "prompts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "prompts" ? "Prompt Management" : t}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "prompts" && (
        <EmptyState
          title="Prompt management not available yet"
          description="Centralized prompt/version management needs a backend endpoint (planned with the Workflow Pack Framework)."
        />
      )}
    </div>
  );
}

function UsersTab() {
  const users = useUsers();
  const assign = useAssignRole();

  const columns: Column<UserItem>[] = [
    {
      key: "email",
      header: "User",
      render: (u) => (
        <div>
          <div className="font-medium text-foreground">{u.email ?? u.id}</div>
          {(u.first_name || u.last_name) && (
            <div className="text-xs text-muted-foreground">
              {[u.first_name, u.last_name].filter(Boolean).join(" ")}
            </div>
          )}
        </div>
      ),
    },
    { key: "roles", header: "Roles", render: (u) => u.roles.join(", ") || "—" },
    {
      key: "assign",
      header: "Assign role",
      align: "right",
      render: (u) => (
        <select
          defaultValue=""
          onChange={(e) => e.target.value && assign.mutate({ id: u.id, role: e.target.value })}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          <option value="" disabled>
            Set role…
          </option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={users.data}
      rowKey={(u) => u.id}
      isLoading={users.isLoading}
      error={users.error}
      onRetry={() => users.refetch()}
      emptyTitle="No users found"
    />
  );
}

function AuditTab() {
  const audit = useAuditEvents("admin", 200);

  const columns: Column<AuditEvent>[] = [
    {
      key: "action",
      header: "Action",
      render: (e) => <span className="font-medium">{e.action}</span>,
    },
    { key: "actor", header: "Actor", render: (e) => e.actor_email ?? e.actor_id },
    { key: "resource", header: "Resource", render: (e) => `${e.resource_kind}` },
    {
      key: "created_at",
      header: "When",
      align: "right",
      render: (e) => new Date(e.created_at).toLocaleString(),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={audit.data}
      rowKey={(e) => e.id}
      isLoading={audit.isLoading}
      error={audit.error}
      onRetry={() => audit.refetch()}
      emptyTitle="No audit events"
      emptyDescription="Actions across the tenant will be recorded here."
    />
  );
}
