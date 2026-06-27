'use client';

import { Briefcase } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  targetPosition: string;
  onTargetPositionChange: (v: string) => void;
}

const MAX_JD_CHARS = 8000;

export default function JDInput({ value, onChange, targetPosition, onTargetPositionChange }: Props) {
  const overLimit = value.length > MAX_JD_CHARS;
  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Briefcase className="text-blue-600" size={20} />
        步骤 2：粘贴 JD（可选但推荐）
      </h2>

      <div className="mb-3">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          目标岗位
        </label>
        <input
          type="text"
          className="input"
          value={targetPosition}
          onChange={(e) => onTargetPositionChange(e.target.value)}
          placeholder="例如：高级前端工程师 / 技术总监"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          职位描述（JD）
        </label>
        <textarea
          className="input h-48 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="把招聘网站的 JD 全文粘贴到这里。AI 会基于 JD 关键词做精准包装 + 提示简历未覆盖的关键词。"
        />
        <div
          className={`text-xs mt-1 text-right ${
            overLimit ? 'text-red-600 font-medium' : 'text-slate-500'
          }`}
        >
          {value.length} / {MAX_JD_CHARS}
          {overLimit && ' · 超出上限，请精简'}
          {!overLimit && value.length > 0 && ' · 留空将只做通用包装'}
        </div>
      </div>
    </div>
  );
}