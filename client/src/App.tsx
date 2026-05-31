import { useCallback, useEffect, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { apiUrl, IS_PUBLIC_DEMO } from './lib/api';
import { FlowCanvas, type FlowCanvasHandle } from './components/FlowCanvas';
import { IntroSplash } from './components/IntroSplash';
import { NodePalette, type PaletteItem } from './components/NodePalette';
import { ExecutionPanel } from './components/ExecutionPanel';
import { NodeInspector } from './components/NodeInspector';
import { WorkflowManager, autosaveWorkflow } from './components/WorkflowManager';
import { useWorkflowExecution } from './hooks/useWorkflowExecution';
import { hasSeenIntro, markIntroSeen } from './lib/introStorage';
import { useWorkflowStore } from './store/workflowStore';
import { loadWorkflowFromStorage } from './lib/workflowStorage';
import type { FlowNodeData } from './types';
import './App.css';

const IS_DEV = import.meta.env.DEV;
const GITHUB_URL = 'https://github.com/skhdabhat/agent-workbench';

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
    let cancelled = false;
    let retryTimer: number | undefined;

    const loadServers = async (attempt = 0) => {
      try {
        const res = await fetch(apiUrl('/api/mcp/servers'));
        const data = await res.json();
        if (!cancelled) setMcpServers(data.servers ?? []);
      } catch {
        if (cancelled) return;
        if (attempt < 3) {
          retryTimer = window.setTimeout(() => void loadServers(attempt + 1), 800 * (attempt + 1));
        }
      }
    };

    void loadServers();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [setMcpServers]);

  return (
    <div className="mcp-status">
      {mcpServers.length ? (
        mcpServers.map((s) => (
          <span key={s.id} className={`mcp-badge status-${s.status}`}>
            {s.name}
          </span>
        ))
      ) : (
        <span className="mcp-badge status-pending">MCP</span>
      )}
      <button className="btn-ghost" type="button" onClick={connect} disabled={loading}>
        {loading ? '连接中...' : '重连 MCP'}
      </button>
    </div>
  );
}

