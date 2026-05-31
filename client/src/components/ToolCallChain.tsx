import { useCallback, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';

function formatResult(result: unknown): string {
  if (typeof result === 'string') return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function formatDuration(ms?: number): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function ToolCallChain() {
  const toolCalls = useWorkflowStore((s) => s.toolCalls);
  const focusedToolCallId = useWorkflowStore((s) => s.focusedToolCallId);
  const setFocusedToolCallId = useWorkflowStore((s) => s.setFocusedToolCallId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const isExpanded = (id: string) => expanded[id] ?? true;

  const copyText = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  }, []);

  if (toolCalls.length === 0) {
    return (
      <div className="tool-chain empty">
        <p>Function Calling 过程将在执行时显示</p>
      </div>
    );
  }

  return (
    <div className="tool-chain tool-chain--timeline">
      {toolCalls.map((tc, i) => {
        const resultText = tc.result !== undefined ? formatResult(tc.result) : '';
        const expandedState = isExpanded(tc.id);
        const isFocused = focusedToolCallId === tc.id;

        return (
          <div key={tc.id} className="tool-timeline-item">
            <div className="tool-timeline-rail">
              <span className={`tool-timeline-dot status-${tc.status}`} />
              {i < toolCalls.length - 1 && <span className="tool-timeline-line" />}
            </div>

            <div
              className={`tool-call-item status-${tc.status} ${isFocused ? 'tool-call-item--focused' : ''}`}
              onClick={() => setFocusedToolCallId(isFocused ? null : tc.id)}
            >
              <div className="tool-call-header">
                <span className="tool-call-index">{i + 1}</span>
                <div className="tool-call-meta">
                  <span className="tool-call-name">
                    {tc.mcpServer}/{tc.tool}
                  </span>
                  <span className="tool-call-node">{tc.nodeId}</span>
                </div>
                <span className={`tool-call-status ${tc.status}`}>
                  {tc.status === 'success' ? 'SUCCESS' : tc.status}
                </span>
                <span className="tool-call-duration">{formatDuration(tc.durationMs)}</span>
                <button
                  type="button"
                  className="tool-call-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(tc.id);
                  }}
                  aria-expanded={expandedState}
                >
                  {expandedState ? '−' : '+'}
                </button>
              </div>

              {expandedState && (
                <div className="tool-call-body">
                  {tc.args && (
                    <div className="tool-call-section">
                      <div className="tool-call-section-head">
                        <span>参数</span>
                        <button
                          type="button"
                          className="tool-copy-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyText(`${tc.id}-args`, JSON.stringify(tc.args, null, 2));
                          }}
                        >
                          {copiedId === `${tc.id}-args` ? '已复制' : '复制'}
                        </button>
                      </div>
                      <pre className="tool-call-args">{JSON.stringify(tc.args, null, 2)}</pre>
                    </div>
                  )}

                  {tc.status === 'error' && tc.error && (
                    <div className="tool-call-error">{tc.error}</div>
                  )}

                  {tc.result !== undefined && (
                    <div className="tool-call-section">
                      <div className="tool-call-section-head">
                        <span>结果</span>
                        <button
                          type="button"
                          className="tool-copy-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyText(`${tc.id}-result`, resultText);
                          }}
                        >
                          {copiedId === `${tc.id}-result` ? '已复制' : '复制'}
                        </button>
                      </div>
                      <pre className="tool-call-result">{resultText.slice(0, 1200)}</pre>
                    </div>
                  )}

                  {tc.status === 'running' && (
                    <div className="tool-call-pending">等待 MCP 返回…</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
