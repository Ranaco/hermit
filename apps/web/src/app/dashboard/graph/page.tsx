"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Boxes,
  Building2,
  FolderTree,
  KeyRound,
  Loader2,
  Network,
  Search,
  Shield,
  SlidersHorizontal,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { useAccessGraph, useAccessGraphDetail } from "@/hooks/use-organizations";
import { useRBAC } from "@/hooks/use-rbac";
import { cn } from "@/lib/utils";
import type { AccessGraphNode } from "@/services/organization.service";
import { useOrganizationStore } from "@/store/organization.store";

const NODE_TYPE_ORDER: AccessGraphNode["type"][] = [
  "organization",
  "vault",
  "group",
  "secret",
  "key",
  "team",
  "member",
  "role",
  "policy",
];

const NODE_TYPE_META: Record<
  AccessGraphNode["type"],
  {
    label: string;
    short: string;
    icon: typeof Building2;
    panel: string;
    iconTone: string;
    minimapColor: string;
  }
> = {
  organization: {
    label: "Organization",
    short: "ORG",
    icon: Building2,
    panel: "border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/30",
    iconTone: "text-sky-700 dark:text-sky-300",
    minimapColor: "#0ea5e9",
  },
  vault: {
    label: "Vaults",
    short: "VAULT",
    icon: Boxes,
    panel: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30",
    iconTone: "text-emerald-700 dark:text-emerald-300",
    minimapColor: "#10b981",
  },
  group: {
    label: "Folders",
    short: "FOLDER",
    icon: FolderTree,
    panel: "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30",
    iconTone: "text-amber-700 dark:text-amber-300",
    minimapColor: "#f59e0b",
  },
  secret: {
    label: "Secrets",
    short: "SECRET",
    icon: Shield,
    panel: "border-violet-200 bg-violet-50/80 dark:border-violet-900 dark:bg-violet-950/30",
    iconTone: "text-violet-700 dark:text-violet-300",
    minimapColor: "#8b5cf6",
  },
  key: {
    label: "Keys",
    short: "KEY",
    icon: KeyRound,
    panel: "border-indigo-200 bg-indigo-50/80 dark:border-indigo-900 dark:bg-indigo-950/30",
    iconTone: "text-indigo-700 dark:text-indigo-300",
    minimapColor: "#6366f1",
  },
  team: {
    label: "Teams",
    short: "TEAM",
    icon: Users,
    panel: "border-orange-200 bg-orange-50/80 dark:border-orange-900 dark:bg-orange-950/30",
    iconTone: "text-orange-700 dark:text-orange-300",
    minimapColor: "#f97316",
  },
  member: {
    label: "Members",
    short: "MEMBER",
    icon: UserRound,
    panel: "border-fuchsia-200 bg-fuchsia-50/80 dark:border-fuchsia-900 dark:bg-fuchsia-950/30",
    iconTone: "text-fuchsia-700 dark:text-fuchsia-300",
    minimapColor: "#d946ef",
  },
  role: {
    label: "Roles",
    short: "ROLE",
    icon: Workflow,
    panel: "border-teal-200 bg-teal-50/80 dark:border-teal-900 dark:bg-teal-950/30",
    iconTone: "text-teal-700 dark:text-teal-300",
    minimapColor: "#14b8a6",
  },
  policy: {
    label: "Policies",
    short: "POLICY",
    icon: SlidersHorizontal,
    panel: "border-rose-200 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/30",
    iconTone: "text-rose-700 dark:text-rose-300",
    minimapColor: "#f43f5e",
  },
};

type FlowNodeData = {
  graphNode: AccessGraphNode;
  relationCount: number;
  highlighted: boolean;
};

const COLUMN_WIDTH = 304;
const COLUMN_GAP = 108;
const ROW_HEIGHT = 150;
const ROW_GAP = 26;
const START_X = 80;
const START_Y = 112;

