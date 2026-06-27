'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  History,
  Save,
  Download,
  Loader2,
  Clock,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';

import { analyzeResume } from '@/lib/ai-service';
import { optimizeResumeForJD } from '@/lib/resume-optimizer';
import { ResumePDF } from '@/lib/pdf-template';
import {
  saveVersion,
  listVersions,
  MAX_VERSIONS_CONST,
} from '@/lib/resume-storage';

import ResumeUploader from './ResumeUploader';
import JDInput from './JDInput';
import ResumeEditor from './ResumeEditor';
import VersionHistory from './VersionHistory';

import type {
  ParsedResume,
  OptimizeResult,
  ResumeVersion,
} from '@/types';

/* ============== 模板 + 限制 ============== */

const RESUME_TEMPLATE = `姓名：张三
手机：138-xxxx-xxxx | 邮箱：zhangsan@email.com
城市：深圳 | GitHub：github.com/zhangsan

【个人总结】
三年前端开发经验，专注于 Web 性能优化与组件库建设，熟悉 React/TypeScript 全链路开发。

【教育背景】
2020.09 - 2024.06  深圳大学  计算机科学与技术  本科
- GPA: 3.8/4.0
- 获国家奖学金、优秀学生干部

【工作经历】
2024.07 - 至今   字节跳动   高级前端工程师
- 负责抖音创作者中心核心模块的前端开发
- 使用 React + TypeScript 重构了数据看板，首屏加载从 3.2s 降到 1.1s
- 主导前端组件库从 0 到 1 建设，覆盖 30+ 业务线

2023.03 - 2024.06  腾讯   前端工程师
- 参与了微信小程序商城项目的开发
- 使用 Vue3 重构了商家管理后台，月活商家 5000+

【项目经验】
校园二手交易平台
技术栈：Vue.js, Node.js, MongoDB
- 实现了用户注册、商品发布、在线交易等核心功能
- 注册用户超过 5000 人，日均交易 200 单

实时协作白板
技术栈：React, WebSocket, Canvas
- 实现了多人实时绘图、撤销重做
- 支撑 50 人同时在线编辑

【技能特长】
编程语言：JavaScript, TypeScript, Python
前端框架：React, Vue.js, Next.js
工具：Git, Docker, VS Code, Webpack
`;

const AI_TIMEOUT_MS = 60_000;
const RESUME_MAX_CHARS = 8000;
type Tab = 'analyze' | 'optimize';

/* ============== 主组件 ============== */

