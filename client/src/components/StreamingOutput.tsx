import { useEffect, useRef, useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import type { OutputSource } from '../types';

const sourceLabels: Record<OutputSource, string> = {
  agent: 'Agent 输出',
  system: '系统',
  tool: 'Tool 结果',
};

export function StreamingOutput() {
  const {
    nodeOutputs,
    nodeOutputSources,
    streamingNodeIds,
    nodeStatuses,
    isRunning,
    agentPhase,
  } = useWorkflowStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const entries = Object.entries(nodeOutputs);
  const activeId = [...streamingNodeIds].find((id) => nodeStatuses[id] === 'running') ?? null;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [nodeOutputs, autoScroll, streamingNodeIds]);

  const phaseLabel =
    agentPhase === 'planning'
      ? '准备中'
      : agentPhase === 'tool'
        ? '调用工具'
        : agentPhase === 'generating'
          ? '生成回答'
          : null;

  return (
    <div className="streaming-output">
      <div className="streaming-output-header">
        <div className="section-title section-title--inline">
          <span>Agent 流式输出</span>
          {isRunning && phaseLabel && (
            <span className={`agent-phase agent-phase--${agentPhase}`}>{phaseLabel}</span>
          )}
        </div>
        <label className="auto-scroll-toggle">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          跟随滚动
        </label>
      </div>

      <div className="streaming-output-body" ref={scrollRef}>
        {entries.length === 0 ? (
          <p className="empty-hint">运行后将在此实时显示 Agent 输出</p>
        ) : (
          entries.map(([nodeId, text]) => {
            const source = nodeOutputSources[nodeId] ?? 'agent';
            const isStreaming = streamingNodeIds.has(nodeId) && nodeStatuses[nodeId] === 'running';
            const isActive = nodeId === activeId;

            return (
              <div
                key={nodeId}
                className={`stream-block source-${source} ${isActive ? 'stream-block--active' : ''}`}
              >
                <div className="stream-block-header">
                  <span className={`stream-source-badge source-${source}`}>
                    {sourceLabels[source]}
                  </span>
                  <span className="stream-node-id">{nodeId}</span>
                  {isStreaming && <span className="stream-live">LIVE</span>}
                </div>
                <pre className="stream-text">
                  {text}
                  {isStreaming && <span className="stream-cursor" aria-hidden />}
                </pre>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
