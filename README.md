# Agent 可视化工作台

拖拽编排 Agent 任务流，集成 MCP 工具（Filesystem + Fetch），支持 Function Calling 执行链路可视化、流式输出与失败重试。

## 功能特性

- **拖拽编排** — 基于 React Flow，支持 Start / Agent / MCP Tool / Condition / End 节点
- **MCP 集成** — 接入 Filesystem（官方 `@modelcontextprotocol/server-filesystem`）和 Fetch（内置 MCP Server）
- **Function Calling** — Agent 节点自动将 MCP 工具暴露给 LLM；Mock 模式无需 API Key 即可演示
- **执行可视化** — 实时 SSE 流式日志、步骤状态、Function Calling 调用链
- **失败重试** — 节点级可配置重试次数，指数退避

## 快速开始

### 前置要求

- Node.js 18+
- npm 9+

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式（同时启动前后端）
npm run dev
```

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001

### 使用 OpenAI Function Calling（可选）

```bash
# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_MODEL="gpt-4o-mini"
npm run dev
```

未设置 `OPENAI_API_KEY` 时自动进入 **Mock 模式**，仍可演示 MCP 工具调用链路。

## 项目结构

```
agent-workbench/
├── client/          # React + React Flow 前端
│   └── src/
│       ├── components/   # 画布、节点、执行面板
│       ├── hooks/        # SSE 工作流执行
│       └── store/        # Zustand 状态
├── server/          # Express 后端
│   └── src/
│       ├── mcp/          # MCP 管理器 + 内置 Fetch Server
│       ├── engine/       # 工作流执行引擎
│       └── index.ts      # API 入口
└── workspace/       # Filesystem MCP 沙箱目录
```

## 使用说明

1. 从左侧面板拖拽节点到画布
2. 连接节点形成任务流（默认已有 Start → Agent → End 示例）
3. 点击右上角 **运行工作流**
4. 右侧面板查看：
   - Function Calling 调用链
   - 流式执行日志
   - 各节点输出与状态（节点边框颜色反映状态）

### 节点类型

| 节点 | 说明 |
|------|------|
| 开始 | 工作流入口，传递 `{{input}}` 变量 |
| Agent | LLM + Function Calling，自动调用已连接 MCP 工具 |
| MCP 工具 | 直接调用指定 MCP 工具（如 fetch、list_directory） |
| 条件分支 | 根据 JS 表达式选择 true/false 分支 |
| 结束 | 工作流出口 |

### MCP Servers

| Server | 说明 |
|--------|------|
| **Filesystem** | 官方 MCP，读写 `workspace/` 目录 |
| **Fetch** | 内置 MCP Server，抓取 URL 并转 Markdown |

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/mcp/servers` | 获取 MCP 服务状态 |
| POST | `/api/mcp/connect` | 连接/重连 MCP |
| POST | `/api/workflow/run` | SSE 流式执行工作流 |

## 构建部署

```bash
npm run build
npm start
# 生产单端口访问 http://localhost:3001
```

生产模式下后端会托管 `client/dist` 静态文件。

### 上线包（面试 / 作品集）

| 组件 | 说明 |
|------|------|
| **在线 Demo** | [Render](https://render.com/) 部署整仓（见 `render.yaml`） |
| **产品页** | `landing/` 静态站，部署到 [Vercel](https://vercel.com/) |
| **环境变量** | 复制 `.env.example` → `.env` |

详细步骤见 **[DEPLOY.md](./DEPLOY.md)**。

部署后请修改 `landing/config.js` 中的占位地址：

- `demoUrl` → 你的 Render 应用 URL
- `githubUrl` → 你的 GitHub 仓库

分体部署（前端 Vercel + 后端 Render）时，在 Vercel 设置 `VITE_API_BASE_URL`，在 Render 设置 `CORS_ORIGIN`。

公开 Demo 建议 `PUBLIC_DEMO=true`（服务端强制 Mock）与 `VITE_PUBLIC_DEMO=true`（前端默认 Mock）。

## License

MIT
