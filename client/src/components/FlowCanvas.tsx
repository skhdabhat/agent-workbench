import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
import type { FlowNodeData } from '../types';
import { getMaxNodeId, loadWorkflowFromStorage } from '../lib/workflowStorage';
import { workflowTemplates } from '../lib/workflowTemplates';

const defaultTemplate = workflowTemplates[0];

function getInitialFlow(): { nodes: Node[]; edges: Edge[] } {
  const saved = loadWorkflowFromStorage();
  if (saved?.nodes?.length) {
    return { nodes: saved.nodes, edges: saved.edges };
  }
  return { nodes: defaultTemplate.nodes, edges: defaultTemplate.edges };
}

const initialFlow = getInitialFlow();

let nodeIdCounter = getMaxNodeId(initialFlow.nodes);

export interface FlowCanvasHandle {
  updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void;
  loadWorkflow: (nodes: Node[], edges: Edge[]) => void;
}

interface Props {
  onFlowChange?: (nodes: Node[], edges: Edge[]) => void;
  onSelectNode?: (node: Node | null) => void;
}

const FlowCanvasInner = forwardRef<FlowCanvasHandle, Props>(function FlowCanvasInner(
  { onFlowChange, onSelectNode },
  ref
) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const nodeStatuses = useWorkflowStore((s) => s.nodeStatuses);

  const loadWorkflow = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      nodeIdCounter = getMaxNodeId(newNodes);
      setNodes(newNodes);
      setEdges(newEdges);
      onSelectNode?.(null);
      window.requestAnimationFrame(() => fitView({ padding: 0.22, duration: 280 }));
    },
    [setNodes, setEdges, onSelectNode, fitView]
  );

  useImperativeHandle(ref, () => ({
    updateNodeData: (nodeId, data) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      );
    },
    loadWorkflow,
  }));

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
      onSelectNode?.(newNode);
    },
    [screenToFlowPosition, setNodes, onSelectNode]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      onSelectNode?.(selected[0] ?? null);
    },
    [onSelectNode]
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
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(100, 116, 139, 0.18)" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              start: '#52ffb8',
              agent: '#52ffb8',
              tool: '#52ffb8',
              condition: '#52ffb8',
              end: '#52ffb8',
            };
            return colors[n.type ?? ''] ?? '#64748b';
          }}
          maskColor="rgba(6, 9, 14, 0.82)"
        />
      </ReactFlow>
      <FlowSync nodes={nodes} edges={edges} onFlowChange={onFlowChange} />
    </div>
  );
});

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

export const FlowCanvas = forwardRef<FlowCanvasHandle, Props>(function FlowCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner ref={ref} {...props} />
    </ReactFlowProvider>
  );
});
