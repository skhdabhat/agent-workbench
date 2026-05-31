import { useWorkflowStore } from '../store/workflowStore';

export function ToolCallChain() {
  const toolCalls = useWorkflowStore((s) => s.toolCalls);

  if (toolCalls.length === 0) {
    return (
      <div className="tool-chain empty">
        <p>Function Calling 链路将在执行时显示</p>
      </div>
    );
  }

  return (
    <div className="tool-chain">
      {toolCalls.map((tc, i) => (
        <div key={tc.id} className={`tool-call-item status-${tc.status}`}>
          <div className="tool-call-header">
            <span className="tool-call-index">{i + 1}</span>
            <span className="tool-call-name">
              {tc.mcpServer}/{tc.tool}
            </span>
            <span className={`tool-call-status ${tc.status}`}>{tc.status}</span>
          </div>
          {tc.args && (
            <pre className="tool-call-args">{JSON.stringify(tc.args, null, 2)}</pre>
          )}
          {tc.result !== undefined && (
            <pre className="tool-call-result">
              {typeof tc.result === 'string'
                ? tc.result
                : JSON.stringify(tc.result, null, 2).slice(0, 500)}
            </pre>
          )}
          {i < toolCalls.length - 1 && <div className="tool-call-arrow">↓</div>}
        </div>
      ))}
    </div>
  );
}
