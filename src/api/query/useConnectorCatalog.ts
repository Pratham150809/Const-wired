import { useQuery } from "@tanstack/react-query";

import { listConnectorCatalog } from "../client";

/** Full connector catalogue (with `entitled` flags) for the workflow builder palette. */
export const useConnectorCatalog = () =>
  useQuery({ queryKey: ["connector-catalog"], queryFn: listConnectorCatalog });
