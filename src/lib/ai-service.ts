import { Resume, ResumeAnalysis } from '@/types';

// JSON 输出严格约束（注入到所有需要 JSON 的 prompt 末尾）
const JSON_STRICT_INSTRUCTION = `

## ⚠️ JSON 输出强制约束（重要）
- 必须返回 **合法可被 JSON.parse() 直接解析** 的 JSON 字符串
- 所有 key 必须用 **双引号** 包裹（"score"，不允许 {score: 65} 这种裸 key）
- 所有 string 值必须用 **双引号** 包裹
- **绝对不要** 用 \`\`\`json ... \`\`\` 或 \`\`\` ... \`\`\` 包裹
- **绝对不要** 在 JSON 前面/后面加任何解释文字、注释、前缀（如"以下是..."）
- **绝对不要** 使用 Markdown 格式
- 第一个字符必须是 \`{\`，最后一个字符必须是 \`}\``;

// 简历分析Prompt模板
const RESUME_ANALYSIS_PROMPT = `你是一位专业的简历优化师和HR顾问。请分析以下简历，给出详细的优化建议。

## 评分标准
1. 内容完整性 (20分)
2. 关键词匹配度 (20分) - 针对目标岗位
3. 成就量化程度 (20分)
4. 格式规范性 (20分)
5. ATS兼容性 (20分)

## 请从以下维度分析：

### 1. 优势亮点
- 列出简历中最有竞争力的3-5个亮点

### 2. 待改进问题
- 列出3-5个需要改进的具体问题

### 3. 关键词分析
- 已有的强关键词
- 缺失的重要关键词
- 建议添加的关键词

### 4. ATS兼容性评分 (0-100)
- 简历追踪系统(ATS)解析效果评估

### 5. 优化建议
- 针对每个问题给出具体可操作的改进建议

## 简历内容：
{resumeContent}

## 目标岗位（如果有）：
{targetPosition}

请严格按以下 JSON 格式返回（不要用 Markdown 代码块包裹，不要任何解释文字，直接输出 JSON）：
{
  "score": 总分(0-100),
  "strengths": ["优势1", "优势2", ...],
  "weaknesses": ["问题1", "问题2", ...],
  "suggestions": ["建议1", "建议2", ...],
  "keywordAnalysis": {
    "found": ["已有关键词1", ...],
    "missing": ["缺失关键词1", ...],
    "suggested": ["建议添加1", ...]
  },
  "atsCompatibility": 兼容性分数(0-100)
}${JSON_STRICT_INSTRUCTION}`;

// 简历优化Prompt
const RESUME_OPTIMIZE_PROMPT = `你是一位顶级简历优化师，服务过众多500强企业的招聘。请根据以下简历内容和目标岗位，优化简历使其更具竞争力。

## 优化原则
1. **成就量化**：用数据说话，量化工作成果
2. **关键词优化**：针对目标岗位嵌入行业关键词
3. **STAR法则**：用Situation-Task-Action-Result结构描述经历
4. **简洁有力**：删除废话，突出核心价值

## 原始简历：
{originalResume}

## 目标岗位：
{targetPosition}

## 请输出优化后的完整简历，包含：
1. 个人总结（3-5句话，突出核心价值）
2. 工作经历（每条用STAR法则重构）
3. 技能列表（按相关性排序）

请用Markdown格式输出。`;

// 模拟面试问题生成Prompt
const INTERVIEW_QUESTION_PROMPT = `你是一位经验丰富的面试官，专注于{position}岗位的招聘。请根据以下信息生成模拟面试问题。

## 岗位信息
- 职位：{position}
- 公司类型：{companyType}
- 候选人的简历摘要：{resumeSummary}

## 问题类型分配
- 行为面试题 (STAR法则)：3个
- 专业能力题：4个
- 情景模拟题：2个
- 反问环节问题：1个

## 请生成面试问题

对于每个问题，请说明：
1. 考察点
2. 评分标准（好/中/差的回答特征）

请严格按以下 JSON 格式返回（不要用 Markdown 代码块包裹，不要任何解释文字，直接输出 JSON）：
{
  "questions": [
    {
      "id": "q1",
      "type": "behavioral|technical|situational",
      "question": "问题内容",
      "考察点": "考察什么能力",
      "评分标准": {
        "excellent": "优秀回答特征",
        "average": "一般回答特征",
        "poor": "较差回答特征"
      }
    }
  ]
}${JSON_STRICT_INSTRUCTION}`;

// 面试回答评估Prompt
const EVALUATE_ANSWER_PROMPT = `你是一位经验丰富的面试官，擅长评估候选人的回答质量。请评估候选人对以下面试问题的回答。

## 面试问题：
{question}

## 候选人回答：
{answer}

## 评估维度
1. 内容相关性 (25分) - 回答是否切题
2. 逻辑清晰度 (25分) - 思路是否条理分明
3. 深度和专业性 (25分) - 是否展现专业能力
4. 表达质量 (25分) - 语言是否流畅、是否有具体例子

## 请严格按以下 JSON 格式返回（不要用 Markdown 代码块包裹，不要任何解释文字，直接输出 JSON）：
{
  "score": 总分(0-100),
  "feedback": "详细反馈，指出优点和不足，给出具体改进建议"
}${JSON_STRICT_INSTRUCTION}`;

