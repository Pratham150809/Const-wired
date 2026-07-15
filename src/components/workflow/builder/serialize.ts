// Pure, dependency-free (no React, no @xyflow) serialization between the visual
// canvas and the backend WorkflowDefinition contract. Keep it side-effect-free so
// it stays unit-testable and reasoned-about in isolation.
//
// The canvas is a linear chain with optional single/nested branches — NOT a free
// DAG. The engine runs `steps` as an ordered list with `when` guards, so serialize
// flattens the graph via DFS from the trigger and derives branch guards.

// ------------------------------------------------------------------ shapes

/** Node data carried by every canvas node. Structurally compatible with the
 *  `data` payload of an @xyflow `Node<BuilderNodeData>`. */
export interface BuilderNodeData {
  label: string;
  /** The workflow step type — or "manual" for the trigger node. */
  stepType: string;
  /** Friendly, panel-editable config (see config-panel.tsx). serialize maps this
   *  to the exact engine config shape. */
  config: Record<string, unknown>;
  [key: string]: unknown;
}

/** Minimal node shape serialize needs. A real @xyflow `Node<BuilderNodeData>` is
 *  assignable to this (extra fields like `position`, `selected` are ignored). */
export interface SerializableNode {
  id: string;
  /** @xyflow node type: "trigger" | "step" | "branch". */
  type?: string;
  position?: { x: number; y: number };
  deletable?: boolean;
  data: BuilderNodeData;
}

/** Minimal edge shape. A real @xyflow `Edge` is assignable to this. */
export interface SerializableEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

// ------------------------------------------------------------------ emitted contract

export interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  out: string;
  when?: string;
}

export interface WorkflowApproval {
  step: string;
  approver_persona: string;
}

export interface WorkflowDefinition {
  $schema: string;
  key: string;
  pack: string;
  version: string;
  business_goal: string;
  trigger: { type: string };
  inputs: unknown[];
  connectors_required: string[];
  steps: WorkflowStep[];
  approvals: WorkflowApproval[];
  outputs: unknown[];
}

// ------------------------------------------------------------------ helpers

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

/** lowercase, non-alphanumeric → "-", trim, collapse repeats. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isTrigger = (n: SerializableNode): boolean =>
  n.type === "trigger" || n.data?.stepType === "manual";

const isBranch = (n: SerializableNode): boolean =>
  n.type === "branch" || n.data?.stepType === "branch";

const handleOf = (e: SerializableEdge): string => (e.sourceHandle ?? "").toLowerCase();

/** Parse a JSON textarea value into an object, or `undefined` when empty. Throws a
 *  toast-ready Error naming the offending step + field when the JSON is invalid. */
function parseJsonField(
  raw: unknown,
  fieldLabel: string,
  stepName: string,
): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  const text = String(raw).trim();
  if (!text) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Step "${stepName}": ${fieldLabel} must be valid JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Step "${stepName}": ${fieldLabel} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

/** Map a node's friendly, panel-editable config to the EXACT engine config shape.
 *  Branch config is computed by serialize itself (guards), not here. */
function buildStepConfig(
  stepType: string,
  cfg: Record<string, unknown>,
  stepName: string,
): Record<string, unknown> {
  switch (stepType) {
    case "connector.call": {
      const args: Record<string, unknown> = { endpoint: str(cfg.endpoint) };
      const query = parseJsonField(cfg.query, "Query", stepName);
      if (query) args.query = query;
      const body = parseJsonField(cfg.body, "Body", stepName);
      if (body) args.body = body;
      return {
        connector: str(cfg.connector),
        tool: str(cfg.tool) || "GET",
        arguments: args,
      };
    }
    case "notify": {
      const args: Record<string, unknown> = { endpoint: str(cfg.endpoint) };
      const body = parseJsonField(cfg.body, "Body", stepName);
      if (body) args.body = body;
      return {
        connector: str(cfg.connector),
        tool: "send",
        arguments: args,
      };
    }
    case "ai.action": {
      const out: Record<string, unknown> = { prompt_text: str(cfg.prompt_text) };
      if (cfg.output) out.output = str(cfg.output);
      if (cfg.model) out.model = str(cfg.model);
      return out;
    }
    case "approval":
      // Approver comes from the top-level approvals[] gate; step config stays empty.
      return {};
    case "transform":
      return parseJsonField(cfg.json, "Config", stepName) ?? {};
    default:
      // Unknown types: pass through whatever object we have.
      return { ...cfg };
  }
}

