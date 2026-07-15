import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteWorkflowDefinition } from "../client";

/** Delete a user workflow definition, then refresh the definitions list. */
export const useDeleteWorkflowDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deleteWorkflowDefinition(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-definitions"] }),
  });
};
