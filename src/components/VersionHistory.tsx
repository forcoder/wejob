'use client';

import { useEffect, useState } from 'react';
import {
  X,
  History,
  Trash2,
  Download,
  RotateCcw,
  Pencil,
  Check,
} from 'lucide-react';
import type { ParsedResume, ResumeVersion } from '@/types';
import {
  deleteVersion,
  listVersions,
  renameVersion,
  updateNotes,
  MAX_VERSIONS_CONST,
} from '@/lib/resume-storage';

interface Props {
  open: boolean;
  onClose: () => void;
  currentParsed: ParsedResume | null;
  onRestore: (v: ResumeVersion) => void;
  /** 抽屉外的版本号变了，强制 list 重新渲染 */
  refreshKey: number;
}

export default function VersionHistory({
  open,
  onClose,
  currentParsed,
  onRestore,
  refreshKey,
}: Props) {
  const [list, setList] = useState<ResumeVersion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');

  const reload = () => {
    setList(listVersions());
  };

  useEffect(() => {
    if (open) reload();
  }, [open, refreshKey]);

  if (!open) return null;

  const handleDelete = (id: string) => {
    if (!confirm('删除该版本？此操作不可撤销。')) return;
    deleteVersion(id);
    reload();
  };

  const handleRestore = (v: ResumeVersion) => {
    if (currentParsed) {
      if (
        !confirm(
          `恢复"${v.label}"将覆盖当前编辑内容（不影响已保存的其他版本）。是否继续？`
        )
      ) {
        return;
      }
    }
    onRestore(v);
    onClose();
  };

  const startEdit = (v: ResumeVersion) => {
    setEditingId(v.id);
    setDraftLabel(v.label);
  };

  const commitEdit = (id: string) => {
    if (draftLabel.trim()) renameVersion(id, draftLabel.trim());
    setEditingId(null);
    reload();
  };

  const handleNotesSave = (id: string, notes: string) => {
    updateNotes(id, notes);
    reload();
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* 抽屉 */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
        role="dialog"
        aria-label="简历历史版本"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">历史版本</h3>
            <span className="text-xs text-slate-400">
              {list.length} / {MAX_VERSIONS_CONST}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {list.length === 0 && (
            <div className="text-sm text-slate-400 italic text-center py-12">
              还没有保存的版本。
              <br />
              完成 AI 优化后，点「保存版本」就会出现在这里。
            </div>
          )}
          {list.map((v) => (
            <VersionItem
              key={v.id}
              v={v}
              editing={editingId === v.id}
              draftLabel={draftLabel}
              onDraftLabelChange={setDraftLabel}
              onStartEdit={() => startEdit(v)}
              onCommitEdit={() => commitEdit(v.id)}
              onCancelEdit={() => setEditingId(null)}
              onRestore={() => handleRestore(v)}
              onDelete={() => handleDelete(v.id)}
              onNotesSave={(notes) => handleNotesSave(v.id, notes)}
              isCurrent={
                !!currentParsed && currentParsed.contact.name === v.parsed.contact.name
              }
            />
          ))}
        </div>
      </aside>
    </>
  );
}

function VersionItem({
  v,
  editing,
  draftLabel,
  onDraftLabelChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onRestore,
  onDelete,
  onNotesSave,
  isCurrent,
}: {
  v: ResumeVersion;
  editing: boolean;
  draftLabel: string;
  onDraftLabelChange: (s: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onNotesSave: (s: string) => void;
  isCurrent: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(v.notes || '');

  return (
    <div
      className={`border rounded-lg p-3 ${
        isCurrent ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        {editing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              className="input text-sm flex-1 py-1"
              value={draftLabel}
              onChange={(e) => onDraftLabelChange(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={onCommitEdit}
              className="text-emerald-600 hover:text-emerald-700"
              aria-label="保存标签"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-slate-400 hover:text-slate-700"
              aria-label="取消"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="font-medium text-sm text-slate-900 flex-1 truncate">
              {v.label}
              {isCurrent && (
                <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  当前
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onStartEdit}
              className="text-slate-400 hover:text-slate-700 shrink-0"
              aria-label="重命名"
            >
              <Pencil size={12} />
            </button>
          </>
        )}
      </div>

      <div className="text-xs text-slate-500 mb-1.5">
        {new Date(v.createdAt).toLocaleString('zh-CN')}
      </div>

      <div className="text-xs text-slate-600 mb-2 line-clamp-2">
        {v.parsed.contact.name || '未命名'} · {v.parsed.experience.length} 段工作 ·{' '}
        {v.parsed.projects.length} 项目
      </div>

      {v.jd && (
        <div className="text-xs text-slate-500 mb-2 line-clamp-2 italic">
          JD：{v.jd.slice(0, 60)}
          {v.jd.length > 60 && '...'}
        </div>
      )}

      {showNotes ? (
        <div className="mb-2">
          <textarea
            className="input text-xs"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="备注..."
          />
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              className="text-xs text-slate-500"
              onClick={() => {
                setShowNotes(false);
                setNotes(v.notes || '');
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="text-xs text-blue-600"
              onClick={() => {
                onNotesSave(notes);
                setShowNotes(false);
              }}
            >
              保存备注
            </button>
          </div>
        </div>
      ) : v.notes ? (
        <button
          type="button"
          className="block w-full text-left text-xs text-slate-500 bg-slate-50 rounded p-1.5 mb-2 hover:bg-slate-100"
          onClick={() => setShowNotes(true)}
        >
          📝 {v.notes}
        </button>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRestore}
            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 px-2 py-1"
          >
            <RotateCcw size={12} />
            恢复
          </button>
          <button
            type="button"
            onClick={() => setShowNotes((s) => !s)}
            className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 px-2 py-1"
          >
            <Pencil size={12} />
            {v.notes ? '改备注' : '加备注'}
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600 px-2 py-1"
        >
          <Trash2 size={12} />
          删除
        </button>
      </div>
    </div>
  );
}

/** 用于在父组件触发的"导出版本"提示 */
export function versionSummary(v: ResumeVersion): string {
  return `${v.label}（${new Date(v.createdAt).toLocaleDateString('zh-CN')}）`;
}

export { Download };