import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData } from '../../types';

const statusColors: Record<string, string> = {
  pending: '#52ffb8',
  running: '#38bdf8',
  success: '#52ffb8',
  error: '#fb7185',
  retrying: '#fbbf24',
};

const nodeMeta: Record<string, { color: string; tag: string }> = {
  start: { color: '#52ffb8', tag: 'START' },
  end: { color: '#52ffb8', tag: 'END' },
  agent: { color: '#52ffb8', tag: 'AGENT' },
  tool: { color: '#52ffb8', tag: 'TOOL' },
  condition: { color: '#52ffb8', tag: 'IF' },
};

function NodeShell({
  children,
  type,
  status,
  selected,
}: {
  children: React.ReactNode;
  type: string;
  status?: string;
  selected?: boolean;
}) {
  const meta = nodeMeta[type] ?? { color: '#52ffb8', tag: 'NODE' };
  const borderColor = status ? statusColors[status] ?? meta.color : meta.color;

  return (
    <div
      className={`custom-node custom-node--${type} ${selected ? 'selected' : ''} ${status ? `status-${status}` : ''}`}
      style={
        {
          '--node-accent': meta.color,
          '--node-border': borderColor,
        } as React.CSSProperties
      }
    >
      <div className="node-header">
        <span className="node-tag">{meta.tag}</span>
        {status && status !== 'pending' && <span className={`node-status-dot status-${status}`} />}
      </div>
      {children}
    </div>
  );
}

export const StartNode = memo(({ data, selected, type }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell type={type ?? 'start'} status={d.status} selected={selected}>
      <Handle type="source" position={Position.Right} className="node-handle" />
      <div className="node-body">
        <div className="node-icon">▶</div>
        <div className="node-label">{d.label || '开始'}</div>
      </div>
    </NodeShell>
  );
});

export const EndNode = memo(({ data, selected, type }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell type={type ?? 'end'} status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="node-body">
        <div className="node-icon">⏹</div>
        <div className="node-label">{d.label || '结束'}</div>
      </div>
    </NodeShell>
  );
});

export const AgentNode = memo(({ data, selected, type }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell type={type ?? 'agent'} status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
      <div className="node-body">
        <div className="node-icon">🤖</div>
        <div className="node-label">{d.label || 'Agent'}</div>
        {d.prompt && <div className="node-sub">{d.prompt.slice(0, 48)}…</div>}
      </div>
    </NodeShell>
  );
});

export const ToolNode = memo(({ data, selected, type }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell type={type ?? 'tool'} status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
      <div className="node-body">
        <div className="node-icon">🔧</div>
        <div className="node-label">{d.label || 'MCP Tool'}</div>
        {d.toolName && (
          <div className="node-sub">
            {d.mcpServer}/{d.toolName}
          </div>
        )}
      </div>
    </NodeShell>
  );
});

export const ConditionNode = memo(({ data, selected, type }: NodeProps) => {
  const d = data as unknown as FlowNodeData;
  return (
    <NodeShell type={type ?? 'condition'} status={d.status} selected={selected}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} id="true" style={{ top: '35%' }} className="node-handle" />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '65%' }} className="node-handle" />
      <div className="node-body">
        <div className="node-icon">◇</div>
        <div className="node-label">{d.label || '条件'}</div>
        {d.expression && <div className="node-sub">{d.expression}</div>}
      </div>
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
