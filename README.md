# WeJob · 智能求职辅助系统

> AI 驱动的简历优化、模拟面试、薪资情报平台，帮助求职者提升竞争力。

WeJob 是一个面向求职者（应届生、海归、在职跳槽）的智能求职工具 Web 应用。区别于传统求职网站，WeJob 以 **AI + 数据**为核心：内置简历分析引擎对照 ATS 评分模型逐项打分；模拟面试模块按 STAR 法则、行为题、专业题、情景题分类出题并给出评分标准；薪资情报模块汇总公开渠道数据，提供按公司 / 岗位 / 城市 / 级别的中位数查询与 Offer 谈判建议。设计风格遵循 **Professional Smart** —— 深墨色主色 + 蓝色点缀 + 琥珀色微温暖，克制、专业、可信。

## 当前功能状态

| 模块 | 功能 | 状态 | 后端 |
|---|---|---|---|
| 简历分析 | 输入简历 → 评分 + 优势 + 不足 + 关键词 + ATS | ✅ 真实 AI | LongCat |
| 简历优化 | 输入简历 → Markdown 格式重构（STAR 法则） | ✅ 真实 AI | LongCat |
| 模拟面试 | 输入岗位 → 生成 10 道分类面试题（行为/专业/情景/反问） | ✅ 真实 AI | LongCat |
| 面试评估 | 输入问答 → 评分 + 详细反馈 | ✅ 真实 AI | LongCat |
| 薪资情报 | 按公司 / 岗位 / 城市 / 级别查询 | ✅ 静态数据 | `src/lib/data.ts` |
| 简历模板 | — | 🚧 未实现 | — |
| 求职进度跟踪 | — | 🚧 未实现 | — |

## 技术栈

