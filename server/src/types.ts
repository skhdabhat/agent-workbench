export type NodeType = 'start' | 'agent' | 'tool' | 'condition' | 'end';

export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'retrying' | 'skipped';

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface AgentNodeData {
  label: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxRetries?: number;
}

export interface ToolNodeData {
  label: string;
  mcpServer: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  maxRetries?: number;
}

export interface ConditionNodeData {
  label: string;
  expression: string;
}

export interface ExecutionEvent {
  type:
    | 'workflow_start'
    | 'workflow_complete'
    | 'step_start'
    | 'step_output'
    | 'step_complete'
    | 'step_retry'
    | 'tool_call'
    | 'tool_result'
    | 'error';
  runId: string;
  nodeId?: string;
  nodeType?: NodeType;
  status?: StepStatus;
  content?: string;
  tool?: string;
  mcpServer?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  attempt?: number;
  maxAttempts?: number;
  timestamp: number;
  message?: string;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPToolInfo[];
  error?: string;
}

export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  serverId: string;
  serverName: string;
}

export interface RunWorkflowRequest {
  workflow: WorkflowDefinition;
  input?: string;
  mockMode?: boolean;
}
