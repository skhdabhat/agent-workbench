# Agent 可视化工作台

一个面向演示与作品集展示的 Agent 任务编排平台：支持拖拽编排工作流、接入 MCP 工具、可视化 Function Calling 调用链，并以流式日志展示执行过程。

[在线 Demo](https://render.com/) · [产品页](https://vercel.com/) · [部署指南](./DEPLOY.md)

## 项目亮点

- **拖拽式工作流编排**：基于 React Flow 快速搭建 Start / Agent / MCP Tool / Condition / End 节点
- **MCP 工具集成**：接入 Filesystem（官方 `@modelcontextprotocol/server-filesystem`）与内置 Fetch Server
- **Function Calling 可视化**：展示模型调用工具的完整链路，方便调试与演示
- **流式执行体验**：通过 SSE 输出实时日志、步骤状态与节点结果
- **Mock / 真实模式切换**：未配置 API Key 时也能演示完整流程
- **可部署作品集方案**：Render 托管整仓 Demo，Vercel 托管静态产品页

## 在线体验

- **在线 Demo**：部署到 Render 的完整应用
- **产品页**：部署到 Vercel 的静态展示页
- **仓库地址**：`https://github.com/skhdabhat/agent-workbench`
- **建议展示**：README 顶部可补一张工作流执行截图或动图，提升作品集观感

> 如果你正在本地运行，建议先打开产品页查看项目介绍，再进入在线 Demo 体验工作流执行。

## 技术栈

- **前端**：React、Vite、React Flow、Zustand
- **后端**：Node.js、Express、SSE
- **工具集成**：MCP、Fetch、Filesystem
- **部署**：Render、Vercel

## 快速开始

### 前置要求

- Node.js 18+
- npm 9+

### 安装与运行

```bash
npm install
npm run dev
```

- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:3001`

### 可选的 OpenAI 配置

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_MODEL="gpt-4o-mini"
npm run dev
```

未设置 `OPENAI_API_KEY` 时会自动进入 **Mock 模式**，仍可演示 MCP 工具调用链路。

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
├── landing/         # 静态产品页
└── workspace/       # Filesystem MCP 沙箱目录
```

## 使用说明

1. 从左侧面板拖拽节点到画布
2. 连接节点形成任务流（默认已有 Start → Agent → End 示例）
3. 点击右上角 **运行工作流**
4. 在右侧面板查看：
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

## 部署

### Render 在线 Demo

- 构建命令：`npm install && npm run build`
- 启动命令：`npm start`
- 健康检查：`/api/health`
- 推荐环境变量：
  - `PUBLIC_DEMO=true`
  - `NODE_VERSION=20`

### Vercel 静态产品页

- Root Directory：`landing`
- Framework Preset：`Other`
- 部署后修改 `landing/config.js`：
  - `demoUrl` 指向 Render 应用
  - `githubUrl` 指向你的 GitHub 仓库

### 分体部署（可选）

如果将前端与后端分开部署：

- Render 设置 `CORS_ORIGIN=https://你的前端域名`
- Vercel 设置 `VITE_API_BASE_URL=https://你的后端域名`
- 同时可设置 `VITE_PUBLIC_DEMO=true`

详细步骤见 **[DEPLOY.md](./DEPLOY.md)**。

## 适合作品集展示的内容

- 一个完整可运行的在线 Demo
- 一个简洁的静态产品页
- 一条可复现的 Mock 演示流程
- 清晰的 README 与部署说明

## License

MIT
