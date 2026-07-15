import { useQuery } from "@tanstack/react-query";
import { listWorkflowDefinitions } from "../client";

export const useWorkflowDefinitions = () =>
  useQuery({ queryKey: ["workflow-definitions"], queryFn: listWorkflowDefinitions });
