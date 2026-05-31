import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import type {
  AgentNodeData,
  ConditionNodeData,
  ExecutionEvent,
  FlowEdge,
  FlowNode,
  RunWorkflowRequest,
  ToolNodeData,
  WorkflowDefinition,
} from '../types.js';
import { mcpManager } from '../mcp/manager.js';

type EventEmitter = (event: ExecutionEvent) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class WorkflowExecutor {
  private emit: EventEmitter;
  private runId: string;
  private mockMode: boolean;
  private context: Record<string, unknown> = {};

  constructor(emit: EventEmitter, mockMode = false) {
    this.emit = emit;
    this.runId = uuidv4();
    this.mockMode = mockMode;
  }

  async run(request: RunWorkflowRequest): Promise<void> {
    const { workflow, input } = request;
    this.mockMode = request.mockMode ?? !process.env.OPENAI_API_KEY;

    this.context = { input: input ?? '', lastOutput: '' };

    this.emit({
      type: 'workflow_start',
      runId: this.runId,
      timestamp: Date.now(),
      content: input,
    });

    try {
      const order = topologicalSort(workflow.nodes, workflow.edges);
      const startIdx = order.findIndex((n) => n.type === 'start');
      const nodesToRun = startIdx >= 0 ? order.slice(startIdx) : order;

      for (const node of nodesToRun) {
        if (node.type === 'start') {
          await this.runStart(node);
          continue;
        }

        if (node.type === 'end') {
          await this.runEnd(node);
          break;
        }

        if (node.type === 'condition') {
          const nextId = await this.runCondition(node, workflow.edges);
          if (nextId) {
            const nextNode = workflow.nodes.find((n) => n.id === nextId);
            if (nextNode) {
              await this.runNode(nextNode);
            }
          }
          continue;
        }

        await this.runNode(node);
      }

      this.emit({
        type: 'workflow_complete',
        runId: this.runId,
        status: 'success',
        timestamp: Date.now(),
        content: String(this.context.lastOutput ?? ''),
      });
    } catch (err) {
      this.emit({
        type: 'error',
        runId: this.runId,
        timestamp: Date.now(),
        message: err instanceof Error ? err.message : String(err),
      });
      this.emit({
        type: 'workflow_complete',
        runId: this.runId,
        status: 'error',
        timestamp: Date.now(),
      });
    }
  }

  private async runNode(node: FlowNode): Promise<void> {
    switch (node.type) {
      case 'agent':
        await this.runAgent(node);
        break;
      case 'tool':
        await this.runTool(node);
        break;
      default:
        break;
    }
  }

  private async runStart(node: FlowNode): Promise<void> {
    this.emit({
      type: 'step_start',
      runId: this.runId,
      nodeId: node.id,
      nodeType: 'start',
      status: 'running',
      timestamp: Date.now(),
    });

    this.emit({
      type: 'step_output',
      runId: this.runId,
      nodeId: node.id,
      content: `工作流启动，输入: ${this.context.input}`,
      timestamp: Date.now(),
    });

    this.emit({
      type: 'step_complete',
      runId: this.runId,
      nodeId: node.id,
      nodeType: 'start',
      status: 'success',
      timestamp: Date.now(),
    });
  }

  private async runEnd(node: FlowNode): Promise<void> {
    this.emit({
      type: 'step_start',
      runId: this.runId,
      nodeId: node.id,
      nodeType: 'end',
      status: 'running',
      timestamp: Date.now(),
    });

    this.emit({
      type: 'step_output',
      runId: this.runId,
      nodeId: node.id,
      content: `最终输出: ${this.context.lastOutput}`,
      timestamp: Date.now(),
    });

    this.emit({
      type: 'step_complete',
      runId: this.runId,
      nodeId: node.id,
      nodeType: 'end',
      status: 'success',
      timestamp: Date.now(),
    });
  }

  private async runAgent(node: FlowNode): Promise<void> {
    const data = node.data as unknown as AgentNodeData;
    const maxRetries = data.maxRetries ?? 3;

    await this.withRetry(
      node.id,
      'agent',
      maxRetries,
      async () => {
        this.emit({
          type: 'step_start',
          runId: this.runId,
          nodeId: node.id,
          nodeType: 'agent',
          status: 'running',
          timestamp: Date.now(),
        });

        const prompt = interpolate(data.prompt ?? '', this.context);
        const systemPrompt =
          data.systemPrompt ??
          'You are a helpful assistant with access to MCP tools. Use tools when needed.';

        if (this.mockMode) {
          await this.runAgentMock(node.id, prompt, systemPrompt);
        } else {
          await this.runAgentOpenAI(node.id, prompt, systemPrompt, data.model);
        }

        this.emit({
          type: 'step_complete',
          runId: this.runId,
          nodeId: node.id,
          nodeType: 'agent',
          status: 'success',
          timestamp: Date.now(),
        });
      }
    );
  }

  private async runAgentMock(
    nodeId: string,
    prompt: string,
    systemPrompt: string
  ): Promise<void> {
    const tools = await mcpManager.listAllTools();

    this.emit({
      type: 'step_output',
      runId: this.runId,
      nodeId,
      content: `[Mock Agent] System: ${systemPrompt.slice(0, 80)}...\nPrompt: ${prompt}`,
      timestamp: Date.now(),
    });

    await sleep(300);

    // Simulate function calling if prompt mentions fetch or file
    const lower = prompt.toLowerCase();
    if (lower.includes('fetch') || lower.includes('http') || lower.includes('url')) {
      const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
      const url = urlMatch?.[0] ?? 'https://example.com';

      this.emit({
        type: 'tool_call',
        runId: this.runId,
        nodeId,
        tool: 'fetch',
        mcpServer: 'fetch',
        args: { url },
        timestamp: Date.now(),
      });

      await sleep(200);

      const result = await mcpManager.callTool('fetch', 'fetch', { url });

      this.emit({
        type: 'tool_result',
        runId: this.runId,
        nodeId,
        tool: 'fetch',
        mcpServer: 'fetch',
        result: result.content,
        timestamp: Date.now(),
      });

      const text = extractTextContent(result.content);
      this.context.lastOutput = text.slice(0, 500);
    } else if (lower.includes('file') || lower.includes('read') || lower.includes('list')) {
      this.emit({
        type: 'tool_call',
        runId: this.runId,
        nodeId,
        tool: 'list_directory',
        mcpServer: 'filesystem',
        args: { path: '.' },
        timestamp: Date.now(),
      });

      await sleep(200);

      try {
        const result = await mcpManager.callTool('filesystem', 'list_directory', { path: '.' });
        this.emit({
          type: 'tool_result',
          runId: this.runId,
          nodeId,
          tool: 'list_directory',
          mcpServer: 'filesystem',
          result: result.content,
          timestamp: Date.now(),
        });
        this.context.lastOutput = extractTextContent(result.content);
      } catch (err) {
        this.context.lastOutput = `Mock: 可用工具 ${tools.map((t) => t.name).join(', ')}`;
      }
    } else {
      const output = `[Mock 回复] 已处理请求: "${prompt.slice(0, 100)}"。可用 MCP 工具: ${tools.map((t) => `${t.serverName}/${t.name}`).join(', ')}`;
      this.streamOutput(nodeId, output);
      this.context.lastOutput = output;
    }
  }

  private createOpenAIClient(): OpenAI {
    const options: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey: process.env.OPENAI_API_KEY,
    };

    if (process.env.OPENAI_BASE_URL?.trim()) {
      options.baseURL = process.env.OPENAI_BASE_URL.trim();
    }

    if (process.env.LLM_PROVIDER === 'github-models') {
      options.defaultHeaders = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
    }

    return new OpenAI(options);
  }

  private async runAgentOpenAI(
    nodeId: string,
    prompt: string,
    systemPrompt: string,
    model?: string
  ): Promise<void> {
    const openai = this.createOpenAIClient();
    const mcpTools = await mcpManager.listAllTools();

    const openaiTools: OpenAI.Chat.ChatCompletionTool[] = mcpTools.map((t) => ({
      type: 'function' as const,
      function: {
        name: `${t.serverId}__${t.name}`,
        description: t.description ?? `${t.serverName} - ${t.name}`,
        parameters: t.inputSchema ?? { type: 'object', properties: {} },
      },
    }));

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      iterations++;

      const stream = await openai.chat.completions.create({
        model: model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        stream: true,
      });

      let assistantContent = '';
      const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          assistantContent += delta.content;
          this.emit({
            type: 'step_output',
            runId: this.runId,
            nodeId,
            content: delta.content,
            timestamp: Date.now(),
          });
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id ?? '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              const existing = toolCalls[tc.index];
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        }
      }

      if (toolCalls.length === 0) {
        this.context.lastOutput = assistantContent;
        break;
      }

      messages.push({
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        const [serverId, ...toolParts] = tc.function.name.split('__');
        const toolName = toolParts.join('__');
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }

        this.emit({
          type: 'tool_call',
          runId: this.runId,
          nodeId,
          tool: toolName,
          mcpServer: serverId,
          args,
          timestamp: Date.now(),
        });

        const result = await mcpManager.callTool(serverId, toolName, args);

        this.emit({
          type: 'tool_result',
          runId: this.runId,
          nodeId,
          tool: toolName,
          mcpServer: serverId,
          result: result.content,
          timestamp: Date.now(),
        });

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result.content),
        });
      }
    }
  }

  private async runTool(node: FlowNode): Promise<void> {
    const data = node.data as unknown as ToolNodeData;
    const maxRetries = data.maxRetries ?? 3;

    await this.withRetry(node.id, 'tool', maxRetries, async () => {
      this.emit({
        type: 'step_start',
        runId: this.runId,
        nodeId: node.id,
        nodeType: 'tool',
        status: 'running',
        timestamp: Date.now(),
      });

      const args = resolveArgs(data.toolArgs ?? {}, this.context);

      this.emit({
        type: 'tool_call',
        runId: this.runId,
        nodeId: node.id,
        tool: data.toolName,
        mcpServer: data.mcpServer,
        args,
        timestamp: Date.now(),
      });

      const result = await mcpManager.callTool(data.mcpServer, data.toolName, args);

      this.emit({
        type: 'tool_result',
        runId: this.runId,
        nodeId: node.id,
        tool: data.toolName,
        mcpServer: data.mcpServer,
        result: result.content,
        timestamp: Date.now(),
      });

      if (result.isError) {
        throw new Error(extractTextContent(result.content));
      }

      const text = extractTextContent(result.content);
      this.context.lastOutput = text;
      this.streamOutput(node.id, text);

      this.emit({
        type: 'step_complete',
        runId: this.runId,
        nodeId: node.id,
        nodeType: 'tool',
        status: 'success',
        timestamp: Date.now(),
      });
    });
  }

  private async runCondition(
    node: FlowNode,
    edges: FlowEdge[]
  ): Promise<string | null> {
    const data = node.data as unknown as ConditionNodeData;

    this.emit({
      type: 'step_start',
      runId: this.runId,
      nodeId: node.id,
      nodeType: 'condition',
      status: 'running',
      timestamp: Date.now(),
    });

    const expr = interpolate(data.expression ?? 'true', this.context);
    let result = false;
    try {
      // eslint-disable-next-line no-new-func
      result = Boolean(new Function('context', `with(context){ return (${expr}); }`)(this.context));
    } catch {
      result = Boolean(this.context.lastOutput);
    }

    const handleId = result ? 'true' : 'false';
    const outEdge = edges.find((e) => e.source === node.id && e.sourceHandle === handleId);
    const fallbackEdge = edges.find((e) => e.source === node.id);

    this.emit({
      type: 'step_output',
      runId: this.runId,
      nodeId: node.id,
      content: `条件 "${data.expression}" => ${result}`,
      timestamp: Date.now(),
    });

    this.emit({
      type: 'step_complete',
      runId: this.runId,
      nodeId: node.id,
      nodeType: 'condition',
      status: 'success',
      timestamp: Date.now(),
    });

    return outEdge?.target ?? fallbackEdge?.target ?? null;
  }

  private streamOutput(nodeId: string, text: string): void {
    const chunkSize = 20;
    for (let i = 0; i < text.length; i += chunkSize) {
      this.emit({
        type: 'step_output',
        runId: this.runId,
        nodeId,
        content: text.slice(i, i + chunkSize),
        timestamp: Date.now(),
      });
    }
  }

  private async withRetry(
    nodeId: string,
    nodeType: 'agent' | 'tool',
    maxRetries: number,
    fn: () => Promise<void>
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          this.emit({
            type: 'step_retry',
            runId: this.runId,
            nodeId,
            nodeType,
            status: 'retrying',
            attempt,
            maxAttempts: maxRetries,
            timestamp: Date.now(),
            message: lastError?.message,
          });
          await sleep(Math.min(1000 * Math.pow(2, attempt - 2), 8000));
        }

        await fn();
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === maxRetries) {
          this.emit({
            type: 'step_complete',
            runId: this.runId,
            nodeId,
            nodeType,
            status: 'error',
            timestamp: Date.now(),
            message: lastError.message,
          });
          throw lastError;
        }
      }
    }
  }
}

function topologicalSort(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const result: FlowNode[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) result.push(node);

    for (const neighbor of adjacency.get(id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  return result.length === nodes.length ? result : nodes;
}

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] ?? ''));
}

function resolveArgs(
  args: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === 'string') {
      resolved[k] = interpolate(v, context);
    } else {
      resolved[k] = v;
    }
  }
  return resolved;
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (typeof c === 'object' && c !== null && 'text' in c) {
          return String((c as { text: unknown }).text);
        }
        return JSON.stringify(c);
      })
      .join('\n');
  }
  return JSON.stringify(content);
}
