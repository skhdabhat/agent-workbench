import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { ToolCallChain } from './ToolCallChain';
import { StreamingOutput } from './StreamingOutput';

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
  const { executionEvents, isRunning, mockMode, setMockMode, toolCalls, focusedToolCallId } =
    useWorkflowStore();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [executionEvents]);

  useEffect(() => {
    if (!focusedToolCallId || !logRef.current) return;
    const el = logRef.current.querySelector(`[data-tool-id="${focusedToolCallId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedToolCallId]);

  const getToolCallIdForEvent = (eventIndex: number) => {
    const callIndex = executionEvents.slice(0, eventIndex + 1).filter((e) => e.type === 'tool_call').length - 1;
    return callIndex >= 0 ? toolCalls[callIndex]?.id : undefined;
  };

  return (
    <div className="execution-panel">
      <div className="execution-panel-toolbar">
        <label className="mock-toggle">
          <input
            type="checkbox"
            checked={mockMode}
            onChange={(e) => setMockMode(e.target.checked)}
          />
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
          Mock
        </label>
      </div>

      {isRunning && (
        <div className="running-indicator">
          <span className="pulse" />
          Agent 正在执行工作流…
        </div>
      )}

      <StreamingOutput />

      <div className="section-title">
        <span>Function Calling 过程</span>
      </div>
      <ToolCallChain />

      <div className="section-title">
        <span>参数日志</span>
        <span className="section-count">{executionEvents.length}</span>
      </div>
      <div className="event-log" ref={logRef}>
        {executionEvents.length === 0 ? (
          <p className="empty-hint">点击「运行工作流」开始执行</p>
        ) : (
          executionEvents.map((ev, i) => {
            const toolId = ev.type === 'tool_call' ? getToolCallIdForEvent(i) : undefined;

            return (
              <div
                key={i}
                className={`log-entry type-${ev.type} ${toolId && focusedToolCallId === toolId ? 'log-entry--focused' : ''}`}
                data-tool-id={toolId}
              >
                <span className="log-time">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
                <span className="log-type">{eventTypeLabels[ev.type] ?? ev.type}</span>
                {ev.nodeId && <span className="log-node">{ev.nodeId}</span>}
                {ev.content && <span className="log-content">{ev.content}</span>}
                {ev.message && <span className="log-error">{ev.message}</span>}
                {ev.type === 'step_retry' && (
                  <span className="log-retry">
                    第 {ev.attempt}/{ev.maxAttempts} 次重试
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