/**
 * 调服务端 /api/ai/chat 跑 LongCat。
 * 客户端不能直接调 LongCat（key 暴露），统一走这个中转。
 * UI 层不再静默 fallback，错误往上抛。
 *
 * 错误类型：
 * - `RATE_LIMIT` — LongCat 429，建议 10-30s 后重试
 * - `AI_UPSTREAM_ERROR` — 其他上游错误（4xx/5xx）
 * - `TIMEOUT` — 客户端 60s 超时
 * - `NETWORK` — fetch 抛错（断网 / CORS / 浏览器取消）
 */
async function callAI(prompt: string, systemPrompt?: string, expectJson = true): Promise<string> {
  // 客户端超时：60s 后主动 abort。
  // ai-sdk 在服务端已经关闭自动重试（route.ts maxRetries: 0），所以正常响应一般在 5-30s。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system: systemPrompt, json: expectJson }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // 优先解析后端 JSON（error/code），fallback 到 statusText
      let errMsg = res.statusText || `HTTP ${res.status}`;
      let errCode = 'AI_UPSTREAM_ERROR';
      try {
        const data = await res.json();
        if (data?.error) errMsg = data.error;
        if (data?.code) errCode = data.code;
      } catch {
        // 响应不是 JSON（极少见，Vercel 502/504 是 HTML），保持 errMsg
      }
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
    // fetch 网络层抛错（断网/CORS/aborted）
    if (e?.name === 'AbortError') {
      const err: Error & { code?: string } = new Error('请求超时（60s 未返回），可缩短输入或稍后重试');
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

/**
 * 服务端可能把 JSON 字符串包了 ```json ``` 包裹，剥一下再 parse。
 * 失败时抛出去，不静默用 mock。
 * 加一层兜底：模型偶尔返回非标准 JSON（裸 key、单引号、尾逗号等），做一次轻量修复。
 */
function safeJsonParse<T = any>(text: string): T {
  // 1. 剥 ```json ... ``` 或 ``` ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let cleaned = (fenced ? fenced[1] : text).trim();

  // 2. 先尝试直接 parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 继续尝试修复
  }

  // 3. 轻量修复常见 LLM 输出问题
  try {
    let fixed = cleaned
      // 单引号 → 双引号（仅在 JSON string 上下文，避免破坏正文）
      .replace(/'([^'\n]*?)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`)
      // 裸 key（形如 {score: 65 或 , foo: "bar"）→ 加双引号
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_一-龥]*)\s*:/g, '$1"$2":')
      // 去掉尾逗号（对象/数组末尾的 ,）
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(fixed) as T;
  } catch (e) {
    throw new Error(`AI 返回的 JSON 解析失败: ${(e as Error).message}; raw=${cleaned.slice(0, 200)}`);
  }
}

// 分析简历
export async function analyzeResume(
  resumeContent: string,
  targetPosition?: string
): Promise<ResumeAnalysis> {
  const prompt = RESUME_ANALYSIS_PROMPT
    .replace('{resumeContent}', resumeContent)
    .replace('{targetPosition}', targetPosition || '通用');

  const text = await callAI(prompt, undefined, true);
  const parsed = safeJsonParse<ResumeAnalysis>(text);

  // 兜底：模型可能漏字段
  return {
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    keywordAnalysis: {
      found: Array.isArray(parsed.keywordAnalysis?.found) ? parsed.keywordAnalysis.found : [],
      missing: Array.isArray(parsed.keywordAnalysis?.missing) ? parsed.keywordAnalysis.missing : [],
      suggested: Array.isArray(parsed.keywordAnalysis?.suggested) ? parsed.keywordAnalysis.suggested : [],
    },
    atsCompatibility: typeof parsed.atsCompatibility === 'number' ? parsed.atsCompatibility : 0,
  };
}

// 优化简历
export async function optimizeResume(
  originalResume: string,
  targetPosition: string
): Promise<string> {
  const prompt = RESUME_OPTIMIZE_PROMPT
    .replace('{originalResume}', originalResume)
    .replace('{targetPosition}', targetPosition);

  return await callAI(prompt, undefined, false);
}

// 生成面试问题
export async function generateInterviewQuestions(
  position: string,
  companyType: string,
  resumeSummary: string
): Promise<any[]> {
  const prompt = INTERVIEW_QUESTION_PROMPT
    .replace('{position}', position)
    .replace('{companyType}', companyType)
    .replace('{resumeSummary}', resumeSummary);

  const text = await callAI(prompt, undefined, true);
  const parsed = safeJsonParse<{ questions: any[] }>(text);
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}

// 评估面试回答
export async function evaluateAnswer(
  question: string,
  answer: string
): Promise<{ score: number; feedback: string }> {
  const prompt = EVALUATE_ANSWER_PROMPT
    .replace('{question}', question)
    .replace('{answer}', answer);

  const text = await callAI(prompt, undefined, true);
  const parsed = safeJsonParse<{ score: number; feedback: string }>(text);
  return {
    score: typeof parsed.score === 'number' ? parsed.score : 0,
    feedback: parsed.feedback || '暂无反馈',
  };
}