export default function ResumeAnalyzer() {
  const [tab, setTab] = useState<Tab>('optimize'); // 默认进优化（新功能）

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">AI 简历优化</h1>
        <p className="text-lg text-slate-600">
          上传简历 → 粘贴 JD → AI 精准包装 → 可编辑 → 一键导出 PDF
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          <TabButton active={tab === 'optimize'} onClick={() => setTab('optimize')}>
            <Sparkles size={16} />
            智能优化
          </TabButton>
          <TabButton active={tab === 'analyze'} onClick={() => setTab('analyze')}>
            <TrendingUp size={16} />
            简历分析
          </TabButton>
        </div>
      </div>

      {tab === 'optimize' ? <OptimizeFlow /> : <AnalyzeFlow />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
 * 子流程 1：智能优化（M1+M2 新）
 * ============================================================ */

function OptimizeFlow() {
  // ===== 状态 =====
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [optimized, setOptimized] = useState<ParsedResume | null>(null);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [jd, setJd] = useState('');
  const [targetPosition, setTargetPosition] = useState('高级前端工程师');

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  // 长猫 RPM 限制较严：连发 2 个请求第 3 个会超时。前端加 5s 冷却防撞限速
  const AI_COOLDOWN_MS = 5_000;
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownNow, setCooldownNow] = useState(Date.now());
  useEffect(() => {
    if (cooldownUntil === 0) return;
    const t = setInterval(() => setCooldownNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [cooldownUntil]);
  const inCooldown = cooldownUntil > cooldownNow;
  const cooldownLeftMs = inCooldown ? cooldownUntil - cooldownNow : 0;

  const triggerCooldown = () => {
    setCooldownUntil(Date.now() + AI_COOLDOWN_MS);
  };

  // 防止"AI 跑完前用户已编辑"竞态
  const resultRef = useRef<OptimizeResult | null>(null);
  resultRef.current = result;

  const startOptimize = async () => {
    if (!parsed) return;
    if (inCooldown) {
      setOptimizeError(`请求太频繁，请等待 ${(cooldownLeftMs / 1000).toFixed(1)} 秒后重试`);
      return;
    }
    if (result) {
      if (
        !confirm(
          '当前已有 AI 包装结果，再次生成将丢失当前改造点列表（你编辑过的内容会保留）。继续？'
        )
      ) {
        return;
      }
    }

    setIsOptimizing(true);
    setOptimizeError(null);
    setResult(null);
    setOptimized(null);

    try {
      const r = await optimizeResumeForJD(parsed, {
        jdText: jd,
        targetPosition,
        timeoutMs: AI_TIMEOUT_MS,
      });
      setResult(r);
      setOptimized(r.optimized);
      triggerCooldown(); // 成功后启动冷却，防用户连点
    } catch (e: any) {
      console.error('[OptimizeFlow] optimize failed:', e);
      // 根据错误 code 生成更友好的提示（前端不再显示原始的 "Failed to fetch"）
      const code = e?.code;
      let msg = e?.message || 'AI 优化失败';
      if (code === 'RATE_LIMIT') {
        msg = `AI 服务繁忙（速率限制）。请等待 10-30 秒后重试，避免连续点击。`;
      } else if (code === 'TIMEOUT') {
        msg = `请求超时：${e?.message || ''}\n建议：缩短简历/JD，或稍后再试`;
      } else if (code === 'NETWORK') {
        msg = `网络请求失败，请检查网络连接后重试`;
      } else if (code === 'AI_UPSTREAM_ERROR') {
        msg = `AI 服务暂时不可用：${e?.message || '未知错误'}\n请稍后重试`;
      }
      setOptimizeError(msg);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleEditChange = (next: ParsedResume) => {
    setOptimized(next);
  };

  const handleSaveVersion = () => {
    if (!parsed || !optimized) return;
    try {
      const label =
        targetPosition.trim() || jd.slice(0, 12).trim() || '未命名版本';
      const { evicted } = saveVersion(
        optimized,
        jd,
        result ? { ...result, optimized } : undefined,
        { label: `${label} #${listVersions().length + 1}` }
      );
      const msg = evicted
        ? `已保存新版本（历史已达 ${MAX_VERSIONS_CONST} 条上限，已自动淘汰最旧版本："${evicted.label}"）`
        : '✓ 版本已保存到本地';
      setSavedToast(msg);
      setTimeout(() => setSavedToast(null), 3000);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setSavedToast(`保存失败：${e?.message}`);
      setTimeout(() => setSavedToast(null), 4000);
    }
  };

  const handleExportPDF = async () => {
    if (!optimized) return;
    setExporting(true);
    try {
      const blob = await pdf(<ResumePDF parsed={optimized} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${optimized.contact.name || '简历'}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('[PDF export] size:', blob.size, 'bytes');
    } catch (e: any) {
      console.error('[PDF export] failed:', e);
      alert(`PDF 导出失败：${e?.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreVersion = (v: ResumeVersion) => {
    setParsed(v.parsed);
    setOptimized(v.parsed);
    setResult(v.optimized || null);
    setJd(v.jd);
    setSavedToast(`✓ 已恢复版本："${v.label}"`);
    setTimeout(() => setSavedToast(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 步骤 1 */}
      <ResumeUploader
        onParsed={(p) => {
          setParsed(p);
          setOptimized(p);
          setResult(null);
        }}
        current={parsed}
      />

      {/* 步骤 2 */}
      <JDInput
        value={jd}
        onChange={setJd}
        targetPosition={targetPosition}
        onTargetPositionChange={setTargetPosition}
      />

      {/* 步骤 3：触发按钮 */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="text-blue-600" size={20} />
              步骤 3：开始 AI 优化
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {parsed
                ? `已识别 ${parsed.experience.length} 段工作、${parsed.projects.length} 个项目`
                : '请先上传简历'}
              {jd ? ' · 已绑定 JD' : ' · 未提供 JD（将只做通用包装）'}
            </p>
          </div>
          <button
            type="button"
            onClick={startOptimize}
            disabled={!parsed || isOptimizing || inCooldown}
            className="btn btn-primary"
          >
            {isOptimizing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                AI 正在包装，预计 15-60s...
              </>
            ) : inCooldown ? (
              <>
                <Clock size={16} />
                请等待 {(cooldownLeftMs / 1000).toFixed(1)}s 后重试
              </>
            ) : (
              <>
                <Sparkles size={16} />
                开始 AI 优化
              </>
            )}
          </button>
        </div>

        {optimizeError && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">优化失败</div>
              <div className="mt-0.5">{optimizeError}</div>
              <button
                type="button"
                onClick={startOptimize}
                className="mt-2 text-xs text-red-700 underline"
              >
                重试
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 步骤 4：编辑 + 改造点 */}
      {optimized && (
        <ResumeEditor
          parsed={parsed!}
          optimized={optimized}
          result={result}
          onChange={handleEditChange}
        />
      )}

      {/* 步骤 5：保存 / 导出 */}
      {optimized && (
        <div className="card p-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveVersion}
            className="btn btn-primary"
          >
            <Save size={16} />
            保存版本
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting}
            className="btn btn-accent"
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                生成 PDF 中...
              </>
            ) : (
              <>
                <Download size={16} />
                导出 PDF
              </>
            )}
          </button>
          {savedToast && (
            <span className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              {savedToast}
            </span>
          )}
        </div>
      )}

      {/* 历史版本抽屉触发器 */}
      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="fixed bottom-6 right-6 z-30 bg-slate-900 text-white px-4 py-3 rounded-full shadow-lg hover:bg-slate-700 flex items-center gap-2 text-sm"
        aria-label="打开历史版本"
      >
        <History size={16} />
        历史版本
      </button>

      <VersionHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentParsed={optimized}
        onRestore={handleRestoreVersion}
        refreshKey={refreshKey}
      />
    </div>
  );
}

/* ============================================================
 * 子流程 2：原版"简历分析"（未改）
 * ============================================================ */

function AnalyzeFlow() {
  const [resume, setResume] = useState(RESUME_TEMPLATE);
  const [targetPosition, setTargetPosition] = useState('前端工程师');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [optimizedResume, setOptimizedResume] = useState('');
  const [analyzeError, setAnalyzeError] = useState<{ message: string } | null>(null);
  const [optimizeError, setOptimizeError] = useState<{ message: string } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 这里继续调用旧的 optimizeResume（字符串版本），保持原分析流程不变
  // 动态 import 旧 api 以避免在优化 tab 里也加载
  const callOptimizeResume = useCallback(async (text: string, position: string) => {
    const mod = await import('@/lib/ai-service');
    return mod.optimizeResume(text, position);
  }, []);

  const fetchWithTimeout = async (promise: Promise<any>, ms: number) => {
    let timer: any;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`请求超时（${ms / 1000} 秒未返回）`)),
        ms
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setAnalysisResult(null);
    try {
      const result = await fetchWithTimeout(
        analyzeResume(resume, targetPosition),
        AI_TIMEOUT_MS
      );
      setAnalysisResult(result);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setAnalyzeError({ message: error?.message || '简历分析失败' });
    }
    setIsAnalyzing(false);
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setOptimizeError(null);
    setOptimizedResume('');
    try {
      const result = await fetchWithTimeout(
        callOptimizeResume(resume, targetPosition),
        AI_TIMEOUT_MS
      );
      setOptimizedResume(result);
    } catch (error: any) {
      console.error('Optimization failed:', error);
      setOptimizeError({ message: error?.message || '简历优化失败' });
    }
    setIsOptimizing(false);
  };

  const charCount = resume.length;
  const charOver = charCount > RESUME_MAX_CHARS;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* 左侧：简历输入 */}
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              输入简历内容
            </h2>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              目标岗位
            </label>
            <input
              type="text"
              value={targetPosition}
              onChange={(e) => setTargetPosition(e.target.value)}
              className="input"
              placeholder="例如：前端工程师"
            />
          </div>

          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            className="input h-80 font-mono text-sm"
            placeholder="粘贴你的简历内容..."
          />
          <div
            className={`text-xs mt-1 text-right ${
              charOver ? 'text-red-600 font-medium' : 'text-slate-500'
            }`}
          >
            已输入 {charCount} 字{' '}
            {charOver
              ? `· 超出建议上限 ${RESUME_MAX_CHARS} 字，可能影响效果`
              : `/ 建议 ${RESUME_MAX_CHARS} 字以内`}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || charOver}
            className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                AI 正在分析你的简历，预计 10-30 秒...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                分析简历
              </>
            )}
          </button>

          <button
            onClick={handleOptimize}
            disabled={isOptimizing || charOver}
            className="btn btn-accent flex-1 flex items-center justify-center gap-2"
          >
            {isOptimizing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI 正在优化你的简历...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                优化简历
              </>
            )}
          </button>
        </div>
      </div>

      {/* 右侧：分析结果 */}
      <div className="space-y-6">
        {analysisResult && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              分析结果
            </h3>

            {/* 评分 */}
            <div className="text-center mb-6">
              <div className={`text-4xl font-bold ${getScoreColor(analysisResult.score)}`}>
                {analysisResult.score}
              </div>
              <div className="text-sm text-slate-500">综合评分</div>
            </div>

            {/* 优势 */}
            {analysisResult.strengths && analysisResult.strengths.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500" />
                  优势亮点
                </h4>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {analysisResult.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 待改进 */}
            {analysisResult.weaknesses && analysisResult.weaknesses.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-sm text-slate-700 mb-2 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-500" />
                  待改进
                </h4>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {analysisResult.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">!</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 建议 */}
            {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-sm text-slate-700 mb-2">优化建议</h4>
                <ul className="text-sm text-slate-600 space-y-1.5">
                  {analysisResult.suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 关键词 */}
            {analysisResult.keywordAnalysis && (
              <div>
                <h4 className="font-medium text-sm text-slate-700 mb-2">关键词分析</h4>
                {analysisResult.keywordAnalysis.found?.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-slate-500 mb-1">已有关键词</div>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.keywordAnalysis.found.map((k: string, i: number) => (
                        <span key={i} className="tag tag-success text-xs">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysisResult.keywordAnalysis.missing?.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-slate-500 mb-1">缺失关键词</div>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.keywordAnalysis.missing.map((k: string, i: number) => (
                        <span key={i} className="tag tag-warning text-xs">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysisResult.keywordAnalysis.suggested?.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">建议添加</div>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.keywordAnalysis.suggested.map((k: string, i: number) => (
                        <span key={i} className="tag tag-primary text-xs">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ATS */}
            {typeof analysisResult.atsCompatibility === 'number' && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">ATS 兼容性</span>
                  <span className={`text-lg font-bold ${getScoreColor(analysisResult.atsCompatibility)}`}>
                    {analysisResult.atsCompatibility}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {optimizedResume && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="text-blue-600" size={20} />
              优化后的简历
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed text-slate-700">
              {optimizedResume}
            </div>
          </div>
        )}

        {!analysisResult && !optimizedResume && !analyzeError && !optimizeError && (
          <div className="card p-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p>输入简历后，点击左侧按钮开始分析或优化</p>
          </div>
        )}

        {(analyzeError || optimizeError) && (
          <div className="card p-6 border-red-200 bg-red-50">
            <div className="flex items-start gap-2 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">{analyzeError ? '分析失败' : '优化失败'}</div>
                <div className="text-sm mt-1">
                  {analyzeError?.message || optimizeError?.message}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}