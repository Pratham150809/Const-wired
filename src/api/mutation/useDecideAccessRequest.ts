import { useMutation, useQueryClient } from "@tanstack/react-query";

import { approveAccessRequest, rejectAccessRequest } from "../client";

/** Approve or reject a pending connector access request (admin). Approving grants
 *  the entitlement server-side, so refresh the catalogue + connector lists too. */
export const useDecideAccessRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      decision === "approve" ? approveAccessRequest(id) : rejectAccessRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["access-requests"] });
      qc.invalidateQueries({ queryKey: ["connectors"] });
      qc.invalidateQueries({ queryKey: ["connector-catalog"] });
    },
  });
};
