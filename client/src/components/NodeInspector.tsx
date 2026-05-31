import type { Node } from '@xyflow/react';
import { useWorkflowStore } from '../store/workflowStore';
import type { FlowNodeData } from '../types';

interface Props {
  node: Node | null;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="inspector-field">
      <span className="inspector-label">{label}</span>
      {hint && <span className="inspector-hint">{hint}</span>}
      {children}
    </label>
  );
}

export function NodeInspector({ node, onUpdate }: Props) {
  const mcpServers = useWorkflowStore((s) => s.mcpServers);

  if (!node) {
    return (
      <div className="panel inspector-panel inspector-panel--empty">
        <p className="empty-hint">点击画布上的节点以编辑 Prompt、工具参数等</p>
      </div>
    );
  }

  const data = node.data as unknown as FlowNodeData;
  const type = node.type ?? 'agent';

  const patch = (updates: Partial<FlowNodeData>) => onUpdate(node.id, updates);

  const fetchTools = (serverId: string) =>
    mcpServers.find((s) => s.id === serverId)?.tools ?? [];

  return (
    <div className="panel inspector-panel">
      <div className="inspector-header">
        <span className={`inspector-type-badge type-${type}`}>{type}</span>
        <span className="inspector-node-id">{node.id}</span>
      </div>

      <Field label="显示名称">
        <input
          className="inspector-input"
          value={data.label ?? ''}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </Field>

      {type === 'agent' && (
        <>
          <Field label="System Prompt" hint="Agent 系统指令">
            <textarea
              className="inspector-textarea"
              rows={3}
              value={data.systemPrompt ?? ''}
              onChange={(e) => patch({ systemPrompt: e.target.value })}
              placeholder="You are a helpful assistant with MCP tools."
            />
          </Field>
          <Field label="任务 Prompt" hint="支持 {{input}}、{{lastOutput}}">
            <textarea
              className="inspector-textarea"
              rows={4}
              value={data.prompt ?? ''}
              onChange={(e) => patch({ prompt: e.target.value })}
            />
          </Field>
          <Field label="最大重试">
            <input
              className="inspector-input inspector-input--short"
              type="number"
              min={1}
              max={10}
              value={data.maxRetries ?? 3}
              onChange={(e) => patch({ maxRetries: Number(e.target.value) || 3 })}
            />
          </Field>
        </>
      )}

      {type === 'tool' && (
        <>
          <Field label="MCP 服务">
            <select
              className="inspector-input"
              value={data.mcpServer ?? ''}
              onChange={(e) => {
                const serverId = e.target.value;
                const tools = fetchTools(serverId);
                patch({
                  mcpServer: serverId,
                  toolName: tools[0]?.name ?? '',
                });
              }}
            >
              <option value="">选择服务</option>
              {mcpServers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.tools.length})
                </option>
              ))}
            </select>
          </Field>
          <Field label="工具">
            <select
              className="inspector-input"
              value={data.toolName ?? ''}
              onChange={(e) => patch({ toolName: e.target.value })}
            >
              <option value="">选择工具</option>
              {fetchTools(data.mcpServer ?? '').map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="工具参数 (JSON)">
            <textarea
              className="inspector-textarea inspector-textarea--mono"
              rows={5}
              value={JSON.stringify(data.toolArgs ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  patch({ toolArgs: JSON.parse(e.target.value) });
                } catch {
                  // keep editing until valid JSON
                }
              }}
            />
          </Field>
        </>
      )}

      {type === 'condition' && (
        <Field label="条件表达式" hint="例如 lastOutput.length > 0">
          <input
            className="inspector-input"
            value={data.expression ?? ''}
            onChange={(e) => patch({ expression: e.target.value })}
          />
        </Field>
      )}

      {(type === 'start' || type === 'end') && (
        <p className="inspector-note">此节点仅需配置显示名称。</p>
      )}
    </div>
  );
}
