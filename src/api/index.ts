// Public API surface. Import the low-level client (types, `api`, `ApiError`) and the
// TanStack Query hooks from here — never reach into query/ or mutation/ directly.
export * from "./client";

// Query hooks
export * from "./query/useWorkflows";
export * from "./query/useWorkflowDefinitions";
export * from "./query/useDocuments";
export * from "./query/useConnectors";
export * from "./query/useConnectorCatalog";
export * from "./query/useAccessRequests";
export * from "./query/useSystemHealth";
export * from "./query/useTenant";
export * from "./query/useUsers";
export * from "./query/useAuditEvents";
export * from "./query/useRun";
export * from "./query/useChatSessions";

// Mutation hooks
export * from "./mutation/useAssignRole";
export * from "./mutation/useUploadDocument";
export * from "./mutation/useDecideWorkflow";
export * from "./mutation/useRetrieveDocuments";
export * from "./mutation/useSaveWorkflowDefinition";
export * from "./mutation/useDeleteWorkflowDefinition";
export * from "./mutation/useStartWorkflow";
export * from "./mutation/useDecideRun";
export * from "./mutation/useRequestAccess";
export * from "./mutation/useDecideAccessRequest";
export * from "./mutation/useSetEntitlement";
export * from "./mutation/useRenameChatSession";
export * from "./mutation/useDeleteChatSession";
