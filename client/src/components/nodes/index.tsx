import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../types';

const statusColors: Record<string, string> = {
  pending: '#64748b',
  running: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
  retrying: '#f59e0b',
};

function NodeShell({
  children,
  color,
  status,
  selected,
}: {
  children: React.ReactNode;
  color: string;
  status?: string;
  selected?: boolean;
}) {
  const borderColor = status ? statusColors[status] ?? color : color;
  return (
    <div
      className={`custom-node ${selected ? 'selected' : ''}`}
      style={{ borderColor, boxShadow: selected ? `0 0 0 2px ${borderColor}40` : undefined }}
    >
      <div className="node-accent" style={{ background: color }} />
      {children}
    </div>
  );
}

export const StartNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell color="#10b981" status={d.status} selected={selected}>
      <Handle type="source" position={Position.Right} />
      <div className="node-icon">▶</div>
      <div className="node-label">{d.label || '开始'}</div>
    </NodeShell>
  );
});

export const EndNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell color="#6366f1" status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} />
      <div className="node-icon">⏹</div>
      <div className="node-label">{d.label || '结束'}</div>
    </NodeShell>
  );
});

export const AgentNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell color="#8b5cf6" status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="node-icon">🤖</div>
      <div className="node-label">{d.label || 'Agent'}</div>
      {d.prompt && <div className="node-sub">{d.prompt.slice(0, 40)}...</div>}
    </NodeShell>
  );
});

export const ToolNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell color="#0ea5e9" status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="node-icon">🔧</div>
      <div className="node-label">{d.label || 'MCP Tool'}</div>
      {d.toolName && (
        <div className="node-sub">
          {d.mcpServer}/{d.toolName}
        </div>
      )}
    </NodeShell>
  );
});

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell color="#f59e0b" status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} id="true" style={{ top: '35%' }} />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '65%' }} />
      <div className="node-icon">◇</div>
      <div className="node-label">{d.label || '条件'}</div>
      {d.expression && <div className="node-sub">{d.expression}</div>}
    </NodeShell>
  );
});

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  agent: AgentNode,
  tool: ToolNode,
  condition: ConditionNode,
};
