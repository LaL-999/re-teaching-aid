# 需求工程教学辅助系统

面向《需求工程》课程的教学辅助 Web 系统。教师 / 学生双角色，提供「按模块的课件资源管理」与「5 个大模型驱动的 AI 工具」，覆盖需求获取、建模、验证、规格说明等教学环节。

> **离线即可演示**：未配置大模型 API Key 时，全部 AI 工具自动使用内置的「离线 Mock」，仍可跑通所有验收场景；配置 Key 后无缝切换为真实大模型。

---

## 功能一览

| 模块 | 功能 | 角色 |
|---|---|---|
| 公共 | 学号 + 密码登录，JWT 鉴权，按角色进入不同主页 | 教师 / 学生 |
| 教师 | 按 6 大教学模块上传课件（ppt/word/pdf/txt，类型白名单） | 教师 |
| 教师 | 资源在线预览（pdf/txt 内嵌预览，office 提示下载）、下载、删除 | 教师 |
| 教师 | 作业管理：布置作业、查看学生提交、逐份批改打分与评语 | 教师 |
| 教师 | 统计仪表盘（模块数 / 资源总数 / 作业数 / AI 模式 / 分布） | 教师 |
| 学生 | 按模块浏览课件，预览 / 下载（空模块显示「暂无资源」） | 学生 |
| 学生 | 作业：查看布置、提交（可覆盖重交）、查看成绩与评语 | 学生 |
| 需求工程流水线 | 七车间闭环（见下方专节），各车间产物可一键流转到下游、可就地审核优化、可持久保存与清空 | 师生共用 |
| ├ ① 产品概要 | 一句话想法 → 背景 / 目标 / 范围 / 干系人 / 核心功能概要 | 师生共用 |
| ├ ② 访谈提纲 | 项目领域 → ≥8 个访谈问题，一键复制 | 师生共用 |
| ├ ③ 具体需求 | 产品概要 → 功能模块 + 用户故事 + 验收标准 | 师生共用 |
| ├ ④ 需求分析与审查 | 标注模糊词 / 主观词 / 矛盾 + 产出「优化后需求」（含原质量检查能力） | 师生共用 |
| ├ ⑤ i\* 目标建模 | 需求 → i\* 模型代码（复制 / 下载 / 审核优化） | 师生共用 |
| ├ ⑥ UML 建模与预览 | 需求 → PlantUML（用例 / 活动 / 类图）+ 在线编译预览，改码即重编 | 师生共用 |
| └ ⑦ SRS 规格说明书 | 项目信息 + 上游需求素材 → GB/T 9385 结构 SRS，导出 MD/HTML，补充非功能需求 | 师生共用 |

---

## 需求工程流水线（闭环）

7 个「车间」按生产顺序串联，构成可闭环的需求工程产线：

```
① 产品概要 → ② 访谈提纲 → ③ 具体需求 → ④ 需求分析与审查 → ⑤ i* 目标建模
                                              └→ ⑥ UML 建模与预览
                                              └→ ⑦ SRS 规格说明书
```

- **数据流转**：每个车间产物下方有「发送到下一车间」按钮，把产物写入下游输入并跳转，无需手工复制粘贴。
- **就地优化**：文本类车间均有「审核并优化」，调用大模型对当前产物做评审改写；④ 本身即「审查＋优化」环节。
- **持久与清空**：所有车间的输入与产物存于可持久化工作台（`store/workbenchStore.ts`，localStorage），**切换车间 / 刷新页面均不丢失**；每个车间提供「清空」。
- **不限字数**：需求类输入框已移除字数上限，可粘贴长需求。

---

## 技术栈

- **前端**：React 18 + Vite + TypeScript + Ant Design 5 + Zustand（含持久化工作台 store）+ React Router 6 + axios
- **后端**：Node + Express + TypeScript（分层 controller → service → repository）
- **持久化**：SQLite（better-sqlite3，单文件零配置）
- **鉴权**：JWT + bcryptjs
- **大模型**：抽象 `LlmProvider` 接口，默认 OpenAI 兼容客户端（DeepSeek/智谱/OpenAI/Ollama 可配）+ 离线 Mock 兜底
- **图形渲染**：PlantUML 经 Kroki 在线渲染 SVG（无需本地 Java）
- **测试**：Vitest（后端 service / 前端组件与工具函数）

---

## 目录结构

```
work/
├─ client/                 前端（React + Vite）
│  └─ src/
│     ├─ components/        布局、守卫、复用组件
│     ├─ pages/             登录、教师、学生、ai/ 七车间流水线
│     ├─ services/          网络层（axios 封装，UI 不直连 fetch）
│     ├─ store/             Zustand 登录态
│     └─ utils/             文件保存、格式化
├─ server/                 后端（Express + SQLite）
│  ├─ src/
│  │  ├─ db/               schema / 连接 / 种子数据
│  │  ├─ middleware/       认证守卫、统一错误处理
│  │  └─ modules/          auth / catalog / resources / ai
│  ├─ data/               运行期 SQLite 文件（自动生成）
│  └─ uploads/            运行期上传文件（自动生成）
└─ package.json            根脚本（一键启动前后端）
```

---

## 快速开始

### 环境要求
- Node.js ≥ 18（开发使用 Node 24 验证）
- npm

### 安装依赖
```bash
npm run install:all
```
（等价于在根目录、`server/`、`client/` 分别执行 `npm install`）

