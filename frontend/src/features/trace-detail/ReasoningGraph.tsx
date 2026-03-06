import { useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { AgentStep } from '../../lib/api';
import { GraphNode } from './GraphNode';
import type { GraphNodeData } from './GraphNode';
import styles from './TraceDetail.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_TYPES = { graphNode: GraphNode } as const;

const NODE_W = 180;
const NODE_H = 76;
const H_GAP  = 48;
const V_GAP  = 72;

// ── Layout engine ─────────────────────────────────────────────────────────────
// Assigns x/y positions using depth-first level assignment via parentId chain.
// No external dependencies required.

function buildLayout(
  steps: AgentStep[],
  rootStepId: string,
): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const stepMap = new Map(steps.map((s) => [s.stepId, s]));

  // Compute depth for each step (distance from root via parentId chain).
  // Uses a computing set to guard against cycles.
  const depthCache  = new Map<string, number>();
  const computing   = new Set<string>();

  function getDepth(id: string): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (computing.has(id))  return 0; // cycle guard
    computing.add(id);
    const step = stepMap.get(id);
    const d = step?.parentId ? getDepth(step.parentId) + 1 : 0;
    depthCache.set(id, d);
    computing.delete(id);
    return d;
  }
  steps.forEach((s) => getDepth(s.stepId));

  // Group steps by depth level
  const byDepth = new Map<number, AgentStep[]>();
  steps.forEach((s) => {
    const d = depthCache.get(s.stepId) ?? 0;
    const arr = byDepth.get(d) ?? [];
    arr.push(s);
    byDepth.set(d, arr);
  });

  // Assign positions: levels are rows, steps within a level are columns
  const nodes: Node<GraphNodeData>[] = [];
  byDepth.forEach((levelSteps, depth) => {
    const rowWidth = levelSteps.length * NODE_W + (levelSteps.length - 1) * H_GAP;
    const startX   = -rowWidth / 2;
    levelSteps.forEach((step, i) => {
      nodes.push({
        id:       step.stepId,
        type:     'graphNode',
        position: {
          x: startX + i * (NODE_W + H_GAP),
          y: depth  * (NODE_H + V_GAP),
        },
        data: {
          step,
          isRoot:   step.stepId === rootStepId,
          isActive: false, // set by selection effect
        },
      });
    });
  });

  // Edges follow parentId relationships
  const edges: Edge[] = steps
    .filter((s) => s.parentId && stepMap.has(s.parentId))
    .map((s) => ({
      id:     `${s.parentId}->${s.stepId}`,
      source: s.parentId!,
      target: s.stepId,
      type:   'smoothstep',
      style:  { stroke: 'var(--border)', strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ReasoningGraphProps {
  steps: AgentStep[];
  rootStepId: string;
  activeStepId: string | null;
  onSelect: (step: AgentStep) => void;
}

export function ReasoningGraph({
  steps,
  rootStepId,
  activeStepId,
  onSelect,
}: ReasoningGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Rebuild layout whenever the graph structure changes
  useEffect(() => {
    const { nodes: n, edges: e } = buildLayout(steps, rootStepId);
    setNodes(n);
    setEdges(e);
  }, [steps, rootStepId, setNodes, setEdges]);

  // Lightweight selection update — avoids a full layout rebuild on every click
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, isActive: n.id === activeStepId },
      })),
    );
  }, [activeStepId, setNodes]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      const step = steps.find((s) => s.stepId === node.id);
      if (step) onSelect(step);
    },
    [steps, onSelect],
  );

  return (
    <div className={styles.graphContainer}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2.5}
        panOnScroll
        deleteKeyCode={null}   // prevent accidental deletions
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="var(--border-muted)"
          gap={20}
          size={1}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
