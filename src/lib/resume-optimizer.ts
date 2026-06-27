/**
 * 简历优化器（M1 核心）：接收 ParsedResume + JD，调 LongCat 包装 + 改造点列表。
 *
 * 设计原则：
 * 1. 保真约束 — 绝对不能编造原文没有的事实（公司、数字、奖项、项目名）。
 * 2. 结构化输出 — 严格 JSON，配合 safeJsonParse 兜底。
 * 3. AI 推断必须显式标注 aiAdded: true，让前端给出"建议核实"提示。
 *
 * 与旧版 optimizeResume 的区别：
 * - 输入从原始字符串 → 结构化 ParsedResume
 * - 输出从 Markdown 字符串 → OptimizeResult（结构化 + 改造点 + 关键词命中）
 */

import type { ParsedResume, OptimizeResult } from '@/types';

// 复用 ai-service.ts 的 JSON 严格约束和解析逻辑
const JSON_STRICT_INSTRUCTION = `

## ⚠️ JSON 输出强制约束（重要）
- 必须返回 **合法可被 JSON.parse() 直接解析** 的 JSON 字符串
- 所有 key 必须用 **双引号** 包裹（"score"，不允许 {score: 65} 这种裸 key）
- 所有 string 值必须用 **双引号** 包裹
- **绝对不要** 用 \`\`\`json ... \`\`\` 或 \`\`\` ... \`\`\` 包裹
- **绝对不要** 在 JSON 前面/后面加任何解释文字、注释、前缀（如"以下是..."）
- **绝对不要** 使用 Markdown 格式
- 第一个字符必须是 \`{\`，最后一个字符必须是 \`}\``;

const RESUME_OPTIMIZE_FOR_JD_PROMPT = `你是一位顶级简历优化师，服务过众多 500 强企业的招聘，服务对象是资深技术候选人。

## 🚨 第一原则：保真（NON-NEGOTIABLE）
- **绝对不能编造原文没有的事实**：
  - 不能新增公司、项目、奖项、教育背景
  - 不能编造数字、百分比、用户数、性能数据、时间
  - 不能虚构技能、证书、专利
  - 不能把"参与"私自升级成"主导"（除非原文就是主导）
- 可以做的合法优化（不引入新事实，只改写表达）：
  - 动词替换：参与 → 协助；做了 → 负责 / 承担 / 主导（仅当原文语气支持时）
  - 模糊量化建议：原文没有数字时**不要硬塞数字**，改用"显著提升 / 明显优化"等措辞，并在 reason 里说明
  - STAR 结构化：把流水叙述改成 情境(S)-任务(T)-动作(A)-结果(R) 顺序，但内容必须 100% 取自原文
  - 关键词植入：JD 里的高频关键词，若简历已经有相关经历，把对应 bullet 改写得更贴近 JD 用词（不增加新经历）
- AI 推断处理：如果你觉得原文某段可以"补一句合理推断"（如推测某技术产生了某类收益），必须：
  - 在 changes 数组里把这条的 aiAdded 字段设为 true
  - 在 optimized 字段里把那句推断放在「[建议核实]」前缀里（例如："[建议核实] 推测该重构使转化率提升"）
  - 在 reason 里说明这是推断，需要用户人工核实

## 输入

### 简历（已结构化为 JSON）
{parsedResumeJson}

### 目标 JD（可选；为空时只做"通用包装"，不做关键词对齐）
{jdText}

## 输出

严格按以下 JSON 格式返回（不要 Markdown 代码块，不要解释文字，直接 JSON）：

{
  "optimized": {
    "contact": { "name": "...", "phone": "...", "email": "...", "city": "...", "links": ["..."] },
    "summary": "优化后的个人总结（3-5 句话）。原文为空时可基于 experience/projects 提炼；提炼属于推断，整段 aiAdded=true，并在 changes 里标注。",
    "education": [ ...保持原文结构，degree/school/major 不变；gpa/awards 保留；可改写"奖项"表述但不能新增 ... ],
    "experience": [
      {
        "company": "...", "title": "...", "period": "...",
        "bullets": [
          "改写后的第 1 条（保真）",
          "改写后的第 2 条（如有 aiAdded 内容，加 [建议核实] 前缀）",
          ...
        ]
      }
    ],
    "projects": [
      {
        "name": "...", "period": "...", "tech": [...],
        "bullets": [...]
      }
    ],
    "skills": { "languages": [...], "frameworks": [...], "tools": [...], "other": [...] }
  },
  "changes": [
    {
      "section": "summary" | "experience" | "projects" | "skills" | "education",
      "sectionIndex": 0,        // 第几条（从 0 起）
      "field": "bullet-0",      // bullets 数组里的下标；summary 整个字段为 null；skills 用 "languages" 等
      "original": "原文片段",
      "optimized": "改写后片段",
      "reason": "为什么要这么改（一句话，< 30 字）",
      "aiAdded": false           // 仅当添加了原文没有的内容时为 true
    }
  ],
  "jdKeywordsMatched": [
    "JD 里出现且简历已经覆盖的关键词（保真原则下不修改原意，仅改善表述）"
  ],
  "jdKeywordsMissing": [
    "JD 里出现但简历完全没有体现的关键词（建议添加但要人工核实，避免编造）"
  ]
}

## 改造点（changes）规则
- 每一条改动都要进 changes 数组，方便前端用户逐条核对
- 如果某段你完全没改（保留原文），不要进 changes
- reason 写清楚动机，例如："动词升级 + 强调成果"、"对齐 JD 关键词 'React'"、"加入 STAR 结构"
- 总数控制在 5-15 条之间（最重要的改动）

## 输出前自检清单（请在脑子里跑一遍）
1. ✅ optimized.experience 里的所有 bullet，事实是否都能在原文找到？
2. ✅ 数字、公司名、项目名、奖项是否与原文一致？
3. ✅ changes 数组里所有 aiAdded=true 的条目，前缀是否都有"[建议核实]"？
4. ✅ JD 为空时，jdKeywordsMatched 和 jdKeywordsMissing 都是空数组？
${JSON_STRICT_INSTRUCTION}`;

