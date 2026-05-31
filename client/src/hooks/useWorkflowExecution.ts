import { useCallback } from 'react';
import { apiUrl } from '../lib/api';
import { useWorkflowStore } from '../store/workflowStore';
import type { Node, Edge } from '@xyflow/react';

export function useWorkflowExecution() {
  const { startRun, endRun, addEvent, mockMode } = useWorkflowStore();

  const runWorkflow = useCallback(
    async (nodes: Node[], edges: Edge[], input: string) => {
      startRun();

      const workflow = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as string,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
        })),
      };

      try {
        const response = await fetch(apiUrl('/api/workflow/run'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow, input, mockMode }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                addEvent(event);
              } catch {
                // skip malformed
              }
            }
          }
        }
      } catch (err) {
        addEvent({
          type: 'error',
          runId: '',
          timestamp: Date.now(),
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        endRun();
      }
    },
    [startRun, endRun, addEvent, mockMode]
  );

  return { runWorkflow };
}
