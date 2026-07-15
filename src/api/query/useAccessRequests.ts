import { useQuery } from "@tanstack/react-query";

import { api } from "../client";

/** Pending connector access requests (admin approval queue). */
export const useAccessRequests = () =>
  useQuery({ queryKey: ["access-requests"], queryFn: () => api.listAccessRequests("pending") });
