import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MCPServerInfo, MCPToolInfo } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MCPConnection {
  id: string;
  name: string;
  client: Client;
  transport: StdioClientTransport;
}

export class MCPManager {
  private connections = new Map<string, MCPConnection>();

  async connectFilesystem(allowedPath?: string): Promise<MCPServerInfo> {
    const id = 'filesystem';
    const fsPath = allowedPath ?? path.resolve(process.cwd(), '..', 'workspace');

    await this.disconnect(id);

    const transport = new StdioClientTransport({
      command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', fsPath],
    });

    const client = new Client(
      { name: 'agent-workbench', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    const toolsResult = await client.listTools();
    const tools: MCPToolInfo[] = toolsResult.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
      serverId: id,
      serverName: 'Filesystem',
    }));

    this.connections.set(id, { id, name: 'Filesystem', client, transport });

    return { id, name: 'Filesystem', status: 'connected', tools };
  }

  async connectFetch(): Promise<MCPServerInfo> {
    const id = 'fetch';
    await this.disconnect(id);

    const fetchServerPath = path.resolve(__dirname, 'builtin-fetch-entry.ts');
    const tsxPath = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const fallbackTsxPath = path.resolve(process.cwd(), '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const resolvedTsxPath = fs.existsSync(tsxPath) ? tsxPath : fallbackTsxPath;

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolvedTsxPath, fetchServerPath],
    });

    const client = new Client(
      { name: 'agent-workbench', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    const toolsResult = await client.listTools();
    const tools: MCPToolInfo[] = toolsResult.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
      serverId: id,
      serverName: 'Fetch',
    }));

    this.connections.set(id, { id, name: 'Fetch', client, transport });

    return { id, name: 'Fetch', status: 'connected', tools };
  }

  async connectAll(): Promise<MCPServerInfo[]> {
    const results: MCPServerInfo[] = [];

    for (const connect of [() => this.connectFilesystem(), () => this.connectFetch()]) {
      try {
        results.push(await connect());
      } catch (err) {
        const name = results.length === 0 ? 'Filesystem' : 'Fetch';
        results.push({
          id: name.toLowerCase(),
          name,
          status: 'error',
          tools: [],
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }

  getAllTools(): MCPToolInfo[] {
    const tools: MCPToolInfo[] = [];
    for (const conn of this.connections.values()) {
      // Tools are cached at connect time; re-list for freshness
    }
    return tools;
  }

  async listAllTools(): Promise<MCPToolInfo[]> {
    const tools: MCPToolInfo[] = [];

    for (const conn of this.connections.values()) {
      try {
        const result = await conn.client.listTools();
        for (const t of result.tools) {
          tools.push({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema as Record<string, unknown>,
            serverId: conn.id,
            serverName: conn.name,
          });
        }
      } catch {
        // skip disconnected
      }
    }

    return tools;
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ content: unknown; isError?: boolean }> {
    const conn = this.connections.get(serverId);
    if (!conn) {
      throw new Error(`MCP server "${serverId}" not connected`);
    }

    const result = await conn.client.callTool({ name: toolName, arguments: args });

    return {
      content: result.content,
      isError: Boolean(result.isError),
    };
  }

  getServers(): MCPServerInfo[] {
    return Array.from(this.connections.values()).map((conn) => ({
      id: conn.id,
      name: conn.name,
      status: 'connected' as const,
      tools: [],
    }));
  }

  async disconnect(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) return;

    try {
      await conn.client.close();
    } catch {
      // ignore
    }

    this.connections.delete(id);
  }

  async disconnectAll(): Promise<void> {
    for (const id of [...this.connections.keys()]) {
      await this.disconnect(id);
    }
  }
}

export const mcpManager = new MCPManager();
