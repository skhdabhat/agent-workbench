import type { NodeType } from '../types';

interface PaletteItem {
  type: NodeType;
  label: string;
  icon: string;
  description: string;
  defaultData: Record<string, unknown>;
}

export const paletteItems: PaletteItem[] = [
  {
    type: 'start',
    label: '开始',
    icon: '▶',
    description: '工作流入口',
    defaultData: { label: '开始' },
  },
  {
    type: 'agent',
    label: 'Agent',
    icon: '🤖',
    description: 'LLM + Function Calling',
    defaultData: {
      label: 'Agent',
      prompt: '请帮我 fetch https://example.com 的内容',
      systemPrompt: 'You are a helpful assistant with MCP tools.',
      maxRetries: 3,
    },
  },
  {
    type: 'tool',
    label: 'MCP 工具',
    icon: '🔧',
    description: '直接调用 MCP 工具',
    defaultData: {
      label: 'Fetch URL',
      mcpServer: 'fetch',
      toolName: 'fetch',
      toolArgs: { url: 'https://example.com' },
      maxRetries: 3,
    },
  },
  {
    type: 'condition',
    label: '条件分支',
    icon: '◇',
    description: '根据表达式分支',
    defaultData: {
      label: '条件',
      expression: 'lastOutput.length > 0',
    },
  },
  {
    type: 'end',
    label: '结束',
    icon: '⏹',
    description: '工作流出口',
    defaultData: { label: '结束' },
  },
];

interface Props {
  onDragStart: (event: React.DragEvent, item: PaletteItem) => void;
}

export function NodePalette({ onDragStart }: Props) {
  return (
    <div className="panel palette">
      <h3>节点面板</h3>
      <p className="panel-hint">拖拽到画布添加节点</p>
      <div className="palette-items">
        {paletteItems.map((item) => (
          <div
            key={item.type}
            className="palette-item"
            draggable
            onDragStart={(e) => onDragStart(e, item)}
          >
            <span className="palette-icon">{item.icon}</span>
            <div>
              <div className="palette-label">{item.label}</div>
              <div className="palette-desc">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { PaletteItem };
