'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  X,
  Sparkles,
  ArrowRight,
  Eye,
  Code,
} from 'lucide-react';
import type { ParsedResume, OptimizeResult, ResumeChange } from '@/types';

interface Props {
  parsed: ParsedResume;
  optimized: ParsedResume;
  result: OptimizeResult | null;
  onChange: (next: ParsedResume) => void;
}

/**
 * 简历编辑器
 * - 顶部 Tab：结构化视图 | Markdown 预览
 * - 结构化视图：每个字段（summary / 经历 bullet / 项目 bullet / 技能）可编辑
 * - 右栏：改造点列表（带 ✓ / ⚠ 图标）
 */
export default function ResumeEditor({ parsed, optimized, result, onChange }: Props) {
  const [view, setView] = useState<'structured' | 'markdown'>('structured');

  // 把 change 按 (section, sectionIndex, field) 索引化，方便高亮关联
  const changeMap = useMemo(() => {
    const map = new Map<string, ResumeChange>();
    if (!result) return map;
    for (const c of result.changes) {
      const key = `${c.section}-${c.sectionIndex}-${c.field ?? ''}`;
      map.set(key, c);
    }
    return map;
  }, [result]);

  const updateContact = (k: keyof ParsedResume['contact'], v: string) => {
    onChange({ ...optimized, contact: { ...optimized.contact, [k]: v } });
  };

  const updateSummary = (v: string) => onChange({ ...optimized, summary: v });

  const updateExperienceBullet = (expIdx: number, bulletIdx: number, v: string) => {
    const next = optimized.experience.map((e, i) => {
      if (i !== expIdx) return e;
      const bullets = e.bullets.slice();
      bullets[bulletIdx] = v;
      return { ...e, bullets };
    });
    onChange({ ...optimized, experience: next });
  };

  const addExperienceBullet = (expIdx: number) => {
    const next = optimized.experience.map((e, i) =>
      i === expIdx ? { ...e, bullets: [...e.bullets, ''] } : e
    );
    onChange({ ...optimized, experience: next });
  };

  const removeExperienceBullet = (expIdx: number, bulletIdx: number) => {
    const next = optimized.experience.map((e, i) => {
      if (i !== expIdx) return e;
      const bullets = e.bullets.filter((_, j) => j !== bulletIdx);
      return { ...e, bullets };
    });
    onChange({ ...optimized, experience: next });
  };

  const updateProjectBullet = (projIdx: number, bulletIdx: number, v: string) => {
    const next = optimized.projects.map((p, i) => {
      if (i !== projIdx) return p;
      const bullets = p.bullets.slice();
      bullets[bulletIdx] = v;
      return { ...p, bullets };
    });
    onChange({ ...optimized, projects: next });
  };

  const updateSkill = (
    cat: 'languages' | 'frameworks' | 'tools' | 'other',
    idx: number,
    v: string
  ) => {
    const cur = optimized.skills[cat] || [];
    const next = cur.slice();
    next[idx] = v;
    onChange({ ...optimized, skills: { ...optimized.skills, [cat]: next } });
  };

  const addSkill = (cat: 'languages' | 'frameworks' | 'tools' | 'other') => {
    const cur = optimized.skills[cat] || [];
    onChange({ ...optimized, skills: { ...optimized.skills, [cat]: [...cur, ''] } });
  };

  const removeSkill = (cat: 'languages' | 'frameworks' | 'tools' | 'other', idx: number) => {
    const cur = optimized.skills[cat] || [];
    onChange({
      ...optimized,
      skills: { ...optimized.skills, [cat]: cur.filter((_, i) => i !== idx) },
    });
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Pencil className="text-blue-600" size={20} />
          步骤 4：查看 / 编辑
        </h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 text-sm">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              view === 'structured' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
            }`}
            onClick={() => setView('structured')}
          >
            <Code size={14} /> 结构化
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              view === 'markdown' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'
            }`}
            onClick={() => setView('markdown')}
          >
            <Eye size={14} /> 预览
          </button>
        </div>
      </div>

      {view === 'markdown' ? (
        <MarkdownPreview optimized={optimized} />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左：原文 | 右：可编辑包装后 | 中：改造点列表 */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contact */}
            <EditorSection title="联系方式">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <EditorField label="姓名" value={optimized.contact.name} onChange={(v) => updateContact('name', v)} />
                <EditorField label="手机" value={optimized.contact.phone} onChange={(v) => updateContact('phone', v)} />
                <EditorField label="邮箱" value={optimized.contact.email} onChange={(v) => updateContact('email', v)} />
                <EditorField label="城市" value={optimized.contact.city} onChange={(v) => updateContact('city', v)} />
              </div>
            </EditorSection>

            {/* Summary */}
            {optimized.summary !== undefined && (
              <EditorSection title="个人总结">
                <textarea
                  className="input text-sm leading-relaxed"
                  rows={4}
                  value={optimized.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                />
                <ChangeHint
                  change={changeMap.get('summary-0-') || null}
                  original={parsed.summary || ''}
                />
              </EditorSection>
            )}

            {/* Experience */}
            {optimized.experience.map((exp, i) => {
              const originalExp = parsed.experience[i];
              return (
                <EditorSection
                  key={i}
                  title={`${exp.company} · ${exp.title}`}
                  subtitle={exp.period}
                >
                  <div className="space-y-2">
                    {exp.bullets.map((b, j) => (
                      <div key={j}>
                        <BulletEditor
                          value={b}
                          onChange={(v) => updateExperienceBullet(i, j, v)}
                          onRemove={() => removeExperienceBullet(i, j)}
                        />
                        <ChangeHint
                          change={changeMap.get(`experience-${i}-bullet-${j}`) || null}
                          original={originalExp?.bullets[j] || ''}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-700"
                      onClick={() => addExperienceBullet(i)}
                    >
                      + 添加一条
                    </button>
                  </div>
                </EditorSection>
              );
            })}

            {/* Projects */}
            {optimized.projects.map((p, i) => {
              const originalProj = parsed.projects[i];
              return (
                <EditorSection key={i} title={p.name} subtitle={p.period}>
                  {p.tech.length > 0 && (
                    <div className="text-xs text-slate-500 mb-2">
                      技术栈：{p.tech.join(' · ')}
                    </div>
                  )}
                  <div className="space-y-2">
                    {p.bullets.map((b, j) => (
                      <div key={j}>
                        <BulletEditor
                          value={b}
                          onChange={(v) => updateProjectBullet(i, j, v)}
                        />
                        <ChangeHint
                          change={changeMap.get(`projects-${i}-bullet-${j}`) || null}
                          original={originalProj?.bullets[j] || ''}
                        />
                      </div>
                    ))}
                  </div>
                </EditorSection>
              );
            })}

            {/* Skills */}
            <EditorSection title="技能">
              <div className="space-y-3">
                {(['languages', 'frameworks', 'tools', 'other'] as const).map((cat) => {
                  const items = optimized.skills[cat] || [];
                  const labels: Record<typeof cat, string> = {
                    languages: '编程语言',
                    frameworks: '框架',
                    tools: '工具',
                    other: '其他',
                  };
                  return (
                    <div key={cat}>
                      <div className="text-xs font-medium text-slate-700 mb-1.5">
                        {labels[cat]}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-md px-2 py-1"
                          >
                            <input
                              className="bg-transparent text-xs outline-none w-24"
                              value={it}
                              onChange={(e) => updateSkill(cat, idx, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeSkill(cat, idx)}
                              className="text-slate-400 hover:text-red-500"
                              aria-label="删除"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addSkill(cat)}
                          className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </EditorSection>
          </div>

          {/* 右栏：改造点列表 */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-3">
              <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                改造点列表（{result?.changes.length || 0}）
              </div>

              {result && result.jdKeywordsMissing.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-amber-800 mb-1">
                    ⚠ JD 关键词未覆盖
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.jdKeywordsMissing.map((k, i) => (
                      <span key={i} className="text-xs bg-white border border-amber-200 text-amber-700 rounded px-1.5 py-0.5">
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2 leading-relaxed">
                    这些词在 JD 出现但简历没体现。如要补充，请在对应 bullet 里如实添加（不要编造）。
                  </p>
                </div>
              )}

              {result && result.jdKeywordsMatched.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-emerald-800 mb-1">
                    ✓ JD 关键词已覆盖
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.jdKeywordsMatched.map((k, i) => (
                      <span key={i} className="text-xs bg-white border border-emerald-200 text-emerald-700 rounded px-1.5 py-0.5">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {result?.changes.length ? (
                  result.changes.map((c, i) => (
                    <ChangeCard key={i} change={c} />
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic">暂无改造点（AI 未对简历做任何改动）</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 子组件 ===== */

function EditorSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-blue-500 pl-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function EditorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <input className="input text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function BulletEditor({
  value,
  onChange,
  onRemove,
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <textarea
        className="input text-sm flex-1 leading-relaxed"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 mt-2"
          aria-label="删除"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function ChangeHint({
  change,
  original,
}: {
  change: ResumeChange | null;
  original: string;
}) {
  if (!change) return null;
  const isAiAdded = change.aiAdded;
  return (
    <div
      className={`mt-1 mb-2 text-xs rounded-md p-2 ${
        isAiAdded ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
      }`}
    >
      <div className="flex items-start gap-1.5">
        {isAiAdded ? <AlertTriangle size={12} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={12} className="mt-0.5 shrink-0" />}
        <div className="flex-1 leading-relaxed">
          <span className="font-medium">{isAiAdded ? 'AI 推断：' : '改造：'}</span>
          {change.reason}
          {original && (
            <div className="mt-1 text-slate-500 italic line-clamp-2">原文：{original}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangeCard({ change }: { change: ResumeChange }) {
  const isAiAdded = change.aiAdded;
  return (
    <div
      className={`text-xs rounded-lg p-2.5 border ${
        isAiAdded ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-1 mb-1">
        {isAiAdded ? (
          <AlertTriangle size={12} className="text-amber-600 shrink-0" />
        ) : (
          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
        )}
        <span className={`font-semibold ${isAiAdded ? 'text-amber-800' : 'text-slate-700'}`}>
          {sectionLabel(change.section)}
          {change.sectionIndex !== undefined ? ` #${change.sectionIndex + 1}` : ''}
          {change.field ? ` · ${change.field}` : ''}
        </span>
      </div>
      {change.reason && <div className="text-slate-600 mb-1">{change.reason}</div>}
      <div className="flex items-start gap-1 text-slate-500">
        <span className="line-through flex-1 line-clamp-2">{change.original || '（新增）'}</span>
      </div>
      <div className="flex items-start gap-1 text-slate-900 mt-0.5">
        <ArrowRight size={10} className="mt-0.5 shrink-0 text-blue-500" />
        <span className="flex-1 line-clamp-3">{change.optimized}</span>
      </div>
    </div>
  );
}

function sectionLabel(s: ResumeChange['section']): string {
  const m: Record<ResumeChange['section'], string> = {
    summary: '总结',
    experience: '经历',
    projects: '项目',
    skills: '技能',
    education: '教育',
  };
  return m[s];
}

function MarkdownPreview({ optimized }: { optimized: ParsedResume }) {
  const md = useMemo(() => buildMarkdown(optimized), [optimized]);
  return (
    <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
      {md}
    </pre>
  );
}

export function buildMarkdown(p: ParsedResume): string {
  const lines: string[] = [];
  lines.push(`# ${p.contact.name || '未命名'}`);
  const ct: string[] = [];
  if (p.contact.phone) ct.push(p.contact.phone);
  if (p.contact.email) ct.push(p.contact.email);
  if (p.contact.city) ct.push(p.contact.city);
  if (p.contact.links?.length) ct.push(...p.contact.links);
  if (ct.length) lines.push(ct.join(' | '));

  if (p.summary) {
    lines.push('', '## 个人总结', p.summary);
  }
  if (p.experience.length > 0) {
    lines.push('', '## 工作经历');
    for (const e of p.experience) {
      lines.push('', `**${e.company} · ${e.title}** _${e.period}_`);
      for (const b of e.bullets) lines.push(`- ${b}`);
    }
  }
  if (p.projects.length > 0) {
    lines.push('', '## 项目经验');
    for (const x of p.projects) {
      lines.push('', `**${x.name}** _${x.period || ''}_`);
      if (x.tech.length) lines.push(`技术栈：${x.tech.join(' · ')}`);
      for (const b of x.bullets) lines.push(`- ${b}`);
    }
  }
  if (p.education.length > 0) {
    lines.push('', '## 教育背景');
    for (const ed of p.education) {
      lines.push('', `**${ed.school}** · ${ed.major} _${ed.period}_`);
      lines.push(ed.degree);
      if (ed.gpa) lines.push(`GPA: ${ed.gpa}`);
      if (ed.awards?.length) lines.push(ed.awards.join(' · '));
    }
  }
  if (p.skills) {
    lines.push('', '## 技能');
    if (p.skills.languages?.length) lines.push(`- 编程语言：${p.skills.languages.join(', ')}`);
    if (p.skills.frameworks?.length) lines.push(`- 框架：${p.skills.frameworks.join(', ')}`);
    if (p.skills.tools?.length) lines.push(`- 工具：${p.skills.tools.join(', ')}`);
    if (p.skills.other?.length) lines.push(`- 其他：${p.skills.other.join(', ')}`);
  }
  return lines.join('\n');
}