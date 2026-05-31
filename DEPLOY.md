# 部署指南

推荐组合：**Render 托管完整 Demo** + **Vercel 静态产品页**。面试时把产品页链接放进简历，主按钮指向在线 Demo。

## 一、在线 Demo（Render，推荐）

完整应用（Express + MCP 子进程 + 前端 `dist`）需 Node 运行时，不适合纯静态托管。

### 步骤

1. 将仓库推到 GitHub。
2. 打开 [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**，选择本仓库；或 **New Web Service**，连接仓库。
3. 若手动创建 Web Service：
   - **Root Directory**：留空（仓库根目录）
   - **Build Command**：`npm install && npm run build`
   - **Start Command**：`npm start`
   - **Health Check Path**：`/api/health`
4. 环境变量（建议）：

   | 变量 | 值 | 说明 |
   |------|-----|------|
   | `PUBLIC_DEMO` | `true` | 强制 Mock，公开站不耗 API |
   | `NODE_VERSION` | `20` | Node 版本 |
   | `OPENAI_API_KEY` | （留空） | 公开 Demo 不要填 |

5. 部署完成后得到 URL，例如 `https://agent-workbench-xxxx.onrender.com`。
6. 浏览器打开该 URL，应看到工作台；运行工作流应返回 SSE 事件。

也可在仓库根目录使用 `render.yaml`：**New → Blueprint** 导入。

### 免费层注意

- 冷启动约 30–60 秒，演示前可先访问 `/api/health` 唤醒。
- MCP 需在构建环境能启动 `npx` 子进程；若 Filesystem 连接失败，检查 Render 日志。

---

## 二、静态产品页（Vercel）

1. [Vercel](https://vercel.com/) → **Add New Project** → 导入 GitHub 仓库。
2. **Root Directory** 设为 `landing`。
3. Framework Preset：**Other**（纯静态，无需构建）。
4. 部署后得到产品页 URL，例如 `https://agent-workbench.vercel.app`。

### 修改链接

编辑 `landing/config.js`：

```js
window.SITE_CONFIG = {
  demoUrl: 'https://你的应用.onrender.com',
  githubUrl: 'https://github.com/你的用户名/仓库名',
};
```

提交并重新部署 Vercel。

### 可选截图

将演示截图保存为 `landing/screenshot.png`，产品页会自动展示。

---

## 三、分体部署（可选）

前端 Vercel + 后端 Render 分离时：

**Render（server 逻辑不变，仍用根目录 `npm run build` + `npm start`）**

- `CORS_ORIGIN=https://你的前端.vercel.app`

**Vercel（client 目录）**

- Root Directory：`client`
- Build：`npm install`（在 monorepo 需在项目设置里配置 Install 为在根目录执行，或使用 `cd .. && npm install && npm run build -w client`）
- 环境变量：`VITE_API_BASE_URL=https://你的后端.onrender.com`
- 环境变量：`VITE_PUBLIC_DEMO=true`

更简单的方式仍是 **只部署 Render 一个 URL**，产品页 `demoUrl` 指向它即可。

---

## 四、本地与生产构建

```bash
npm install
npm run build
npm start
# 访问 http://localhost:3001
```

开发模式仍用 `npm run dev`（前端 5173 + 代理到 3001）。

---

## 五、面试展示清单

- [ ] 产品页可打开，「在线体验」指向真实 Demo
- [ ] Demo 上 MCP 显示 connected
- [ ] Mock 模式跑通一条工作流（SSE + 工具链）
- [ ] README 与 DEPLOY 链接一致
- [ ] （可选）30–60 秒录屏放到 README 或 `landing/screenshot.png`

---

## 占位 URL 替换表

| 位置 | 文件 |
|------|------|
| 在线 Demo | `landing/config.js` → `demoUrl` |
| GitHub | `landing/config.js` → `githubUrl` |
| README 徽章区 | `README.md` 部署章节 |