// ------------------------------------------------------------------ serialize

export function serialize(
  name: string,
  nodes: SerializableNode[],
  edges: SerializableEdge[],
): WorkflowDefinition {
  const trimmedName = (name ?? "").trim();
  if (!trimmedName) throw new Error("Give the workflow a name before saving.");
  const key = slugify(trimmedName);
  if (!key) throw new Error("The workflow name must contain letters or numbers.");

  const nodeById = new Map<string, SerializableNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  // 1. adjacency (with branch handles) + in-degree
  const adj = new Map<string, { target: string; handle: string }[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
    adj.get(e.source)!.push({ target: e.target, handle: handleOf(e) });
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const successors = (id: string) => adj.get(id) ?? [];

  // 2. DFS order from the trigger's successors (trigger itself is not a step).
  const order: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    const node = nodeById.get(id);
    if (!node) return;
    if (isTrigger(node)) {
      for (const e of successors(id)) visit(e.target);
      return;
    }
    visited.add(id);
    order.push(id);
    const succ = successors(id);
    if (isBranch(node)) {
      const pick = (h: string) => succ.filter((e) => e.handle === h).map((e) => e.target);
      const other = succ
        .filter((e) => e.handle !== "true" && e.handle !== "false")
        .map((e) => e.target);
      [...pick("true"), ...pick("false"), ...other].forEach(visit);
    } else {
      succ.forEach((e) => visit(e.target));
    }
  };

  const trigger = nodes.find(isTrigger);
  if (trigger) {
    for (const e of successors(trigger.id)) visit(e.target);
  } else {
    // No trigger node: start from every source-less step node.
    for (const n of nodes) {
      if (isTrigger(n)) continue;
      if ((inDegree.get(n.id) ?? 0) === 0) visit(n.id);
    }
  }

  if (order.length === 0) {
    const hasSteps = nodes.some((n) => !isTrigger(n));
    throw new Error(
      hasSteps
        ? "Connect your steps to the trigger — nothing is reachable yet."
        : "Add at least one step before saving.",
    );
  }

  // 3. stable, unique step ids (slug of name, fallback node id).
  const usedIds = new Set<string>();
  const stepIdByNode = new Map<string, string>();
  for (const id of order) {
    const node = nodeById.get(id)!;
    const base = slugify(node.data.label || "") || slugify(node.id) || "step";
    let candidate = base;
    let i = 2;
    while (usedIds.has(candidate)) candidate = `${base}-${i++}`;
    usedIds.add(candidate);
    stepIdByNode.set(id, candidate);
  }

  // 4. branch guards. Propagate `when` down each branch arm, stopping at merge
  //    points (in-degree >= 2), which run unconditionally.
  const whenByNode = new Map<string, string>();
  const branchConfig = new Map<string, Record<string, unknown>>();

  const propagate = (starts: string[], guard: string): void => {
    const seen = new Set<string>();
    const stack = [...starts];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodeById.get(id);
      if (!node || isTrigger(node)) continue;
      if ((inDegree.get(id) ?? 0) >= 2) continue; // merge point → unconditional
      whenByNode.set(id, guard);
      for (const e of successors(id)) stack.push(e.target);
    }
  };

  // Process in DFS order so inner (later) branches override outer guards on the
  // nodes they actually reach.
  for (const bId of order) {
    const node = nodeById.get(bId)!;
    if (!isBranch(node)) continue;
    const stepId = stepIdByNode.get(bId)!;
    const flagTrue = `${stepId}_t`;
    const flagFalse = `${stepId}_f`;
    branchConfig.set(bId, {
      condition: str(node.data.config?.condition),
      on_true: { [flagTrue]: true },
      on_false: { [flagFalse]: true },
    });
    const succ = successors(bId);
    const trueTargets = succ.filter((e) => e.handle === "true").map((e) => e.target);
    const falseTargets = succ.filter((e) => e.handle === "false").map((e) => e.target);
    propagate(trueTargets, `{{ steps.${stepId}.out.${flagTrue} }}`);
    propagate(falseTargets, `{{ steps.${stepId}.out.${flagFalse} }}`);
  }

  // 5. emit steps + collect connectors/approvals.
  const steps: WorkflowStep[] = [];
  const connectorsRequired = new Set<string>();
  const approvals: WorkflowApproval[] = [];

  for (const id of order) {
    const node = nodeById.get(id)!;
    const stepId = stepIdByNode.get(id)!;
    const stepType = node.data.stepType;
    const stepName = node.data.label || stepId;
    const cfg = node.data.config ?? {};

    const config = isBranch(node) ? branchConfig.get(id)! : buildStepConfig(stepType, cfg, stepName);

    const step: WorkflowStep = { id: stepId, type: stepType, name: stepName, config, out: stepId };
    const when = whenByNode.get(id);
    if (when) step.when = when;
    steps.push(step);

    if (stepType === "connector.call" || stepType === "notify") {
      const connector = str(cfg.connector);
      if (connector) connectorsRequired.add(connector);
    }
    if (stepType === "approval") {
      approvals.push({
        step: stepId,
        approver_persona: str(cfg.approver_persona) || "owner",
      });
    }
  }

  // 6. validate: unique ids (defensive — suffixing already guarantees this).
  const seenIds = new Set<string>();
  for (const s of steps) {
    if (seenIds.has(s.id)) throw new Error(`Duplicate step id "${s.id}".`);
    seenIds.add(s.id);
  }

  return {
    $schema: "aios.workflow/v1",
    key,
    pack: "custom",
    version: "1.0.0",
    business_goal: trimmedName,
    trigger: { type: "manual" },
    inputs: [],
    connectors_required: [...connectorsRequired],
    steps,
    approvals,
    outputs: [],
  };
}

