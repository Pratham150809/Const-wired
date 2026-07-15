import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createWorkflowDefinition, updateWorkflowDefinition } from "../client";

/** Create (POST, upsert by key) or update (PUT) a user workflow definition. Pass
 *  `existingKey` when editing so we PUT; otherwise we POST a new definition. */
export const useSaveWorkflowDefinition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ definition, existingKey }: { definition: unknown; existingKey?: string }) =>
      existingKey
        ? updateWorkflowDefinition(existingKey, definition)
        : createWorkflowDefinition(definition),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-definitions"] }),
  });
};
