import { useMutation, useQueryClient } from "@tanstack/react-query";

import { approveRun, rejectRun } from "../client";

/** Approve or reject the human gate of a workflow run, then refresh the run detail
 *  (so the polled view flips to running/completed) and the workflow list. */
export const useDecideRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      decision,
      comment = "",
    }: {
      runId: string;
      decision: "approve" | "reject";
      comment?: string;
    }) => (decision === "approve" ? approveRun(runId, comment) : rejectRun(runId, comment)),
    onSuccess: (_data, { runId }) => {
      qc.invalidateQueries({ queryKey: ["run", runId] });
      qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
};
