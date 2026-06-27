# WeJob 安全策略

> 项目：`wejob`（cookie-8-projects 组织下）
> 生产域名：https://wejob-gold.vercel.app
> 最后更新：2026-06-22 v3（新增 §5 Deployment Protection 配置；记录 401 事故与修复）

本文档记录 WeJob 项目当前的安全实践、已知的 key 状态，以及未来发生泄露事故时的响应流程。

---

## 1. API Key 管理

### 1.1 存储原则

| Key 类型 | 存储位置 | 是否暴露给浏览器 |
|---|---|---|
| 服务端 API key（如 `LONGCAT_API_KEY`） | Vercel Project → Settings → Environment Variables | ❌ 否 |
| 公开站点配置（如 `NEXT_PUBLIC_SITE_URL`） | 同上 | ✅ 是（必须以 `NEXT_PUBLIC_` 开头） |
| 本地开发 key | 仓库根 `.env.local`（git 忽略） | ❌ 否 |

**铁律**：

1. 所有第三方服务的 API key（LongCat、未来可能的 OpenAI、Anthropic 等）**只放在服务端 env var**，变量名**不带** `NEXT_PUBLIC_` 前缀。
2. Next.js 14 行为：只有 `NEXT_PUBLIC_*` 会被打包进客户端 bundle。其它 env var 仅在 Server Components / Route Handlers / `getServerSideProps` 里可见。
3. 任何把 API key 直接放进 `process.env.NEXT_PUBLIC_*` 的 PR 都必须 reject。

### 1.2 命名约定

- 服务端 key：`<PROVIDER>_API_KEY`（例：`LONGCAT_API_KEY`）
- 自定义 endpoint：`<PROVIDER>_API_BASE`
- 模型名：`<PROVIDER>_MODEL`
- 公开变量：必须 `NEXT_PUBLIC_<NAME>`，且**绝不包含 key**

### 1.3 轮换流程

当需要轮换 key（如服务到期、季度安全审计、怀疑泄露）：

1. 在服务商控制台（如 https://longcat.chat/platform）撤销旧 key、生成新 key。
2. Vercel Dashboard → Project → Settings → Environment Variables → 找到对应变量 → 编辑值。或 CLI：
   ```bash
   vercel env rm LONGCAT_API_KEY production
   printf '<new-key>\n' | vercel env add LONGCAT_API_KEY production
   ```
3. 触发一次重新部署（Vercel Dashboard → Deployments → 最新一条 → Redeploy），让新 key 生效。
4. 通知项目组其他人：旧 key 已作废。
5. 在本文档 §2 更新 key 状态记录。

### 1.4 本地开发

- 仓库根目录新建 `.env.local`，填真实值。`.gitignore` 已忽略 `.env` / `.env.local` / `.env*.local`。
- 团队成员之间通过加密渠道（1Password、飞书加密消息）共享本地 dev key，**不**走 Slack/邮件明文。
- 提交代码前 `git status` 确认没有 `.env.local` 被加入 stage。

---

## 2. 当前 LongCat Key 状态

> ⚠️ **关键提醒：以下两个 key 都已视为泄露**，必须撤销重发。

| Key 标识 | 用途 | 状态 | 处理建议 |
|---|---|---|---|
| `ak_27c8n82xm2H53f97aG8OV1Zw8am6w` | 原计划用于生产 | ❌ **泄露** —— 在 agent 对话明文出现过 + **免费额度已耗尽** | **立即**撤销；不再使用 |
| `ak_27i3gd19u43J3fT1tS1Le0mN6cz6U` | 当前 **生产** + 测试 key | ⚠️ **泄露但已上线** —— Vercel Production `LONGCAT_API_KEY` 当前就是这把；每日 5M 免费 tokens | **尽快**撤销；拿到新 key 后替换 Vercel env 并 redeploy |

**为什么会泄露**：在搭建基础设施的过程中，key 以明文形式出现在与 AI agent 的对话上下文里。虽然对话本身不公开，但任何有 workspace 访问权限的人都能读到；按"假定对话日志可能被持久化"的安全原则，这两个 key 都应作废。

**当前生产 key 切换时间线**：
- 2026-06-22 09:48 — 首次部署，使用 `ak_27c8n82xm2...`，**线上返回 429（额度耗尽）**
- 2026-06-22 09:55 — 切换到 `ak_27i3gd19u4...` 并重新部署，**线上 4 个 AI 功能验证通过**

**操作清单（生产 owner 待办）**：

- [ ] 登录 LongCat 控制台（https://longcat.chat/platform）
- [ ] 撤销 `ak_27c8n82xm2H53f97aG8OV1Zw8am6w`
- [ ] 撤销 `ak_27i3gd19u43J3fT1tS1Le0mN6cz6U`（**当前线上在用，撤之前先拿到新 key**）
- [ ] 生成 2 个新 key（生产 + 测试分离，避免撤销影响线上）
- [ ] 新生产 key 写入 Vercel：`printf '%s\n' "new_key" | vercel env add LONGCAT_API_KEY production`（同名变量会替换）
- [ ] 触发 redeploy 验证 AI 功能（访问 https://wejob-gold.vercel.app → 简历分析 / 模拟面试）
- [ ] 更新本节表格状态为 ✅ 已轮换 + 记录新 key 指纹（前 8 位即可，不要完整 key）

---

## 3. 代码安全扫描

已配置/已执行的检查：

### 3.1 Git 忽略规则（`.gitignore`）

```
node_modules/
.next/
.vercel
*.log
.env
.env.local
.env*.local
.DS_Store
*.swp
*.swo
.idea/
.vscode/
```

