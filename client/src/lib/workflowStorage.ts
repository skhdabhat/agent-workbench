import type { Edge, Node } from '@xyflow/react';

export const WORKFLOW_STORAGE_KEY = 'agent-workbench-workflow-v1';

export interface WorkflowSnapshot {
  version: 1;
  name?: string;
  nodes: Node[];
  edges: Edge[];
  input?: string;
  savedAt: number;
}

function stripRuntimeFields(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    const { status, ...rest } = (n.data ?? {}) as Record<string, unknown>;
    return {
      ...n,
      selected: false,
      data: rest,
    };
  });
}

export function createSnapshot(
  nodes: Node[],
  edges: Edge[],
  input?: string,
  name?: string
): WorkflowSnapshot {
  return {
    version: 1,
    name,
    nodes: stripRuntimeFields(nodes),
    edges: edges.map((e) => ({ ...e, selected: false })),
    input,
    savedAt: Date.now(),
  };
}

export function saveWorkflowToStorage(snapshot: WorkflowSnapshot): void {
  try {
    localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Failed to save workflow:', err);
  }
}

export function loadWorkflowFromStorage(): WorkflowSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return null;
    return parseWorkflowJson(raw);
  } catch {
    return null;
  }
}

export function parseWorkflowJson(raw: string): WorkflowSnapshot | null {
  const data = JSON.parse(raw) as Partial<WorkflowSnapshot>;
  if (!data || data.version !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    return null;
  }
  return {
    version: 1,
    name: typeof data.name === 'string' ? data.name : undefined,
    nodes: data.nodes as Node[],
    edges: data.edges as Edge[],
    input: typeof data.input === 'string' ? data.input : undefined,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
  };
}

export function downloadWorkflowJson(snapshot: WorkflowSnapshot, filename?: string): void {
  const name = filename ?? `workflow-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function getMaxNodeId(nodes: Node[]): number {
  let max = 10;
  for (const n of nodes) {
    const match = n.id.match(/-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}
