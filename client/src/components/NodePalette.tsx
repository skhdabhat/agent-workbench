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
    description: '自动化任务 + Function Calling',
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
    description: '调用外部 MCP 工具',
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
    description: '根据条件决定分支',
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
      <div className="panel-title-row">
        <h3>节点库</h3>
        <span className="panel-badge">{paletteItems.length}</span>
      </div>
      <p className="panel-hint">拖拽到画布添加节点</p>

      <div className="palette-items">
        {paletteItems.map((item) => (
          <div
            key={item.type}
            className={`palette-item palette-item--${item.type}`}
            draggable
            onDragStart={(e) => onDragStart(e, item)}
          >
            <div className="palette-icon-wrap">{item.icon}</div>
            <div className="palette-text">
              <div className="palette-label">{item.label}</div>
              <div className="palette-desc">{item.description}</div>
            </div>
            <span className="palette-drag-hint">⠿</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { PaletteItem };
