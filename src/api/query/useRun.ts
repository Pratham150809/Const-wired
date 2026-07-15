import { useQuery } from "@tanstack/react-query";

import { getRun } from "../client";

/** Live detail of a single workflow run. Polls every 1.5s while the run is in
 *  flight (running / awaiting_approval) and stops once it settles (completed /
 *  rejected). Disabled until a runId is available. */
export const useRun = (runId?: string) =>
  useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId!),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "completed" || status === "rejected" ? false : 1500;
    },
  });
