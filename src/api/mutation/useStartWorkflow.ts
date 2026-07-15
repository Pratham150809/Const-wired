import { useMutation, useQueryClient } from "@tanstack/react-query";

import { startWorkflow } from "../client";

/** Start a run of a workflow definition, then refresh the running-workflows list. */
export const useStartWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      packKey,
      workflowKey,
      inputs,
    }: {
      packKey: string;
      workflowKey: string;
      inputs?: Record<string, unknown>;
    }) => startWorkflow(packKey, workflowKey, inputs),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });
};