export default function App() {
  const flowRef = useRef<FlowCanvasHandle>(null);
  const autosaveTimer = useRef<number | undefined>(undefined);
  const setMockMode = useWorkflowStore((s) => s.setMockMode);

  const [flowState, setFlowState] = useState<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });
  const [input, setInput] = useState(() => loadWorkflowFromStorage()?.input ?? '分析 example.com 网站内容');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [rightTab, setRightTab] = useState<'execution' | 'inspector'>('execution');
  const [llmInfo, setLlmInfo] = useState<{
    configured: boolean;
    provider?: string;
    model?: string;
  }>({ configured: false });

  const introPreviewRef = useRef(false);
  const [introVisible, setIntroVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !hasSeenIntro();
  });
  const [introPlayId, setIntroPlayId] = useState(0);
  const [appRevealing, setAppRevealing] = useState(false);

  const { runWorkflow } = useWorkflowExecution();
  const isRunning = useWorkflowStore((s) => s.isRunning);

  const handleIntroComplete = useCallback(() => {
    if (!introPreviewRef.current) markIntroSeen();
    introPreviewRef.current = false;
    setIntroVisible(false);
    setAppRevealing(true);
  }, []);

  const replayIntro = useCallback(() => {
    introPreviewRef.current = true;
    setAppRevealing(false);
    setIntroPlayId((id) => id + 1);
    setIntroVisible(true);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !hasSeenIntro()) {
      markIntroSeen();
    }
  }, []);

  useEffect(() => {
    if (!appRevealing) return;
    const t = window.setTimeout(() => setAppRevealing(false), 3400);
    return () => clearTimeout(t);
  }, [appRevealing]);

  useEffect(() => {
    if (IS_PUBLIC_DEMO) {
      setMockMode(true);
      return;
    }

    fetch(apiUrl('/api/config'))
      .then((r) => r.json())
      .then((d) => {
        const configured = Boolean(d.llmConfigured);
        setLlmInfo({
          configured,
          provider: d.provider,
          model: d.model,
        });
        if (configured) setMockMode(false);
        else {
          const hasKey = Boolean((import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim());
          const hasPublicFlag =
            import.meta.env.VITE_PUBLIC_DEMO === 'true' || import.meta.env.VITE_PUBLIC_DEMO === '1';
          setMockMode(!hasKey || hasPublicFlag);
        }
      })
      .catch(() => {
        const hasKey = Boolean((import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim());
        setLlmInfo({ configured: hasKey });
        setMockMode(!hasKey);
      });
  }, [setMockMode]);

  useEffect(() => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    if (flowState.nodes.length === 0) return;
    autosaveTimer.current = window.setTimeout(() => {
      autosaveWorkflow(flowState.nodes, flowState.edges, input);
    }, 600);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [flowState.nodes, flowState.edges, input]);

  const onFlowChange = useCallback((nodes: Node[], edges: Edge[]) => {
    setFlowState({ nodes, edges });
  }, []);

  const handleWorkflowLoad = useCallback((nodes: Node[], edges: Edge[], nextInput?: string) => {
    flowRef.current?.loadWorkflow(nodes, edges);
    if (nextInput !== undefined) setInput(nextInput);
    setSelectedNode(null);
  }, []);

  const handleSelectNode = useCallback((node: Node | null) => {
    setSelectedNode(node);
    if (node) setRightTab('inspector');
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, data: Partial<FlowNodeData>) => {
    flowRef.current?.updateNodeData(nodeId, data);
    setSelectedNode((prev) =>
      prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
    );
  }, []);

  const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleRun = () => {
    if (flowState.nodes.length === 0) return;
    setRightTab('execution');
    runWorkflow(flowState.nodes, flowState.edges, input);
  };

  const appClass = [
    'app',
    introVisible ? 'app--intro-active' : '',
    appRevealing && !introVisible ? 'app--modules-reveal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={appClass}>
      <div className="app-bg" aria-hidden />
      {introVisible && <IntroSplash key={introPlayId} onComplete={handleIntroComplete} />}
      {IS_DEV && !introVisible && (
        <button type="button" className="intro-preview-btn" onClick={replayIntro} title="开发预览：重播入场动画">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          入场动画
        </button>
      )}
      <header className="header module-float module-float--hud">
        <div className="header-left">
          <div className="brand">
            <div className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h1>Agent 工作台</h1>
              <span className="subtitle">运行实例 MCP · Function Calling</span>
            </div>
          </div>
          <span
            className={`llm-status-chip ${llmInfo.configured ? 'llm-status-chip--connected' : 'llm-status-chip--offline'}`}
            title={llmInfo.configured ? '大模型 API 已配置' : '未配置大模型，将使用 Mock 模式'}
          >
            <span className="llm-status-dot" />
            {llmInfo.configured
              ? `大模型 · ${llmInfo.provider ?? '已连接'}${llmInfo.model ? ` / ${llmInfo.model}` : ''}`
              : '大模型 · 未连接'}
          </span>
          <a className="header-link-chip" href={GITHUB_URL} target="_blank" rel="noreferrer">
            github.com/skhdabhat/agent-workbench
          </a>
        </div>

        <div className="header-right">
          <MCPStatus />
          <input
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="分析 example.com 网站内容"
          />
          <button className="btn-primary" type="button" onClick={handleRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <span className="btn-spinner" />
                运行中
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
                运行工作流
              </>
            )}
          </button>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar-left">
          <div className="module-float module-float--left-top">
            <WorkflowManager
              nodes={flowState.nodes}
              edges={flowState.edges}
              input={input}
              onLoad={handleWorkflowLoad}
            />
          </div>
          <div className="module-float module-float--left-bottom">
            <NodePalette onDragStart={onDragStart} />
          </div>
        </aside>

        <section className="canvas-area module-float module-float--stage">
          <div className="stage-boot-shell">
            <div className="stage-boot-line" aria-hidden />
            <div className="stage-boot-scan" aria-hidden />
            <div className="stage-boot-corners" aria-hidden />
            <FlowCanvas ref={flowRef} onFlowChange={onFlowChange} onSelectNode={handleSelectNode} />
          </div>
        </section>

        <aside className="sidebar-right module-float module-float--right">
          <div className="sidebar-tabs">
            <button
              type="button"
              className={`sidebar-tab ${rightTab === 'execution' ? 'active' : ''}`}
              onClick={() => setRightTab('execution')}
            >
              执行流程
            </button>
            <button
              type="button"
              className={`sidebar-tab ${rightTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setRightTab('inspector')}
            >
              节点详情
              {selectedNode && <span className="sidebar-tab-dot" />}
            </button>
          </div>
          <div className="sidebar-panel-body">
            {rightTab === 'execution' ? (
              <ExecutionPanel />
            ) : (
              <NodeInspector node={selectedNode} onUpdate={handleNodeUpdate} />
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