`.env` / `.env.local` / `.env*.local` 全部忽略，避免误提交。

### 3.2 环境变量命名约定

- 通过代码审查（Code Review）强制要求：服务端 key 变量名不带 `NEXT_PUBLIC_`。
- 当前 `src/app/api/ai/chat/route.ts` 读的是 `LONGCAT_API_KEY` / `LONGCAT_API_BASE` / `LONGCAT_MODEL`，全部服务端安全。

### 3.3 静态扫描（人工 / 命令）

定期手动跑（建议接入 CI）：

```bash
# 查所有 process.env 用法，确认没有 NEXT_PUBLIC_<KEY>
grep -rn "process.env" src/

# 查硬编码 key 前缀（LongCat ak_, OpenAI sk-, Anthropic sk-ant-）
grep -rn "ak_\|sk-\|sk-ant-" src/

# 查意外暴露 env var 到 client component 的痕迹
grep -rn "NEXT_PUBLIC_" src/
```

CI 建议（未来实施）：在 `package.json` 加 `lint:secrets` 脚本，用 `gitleaks` 或 `trufflehog` 在 PR 阶段扫 secret。

### 3.4 错误信息脱敏

`src/app/api/ai/chat/route.ts` 在 catch 块中只把异常 `message` 回传给客户端，**不**打印完整请求（含 key）。生产日志应使用 Vercel 的 Log Drain + 过滤规则，避免 key 出现在日志聚合系统。

---

## 4. 事故响应（Key 泄露）

如果**未来**怀疑或确认任何 key 泄露：

### 4.1 立即（0 ~ 30 分钟）

1. **停止使用**：在 Vercel 移除对应环境变量（`vercel env rm <NAME> production` 或 Dashboard 操作）。
2. **撤销原 key**：到服务商控制台（LongCat / OpenAI / 等）撤销。
3. **生成新 key**。

### 4.2 短期（30 分钟 ~ 2 小时）

4. **写入新 key**：通过加密渠道获取新 key → 写入 Vercel（CLI 或 Dashboard）。
5. **触发 redeploy**：让新配置生效。
6. **验证**：用 Postman / `curl` 打 `/api/ai/chat` 确认 200，确认 AI 功能正常。
7. **回滚检查**：如果服务异常，Dashboard → Deployments → 选上一个 good build → Promote to Production。

### 4.3 事后（24 小时内）

8. **审计日志**：拉 Vercel 函数日志，看泄露 key 期间有没有异常调用（异常 IP、异常 payload、超额 token 消耗）。LongCat 控制台查 usage 记录。
9. **根因**：key 为什么会泄露？commit history？.env.local 被打包？日志泄露？对话上下文？记录到事故复盘。
10. **更新本 SECURITY.md §2**：登记新 key 状态、泄露时间窗口、影响范围。
11. **加固**：根据根因加针对性的防护（git pre-commit hook、CI 扫描、权限收紧等）。
12. **通知**：告知项目 owner / 用户。

### 4.4 长期（1 周内）

13. 复查所有 env var 是否合规（无 `NEXT_PUBLIC_*` 暴露 key）。
14. 考虑引入 secret 扫描工具（gitleaks / trufflehog）到 CI。
15. 如果泄露规模大（>1 个 key 或影响用户数据），按当地法规评估是否需要披露。

---

## 5. Deployment Protection 配置

### 5.1 什么是 Deployment Protection

Vercel 提供 "Deployment Protection"（也称 "Vercel Authentication"）来限制谁能访问部署 URL（`*.vercel.app` 这种临时 URL）。**默认情况下新项目是开启的**，类型是 `all_except_custom_domains`，即：

- 临时 URL（`https://wejob-xxxxxx-cookie-8-projects.vercel.app`）→ **需要登录 Vercel 才能访问**
- 自定义域名 / alias（如 `wejob-gold.vercel.app`）→ 直接可访问

### 5.2 当前配置

✅ **已关闭**：`ssoProtection = null`（2026-06-22 配置）

通过 Vercel API 设置：
```bash
curl -X PATCH "https://api.vercel.com/v1/projects/prj_dOArMlaI5vFbbzk052DKSDagvVAv" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```

### 5.3 为什么关掉

事件回放：2026-06-22 用户授权 agent 推 GitHub commit，Vercel 检测到 push 自动触发部署，新部署被 Deployment Protection 拦了返回 401，Vercel 又把它 promote 成了 production alias，导致 `wejob-gold.vercel.app` 短暂挂掉。回滚 + 关掉 SSO 后恢复。

### 5.4 风险与缓解

关掉 SSO 的代价：**任何拿到 deployment URL 的人都能访问代码**。对于：
- **个人项目 / hobby plan** → 通常 OK
- **有商业机密 / 用户数据的项目** → 应当保留 SSO，配合 `gitProviderOptions.createDeployments = "disabled"` 关闭 GitHub 自动部署
- **多人协作** → 应使用 Preview Deployment + Vercel for GitHub 的 PR 评论模式

### 5.5 复检命令

```bash
# 查看当前保护配置
curl -s "https://api.vercel.com/v1/projects/prj_dOArMlaI5vFbbzk052DKSDagvVAv" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | tr ',' '\n' | grep ssoProtection
```

期望输出：`"ssoProtection":null`（关）或 `"ssoProtection":{"deploymentType":"..."}`（开）。

---

## 6. 联系方式

- 项目 owner：wejob 项目的 cookie-8-projects 组织管理员
- 安全问题反馈：在 GitHub issue 标记 `security` 标签，**不要**在 issue 正文里贴 key
- 紧急情况：直接联系 owner 走加密渠道（不要走明文 IM）

---

**版本**：v1（2026-06-22 建立）