function summarizeReasons(entry: unknown) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const candidate = entry as {
    action?: string;
    allowed?: boolean;
    denied?: boolean;
    reasons?: Array<{ policyName?: string; roleName?: string; teamName?: string | null }>;
  };

  if (!candidate.action) {
    return null;
  }

  const reasonText = (candidate.reasons || [])
    .slice(0, 3)
    .map((reason) => [reason.policyName, reason.roleName, reason.teamName].filter(Boolean).join(" / "))
    .filter(Boolean)
    .join(", ");

  return (
    <div key={candidate.action} className="rounded-xl border border-border/80 bg-background/75 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{candidate.action}</p>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {candidate.denied ? "Denied" : candidate.allowed ? "Allowed" : "No match"}
        </span>
      </div>
      {reasonText ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{reasonText}</p> : null}
    </div>
  );
}

function summarizeNodeMeta(node: AccessGraphNode) {
  const meta = node.meta && typeof node.meta === "object" ? node.meta : null;
  if (!meta) {
    return [];
  }

  return Object.entries(meta)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 3)
    .map(([key, value]) => ({
      key: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
      value: String(value),
    }));
}

function renderDetailRows(details: Record<string, unknown>) {
  const flattened: Array<[string, string | number | boolean]> = [];

  Object.entries(details).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      flattened.push([key, value]);
      return;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        if (
          typeof nestedValue === "string" ||
          typeof nestedValue === "number" ||
          typeof nestedValue === "boolean"
        ) {
          flattened.push([`${key}.${nestedKey}`, nestedValue]);
        }
      });
    }
  });

  if (flattened.length > 0) {
    return (
      <div className="space-y-2 rounded-2xl border border-border/80 bg-background/75 p-4">
        {flattened.slice(0, 8).map(([key, value]) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {key.replace(/([A-Z])/g, " $1")}
            </p>
            <p className="text-right text-sm text-foreground">{String(value)}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-background/75 p-4">
      <pre className="overflow-auto text-xs leading-6 text-muted-foreground">{JSON.stringify(details, null, 2)}</pre>
    </div>
  );
}

function GraphEntityNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const meta = NODE_TYPE_META[data.graphNode.type];
  const Icon = meta.icon;
  const summary = summarizeNodeMeta(data.graphNode);

  return (
    <div
      className={cn(
        "w-[276px] overflow-hidden rounded-[20px] border bg-card text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition",
        selected
          ? "border-foreground/35 shadow-lg"
          : data.highlighted
            ? "border-foreground/15 shadow-sm"
            : "border-border shadow-none",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-background !bg-border" />
      <div className={cn("border-b px-4 py-3", meta.panel)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon className={cn("h-4 w-4", meta.iconTone)} />
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {meta.short}
            </span>
          </div>
          {selected ? (
            <span className="rounded-full border border-foreground/10 bg-background/80 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-foreground">
              Focus
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 px-4 py-3">
        <div>
          <p className="truncate text-sm font-semibold text-foreground">{data.graphNode.label}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{data.graphNode.subtitle || ""}</p>
        </div>
        <div className="grid gap-1.5">
          {summary.length > 0 ? (
            summary.map((entry) => (
              <div key={`${data.graphNode.id}-${entry.key}`} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{entry.key}</span>
                <span className="truncate text-right text-foreground">{entry.value}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Connections</span>
              <span className="text-foreground">{data.relationCount}</span>
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-background !bg-border" />
    </div>
  );
}

const nodeTypes = {
  entity: GraphEntityNode,
};

export default function AccessGraphPage() {
  const permissions = useRBAC();
  const { currentOrganization } = useOrganizationStore();
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<AccessGraphNode["type"]>>(
    () => new Set(NODE_TYPE_ORDER),
  );
  const [selectedNode, setSelectedNode] = useState<AccessGraphNode | null>(null);
  const { data, isLoading } = useAccessGraph(currentOrganization?.id, permissions.canReadPolicies);

  const visibleTypes = useMemo(
    () => NODE_TYPE_ORDER.filter((type) => activeTypes.has(type)),
    [activeTypes],
  );

  const filteredNodes = useMemo(() => {
    const nodes = data?.nodes ?? [];
    return nodes.filter((node) => {
      if (!activeTypes.has(node.type)) {
        return false;
      }
      if (!query.trim()) {
        return true;
      }
      const haystack = `${node.label} ${node.subtitle || ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [activeTypes, data?.nodes, query]);

  useEffect(() => {
    if (selectedNode && !filteredNodes.some((node) => node.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [filteredNodes, selectedNode]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredGraphEdges = useMemo(
    () => (data?.edges ?? []).filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)),
    [data?.edges, visibleNodeIds],
  );

  const edgeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filteredGraphEdges.forEach((edge) => {
      counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
      counts.set(edge.to, (counts.get(edge.to) || 0) + 1);
    });
    return counts;
  }, [filteredGraphEdges]);

  const groupedNodes = useMemo(() => {
    const grouped = new Map<AccessGraphNode["type"], AccessGraphNode[]>();
    visibleTypes.forEach((type) => grouped.set(type, []));
    filteredNodes.forEach((node) => grouped.get(node.type)?.push(node));
    visibleTypes.forEach((type) => {
      grouped.set(
        type,
        (grouped.get(type) || []).sort((left, right) => left.label.localeCompare(right.label)),
      );
    });
    return grouped;
  }, [filteredNodes, visibleTypes]);

  const selectedEdges = useMemo(() => {
    if (!selectedNode) {
      return [];
    }
    return filteredGraphEdges.filter(
      (edge) => edge.from === selectedNode.id || edge.to === selectedNode.id,
    );
  }, [filteredGraphEdges, selectedNode]);

  const relatedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedNode) {
      ids.add(selectedNode.id);
    }
    selectedEdges.forEach((edge) => {
      ids.add(edge.from);
      ids.add(edge.to);
    });
    return ids;
  }, [selectedEdges, selectedNode]);

  const flowNodes = useMemo<Node<FlowNodeData>[]>(() => {
    const nodes: Node<FlowNodeData>[] = [];
    visibleTypes.forEach((type, columnIndex) => {
      const column = groupedNodes.get(type) || [];
      column.forEach((node, rowIndex) => {
        nodes.push({
          id: node.id,
          type: "entity",
          position: {
            x: START_X + columnIndex * (COLUMN_WIDTH + COLUMN_GAP),
            y: START_Y + rowIndex * (ROW_HEIGHT + ROW_GAP),
          },
          data: {
            graphNode: node,
            relationCount: edgeCounts.get(node.id) || 0,
            highlighted: selectedNode ? relatedNodeIds.has(node.id) : false,
          },
          draggable: false,
          selectable: true,
        });
      });
    });
    return nodes;
  }, [edgeCounts, groupedNodes, relatedNodeIds, selectedNode, visibleTypes]);

  const flowEdges = useMemo<Edge[]>(() => {
    const selectedId = selectedNode?.id;
    return filteredGraphEdges.map((edge) => {
      const isFocused = selectedId ? edge.from === selectedId || edge.to === selectedId : false;
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
        },
        style: {
          stroke: isFocused ? "hsl(var(--foreground))" : "hsl(var(--border))",
          strokeOpacity: isFocused ? 0.44 : 0.55,
          strokeWidth: isFocused ? 1.6 : 1.1,
          strokeDasharray: edge.type === "attached-policy" ? "5 4" : undefined,
        },
        zIndex: isFocused ? 3 : 1,
      } satisfies Edge;
    });
  }, [filteredGraphEdges, selectedNode?.id]);

  const nodeMap = useMemo(
    () => new Map(filteredNodes.map((node) => [node.id, node])),
    [filteredNodes],
  );

  const relatedNodesByType = useMemo(() => {
    const sections = new Map<AccessGraphNode["type"], AccessGraphNode[]>();
    visibleTypes.forEach((type) => sections.set(type, []));
    selectedEdges.forEach((edge) => {
      const related = edge.from === selectedNode?.id ? nodeMap.get(edge.to) : nodeMap.get(edge.from);
      if (!related) {
        return;
      }
      const current = sections.get(related.type) || [];
      if (!current.some((node) => node.id === related.id)) {
        current.push(related);
        sections.set(related.type, current);
      }
    });
    return sections;
  }, [nodeMap, selectedEdges, selectedNode?.id, visibleTypes]);

  const detailQuery = useAccessGraphDetail(
    currentOrganization?.id,
    selectedNode?.type,
    selectedNode?.entityId,
    permissions.canReadPolicies && Boolean(selectedNode),
  );

  if (!permissions.canReadPolicies) {
    return (
      <DashboardLayout>
        <section className="rounded-[20px] border border-border bg-card px-6 py-10">
          <p className="app-eyebrow">Access graph</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Restricted</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Policy access is required to inspect structure and effective access.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout fullWidth contentClassName="pb-0 pt-6">
      <div className="flex min-h-[calc(100vh-88px)] flex-col gap-5">
        <section className="flex flex-col gap-5 rounded-[24px] border border-border bg-card px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="app-eyebrow">Access graph</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {currentOrganization?.name || "Current organization"}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                React Flow powers a full workspace board. Inspect structure on the canvas and access on the side.
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search nodes"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {NODE_TYPE_ORDER.map((type) => {
              const active = activeTypes.has(type);
              const meta = NODE_TYPE_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setActiveTypes((current) => {
                      const next = new Set(current);
                      if (next.has(type)) {
                        next.delete(type);
                      } else {
                        next.add(type);
                      }
                      return next;
                    })
                  }
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                    active
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedNode(null);
                setActiveTypes(new Set(NODE_TYPE_ORDER));
              }}
              className="rounded-full border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
            >
              Reset view
            </button>
          </div>
        </section>

        <section className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-[720px] overflow-hidden rounded-[24px] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Network className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Schema visualizer</p>
                  <p className="text-sm text-muted-foreground">
                    {data
                      ? `${filteredNodes.length} visible nodes • ${selectedNode ? selectedEdges.length : 0} focused links`
                      : "Loading structure"}
                  </p>
                </div>
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Pan, zoom, focus
              </p>
            </div>

            <div className="h-[calc(100%-73px)] min-h-[640px] [&_.react-flow__attribution]:hidden [&_.react-flow__controls]:!border-border [&_.react-flow__controls]:!bg-background/95 [&_.react-flow__controls-button]:!border-border [&_.react-flow__controls-button]:!bg-transparent [&_.react-flow__controls-button]:!text-foreground [&_.react-flow__edge-path]:transition-opacity [&_.react-flow__minimap]:!rounded-2xl [&_.react-flow__minimap]:!border [&_.react-flow__minimap]:!border-border [&_.react-flow__minimap]:!bg-background/95">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  fitView
                  minZoom={0.45}
                  maxZoom={1.45}
                  onPaneClick={() => setSelectedNode(null)}
                  onNodeClick={(_, node) => setSelectedNode(node.data.graphNode)}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable
                  panOnScroll
                  selectionOnDrag={false}
                  proOptions={{ hideAttribution: true }}
                  className="bg-background"
                >
                  <Background gap={18} size={1.15} color="hsl(var(--border))" />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => {
                      const type = (node.data as FlowNodeData | undefined)?.graphNode.type;
                      return type ? NODE_TYPE_META[type].minimapColor : "#94a3b8";
                    }}
                  />
                  <Controls showInteractive={false} position="top-right" />
                </ReactFlow>
              )}
            </div>
          </div>

          <aside className="min-h-[720px] rounded-[24px] border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-medium text-foreground">
                {selectedNode ? "Inspector" : "Select a node"}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {selectedNode
                  ? "The inspector explains linked entities and effective access for the focused node."
                  : "Pick a node on the board to inspect structure and access."}
              </p>
            </div>

            <div className="space-y-5 overflow-auto px-5 py-5">
              {detailQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading inspector
                </div>
              ) : detailQuery.data ? (
                <>
                  <div className="space-y-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {detailQuery.data.nodeType}
                    </p>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {detailQuery.data.title}
                      </h2>
                      {detailQuery.data.subtitle ? (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {detailQuery.data.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {selectedNode ? (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">Related entities</h3>
                        <span className="text-xs text-muted-foreground">{selectedEdges.length} links</span>
                      </div>
                      <div className="space-y-3">
                        {visibleTypes.map((type) => {
                          const items = relatedNodesByType.get(type) || [];
                          if (items.length === 0) {
                            return null;
                          }

                          return (
                            <div key={`related-${type}`} className="rounded-2xl border border-border/80 bg-background/70 p-4">
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">{NODE_TYPE_META[type].label}</p>
                                <span className="text-xs text-muted-foreground">{items.length}</span>
                              </div>
                              <div className="space-y-2">
                                {items.map((item) => (
                                  <div key={item.id} className="rounded-xl border border-border bg-background px-3 py-2">
                                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                                    {item.subtitle ? (
                                      <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {detailQuery.data.resourceAccess ? (
                    <section className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">Resource access</h3>
                      <div className="space-y-3">
                        {Object.entries(detailQuery.data.resourceAccess).map(([section, value]) => {
                          const items = Array.isArray(value) ? value : [];
                          if (items.length === 0) {
                            return null;
                          }

                          return (
                            <div key={section} className="rounded-2xl border border-border/80 bg-background/70 p-4">
                              <h4 className="mb-3 text-sm font-medium capitalize text-foreground">{section}</h4>
                              <div className="space-y-3">
                                {items.map((item, index) => {
                                  const candidate = item as {
                                    id?: string;
                                    name?: string;
                                    actions?: unknown[];
                                  };

                                  return (
                                    <div key={candidate.id || `${section}-${index}`} className="rounded-xl border border-border bg-background px-3 py-3">
                                      <p className="text-sm font-medium text-foreground">
                                        {candidate.name || candidate.id}
                                      </p>
                                      <div className="mt-2 space-y-2">
                                        {(candidate.actions || []).map((entry) => summarizeReasons(entry))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {detailQuery.data.principalAccess ? (
                    <section className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">Principal access</h3>
                      <div className="space-y-3">
                        {Object.entries(detailQuery.data.principalAccess).map(([section, value]) => {
                          const items = Array.isArray(value) ? value : [];
                          if (items.length === 0) {
                            return null;
                          }

                          return (
                            <div key={section} className="rounded-2xl border border-border/80 bg-background/70 p-4">
                              <h4 className="mb-3 text-sm font-medium capitalize text-foreground">{section}</h4>
                              <div className="space-y-3">
                                {items.map((item, index) => {
                                  const candidate = item as {
                                    id?: string;
                                    name?: string;
                                    email?: string;
                                    actions?: unknown[];
                                  };

                                  return (
                                    <div key={candidate.id || `${section}-${index}`} className="rounded-xl border border-border bg-background px-3 py-3">
                                      <p className="text-sm font-medium text-foreground">
                                        {candidate.name || candidate.id}
                                      </p>
                                      {candidate.email ? (
                                        <p className="mt-1 text-xs text-muted-foreground">{candidate.email}</p>
                                      ) : null}
                                      <div className="mt-2 space-y-2">
                                        {(candidate.actions || []).map((entry) => summarizeReasons(entry))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {detailQuery.data.details ? renderDetailRows(detailQuery.data.details) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No inspector data available.</p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </DashboardLayout>
  );
}