### 启动开发环境（前后端一键）
```bash
npm run dev
```
- 后端：http://localhost:4000
- 前端：http://localhost:5173 （`/api` 已反向代理到后端，免跨域）

首次启动会自动建库并写入种子数据。

### 演示账号
| 角色 | 学号 | 密码 |
|---|---|---|
| 教师 | `2024001` | `123456` |
| 学生 | `2024100` | `123456` |
| 学生 | `2024101` | `123456` |

> 账号不存在 / 密码错误的异常场景，可用任意未注册学号（如 `999999`）或错误密码触发。

---

## 配置真实大模型

`server/.env` 中填入 `LLM_API_KEY` 即从离线 Mock 切换为真实模型（本项目已接入 DeepSeek）：

```dotenv
LLM_BASE_URL=https://api.deepseek.com/v1   # 国产可选：智谱 https://open.bigmodel.cn/api/paas/v4
LLM_API_KEY=sk-xxxxxxxx                     # 留空 = 离线 Mock
LLM_MODEL=deepseek-chat                      # 默认非推理模型，快；亦可改用推理模型 deepseek-v4-pro
LLM_TIMEOUT_MS=120000                        # 超时给足，兼容慢的推理模型
```

> **模型选择**：默认 `deepseek-chat`（非推理，速度快）。实测：访谈/审查/i\*/UML 等短输出约几秒返回，**完整 SRS 约 20–25 秒**。若改用推理模型 `deepseek-v4-pro`，质量更高但更慢（SRS 可达 60–80 秒，曾因此触发超时，故默认改回 `deepseek-chat`）。系统已放宽超时（服务端 120s、前端 130s）以兼容两者。
>
> **安全**：`server/.env` 已被 `.gitignore` 忽略，请勿提交真实 Key；如 Key 曾出现在聊天/截图中，建议到 DeepSeek 后台轮换。

其余可配项见 `server/.env.example`（JWT 密钥、Kroki/PlantUML 服务地址等）。

---

## 构建与测试

```bash
npm run build        # 前后端生产构建
npm test             # 前后端全部单元测试
npm run seed         # 重置种子数据（清空后重新写入）
```

- 后端测试覆盖：AI 服务的输入校验与正常路径、Mock 提供方输出、Markdown→HTML 的 XSS 安全（单测均强制走离线 Mock，与真实大模型 / 网络解耦）。
- 前端测试覆盖：登录页渲染、工具函数。
- 作业管理、资源上传/预览等链路以接口级集成测试验证（登录 → 布置 → 提交 → 批改 → 查看全闭环）。

---

## 主要 API

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | 登录，返回 JWT |
| GET | `/api/modules` | 模块列表（含资源计数） |
| POST | `/api/resources` | 上传资源（教师，multipart） |
| GET | `/api/resources/module/:id` | 按模块列资源 |
| GET | `/api/resources/:id/preview` | 预览（支持 `?token=`） |
| GET | `/api/resources/:id/download` | 下载 |
| POST | `/api/ai/overview` | ① 产品概要 |
| POST | `/api/ai/interview` | ② 访谈提纲 |
| POST | `/api/ai/requirements` | ③ 具体需求 |
| POST | `/api/ai/review` | ④ 需求分析与审查（问题清单 + 优化后需求） |
| POST | `/api/ai/refine` | 通用「审核并优化」（任一车间产物 → 改进版） |
| POST | `/api/ai/istar` | ⑤ i\* 模型代码 |
| POST | `/api/ai/uml/generate` · `/render` | ⑥ UML 代码生成 / 编译 |
| POST | `/api/ai/srs` | ⑦ SRS 生成（支持上游 `material` 素材） |
| GET | `/api/homework/assignments` | 作业列表（教师含提交统计 / 学生含本人状态） |
| POST | `/api/homework/assignments` | 布置作业（教师） |
| POST | `/api/homework/assignments/:id/submit` | 提交作业（学生，可覆盖） |
| GET | `/api/homework/assignments/:id/submissions` | 查看提交（教师） |
| POST | `/api/homework/submissions/:id/grade` | 批改打分（教师） |

---

## 已知事项与取舍

1. **教学模块命名**：采用验收场景的章节式标签（M1 需求工程概述、M2 需求获取——访谈、M3 需求建模、M4 需求验证与确认、M5 需求管理、M6 需求规格说明书）。其中 M1/M2 与场景标签完全一致；为容纳「概述」一章，原正文的「需求优先级」并入「需求管理」。如需调整，改 `server/src/db/seed.ts` 的 `MODULES` 一处即可。
2. **作业管理**：原始需求未定义其细节，本项目按教学常识实现完整闭环（布置 → 提交 → 批改 → 查看），提交形态为文本内容（如需附件提交可在 `submissions` 表与上传链路上扩展）。
3. **联网依赖**：真实大模型调用与 PlantUML/Kroki 编译预览需公网；离线时 AI 走 Mock，UML 预览不可用（可改 `KROKI_SERVER` 指向自建服务）。
4. **office 文档预览**：ppt/doc/docx 不支持浏览器内嵌预览，按需求降级为「请下载后打开」。
5. **前端包体**：路由已按页 `React.lazy` 懒加载、并拆分 react/antd vendor chunk；首屏只加载核心与当前路由。剩余主包以 Ant Design 核心为主，属固有体积。
