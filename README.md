# iHelp Frontend

iHelp 智能客服工作台前端。项目基于 Vite 和原生 JavaScript，提供对话、售后信息提取和 RAG 知识库管理三个主要页面，并通过开发服务器将 `/api` 请求代理到 FastAPI 后端。

## 功能

### 对话工作台

- 通过 SSE 接收 `/api/chat` 的流式回复，支持中途停止。
- 支持会话创建、切换、历史消息回载和永久删除。
- 自动将当前会话 ID 和用户标识保存在浏览器 `localStorage` 中。
- 展示工具调用状态、知识库引用来源和回复选项。
- 支持订单选择、工单确认、退款申请和换货申请等交互卡片。
- 支持复制会话 ID、消息长度计数和 `Ctrl/Cmd + Enter` 发送。

### 售后提取

- 将售后描述提交到 `/api/extract`。
- 展示订单号、诉求类型和期望方案等结构化字段。
- 支持一键复制完整 JSON 结果。

### RAG 知识库

- 查看文档数、知识块数、已向量化、待处理和失败统计。
- 查看最近 40 条知识块。
- 支持补齐向量化数据或重建完整索引。
- 支持从历史问答中挖掘知识。
- 支持输入问题执行 Top-5 语义检索并查看距离分数。

## 技术栈

- Vite 6
- 原生 JavaScript（ES Modules）
- 原生 CSS
- Fetch API / ReadableStream / Server-Sent Events

## 环境要求

- Node.js 18 或更高版本，推荐使用 Node.js 20+
- npm
- 可访问的 iHelp FastAPI 后端

默认后端地址为 `http://127.0.0.1:8000`。

## 快速开始

1. 先启动 FastAPI 后端，确保其监听 `http://127.0.0.1:8000`。
2. 安装前端依赖：

   ```bash
   npm install
   ```

3. 启动开发服务器：

   ```bash
   npm run dev
   ```

4. 浏览器访问：

   ```text
   http://localhost:5173
   ```

开发模式下，Vite 会将所有 `/api/*` 请求转发到 `http://127.0.0.1:8000`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器，默认端口为 `5173` |
| `npm run build` | 构建生产文件到 `dist/` |
| `npm run preview` | 本地预览生产构建结果 |

## 项目结构

```text
.
├── index.html          # 页面结构、三个功能视图和通用弹窗
├── src/
│   ├── main.js         # 页面状态、交互逻辑、接口请求和 SSE 处理
│   └── styles.css      # 全局样式、组件样式和响应式布局
├── vite.config.js      # 开发服务器端口与 /api 代理配置
├── package.json        # 依赖和 npm scripts
├── package-lock.json   # npm 锁定文件
└── dist/               # 生产构建输出，默认不提交
```

## 后端接口

前端依赖以下 FastAPI 接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/chat` | 对话请求，响应使用 SSE 流 |
| `GET` | `/api/conversations` | 获取会话列表 |
| `GET` | `/api/conversations/{id}/messages` | 获取指定会话的消息 |
| `DELETE` | `/api/conversations/{id}` | 永久删除指定会话 |
| `POST` | `/api/extract` | 提取售后订单和诉求信息 |
| `POST` | `/api/tickets` | 创建工单 |
| `GET` | `/api/refunds/reasons` | 获取退款原因 |
| `POST` | `/api/refunds` | 提交退款申请 |
| `GET` | `/api/exchanges/reasons` | 获取换货原因 |
| `POST` | `/api/exchanges` | 提交换货申请 |
| `GET` | `/api/knowledge/stats` | 获取知识库统计 |
| `GET` | `/api/knowledge/chunks` | 获取知识块列表 |
| `POST` | `/api/knowledge/build` | 建库或重建索引 |
| `POST` | `/api/knowledge/mine` | 从历史问答中挖掘知识 |
| `POST` | `/api/knowledge/search` | 执行语义检索 |

## 配置说明

### 修改后端地址

开发代理配置位于 `vite.config.js`：

```js
server: {
  port: 5173,
  proxy: {
    "/api": {
      target: "http://127.0.0.1:8000",
      changeOrigin: true,
    },
  },
}
```

如果后端运行在其他地址，修改 `target` 后重新启动开发服务器即可。

### 浏览器本地数据

前端目前使用以下 `localStorage` 键：

| 键 | 说明 |
| --- | --- |
| `ihelp-session` | 当前选中的会话 ID |
| `ihelp-user-key` | 当前用户标识，目前固定为 `访客` |

`ihelp-user-key` 仅用于演示和区分本地会话，不是身份认证机制。生产环境接入真实用户体系时，应改为后端签名认证或正式会话凭证。

### 生产部署

执行 `npm run build` 后，将 `dist/` 交给静态文件服务器托管。生产环境需要保证：

1. 访问站点根路径时能够返回 `dist/index.html`。
2. `/api/*` 被反向代理到实际 FastAPI 服务。
3. 如果前后端跨域部署，后端需正确配置 CORS；同域反向代理通常无需额外 CORS 配置。

## 使用提示

- 对话页面中，输入消息后点击“发送”，或按 `Ctrl/Cmd + Enter` 提交。
- 新建会话后，历史会话会显示在左侧列表；只有当前会话可以删除。
- 切换到“知识库”页面时，会自动读取最新统计和知识块。
- 构建索引和历史问答挖掘可能耗时较长，按钮禁用期间请等待后端处理完成。

## 常见问题

### 页面可以打开，但所有接口都请求失败

- 确认 FastAPI 已启动，并监听 `127.0.0.1:8000`。
- 检查后端接口路径是否与 README 中的接口表一致。
- 如果修改过后端端口，请同步更新 `vite.config.js` 中的代理目标。
- 修改代理配置后需要重启 `npm run dev`。

### 生产环境页面正常，但接口返回 404 或跨域错误

确认 Web 服务器已将 `/api/*` 反向代理到 FastAPI。前端代码使用的是相对路径，不会在生产构建中自动改写代理地址。

### 历史会话为空

历史会话由后端按 `user_key` 返回。当前前端固定使用 `访客`，如果后端数据库、用户标识或接口状态发生变化，历史列表可能为空。

### 对话没有流式输出

`/api/chat` 需要返回可读取的流式响应。检查后端是否按 SSE 格式输出、响应是否为 `200`，以及中间代理是否缓冲了流数据。
