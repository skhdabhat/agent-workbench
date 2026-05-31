import type { Edge, Node } from '@xyflow/react';
import type { WorkflowSnapshot } from './workflowStorage';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultInput: string;
  nodes: Node[];
  edges: Edge[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'fetch-agent',
    name: 'Fetch 分析',
    description: 'Agent 自动调用 fetch 抓取网页并总结',
    icon: '🌐',
    defaultInput: '分析 example.com 网站内容',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 80, y: 200 },
        data: { label: '开始' },
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 320, y: 180 },
        data: {
          label: '网页分析 Agent',
          prompt: '请 fetch https://example.com 并总结页面主要内容',
          systemPrompt:
            'You are a helpful assistant with MCP tools. Use fetch when URLs are mentioned.',
          maxRetries: 3,
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 600, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'agent-1', animated: true },
      { id: 'e2', source: 'agent-1', target: 'end-1', animated: true },
    ],
  },
  {
    id: 'direct-fetch',
    name: '直连 Fetch 工具',
    description: '不经 LLM，直接调用 MCP Fetch 节点',
    icon: '🔧',
    defaultInput: '抓取 example.com',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 60, y: 200 },
        data: { label: '开始' },
      },
      {
        id: 'tool-1',
        type: 'tool',
        position: { x: 300, y: 180 },
        data: {
          label: 'Fetch URL',
          mcpServer: 'fetch',
          toolName: 'fetch',
          toolArgs: { url: 'https://example.com' },
          maxRetries: 3,
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 560, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'tool-1', animated: true },
      { id: 'e2', source: 'tool-1', target: 'end-1', animated: true },
    ],
  },
  {
    id: 'filesystem-agent',
    name: '文件目录分析',
    description: 'Agent 列出 workspace 文件并解读',
    icon: '📁',
    defaultInput: '查看工作区有哪些文件',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 80, y: 200 },
        data: { label: '开始' },
      },
      {
        id: 'agent-1',
        type: 'agent',
        position: { x: 300, y: 160 },
        data: {
          label: '文件 Agent',
          prompt: '请 list 工作区根目录文件，并简要说明每个文件的用途',
          systemPrompt: 'You are a helpful assistant with filesystem MCP tools.',
          maxRetries: 3,
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 580, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'agent-1', animated: true },
      { id: 'e2', source: 'agent-1', target: 'end-1', animated: true },
    ],
  },
];

export function templateToSnapshot(template: WorkflowTemplate): WorkflowSnapshot {
  return {
    version: 1,
    name: template.name,
    nodes: template.nodes,
    edges: template.edges,
    input: template.defaultInput,
    savedAt: Date.now(),
  };
}
