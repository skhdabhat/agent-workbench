import { create } from 'zustand';
import type { ExecutionEvent, MCPServerInfo, ToolCallRecord } from '../types';

interface WorkflowState {
  executionEvents: ExecutionEvent[];
  toolCalls: ToolCallRecord[];
  isRunning: boolean;
  runId: string | null;
  mockMode: boolean;
  mcpServers: MCPServerInfo[];
  nodeStatuses: Record<string, string>;
  nodeOutputs: Record<string, string>;

  setMockMode: (v: boolean) => void;
  setMcpServers: (servers: MCPServerInfo[]) => void;
  startRun: () => void;
  endRun: () => void;
  addEvent: (event: ExecutionEvent) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  executionEvents: [],
  toolCalls: [],
  isRunning: false,
  runId: null,
  mockMode: true,
  mcpServers: [],
  nodeStatuses: {},
  nodeOutputs: {},

  setMockMode: (v) => set({ mockMode: v }),
  setMcpServers: (servers) => set({ mcpServers: servers }),

  startRun: () =>
    set({
      isRunning: true,
      executionEvents: [],
      toolCalls: [],
      nodeStatuses: {},
      nodeOutputs: {},
      runId: null,
    }),

  endRun: () => set({ isRunning: false }),

  addEvent: (event) => {
    const state = get();
    const events = [...state.executionEvents, event];

    const updates: Partial<WorkflowState> = { executionEvents: events };

    if (event.type === 'workflow_start') {
      updates.runId = event.runId;
    }

    if (event.nodeId && event.type === 'step_start') {
      updates.nodeStatuses = { ...state.nodeStatuses, [event.nodeId]: 'running' };
    }

    if (event.nodeId && event.type === 'step_complete') {
      updates.nodeStatuses = {
        ...state.nodeStatuses,
        [event.nodeId]: event.status ?? 'success',
      };
    }

    if (event.nodeId && event.type === 'step_retry') {
      updates.nodeStatuses = { ...state.nodeStatuses, [event.nodeId!]: 'retrying' };
    }

    if (event.nodeId && event.type === 'step_output' && event.content) {
      updates.nodeOutputs = {
        ...state.nodeOutputs,
        [event.nodeId]: (state.nodeOutputs[event.nodeId] ?? '') + event.content,
      };
    }

    if (event.type === 'tool_call' && event.nodeId && event.tool) {
      const record: ToolCallRecord = {
        id: `${event.timestamp}-${event.tool}`,
        nodeId: event.nodeId,
        tool: event.tool,
        mcpServer: event.mcpServer ?? '',
        args: event.args,
        status: 'running',
        timestamp: event.timestamp,
      };
      updates.toolCalls = [...state.toolCalls, record];
    }

    if (event.type === 'tool_result' && event.nodeId && event.tool) {
      updates.toolCalls = state.toolCalls.map((tc) =>
        tc.nodeId === event.nodeId && tc.tool === event.tool && tc.status === 'running'
          ? { ...tc, result: event.result, status: 'success' as const }
          : tc
      );
    }

    set(updates);
  },

  reset: () =>
    set({
      executionEvents: [],
      toolCalls: [],
      isRunning: false,
      runId: null,
      nodeStatuses: {},
      nodeOutputs: {},
    }),
}));
