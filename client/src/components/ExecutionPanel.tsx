import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { ToolCallChain } from './ToolCallChain';

const eventTypeLabels: Record<string, string> = {
  workflow_start: '工作流启动',
  workflow_complete: '工作流完成',
  step_start: '步骤开始',
  step_output: '输出',
  step_complete: '步骤完成',
  step_retry: '重试',
  tool_call: '工具调用',
  tool_result: '工具结果',
  error: '错误',
};

export function ExecutionPanel() {
  const { executionEvents, isRunning, nodeOutputs, mockMode, setMockMode } =
    useWorkflowStore();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [executionEvents]);

  return (
    <div className="panel execution-panel">
      <div className="panel-header">
        <h3>执行监控</h3>
        <label className="mock-toggle">
          <input
            type="checkbox"
            checked={mockMode}
            onChange={(e) => setMockMode(e.target.checked)}
          />
          Mock 模式
        </label>
      </div>

      {isRunning && (
        <div className="running-indicator">
          <span className="pulse" /> 执行中...
        </div>
      )}

      <div className="section-title">Function Calling 链路</div>
      <ToolCallChain />

      <div className="section-title">流式日志</div>
      <div className="event-log" ref={logRef}>
        {executionEvents.length === 0 ? (
          <p className="empty-hint">点击「运行工作流」开始执行</p>
        ) : (
          executionEvents.map((ev, i) => (
            <div key={i} className={`log-entry type-${ev.type}`}>
              <span className="log-time">
                {new Date(ev.timestamp).toLocaleTimeString()}
              </span>
              <span className="log-type">{eventTypeLabels[ev.type] ?? ev.type}</span>
              {ev.nodeId && <span className="log-node">[{ev.nodeId}]</span>}
              {ev.content && <span className="log-content">{ev.content}</span>}
              {ev.message && <span className="log-error">{ev.message}</span>}
              {ev.type === 'step_retry' && (
                <span className="log-retry">
                  第 {ev.attempt}/{ev.maxAttempts} 次重试
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {Object.keys(nodeOutputs).length > 0 && (
        <>
          <div className="section-title">节点输出</div>
          <div className="node-outputs">
            {Object.entries(nodeOutputs).map(([nodeId, output]) => (
              <div key={nodeId} className="node-output-item">
                <strong>{nodeId}</strong>
                <pre>{output}</pre>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