// ------------------------------------------------------------------ deserialize

interface LooseStep {
  id?: string;
  type?: string;
  name?: string;
  config?: Record<string, unknown>;
  when?: string;
}
interface LooseDefinition {
  business_goal?: string;
  name?: string;
  steps?: LooseStep[];
  approvals?: WorkflowApproval[];
}

/** Best-effort reconstruction for editing. Rebuilds a linear chain (trigger → step
 *  → step → …); branch structure is approximated by wiring a branch node's default
 *  "true" arm to the following step. Good enough as an editable starting point. */
export function deserialize(def: LooseDefinition | null | undefined): {
  name: string;
  nodes: SerializableNode[];
  edges: SerializableEdge[];
} {
  const steps = Array.isArray(def?.steps) ? def!.steps! : [];
  const approvals = Array.isArray(def?.approvals) ? def!.approvals! : [];
  const name = str(def?.business_goal || def?.name);

  const nodes: SerializableNode[] = [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 280, y: 24 },
      deletable: false,
      data: { label: "Trigger", stepType: "manual", config: {} },
    },
  ];
  const edges: SerializableEdge[] = [];

  let prevId = "trigger";
  let prevIsBranch = false;
  steps.forEach((step, i) => {
    const stepType = str(step.type) || "transform";
    const nodeType = stepType === "branch" ? "branch" : "step";
    const id = str(step.id) || `step-${i + 1}`;
    nodes.push({
      id,
      type: nodeType,
      position: { x: 280, y: 24 + (i + 1) * 140 },
      data: {
        label: str(step.name) || id,
        stepType,
        config: toFriendlyConfig(step, approvals),
      },
    });
    edges.push({
      id: `e-${prevId}-${id}`,
      source: prevId,
      target: id,
      sourceHandle: prevIsBranch ? "true" : null,
    });
    prevId = id;
    prevIsBranch = stepType === "branch";
  });

  return { name, nodes, edges };
}

function toFriendlyConfig(
  step: LooseStep,
  approvals: WorkflowApproval[],
): Record<string, unknown> {
  const cfg = (step.config ?? {}) as Record<string, unknown>;
  const args = (cfg.arguments ?? {}) as Record<string, unknown>;
  const jsonOr = (v: unknown) =>
    v && typeof v === "object" ? JSON.stringify(v, null, 2) : "";

  switch (str(step.type)) {
    case "connector.call":
      return {
        connector: str(cfg.connector),
        tool: str(cfg.tool) || "GET",
        endpoint: str(args.endpoint),
        query: jsonOr(args.query),
        body: jsonOr(args.body),
      };
    case "notify":
      return {
        connector: str(cfg.connector),
        endpoint: str(args.endpoint),
        body: jsonOr(args.body),
      };
    case "ai.action":
      return {
        prompt_text: str(cfg.prompt_text),
        output: str(cfg.output) || "text",
        model: str(cfg.model),
      };
    case "approval": {
      const gate = approvals.find((a) => a.step === str(step.id));
      return { approver_persona: gate?.approver_persona || "owner" };
    }
    case "branch":
      return { condition: str(cfg.condition) };
    case "transform":
    default:
      return { json: JSON.stringify(cfg, null, 2) };
  }
}
