export type NodeType = 'start' | 'agent' | 'tool' | 'condition' | 'end';

export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'retrying' | 'skipped';

export type OutputSource = 'agent' | 'tool' | 'system';

export interface FlowNodeData {
  label: string;
  prompt?: string;
  systemPrompt?: string;
  model?: string;
  mcpServer?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  expression?: string;
  maxRetries?: number;
  status?: StepStatus;
  output?: string;
}

export interface ExecutionEvent {
  type: string;
  runId: string;
  nodeId?: string;
  nodeType?: NodeType;
  status?: StepStatus;
  content?: string;
  source?: OutputSource;
  tool?: string;
  mcpServer?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  attempt?: number;
  maxAttempts?: number;
  timestamp: number;
  message?: string;
}

export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  serverId: string;
  serverName: string;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  tools: MCPToolInfo[];
  error?: string;
}

export interface ToolCallRecord {
  id: string;
  nodeId: string;
  tool: string;
  mcpServer: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: StepStatus;
  timestamp: number;
  completedAt?: number;
  durationMs?: number;
  error?: string;
}
