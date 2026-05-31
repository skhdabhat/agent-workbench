import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { mcpManager } from './mcp/manager.js';
import { WorkflowExecutor } from './engine/executor.js';
import type { RunWorkflowRequest } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const PUBLIC_DEMO = process.env.PUBLIC_DEMO === 'true' || process.env.PUBLIC_DEMO === '1';

const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length
      ? {
          origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error(`CORS blocked: ${origin}`));
            }
          },
        }
      : undefined
  )
);
app.use(express.json({ limit: '2mb' }));

const workspaceDir = process.env.WORKSPACE_DIR
  ? path.resolve(process.env.WORKSPACE_DIR)
  : path.resolve(process.cwd(), '..', 'workspace');

if (!fs.existsSync(workspaceDir)) {
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(
    path.join(workspaceDir, 'sample.txt'),
    'Hello from Agent Workbench!\nThis is a sample file for MCP filesystem demo.'
  );
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    publicDemo: PUBLIC_DEMO,
    hasLlmKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.get('/api/mcp/servers', async (_req, res) => {
  try {
    const servers = mcpManager.getServers();
    const tools = await mcpManager.listAllTools();
    res.json({
      servers: servers.map((s) => ({
        ...s,
        tools: tools.filter((t) => t.serverId === s.id),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/mcp/connect', async (_req, res) => {
  try {
    const servers = await mcpManager.connectAll();
    res.json({ servers });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/workflow/run', async (req, res) => {
  const body = req.body as RunWorkflowRequest;

  if (!body.workflow?.nodes?.length) {
    res.status(400).json({ error: 'Invalid workflow definition' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const mockMode = PUBLIC_DEMO
    ? true
    : (body.mockMode ?? !process.env.OPENAI_API_KEY);

  const executor = new WorkflowExecutor((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }, mockMode);

  try {
    await executor.run(body);
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        runId: '',
        timestamp: Date.now(),
        message: err instanceof Error ? err.message : String(err),
      })}\n\n`
    );
  }

  res.end();
});

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Client not built. Run npm run build from repo root.' });
  }
});

async function bootstrap() {
  console.log('Connecting MCP servers...');
  try {
    const servers = await mcpManager.connectAll();
    for (const s of servers) {
      if (s.status === 'connected') {
        console.log(`  ✓ ${s.name}: ${s.tools.length} tools`);
      } else {
        console.warn(`  ✗ ${s.name}: ${s.error}`);
      }
    }
  } catch (err) {
    console.warn('MCP connect warning:', err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Agent Workbench server running at http://0.0.0.0:${PORT}`);
    console.log(`   MCP workspace: ${workspaceDir}`);
    console.log(
      `   Mode: ${PUBLIC_DEMO ? 'Public Demo (Mock)' : process.env.OPENAI_API_KEY ? 'OpenAI Function Calling' : 'Mock (set OPENAI_API_KEY for real LLM)'}`
    );
    if (allowedOrigins.length) {
      console.log(`   CORS: ${allowedOrigins.join(', ')}`);
    }
  });
}

process.on('SIGINT', async () => {
  await mcpManager.disconnectAll();
  process.exit(0);
});

bootstrap();
