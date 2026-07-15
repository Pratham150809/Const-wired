// n8n-style visual workflow builder. Left palette (entitled connectors + step
// types) → center @xyflow canvas → right config panel. Save serializes the canvas
// to a backend WorkflowDefinition and POSTs/PUTs it.
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Plug, Save } from "lucide-react";
import { toast } from "sonner";

import { useConnectorCatalog, useSaveWorkflowDefinition, type ConnectorItem } from "../../../api";
import { cn } from "../../../lib/utils";
import { ConfigPanel } from "./config-panel";
import { nodeTypes, stepMeta } from "./nodes";
import {
  serialize,
  type BuilderNodeData,
  type SerializableEdge,
  type SerializableNode,
} from "./serialize";

type FlowNode = Node<BuilderNodeData>;

const STEP_PALETTE: { stepType: string; label: string }[] = [
  { stepType: "ai.action", label: "AI action" },
  { stepType: "approval", label: "Approval" },
  { stepType: "branch", label: "Branch" },
  { stepType: "notify", label: "Notify" },
  { stepType: "transform", label: "Transform" },
];

const DRAG_MIME = "application/xyflow";

/** Friendly per-type config defaults (matching config-panel field keys). */
function defaultConfig(stepType: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  switch (stepType) {
    case "connector.call":
      return { connector: "", tool: "GET", endpoint: "", query: "", body: "", ...extra };
    case "notify":
      return { connector: "", endpoint: "", body: "", ...extra };
    case "ai.action":
      return { prompt_text: "", output: "text", model: "", ...extra };
    case "approval":
      return { approver_persona: "owner", ...extra };
    case "branch":
      return { condition: "", ...extra };
    case "transform":
      return { json: "{}", ...extra };
    default:
      return { ...extra };
  }
}

const DEFAULT_TRIGGER: FlowNode = {
  id: "trigger",
  type: "trigger",
  position: { x: 300, y: 24 },
  deletable: false,
  data: { label: "Trigger", stepType: "manual", config: {} },
};

function toFlowNodes(ns: SerializableNode[]): FlowNode[] {
  return ns.map((n) => ({
    id: n.id,
    type: n.type ?? "step",
    position: n.position ?? { x: 300, y: 24 },
    ...(n.type === "trigger" ? { deletable: false } : {}),
    data: n.data,
  }));
}

function toFlowEdges(es: SerializableEdge[]): Edge[] {
  return es.map((e, i) => ({
    id: e.id ?? `e-${i}`,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
  }));
}

export interface WorkflowBuilderProps {
  /** When editing, the existing workflow key (triggers a PUT instead of POST). */
  existingKey?: string;
  /** Pre-loaded canvas (from deserialize) when editing. */
  initial?: { name: string; nodes: SerializableNode[]; edges: SerializableEdge[] };
}

export function WorkflowBuilder(props: WorkflowBuilderProps) {
  // Hooks like useReactFlow must run inside the provider.
  return (
    <ReactFlowProvider>
      <BuilderInner {...props} />
    </ReactFlowProvider>
  );
}

