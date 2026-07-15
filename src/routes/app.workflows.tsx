import { Outlet, createFileRoute } from "@tanstack/react-router";

// Layout route for the /app/workflows subtree. The list lives in
// `app.workflows.index.tsx` (exact /app/workflows) and the visual builder in
// `app.workflows.builder.tsx` (/app/workflows/builder). Keeping this a bare
// <Outlet /> lets the builder render full-screen instead of stacking under the
// list.
export const Route = createFileRoute("/app/workflows")({ component: WorkflowsLayout });

function WorkflowsLayout() {
  return <Outlet />;
}
