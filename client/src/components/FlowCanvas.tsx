import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import type { PaletteItem } from './NodePalette';
import { useWorkflowStore } from '../store/workflowStore';

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 80, y: 200 },
    data: { label: '开始' },
  },
  {
    id: 'agent-1',
    type: 'agent',
    position: { x: 320, y: 180 },
    data: {
      label: 'Agent',
      prompt: '请 fetch https://example.com 并总结内容',
      maxRetries: 3,
    },
  },
  {
    id: 'end-1',
    type: 'end',
    position: { x: 600, y: 200 },
    data: { label: '结束' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'start-1', target: 'agent-1', animated: true },
  { id: 'e2', source: 'agent-1', target: 'end-1', animated: true },
];

let nodeIdCounter = 10;

function FlowCanvasInner({ onFlowChange }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const nodeStatuses = useWorkflowStore((s) => s.nodeStatuses);

  const nodesWithStatus = nodes.map((n) => ({
    ...n,
    data: { ...n.data, status: nodeStatuses[n.id] ?? 'pending' },
  }));

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const item: PaletteItem = JSON.parse(raw);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = `${item.type}-${++nodeIdCounter}`;

      const newNode: Node = {
        id,
        type: item.type,
        position,
        data: { ...item.defaultData },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div className="flow-wrapper" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodesWithStatus}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background gap={20} color="#334155" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              start: '#10b981',
              agent: '#8b5cf6',
              tool: '#0ea5e9',
              condition: '#f59e0b',
              end: '#6366f1',
            };
            return colors[n.type ?? ''] ?? '#64748b';
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
        />
      </ReactFlow>
      <FlowSync nodes={nodes} edges={edges} onFlowChange={onFlowChange} />
    </div>
  );
}

interface Props {
  onFlowChange?: (nodes: Node[], edges: Edge[]) => void;
}

function FlowSync({
  nodes,
  edges,
  onFlowChange,
}: {
  nodes: Node[];
  edges: Edge[];
  onFlowChange?: (nodes: Node[], edges: Edge[]) => void;
}) {
  const prevRef = useRef('');
  const serialized = JSON.stringify({ nodes, edges });
  if (serialized !== prevRef.current) {
    prevRef.current = serialized;
    onFlowChange?.(nodes, edges);
  }
  return null;
}

export function FlowCanvas({ onFlowChange }: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner onFlowChange={onFlowChange} />
    </ReactFlowProvider>
  );
}
