import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// 强制走 Node.js 运行时（Vercel AI SDK 在 edge 上有兼容问题）
export const runtime = 'nodejs';
// 动态路由：避免被静态缓存
export const dynamic = 'force-dynamic';

// LongCat 兼容 OpenAI 协议。
// 备注：package.json 里的 @ai-sdk/openai 是 0.0.0（ai@3 时代早期版本），
// 那个版本没有 createOpenAI 工厂，只有 OpenAI class。用 class 实例。
const longcat = new OpenAI({
  baseUrl: process.env.LONGCAT_API_BASE || 'https://api.longcat.chat/openai/v1',
  apiKey: process.env.LONGCAT_API_KEY,
});

const DEFAULT_MODEL = process.env.LONGCAT_MODEL || 'LongCat-2.0-Preview';

export async function POST(req: NextRequest) {
  // 1. 环境变量兜底（不要把 key 写进报错信息泄漏给前端）
  if (!process.env.LONGCAT_API_KEY) {
    console.error('[api/ai/chat] LONGCAT_API_KEY 未配置');
    return NextResponse.json(
      { success: false, error: '服务端未配置 AI 服务密钥，请联系管理员' },
      { status: 500 }
    );
  }

  // 2. 解析 body
  let body: { prompt?: string; system?: string; json?: boolean; model?: string; maxTokens?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: '请求体不是合法 JSON' },
      { status: 400 }
    );
  }

  const { prompt, system, json, model, maxTokens } = body;
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json(
      { success: false, error: '缺少 prompt 参数' },
      { status: 400 }
    );
  }
  if (prompt.length > 30000) {
    return NextResponse.json(
      { success: false, error: 'prompt 过长（上限 30000 字符）' },
      { status: 400 }
    );
  }

  // 3. 调 LongCat
  //    注意：ai-sdk 的 generateText 默认会重试 3 次，每次间隔指数退避。
  //    LongCat RPM 限制较严，重试只会让用户等更久且更容易撞限流；
  //    直接传 maxRetries: 0 关闭自动重试，让客户端自己决定是否重试。
  try {
    const result = await generateText({
      // 0.0.0 版 @ai-sdk/openai 的 OpenAIChatLanguageModel 类型与 ai@3.4 的 LanguageModelV1
      // 存在轻微类型不一致（嵌套 provider 副本），运行时无碍，加 as any 绕开 ts。
      model: longcat.chat(model || DEFAULT_MODEL) as any,
      system: system || '你是一位专业、严谨的中文助手，回答简洁准确。',
      prompt,
      maxTokens: maxTokens || 2000,
      // 较低温度，JSON 模式更稳
      temperature: 0.4,
      // 关闭 ai-sdk 自动重试：LongCat 429 重试 3 次浪费 60s+，不如让前端自己提示
      maxRetries: 0,
    });

    let text = result.text || '';

    // 客户端要求 JSON 但模型返回了 markdown 代码块包裹，剥一下
    if (json) {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced) text = fenced[1].trim();
    }

    return NextResponse.json({
      success: true,
      text,
      usage: result.usage,
    });
  } catch (e: any) {
    const errMsg = String(e?.message || e || '未知错误');
    console.error('[api/ai/chat] LongCat 调用失败:', errMsg);

    // 判断是否是 LongCat 限流（429）
    // ai-sdk 抛的错 message 一般包含 "Rate limit exceeded" 或 "429"
    const isRateLimit =
      e?.statusCode === 429 ||
      /rate.?limit/i.test(errMsg) ||
      /\b429\b/.test(errMsg);

    if (isRateLimit) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI 服务繁忙（速率限制），请等待 10-30 秒后重试',
          code: 'RATE_LIMIT',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `AI 服务调用失败: ${errMsg.slice(0, 200)}`,
        code: 'AI_UPSTREAM_ERROR',
      },
      { status: 502 }
    );
  }
}

// 其他方法直接 405
export async function GET() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}
