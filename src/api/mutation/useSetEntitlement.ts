import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setConnectorEntitlement } from "../client";

/** Grant or revoke a connector entitlement directly (admin), then refresh the
 *  catalogue + connector lists. */
export const useSetEntitlement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, allowed }: { key: string; allowed: boolean }) =>
      setConnectorEntitlement(key, allowed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connector-catalog"] });
      qc.invalidateQueries({ queryKey: ["connectors"] });
    },
  });
};
