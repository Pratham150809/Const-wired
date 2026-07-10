import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { useState } from "react";

import { useDecideWorkflow, useWorkflows, type WorkflowItem } from "../api";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/common/states";
import { useSession } from "../lib/session";

export const Route = createFileRoute("/app/approvals")({ component: Approvals });

function Approvals() {
  const { isManager } = useSession();
  const workflows = useWorkflows();

  const pending = (workflows.data ?? []).filter((w) => w.status === "awaiting_approval");

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Items awaiting a human decision. Review the AI summary, then approve or reject."
      />

      {!isManager && (
        <div className="mb-4 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
          You can view the queue, but only owners/admins may approve or reject.
        </div>
      )}

      {workflows.isLoading ? (
        <LoadingState />
      ) : workflows.error ? (
        <ErrorState onRetry={() => workflows.refetch()} />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing to approve"
          description="When a workflow reaches a human-approval step, it will appear here."
        />
      ) : (
        <div className="grid gap-3">
          {pending.map((w) => (
            <ApprovalCard key={w.workflow_id} item={w} canDecide={isManager} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ item, canDecide }: { item: WorkflowItem; canDecide: boolean }) {
  const [comment, setComment] = useState("");
  const decide = useDecideWorkflow();

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold capitalize text-foreground">
            {item.type.replace(/_/g, " ")}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{item.workflow_id}</div>
        </div>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          Awaiting approval
        </span>
      </div>

      {item.summary && (
        <div className="mb-3 rounded-lg border border-border bg-surface-2/50 p-3 text-sm text-foreground/90">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            AI summary
          </div>
          <p className="whitespace-pre-wrap">{item.summary}</p>
        </div>
      )}

      {canDecide && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)…"
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                decide.mutate({ workflowId: item.workflow_id, approve: true, comment })
              }
              disabled={decide.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() =>
                decide.mutate({ workflowId: item.workflow_id, approve: false, comment })
              }
              disabled={decide.isPending}
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      )}
      {decide.isError && (
        <p className="mt-2 text-xs text-destructive">Action failed. You may not have permission.</p>
      )}
    </div>
  );
}
