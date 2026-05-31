import { useCallback, useEffect, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { apiUrl, IS_PUBLIC_DEMO } from './lib/api';
import { FlowCanvas } from './components/FlowCanvas';
import { NodePalette, type PaletteItem } from './components/NodePalette';
import { ExecutionPanel } from './components/ExecutionPanel';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';
import { useWorkflowStore } from './store/workflowStore';
import './App.css';

function MCPStatus() {
  const { mcpServers, setMcpServers } = useWorkflowStore();
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/mcp/connect'), { method: 'POST' });
      const data = await res.json();
      setMcpServers(data.servers ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [setMcpServers]);

  useEffect(() => {
    fetch(apiUrl('/api/mcp/servers'))
      .then((r) => r.json())
      .then((d) => setMcpServers(d.servers ?? []))
      .catch(() => connect());
  }, [connect, setMcpServers]);

  return (
    <div className="mcp-status">
      {mcpServers.map((s) => (
        <span key={s.id} className={`mcp-badge status-${s.status}`}>
          {s.name}: {s.status} ({s.tools?.length ?? 0} tools)
        </span>
      ))}
      <button className="btn-sm" onClick={connect} disabled={loading}>
        {loading ? '连接中...' : '重连 MCP'}
      </button>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (IS_PUBLIC_DEMO) {
      useWorkflowStore.getState().setMockMode(true);
    }
  }, []);

  const [flowState, setFlowState] = useState<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });
  const [input, setInput] = useState('分析 example.com 网站内容');
  const { runWorkflow } = useWorkflowExecution();
  const isRunning = useWorkflowStore((s) => s.isRunning);

  const onFlowChange = useCallback((nodes: Node[], edges: Edge[]) => {
    setFlowState({ nodes, edges });
  }, []);

  const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleRun = () => {
    if (flowState.nodes.length === 0) return;
    runWorkflow(flowState.nodes, flowState.edges, input);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Agent 可视化工作台</h1>
          <span className="subtitle">拖拽编排 · MCP 工具 · Function Calling</span>
        </div>
        <div className="header-right">
          <MCPStatus />
          <input
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="工作流输入..."
          />
          <button className="btn-primary" onClick={handleRun} disabled={isRunning}>
            {isRunning ? '运行中...' : '▶ 运行工作流'}
          </button>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar-left">
          <NodePalette onDragStart={onDragStart} />
        </aside>

        <section className="canvas-area">
          <FlowCanvas onFlowChange={onFlowChange} />
        </section>

        <aside className="sidebar-right">
          <ExecutionPanel />
        </aside>
      </main>
    </div>
  );
}
