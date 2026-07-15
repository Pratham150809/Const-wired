import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { api } from "../api";
import { LoadingState } from "../components/common/states";
import { WorkflowBuilder } from "../components/workflow/builder/WorkflowBuilder";
import { deserialize } from "../components/workflow/builder/serialize";

// Optional `?key=<workflow_key>` loads an existing user workflow for editing.
export const Route = createFileRoute("/app/workflows/builder")({
  validateSearch: (search: Record<string, unknown>): { key?: string } => ({
    key: typeof search.key === "string" ? search.key : undefined,
  }),
  component: Builder,
});

function Builder() {
  const { key } = Route.useSearch();

  // Editing fetches the FULL definition (with per-step config) — the list spec only
  // carries id/type/name, which would silently drop config on round-trip.
  const { data: def, isLoading } = useQuery({
    queryKey: ["workflow-definition", key],
    queryFn: () => api.getWorkflowDefinition(key as string),
    enabled: Boolean(key),
  });

  const initial = useMemo(
    () => (def ? deserialize(def as Parameters<typeof deserialize>[0]) : undefined),
    [def],
  );

  const waiting = Boolean(key) && isLoading;

  return (
    <div className="h-[calc(100vh-9rem)] min-h-[600px]">
      {waiting ? (
        <LoadingState label="Loading workflow…" />
      ) : (
        <WorkflowBuilder existingKey={def ? key : undefined} initial={initial} />
      )}
    </div>
  );
}