- **框架**：[Next.js 14.2](https://nextjs.org) App Router（React 18）
- **语言**：TypeScript 5（strict 模式）
- **样式**：Tailwind CSS 3 + PostCSS + Autoprefixer
- **AI SDK**：[`ai`](https://github.com/vercel/ai) v3 + `@ai-sdk/openai`（通过 OpenAI 协议接入 LongCat）
- **AI 服务**：[LongCat](https://longcat.chat/platform)（兼容 OpenAI Chat Completions）
- **图标**：[`lucide-react`](https://lucide.dev)
- **部署**：Vercel

> 版本约束见 `package.json`。`devDependencies` 还包含 `@types/{node,react,react-dom}`。

### 为什么选 LongCat？

LongCat 是美团的大模型 API，**完全兼容 OpenAI Chat Completions 协议**，所以 `@ai-sdk/openai` 这个 SDK 直接能用，只换 `baseURL`。选它的理由：
1. **国内访问稳定**（OpenAI 在国内经常不通）
2. **公测期间每天 5M tokens 免费**（个人项目零成本）
3. **1M 上下文窗口**（简历分析绰绰有余）
4. **OpenAI 协议** → 想换 GPT-4 / Claude / 国内其他模型只需改 `LONGCAT_API_BASE`

## 本地开发

```bash
# 1. 克隆仓库
git clone git@github.com:forcoder/wejob.git wejob
cd wejob

# 2. 安装依赖
npm ci

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，把 LONGCAT_API_KEY 替换成真实 key
# 获取地址：https://longcat.chat/platform （注册后创建 app key）

# 4. 启动开发服务器
npm run dev
#    默认监听 http://localhost:3000
```

### 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Next.js 开发服务器（含热更新） |
| `npm run build` | 生产构建（输出至 `.next/`） |
| `npm run start` | 启动生产服务（需先 build） |
| `npm run lint` | 运行 `next lint`（ESLint + Next.js 规则） |
| `npx tsc --noEmit` | 仅做 TypeScript 类型检查 |

### 验证 AI 服务是否连通

```bash
# dev server 起来后
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"用一句话自我介绍","system":"你是助手"}'
# 期望返回: {"success":true,"text":"...","usage":{...}}
# 若返回 success:false，看 error 字段，常见原因是 LONGCAT_API_KEY 没填或额度用完
```

## 目录结构

```
wejob/
├── src/
│   ├── app/                     # Next.js App Router 入口
│   │   ├── api/
│   │   │   └── ai/chat/
│   │   │       └── route.ts     # LongCat 中转 API（服务端，绝不暴露 key）
│   │   ├── layout.tsx           # 根布局（字体、全局样式、<html>）
│   │   ├── page.tsx             # 主页：Tab 切换，组合各业务模块
│   │   └── globals.css          # Tailwind 入口 + 全局变量
│   ├── components/              # 业务组件
│   │   ├── Header.tsx           # 顶部导航
│   │   ├── Hero.tsx             # 首页 Hero 区块
│   │   ├── Features.tsx         # 功能介绍卡片
│   │   ├── SalaryTable.tsx      # 薪资数据表格
│   │   ├── SalaryExplorer.tsx   # 薪资探索器（按公司/岗位筛选）
│   │   ├── ResumeAnalyzer.tsx   # 简历分析（AI）
│   │   ├── InterviewCoach.tsx   # 模拟面试教练（AI）
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── ai-service.ts        # AI Prompt 模板 + callAI() + safeJsonParse()
│   │   └── data.ts              # 薪资静态数据集 + 工具函数
│   └── types/
│       └── index.ts             # 领域模型（Resume / Interview / SalaryData 等）
├── public/                      # 静态资源
├── DESIGN.md                    # 设计系统文档（色彩 / 字体 / 间距）
├── DEPLOYMENT.md                # 部署说明（Vercel、环境变量、回滚）
├── SECURITY.md                  # 安全策略（key 轮换、事故响应）
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
├── package-lock.json
└── .env.example                 # 环境变量模板（不含真实 key）
```

## AI 服务架构

```
┌──────────────┐    POST /api/ai/chat    ┌─────────────────────────┐    HTTPS    ┌─────────────┐
│   Browser    │ ───────────────────────►│  Vercel Serverless      │ ───────────►│  LongCat    │
│  (前端组件)   │ ◄───────────────────────│  (Node.js runtime)      │ ◄───────────│  Chat API   │
└──────────────┘     JSON 响应            └─────────────────────────┘              └─────────────┘
                                             读 LONGCAT_API_KEY
```

**关键设计决策**：
- 客户端**绝不**直接调 LongCat（key 不进浏览器 bundle）
- 中转 API route 做：超时控制、prompt 长度限制、错误脱敏
- `safeJsonParse()` 三层容错：剥 ``` 包裹 → 直接 parse → 轻量修复（裸 key / 单引号 / 尾逗号）
- Prompt 模板末尾统一加 `JSON_STRICT_INSTRUCTION` 块，强制 LongCat 返回合规 JSON

详见 [DEPLOYMENT.md §5](./DEPLOYMENT.md#5-架构ai-服务链路)。

## 部署

完整部署流程（Vercel、环境变量、域名、CICD）见 **[DEPLOYMENT.md](./DEPLOYMENT.md)**。

简述：
1. 仓库接入 Vercel，Framework Preset 选择 **Next.js**。
2. 在 Vercel Project Settings → Environment Variables 配置 `LONGCAT_API_KEY`。
3. 推送到 `main` 分支即触发自动构建与部署。
4. 生产域名：https://wejob-gold.vercel.app

## 安全

详见 [SECURITY.md](./SECURITY.md)，要点：
- API key 只能放 Vercel 环境变量 / `.env.local`（不入 git）
- key 泄露后立即在 LongCat 控制台撤销 + 重新生成
- 客户端代码、commit message、Issue 里都禁止出现明文 key

## 贡献指南

### 分支策略

- `main`：受保护分支，始终保持可发布状态。
- 功能开发从 `main` 拉取特性分支：`feat/<scope>-<short-desc>`（例：`feat/salary-filter`）。
- 修复类：`fix/<short-desc>`。
- 文档 / 构建调整：`chore/<short-desc>`。

### 提交流程

1. 本地完成开发，提交前请确认：
   - `npm run build` 通过
   - `npm run lint` 通过（不留新增 warning）
   - `npx tsc --noEmit` 通过
2. 提交信息建议使用 Conventional Commits（`feat:` / `fix:` / `chore:` / `docs:`）。
3. 推送分支后在 GitHub 发起 **Pull Request** 指向 `main`，填写：
   - 改动说明与动机
   - 关联 Issue（如有）
   - 截图 / 录屏（涉及 UI 改动时）
4. 等待 Code Review；CI 通过、至少 1 位 reviewer 批准后合入。
5. 合入后如需发版，由维护者按 `DEPLOYMENT.md` 流程触发 Vercel 部署。

### 编码规范

- TypeScript strict；新增模块请同步更新 `src/types/index.ts`。
- 组件使用 client component 时显式标注 `'use client'`。
- 样式优先使用 `tailwind.config.js` / `globals.css` 中已有的设计变量（见 `DESIGN.md`），避免新增色值。
- 不要提交包含 `console.log` / `debugger` 的调试残留。
- **AI 相关代码改动**：必须保证 `safeJsonParse` 仍能兜底（即使 prompt 加了 STRICT 约束，也不能假设模型 100% 听话）。
- **不要** 在前端代码里出现任何 API key / token，即便注释里也不允许。

## 许可证

未指定（待项目所有者确认）。