/* ============== AI 调用 + 解析 ============== */

async function callAI(prompt: string, system?: string): Promise<string> {
  // 简历优化 prompt 较长，单独放宽到 90s
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system, json: true, maxTokens: 4000 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let errMsg = res.statusText || `HTTP ${res.status}`;
      let errCode = 'AI_UPSTREAM_ERROR';
      try {
        const data = await res.json();
        if (data?.error) errMsg = data.error;
        if (data?.code) errCode = data.code;
      } catch {}
      const err: Error & { code?: string; status?: number } = new Error(errMsg);
      err.code = errCode;
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    if (!data.success) {
      const err: Error & { code?: string } = new Error(data.error || 'AI 调用失败');
      err.code = data.code || 'AI_UPSTREAM_ERROR';
      throw err;
    }
    return data.text as string;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      const err: Error & { code?: string } = new Error('请求超时（90s 未返回），可缩短简历/JD 或稍后重试');
      err.code = 'TIMEOUT';
      throw err;
    }
    if (e instanceof TypeError && /fetch/i.test(e?.message || '')) {
      const err: Error & { code?: string } = new Error('网络请求失败，请检查网络连接后重试');
      err.code = 'NETWORK';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function safeJsonParse<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let cleaned = (fenced ? fenced[1] : text).trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 轻量修复
    let fixed = cleaned
      .replace(/'([^'\n]*?)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`)
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_一-龥]*)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, '$1');
    try {
      return JSON.parse(fixed) as T;
    } catch (e) {
      throw new Error(`AI 返回的 JSON 解析失败: ${(e as Error).message}; raw=${cleaned.slice(0, 300)}`);
    }
  }
}

/* ============== 对外 API ============== */

export interface OptimizeOptions {
  /** JD 文本；为空时只做通用包装，不做关键词对齐 */
  jdText?: string;
  /** 目标岗位（用于日志/兜底，AI 主要靠 JD 文本） */
  targetPosition?: string;
  /** 超时 ms，默认 60s */
  timeoutMs?: number;
}

export async function optimizeResumeForJD(
  parsed: ParsedResume,
  options: OptimizeOptions = {}
): Promise<OptimizeResult> {
  const { jdText = '', targetPosition = '', timeoutMs = 60_000 } = options;

  // 把 parsed 转成 JSON 字符串喂给 AI；raw 字段太长，去掉
  const parsedForAI = { ...parsed, raw: undefined };
  const parsedJson = JSON.stringify(parsedForAI, null, 2);

  const prompt = RESUME_OPTIMIZE_FOR_JD_PROMPT
    .replace('{parsedResumeJson}', parsedJson)
    .replace(
      '{jdText}',
      jdText.trim() ? jdText : '（用户未提供 JD，请只做通用专业包装，不做关键词对齐）'
    );

  const system =
    `你是一位专业的简历优化师。` +
    (targetPosition ? `正在帮一位候选人优化针对"${targetPosition}"岗位的简历。` : '') +
    ` 保真是第一原则，不允许编造任何事实。`;

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`请求超时（${timeoutMs / 1000}s 未返回），可重试或缩短输入`)),
      timeoutMs
    );
  });

  try {
    const raw = await Promise.race([callAI(prompt, system), timeoutPromise]);
    return normalizeOptimizeResult(safeJsonParse<OptimizeResult>(raw), parsed);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 把 AI 返回的 result 做兜底（字段缺失/类型不对时回退到原 parsed），
 * 保证前端拿到的 OptimizeResult 一定是完整的 ParsedResume + 数组。
 */
export function normalizeOptimizeResult(
  raw: Partial<OptimizeResult>,
  fallback: ParsedResume
): OptimizeResult {
  // 用局部类型避免 TypeScript strict 把 opt 推断为 {} 后报错
  const opt: any = raw.optimized || {};
  const skills = opt.skills || {};

  return {
    optimized: {
      contact: {
        name: opt.contact?.name ?? fallback.contact.name,
        phone: opt.contact?.phone ?? fallback.contact.phone,
        email: opt.contact?.email ?? fallback.contact.email,
        city: opt.contact?.city ?? fallback.contact.city,
        links: Array.isArray(opt.contact?.links) ? opt.contact!.links : fallback.contact.links,
      },
      summary: typeof opt.summary === 'string' ? opt.summary : fallback.summary,
      education: Array.isArray(opt.education) ? opt.education : fallback.education,
      experience: Array.isArray(opt.experience) ? opt.experience : fallback.experience,
      projects: Array.isArray(opt.projects) ? opt.projects : fallback.projects,
      skills: {
        languages: Array.isArray(skills.languages) ? skills.languages : fallback.skills.languages,
        frameworks: Array.isArray(skills.frameworks) ? skills.frameworks : fallback.skills.frameworks,
        tools: Array.isArray(skills.tools) ? skills.tools : fallback.skills.tools,
        other: Array.isArray(skills.other) ? skills.other : fallback.skills.other,
      },
      raw: fallback.raw,
    },
    changes: Array.isArray(raw.changes) ? raw.changes : [],
    jdKeywordsMatched: Array.isArray(raw.jdKeywordsMatched) ? raw.jdKeywordsMatched : [],
    jdKeywordsMissing: Array.isArray(raw.jdKeywordsMissing) ? raw.jdKeywordsMissing : [],
  };
}