function BuilderInner({ existingKey, initial }: WorkflowBuilderProps) {
  const navigate = useNavigate();
  const { screenToFlowPosition } = useReactFlow();
  const save = useSaveWorkflowDefinition();

  const { data: catalog = [], isLoading: catalogLoading } = useConnectorCatalog();
  const connectors: ConnectorItem[] = catalog.filter((c) => c.entitled);

  const [name, setName] = useState(initial?.name ?? "");
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    initial ? toFlowNodes(initial.nodes) : [DEFAULT_TRIGGER],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initial ? toFlowEdges(initial.edges) : [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const idRef = useRef(0);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  );

  const addNode = useCallback(
    (stepType: string, label: string, position: { x: number; y: number }, extra?: Record<string, unknown>) => {
      const id = `n${++idRef.current}_${Math.random().toString(36).slice(2, 6)}`;
      const nodeType = stepType === "branch" ? "branch" : "step";
      const newNode: FlowNode = {
        id,
        type: nodeType,
        position,
        data: { label, stepType, config: defaultConfig(stepType, extra) },
      };
      setNodes((nds) => nds.concat(newNode));
      setSelectedId(id);
    },
    [setNodes],
  );

  const addFromPayload = useCallback(
    (payload: { kind: string; stepType?: string; label?: string; connector?: string }, position: { x: number; y: number }) => {
      if (payload.kind === "connector") {
        addNode("connector.call", payload.label ?? "Connector call", position, {
          connector: payload.connector ?? "",
        });
      } else if (payload.stepType) {
        addNode(payload.stepType, payload.label ?? payload.stepType, position);
      }
    },
    [addNode],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData(DRAG_MIME);
      if (!raw) return;
      let payload: { kind: string; stepType?: string; label?: string; connector?: string };
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addFromPayload(payload, position);
    },
    [screenToFlowPosition, addFromPayload],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Click-to-add fallback: drop near the center with a small cascade.
  const clickAdd = (stepType: string, label: string, extra?: Record<string, unknown>) => {
    const n = nodes.length;
    addNode(stepType, label, { x: 320 + (n % 4) * 30, y: 140 + n * 24 }, extra);
  };

  const updateNodeData = (id: string, updater: (d: BuilderNodeData) => BuilderNodeData) =>
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: updater(n.data) } : n)));

  const deleteSelected = () => {
    if (!selected || selected.type === "trigger") return;
    const id = selected.id;
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  };

  const handleSave = () => {
    let definition;
    try {
      definition = serialize(name, nodes, edges);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the workflow.");
      return;
    }
    save.mutate(
      { definition, existingKey },
      {
        onSuccess: () => {
          toast.success(`Saved “${name.trim()}”.`);
          navigate({ to: "/app/workflows" });
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Saving the workflow failed."),
      },
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={() => navigate({ to: "/app/workflows" })}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cancel
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name your workflow…"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={handleSave}
          disabled={save.isPending}
          className="brand-gradient inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition hover:opacity-90 disabled:opacity-60"
        >
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {existingKey ? "Update workflow" : "Save workflow"}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Palette */}
        <aside className="w-60 shrink-0 overflow-y-auto border-r border-border bg-card p-3">
          <PaletteSection title="Connectors">
            {catalogLoading ? (
              <div className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
              </div>
            ) : connectors.length === 0 ? (
              <p className="px-1 py-2 text-[11px] text-muted-foreground">
                No entitled connectors. Enable one in the Connector Hub first.
              </p>
            ) : (
              connectors.map((c) => (
                <PaletteItem
                  key={c.key}
                  label={c.name}
                  sublabel={c.key}
                  dot={stepMeta("connector.call").dot}
                  icon={<Plug className="h-3.5 w-3.5" />}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      DRAG_MIME,
                      JSON.stringify({ kind: "connector", label: c.name, connector: c.key }),
                    )
                  }
                  onClick={() => clickAdd("connector.call", c.name, { connector: c.key })}
                />
              ))
            )}
          </PaletteSection>

          <PaletteSection title="Steps">
            {STEP_PALETTE.map((s) => (
              <PaletteItem
                key={s.stepType}
                label={s.label}
                sublabel={s.stepType}
                dot={stepMeta(s.stepType).dot}
                onDragStart={(e) =>
                  e.dataTransfer.setData(
                    DRAG_MIME,
                    JSON.stringify({ kind: "step", stepType: s.stepType, label: s.label }),
                  )
                }
                onClick={() => clickAdd(s.stepType, s.label)}
              />
            ))}
          </PaletteSection>
        </aside>

        {/* Canvas */}
        <div className="relative min-w-0 flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable className="!bg-card" />
          </ReactFlow>
        </div>

        {/* Config panel */}
        <aside className="w-80 shrink-0 overflow-hidden border-l border-border bg-card">
          <ConfigPanel
            node={selected}
            connectors={connectors}
            onChangeLabel={(label) =>
              selected && updateNodeData(selected.id, (d) => ({ ...d, label }))
            }
            onChangeConfig={(config) =>
              selected && updateNodeData(selected.id, (d) => ({ ...d, config }))
            }
            onDelete={deleteSelected}
          />
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────  Palette pieces  ───────────────────────── */

function PaletteSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PaletteItem({
  label,
  sublabel,
  dot,
  icon,
  onDragStart,
  onClick,
}: {
  label: string;
  sublabel: string;
  dot: string;
  icon?: React.ReactNode;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-left transition hover:border-primary/50 hover:bg-surface-2 active:cursor-grabbing"
    >
      <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted", "text-muted-foreground")}>
        {icon ?? <span className={cn("h-2 w-2 rounded-full", dot)} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-foreground">{label}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{sublabel}</span>
      </span>
    </button>
  );
}
