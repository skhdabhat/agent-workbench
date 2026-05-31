import { create } from 'zustand';
import type {
  ExecutionEvent,
  MCPServerInfo,
  OutputSource,
  ToolCallRecord,
} from '../types';

interface WorkflowState {
  executionEvents: ExecutionEvent[];
  toolCalls: ToolCallRecord[];
  isRunning: boolean;
  runId: string | null;
  mockMode: boolean;
  mcpServers: MCPServerInfo[];
  nodeStatuses: Record<string, string>;
  nodeOutputs: Record<string, string>;
  nodeOutputSources: Record<string, OutputSource>;
  streamingNodeIds: Set<string>;
  agentPhase: 'idle' | 'planning' | 'tool' | 'generating';
  focusedToolCallId: string | null;

  setMockMode: (v: boolean) => void;
  setMcpServers: (servers: MCPServerInfo[]) => void;
  setFocusedToolCallId: (id: string | null) => void;
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
  nodeOutputSources: {},
  streamingNodeIds: new Set(),
  agentPhase: 'idle',
  focusedToolCallId: null,

  setMockMode: (v) => set({ mockMode: v }),
  setMcpServers: (servers) => set({ mcpServers: servers }),
  setFocusedToolCallId: (id) => set({ focusedToolCallId: id }),

  startRun: () =>
    set({
      isRunning: true,
      executionEvents: [],
      toolCalls: [],
      nodeStatuses: {},
      nodeOutputs: {},
      nodeOutputSources: {},
      streamingNodeIds: new Set(),
      agentPhase: 'planning',
      focusedToolCallId: null,
      runId: null,
    }),

  endRun: () =>
    set({
      isRunning: false,
      streamingNodeIds: new Set(),
      agentPhase: 'idle',
    }),

  addEvent: (event) => {
    const state = get();
    const events = [...state.executionEvents, event];
    const updates: Partial<WorkflowState> = { executionEvents: events };

    if (event.type === 'workflow_start') {
      updates.runId = event.runId;
    }

    if (event.nodeId && event.type === 'step_start') {
      updates.nodeStatuses = { ...state.nodeStatuses, [event.nodeId]: 'running' };
      const streaming = new Set(state.streamingNodeIds);
      streaming.add(event.nodeId);
      updates.streamingNodeIds = streaming;
      if (event.nodeType === 'agent') {
        updates.agentPhase = 'generating';
      }
    }

    if (event.nodeId && event.type === 'step_complete') {
      updates.nodeStatuses = {
        ...state.nodeStatuses,
        [event.nodeId]: event.status ?? 'success',
      };
      const streaming = new Set(state.streamingNodeIds);
      streaming.delete(event.nodeId);
      updates.streamingNodeIds = streaming;
    }

    if (event.nodeId && event.type === 'step_retry') {
      updates.nodeStatuses = { ...state.nodeStatuses, [event.nodeId!]: 'retrying' };
    }

    if (event.nodeId && event.type === 'step_output' && event.content) {
      updates.nodeOutputs = {
        ...state.nodeOutputs,
        [event.nodeId]: (state.nodeOutputs[event.nodeId] ?? '') + event.content,
      };
      if (event.source) {
        updates.nodeOutputSources = {
          ...state.nodeOutputSources,
          [event.nodeId]: event.source,
        };
      } else if (event.nodeType === 'agent') {
        updates.nodeOutputSources = {
          ...state.nodeOutputSources,
          [event.nodeId]: 'agent',
        };
      }
      if (event.source === 'agent' || event.nodeType === 'agent') {
        updates.agentPhase = 'generating';
      }
    }

    if (event.type === 'tool_call' && event.nodeId && event.tool) {
      const record: ToolCallRecord = {
        id: `${event.timestamp}-${event.tool}-${state.toolCalls.length}`,
        nodeId: event.nodeId,
        tool: event.tool,
        mcpServer: event.mcpServer ?? '',
        args: event.args,
        status: 'running',
        timestamp: event.timestamp,
      };
      updates.toolCalls = [...state.toolCalls, record];
      updates.agentPhase = 'tool';
    }

    if (event.type === 'tool_result' && event.nodeId && event.tool) {
      updates.toolCalls = state.toolCalls.map((tc) => {
        if (tc.nodeId !== event.nodeId || tc.tool !== event.tool || tc.status !== 'running') {
          return tc;
        }
        const completedAt = event.timestamp;
        return {
          ...tc,
          result: event.result,
          status: event.status === 'error' ? ('error' as const) : ('success' as const),
          completedAt,
          durationMs: completedAt - tc.timestamp,
          error: event.message,
        };
      });
      updates.agentPhase = 'generating';
    }

    if (event.type === 'workflow_complete') {
      updates.agentPhase = 'idle';
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
      nodeOutputSources: {},
      streamingNodeIds: new Set(),
      agentPhase: 'idle',
      focusedToolCallId: null,
    }),
}));
