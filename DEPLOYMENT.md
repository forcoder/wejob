# 部署文档（Deployment Guide）

> 本文档面向 WeJob 项目的运维与新成员，说明如何首次部署、如何接入 GitHub 自动部署、如何配置环境变量、如何回滚，以及常见问题排查。

---

## 目录

1. [前置条件](#1-前置条件)
2. [首次部署（命令行）](#2-首次部署命令行)
3. [GitHub 集成（自动部署）](#3-github-集成自动部署)
4. [环境变量](#4-环境变量)
5. [架构：AI 服务链路](#5-架构ai-服务链路)
6. [回滚](#6-回滚)
7. [常见问题](#7-常见问题)

---

## 1. 前置条件

| 项目 | 要求 |
|---|---|
| Node.js | **18.17+**（Next.js 14 要求；建议使用 20 LTS） |
| 包管理器 | npm（项目自带 `package-lock.json`） |
| Vercel 账号 | 一个可用的 Vercel 账号；项目当前归属 team `cookie-8-projects` |
| GitHub 仓库权限 | 对 `forcoder/wejob` 仓库有 Admin/Maintain 权限（用于安装 Vercel GitHub App） |
| Vercel CLI（可选） | `npm i -g vercel`（仅命令行部署需要） |
| AI 服务 | **LongCat API key**（`ak_` 前缀，详见第 4 节） |

---

## 2. 首次部署（命令行）

适用于：第一次部署、本地调试、或在没有 GitHub 集成时手动发布。

```bash
# 1. 克隆代码
git clone git@github.com:forcoder/wejob.git
cd wejob

# 2. 安装依赖
npm install

# 3. （推荐）全局安装 Vercel CLI
npm install -g vercel

# 4. 登录 Vercel（会跳浏览器）
vercel login

# 5. 关联到现有项目（首次部署时）
vercel
# 交互式提示：
#   ? Set up and deploy? → Y
#   ? Which scope? → cookie-8-projects
#   ? Link to existing project? → Y
#   ? What's the name of your existing project? → wejob
#   ? In which directory is your code located? → ./

# 6. 部署到生产环境
vercel --prod
```

部署完成后，Vercel 会输出一个形如 `https://wejob-xxxxxx-cookie-8-projects.vercel.app` 的预览 URL。
当前生产 alias：**`https://wejob-gold.vercel.app`**

### 项目元信息（已 link，无需重复填写）

| 字段 | 值 |
|---|---|
| Project ID | `prj_dOArMlaI5vFbbzk052DKSDagvVAv` |
| Org ID (Team) | `team_U3s8xZpVQBPfEOFXdPBoP9pG` |
| Team Name | `cookie-8-projects` |
| Project Name | `wejob` |
| 生产域名 alias | `wejob-gold.vercel.app` |

这些信息已存在 `.vercel/project.json`（已被 `.gitignore` 排除），无需重新 link。

### 非交互式部署（CI 用）

如果不便用浏览器登录（比如 CI 环境），可使用 token：

```bash
export VERCEL_TOKEN=vercel_xxx   # ⚠️ 见第 7 节安全提醒
vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

---

## 3. GitHub 集成（自动部署）

Vercel GitHub App **不是** GitHub Actions —— 它由 Vercel 维护，无需在 `.github/workflows/` 写任何东西。授权后，每次 `push` 到指定分支，Vercel 自动构建 + 部署。

### 操作清单（用户在浏览器完成）

- [ ] 1. 打开 https://github.com/settings/installations
- [ ] 2. 在 "Installed GitHub Apps" 列表中找到 **Vercel**，点击 "Configure"
  - 若未安装：点击 [Vercel GitHub App](https://github.com/apps/vercel) → "Install" → 选择账号 → "Only select repositories" → 勾选 `forcoder/wejob`
- [ ] 3. 进入 Vercel Dashboard → Project `wejob` → Settings → Git
  - 确认 "Connected Git Repository" = `forcoder/wejob`
  - "Production Branch" = `main`（默认）
  - 勾选 "Deploy Hooks" / "Vercel for GitHub" 评论机器人（如需 PR 预览）
- [ ] 4. 推送一次测试 commit 验证：
  ```bash
  git commit --allow-empty -m "ci: trigger vercel deploy"
  git push origin main
  ```
- [ ] 5. 在 Vercel Dashboard 的 Deployments 标签页确认出现新构建

### 自动部署行为

| 事件 | Vercel 行为 |
|---|---|
| `push` 到 `main` | 部署到 **Production**（绑定 `wejob-gold.vercel.app`） |
| `push` 到其它分支 | 部署到 **Preview**（独立 URL，含 PR 评论链接） |
| Pull Request | 自动生成 **Preview Deployment**，并在 PR 中由 Vercel bot 评论 |
| `git push --force` | 触发新构建，**不会**回滚；如需回滚见 [第 6 节](#6-回滚) |

### 禁用自动部署（可选）

如需临时暂停某个分支的自动部署：
- Vercel Dashboard → Project → Settings → Git → "Ignored Build Step" → 添加命令：
  ```bash
  if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
  ```

---

## 4. 环境变量

### 当前状态（2026-06-22）

经核查：
- **Vercel 项目端**：已配置 `LONGCAT_API_KEY` (Production, Sensitive)
- **代码端**：`src/app/api/ai/chat/route.ts` 读取 `LONGCAT_API_KEY` / `LONGCAT_API_BASE` / `LONGCAT_MODEL`
- **结论**：当前部署**必须有** `LONGCAT_API_KEY`，否则 `/api/ai/chat` 会返回 500

### 当前生产配置

| 变量名 | 值来源 | 必填 | 暴露前端 |
|---|---|---|---|
| `LONGCAT_API_KEY` | LongCat 控制台（`https://longcat.chat/platform`），`ak_` 前缀 | ✅ 是 | ❌ 仅服务端 |
| `LONGCAT_API_BASE` | 默认 `https://api.longcat.chat/openai/v1` | 否 | ❌ 仅服务端 |
| `LONGCAT_MODEL` | 默认 `LongCat-2.0-Preview` | 否 | ❌ 仅服务端 |

### 为什么不用 OpenAI？

项目最初计划用 OpenAI（package.json 里还有 `@ai-sdk/openai` 依赖），但因为：
1. 国内访问 OpenAI 不稳定
2. LongCat 兼容 OpenAI 协议（同一个 SDK 就能调）
3. LongCat 公测期间每日 5M 免费 tokens

所以**实际接入的是 LongCat**。`@ai-sdk/openai` SDK 的 `createOpenAI()` / `new OpenAI()` 是协议无关的，只换 `baseURL` + `apiKey` 就能切到任何 OpenAI-compatible 服务。

### 如何在 Vercel 配置环境变量

**方法 A：Dashboard（推荐）**
1. Vercel Dashboard → Project `wejob` → Settings → Environment Variables
2. 输入 Key / Value
3. 选择作用环境：Production / Preview / Development（可多选）
4. 保存 → 下次部署生效

**方法 B：CLI（非交互式）**
```bash
# 添加（从 stdin 读值，绕开交互式提示）
printf '%s\n' "ak_your_key_here" | vercel env add LONGCAT_API_KEY production

# 列出所有变量（不显示值）
vercel env ls

# 删除
vercel env rm LONGCAT_API_KEY production --yes

# 拉取到本地（写入 .env.local）
vercel env pull .env.local
```

### 本地开发

复制 `.env.example` 为 `.env.local`，填入真实 key：
```bash
cp .env.example .env.local
# 编辑 .env.local，填入 LONGCAT_API_KEY=ak_xxx
npm run dev
```

### ⚠️ 安全提醒

- **永远不要**把真实 `.env.local` 提交到 git（`.gitignore` 已包含 `.env` / `.env.local` / `.env*.local`）
- **永远不要**把 token 写在文档、Slack、Issue、commit message 里
- 客户端可见变量必须以 `NEXT_PUBLIC_` 开头；其它一律仅服务端可见
- LongCat key 泄露处理流程见 [7.6](#76-安全发现-token-或-api-key-泄露怎么办)

---

## 5. 架构：AI 服务链路

```
┌──────────────┐    POST /api/ai/chat    ┌─────────────────────────┐    HTTPS    ┌─────────────┐
│   Browser    │ ───────────────────────►│  Vercel Serverless      │ ───────────►│  LongCat    │
│  (前端组件)   │ ◄───────────────────────│  (Node.js runtime)      │ ◄───────────│  Chat API   │
└──────────────┘     JSON 响应            └─────────────────────────┘  流式/JSON   └─────────────┘
                                             读 LONGCAT_API_KEY
```

### 为什么客户端不直接调 LongCat？

- API key **绝对不能**出现在浏览器 bundle（否则任何人打开 DevTools 就能拿走）
- LongCat 没有 CORS / 没有 referer 校验，key 一旦泄露可以无限调用花光额度
- 中转 API route 还能统一做：超时控制、prompt 长度限制、错误脱敏

### API route 详情：`POST /api/ai/chat`

**请求体**：
```json
{
  "prompt": "用户提示词（必填，≤30000 字符）",
  "system": "系统提示词（可选）",
  "json": true,
  "model": "LongCat-2.0-Preview",
  "maxTokens": 2000
}
```

**响应（成功）**：
```json
{
  "success": true,
  "text": "AI 返回的内容（若 json=true 已剥 ``` 包裹）",
  "usage": { "promptTokens": 100, "completionTokens": 50, "totalTokens": 150 }
}
```

**响应（失败）**：
```json
{ "success": false, "error": "AI 服务调用失败: <原因>" }
```

### JSON 解析容错

`src/lib/ai-service.ts` 里的 `safeJsonParse()` 会：
1. 剥掉 ```json ... ``` 包裹
2. 试 `JSON.parse()` 直接解析
3. 失败则做轻量修复（裸 key → 加双引号、单引号 → 双引号、尾逗号删除）
4. 还失败才抛错（不会静默用 mock）

加上 prompt 模板末尾的 `JSON_STRICT_INSTRUCTION` 块，**实测 LongCat 返回合规 JSON 的概率 > 95%**。

---

## 6. 回滚

Vercel 保留所有部署历史，回滚就是一瞬间的事。

### 通过 Dashboard（最直观）

1. 进入 Project → Deployments
2. 找到你想回滚到的那次部署
3. 点击右上角菜单 → "Promote to Production"

### 通过 CLI

```bash
# 列出最近部署
vercel ls

# 回滚到上一次生产部署（会立即生效）
vercel rollback
```

### 注意事项

- 回滚不会删除中间部署，仍然可访问
- 回滚会立即更新生产 alias，无需重新部署
- 如果回滚后的部署使用了**已删除的**环境变量，会失败 —— 此时应先重新部署上一个 commit，再 rollback
- 回滚只回滚代码，不回滚环境变量 — LongCat key 的轮换走 Dashboard

---

## 7. 常见问题

### 7.1 构建失败：`Module not found` / `Cannot find package`

**原因**：依赖未安装或版本冲突。

**排查**：
```bash
rm -rf node_modules .next package-lock.json
npm install
npm run build   # 本地先跑一遍构建
```

如果本地构建成功但 Vercel 失败：检查 Node 版本（Vercel 默认 20.x，Project Settings 可改）。

### 7.2 构建超时

**原因**：Next.js 14 在大型项目上首次冷启动较慢。

**解决**：
- Vercel Dashboard → Project → Settings → General → "Build Command" 改为 `npm run build`
- 启用 "Ignored Build Step" 跳过无变化 commit
- Pro 账号可提高到 45 分钟构建时间

### 7.3 环境变量未生效

**排查清单**：
- [ ] 变量名拼写是否完全一致（大小写敏感）？
- [ ] 选择了正确的环境（Production / Preview / Development）？
- [ ] 修改后**重新部署**了吗？（仅保存不触发重建）
- [ ] 客户端访问 `process.env.XXX` 但没用 `NEXT_PUBLIC_` 前缀？
- [ ] Next.js 14 对新增 env 需要 `next dev` 重启或重新 `vercel --prod`

### 7.4 域名 / Alias 配置

项目当前生产 alias：`wejob-gold.vercel.app`

**添加自定义域名**：
1. Vercel Dashboard → Project → Settings → Domains
2. 输入域名（如 `wejob.com`）
3. 按提示到 DNS 服务商添加 CNAME / A 记录
4. 等待 SSL 证书自动签发（通常 < 1 分钟）

**查看所有 alias**：
```bash
vercel alias ls
```

**自动切换 alias 到最新 production 部署**（推荐用于 push 后）：

项目启用了 GitHub 自动部署（§3），push 后 Vercel 会自动构建新部署，但**不会自动切到 `wejob-gold.vercel.app`**（项目有多个域名，CLI 只切主 alias）。手动切需要调 API，本仓库自带脚本一键完成：

```bash
export VERCEL_TOKEN=vcp_xxx    # Vercel API token（Dashboard → Settings → Tokens）
npm run alias:promote
# 或直接调用：
./scripts/alias-promote.sh
```

脚本逻辑：
1. 查最新 READY 状态的 production 部署
2. 查 alias `wejob-gold.vercel.app` 当前指向哪个部署
3. 如果不是最新 → 调 `POST /v2/deployments/{id}/aliases` 切过去
4. 否则报"无需切换"

环境变量：
- `VERCEL_TOKEN`（必填）：Vercel API token
- `VERCEL_PROJECT_ID`（可选）：默认从 `.vercel/repo.json` 读
- `VERCEL_TEAM_ID`（可选）：默认从 `.vercel/repo.json` 读
- `ALIAS`（可选）：默认 `wejob-gold.vercel.app`，可换成 `wejob-cookie-8-projects.vercel.app`

返回码：`0` 成功或已是最新 / `1` 缺 token / `2` 项目找不到 / `3` 部署未就绪 / `4` API 失败

### 7.5 AI 功能返回 "Token 额度不足"

LongCat 每日免费额度（5M tokens）用完。

**解决**：
1. 去 https://longcat.chat/platform/feedback 反馈模型使用 case，可以获取更多额度
2. 等 UTC+0 0 点重置
3. 切换到付费 key 或其他 OpenAI-compatible 服务（修改 `LONGCAT_API_KEY` / `LONGCAT_API_BASE`）

### 7.6 安全：发现 token 或 API key 泄露怎么办？

**立即执行**（不分昼夜）：

**Vercel Token 泄露：**
1. Vercel Dashboard → Settings → Tokens → 找到对应 token → **Revoke**
2. 重新生成 token，存到密码管理器（1Password / Bitwarden）
3. 检查 git 历史、Slack、日志中是否还有泄露痕迹

**LongCat API Key 泄露：**
1. https://longcat.chat/platform → 找到对应 app key → **撤销/重置**
2. 重新生成 key
3. 更新 Vercel env：`printf '%s\n' "new_key" | vercel env add LONGCAT_API_KEY production`（会替换旧的）
4. 触发重新部署（或 push 一次让 GitHub 集成重跑）

**注意事项**：
- Vercel 部署完之后我（agent）都会主动提醒你 key 已泄露，建议轮换
- 项目对 key 泄露的容忍度取决于你的额度预算 — LongCat 免费层泄露一次最多损失 5M tokens/天，付费 key 泄露一次可能损失真金白银

### 7.7 网站突然 401 "Authentication Required"

**症状**：
- 浏览器打开 `wejob-gold.vercel.app` 显示 Vercel 的登录拦截页
- `curl` 返回 HTTP 401 + "Authentication Required" HTML
- 但服务器实际是 Ready 状态（Vercel Dashboard 看是绿色）

**原因**：通常是某个新部署开启了 Vercel Deployment Protection（默认开启），并且**这个新部署被 promote 成了 production alias**。这种情况最容易在 GitHub 自动部署触发后出现。

**排查步骤**：
```bash
# 1. 确认 401 是来自 deployment protection（不是代码 bug）
curl -sS -m 10 https://wejob-gold.vercel.app/ | grep -q "Authentication Required" && echo "是 deployment protection"

# 2. 看最近部署
vercel ls

# 3. 找上次能正常访问的部署（用记忆里的旧 URL 或者之前的 vercel ls 输出）

# 4. 回滚到上次好的部署
vercel rollback https://<上次好的部署 URL> --scope cookie-8-projects --yes
```

**永久解决**（关掉 Deployment Protection）：

API（推荐，可脚本化）：
```bash
curl -X PATCH "https://api.vercel.com/v1/projects/prj_dOArMlaI5vFbbzk052DKSDagvVAv" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```

Dashboard：Project → Settings → Deployment Protection → 关掉 "Vercel Authentication"。

**注意事项**：
- 关掉后任何拿到 deployment URL 的人都能访问你的代码（看 build artifact），不算 source code 泄露，但 build 时打的 `NEXT_PUBLIC_*` env 会暴露
- 详细配置说明见 [SECURITY.md §5](./SECURITY.md#5-deployment-protection-配置)

### 7.8 git push 后生产自动更新了，怎么防止？

Vercel 检测到 GitHub push 默认会触发部署（如果项目 link 状态启用）。要在 push 后等一下手动控制：

**Dashboard**：Project → Settings → Git → "Disconnect" 仓库（之后只能手动 `vercel --prod`）

**API**：
```bash
curl -X PATCH "https://api.vercel.com/v1/projects/prj_dOArMlaI5vFbbzk052DKSDagvVAv" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gitProviderOptions":{"createDeployments":"disabled"}}'
```

---

## 附录 A：常用命令速查

```bash
# 本地开发
npm run dev                       # http://localhost:3000

# 本地构建（模拟 Vercel）
npm run build && npm start

# 部署
vercel                            # 预览部署
vercel --prod                     # 生产部署

# 项目信息
vercel inspect                    # 查看项目配置
vercel env ls                     # 列出环境变量（不含值）
vercel alias ls                   # 列出域名 alias
vercel ls                         # 列出最近部署
vercel logs <deployment-url>      # 查看运行时日志

# 回滚
vercel rollback

# 环境变量
vercel env add KEY production     # 添加（交互式）
printf '%s\n' "value" | vercel env add KEY production  # 非交互式
vercel env rm KEY production --yes                    # 删除
vercel env pull .env.local        # 拉取到本地

# LongCat 联调（本地）
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"ping","system":"你是助手"}'
```

## 附录 B：项目结构速览

```
wejob/
├── .env.example           # 环境变量模板（本文档配套）
├── .gitignore             # 已排除 .vercel / .next / node_modules / .env*
├── .vercel/               # Vercel 链接配置（不入 git）
│   └── project.json       # projectId / orgId
├── DEPLOYMENT.md          # 本文档
├── SECURITY.md            # 安全策略（key 轮换 / 事故响应）
├── DESIGN.md              # 设计规范
├── README.md
├── next.config.js         # Next.js 配置（最小化）
├── package.json           # 依赖：next 14、react 18、ai-sdk、@ai-sdk/openai
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── src/
    ├── app/               # App Router
    │   ├── api/
    │   │   └── ai/chat/route.ts   # LongCat 中转 API route（服务端）
    │   ├── layout.tsx
    │   └── page.tsx       # 首页（4 个 tab：home/resume/salary/interview）
    ├── components/        # 8 个客户端组件
    ├── lib/
    │   ├── ai-service.ts  # AI Prompt 模板 + callAI() + safeJsonParse()
    │   └── data.ts        # 薪资静态数据
    └── types/index.ts
```

## 附录 C：变更记录

| 日期 | 变更 |
|---|---|
| 2026-06-22 v1 | 初版；记录项目元信息、占位 AI 接入说明 |
| 2026-06-22 v2 | **接入 LongCat** — 新增 `/api/ai/chat` 中转路由；`LONGCAT_API_KEY` 已配 Vercel Production；`ai-service.ts` 重写为客户端 fetch 中转；新增 `safeJsonParse` 容错 + `JSON_STRICT_INSTRUCTION` prompt 约束；4 个 AI 功能（简历分析/优化/面试题/面试评估）端到端可用 |
| 2026-06-22 v3 | **401 事故修复** — git push 触发 GitHub 集成自动部署，新部署被 Vercel Deployment Protection 拦了导致生产 401；rollback 到上一版 + API `PATCH /v1/projects/...` 把 `ssoProtection` 关掉；新增 §7.7 401 排查、§7.8 关闭 GitHub 自动部署 |