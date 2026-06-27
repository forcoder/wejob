/**
 * 简历版本管理（localStorage）
 *
 * 存储 key: wejob:resume:versions
 * 上限 20 条，FIFO 淘汰最旧。
 * 所有读写都 try/catch，避免在隐私模式 / quota 满时炸 UI。
 */

import type { ResumeVersion } from '@/types';

const STORAGE_KEY = 'wejob:resume:versions';
const MAX_VERSIONS = 20;

/** uuid（不依赖 crypto.randomUUID 以兼容老浏览器） */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function readAll(): ResumeVersion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn('[resume-storage] read failed:', e);
    return [];
  }
}

function writeAll(list: ResumeVersion[]): { ok: boolean; evicted?: ResumeVersion } {
  if (typeof window === 'undefined') return { ok: false };
  try {
    // FIFO：超过上限丢最旧
    let evicted: ResumeVersion | undefined;
    if (list.length > MAX_VERSIONS) {
      evicted = list[0];
      list = list.slice(list.length - MAX_VERSIONS);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return { ok: true, evicted };
  } catch (e: any) {
    // quota 满
    console.warn('[resume-storage] write failed:', e);
    throw new Error('localStorage 写入失败（空间已满？）');
  }
}

export interface SaveOptions {
  /** 标签，默认 "版本 YYYY-MM-DD HH:mm" */
  label?: string;
  notes?: string;
}

/** 保存一个新版本；返回写入结果 + 是否触发淘汰 */
export function saveVersion(
  parsed: ResumeVersion['parsed'],
  jd: string,
  optimized: ResumeVersion['optimized'],
  options: SaveOptions = {}
): { version: ResumeVersion; evicted?: ResumeVersion } {
  const list = readAll();
  const version: ResumeVersion = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    label: options.label || defaultLabel(),
    parsed,
    jd,
    optimized,
    notes: options.notes,
  };
  const next = [...list, version];
  const { evicted } = writeAll(next);
  return { version, evicted };
}

/** 列出所有版本（按创建时间倒序：新 → 旧） */
export function listVersions(): ResumeVersion[] {
  return readAll().slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** 获取某条 */
export function getVersion(id: string): ResumeVersion | undefined {
  return readAll().find((v) => v.id === id);
}

/** 删除某条 */
export function deleteVersion(id: string): boolean {
  const list = readAll();
  const next = list.filter((v) => v.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}

/** 更新备注 */
export function updateNotes(id: string, notes: string): boolean {
  const list = readAll();
  const idx = list.findIndex((v) => v.id === id);
  if (idx < 0) return false;
  list[idx] = { ...list[idx], notes };
  writeAll(list);
  return true;
}

/** 重命名标签 */
export function renameVersion(id: string, label: string): boolean {
  const list = readAll();
  const idx = list.findIndex((v) => v.id === id);
  if (idx < 0) return false;
  list[idx] = { ...list[idx], label };
  writeAll(list);
  return true;
}

/** 清空所有（带二次确认 UI 决定） */
export function clearAll(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[resume-storage] clear failed:', e);
  }
}

export const MAX_VERSIONS_CONST = MAX_VERSIONS;
export const STORAGE_KEY_CONST = STORAGE_KEY;

function defaultLabel(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `版本 ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}