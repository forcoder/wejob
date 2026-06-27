'use client';

import { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { parseResumeFile, parseResumeText, RESUME_TEMPLATE_TEXT } from '@/lib/resume-parser';
import type { ParsedResume } from '@/types';

interface Props {
  onParsed: (parsed: ParsedResume) => void;
  current: ParsedResume | null;
}

export default function ResumeUploader({ onParsed, current }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const parsed = await parseResumeFile(file);
      onParsed(parsed);
    } catch (e: any) {
      setError(e?.message || '文件解析失败');
    } finally {
      setBusy(false);
    }
  };

  const handleTemplate = () => {
    setError(null);
    const parsed = parseResumeText(RESUME_TEMPLATE_TEXT);
    onParsed(parsed);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const stats = current
    ? `${current.contact.name || '未识别姓名'} · ${current.experience.length} 段工作 · ${current.projects.length} 个项目 · ${
        (current.skills.languages?.length || 0) +
        (current.skills.frameworks?.length || 0) +
        (current.skills.tools?.length || 0) +
        (current.skills.other?.length || 0)
      } 项技能`
    : '';

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <FileText className="text-blue-600" size={20} />
        步骤 1：上传简历
      </h2>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-xl p-6 text-center bg-slate-50/50"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <Upload size={28} className="mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-600 mb-3">
          拖拽 .txt / .md / .docx 文件到此处，或
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                解析中...
              </>
            ) : (
              <>
                <Upload size={16} />
                选择文件
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={handleTemplate}
          >
            <Sparkles size={16} />
            用示例模板
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">PDF 上传将在 v3 版本支持</p>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {current && !error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>✓ 已识别：{stats}</span>
        </div>
      )}

      {current && !error && current.experience.length === 0 && current.projects.length === 0 && (current.skills?.languages?.length ?? 0) === 0 && (current.skills?.frameworks?.length ?? 0) === 0 && (current.skills?.tools?.length ?? 0) === 0 && (current.skills?.other?.length ?? 0) === 0 && (
        <div className="mt-3 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">未识别到任何工作/项目/技能段落</div>
            <div className="mt-1 text-xs text-amber-600">
              请检查简历是否包含「工作经历 / 项目经验 / 技能特长」等标准段落标题。
              支持的格式示例：<code className="bg-amber-100 px-1 rounded">【工作经历】</code> 或 <code className="bg-amber-100 px-1 rounded">工作经历</code> 单独一行。
              <details className="mt-1">
                <summary className="cursor-pointer underline">看原始文本前 5 行</summary>
                <pre className="mt-1 text-xs bg-amber-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                  {current.raw?.split('\n').slice(0, 5).join('\n') || '(空)'}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}