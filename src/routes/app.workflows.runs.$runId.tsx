import { createFileRoute } from "@tanstack/react-router";

import { RunView } from "../components/workflow/RunView";

// Live view of a single workflow run: /app/workflows/runs/<run_id>. Polls the run
// detail while it's in flight, surfaces the human approval gate, and shows the result.
export const Route = createFileRoute("/app/workflows/runs/$runId")({ component: RunPage });

function RunPage() {
  const { runId } = Route.useParams();
  return (
    <div className="space-y-6">
      <RunView runId={runId} />
    </div>
  );
}
