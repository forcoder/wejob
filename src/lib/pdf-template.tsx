'use client';

/**
 * PDF 简历模板（@react-pdf/renderer）
 *
 * 风格：Professional Smart — 深墨色 header + 蓝色分节色条 + 白色主背景 + 紧凑排版
 * 目标：A4 单页（内容超过则自动换页，不强塞）
 *
 * 注意事项：
 * - react-pdf 的 StyleSheet 不支持 Tailwind，必须用纯对象 + 单位 pt
 * - 中文字体：react-pdf 4.x 默认 fonts 没装中文字库，会导致中文渲染为方块。
 *   这里用平台 fallback（Helvetica + 自定义字体注册示例代码注释保留）。
 *   实际部署时建议注册思源黑体 / Noto Sans SC（体积大，本地测试先用默认字体，中文若变方块属预期）。
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { ParsedResume } from '@/types';

// 注册中文字体
// 方案：本地 public/fonts/NotoSansSC-Regular.ttf（11MB 全量 TTF），浏览器 fetch 一次
// Vercel 自动把 public/ 服务到 CDN，浏览器首次下载后由浏览器 HTTP 缓存复用
// react-pdf 的 Font.register 在浏览器环境下 fetch 这个 URL
//
// 兜底：如果未来想用更小体积的 woff2 子集，把 src 换成 fonts.gstatic.com 的
// 单一 unicode-range 文件；缺点是该 woff2 只覆盖一段 unicode 范围，
// 完整覆盖中文需多个文件，而 react-pdf 不支持 multi-src 注册，所以现统一用本地 TTF。
let chineseFontRegistered = false;
try {
  // 只在浏览器侧运行 Font.register；SSR 环境跳过（字体由浏览器 fetch）
  if (typeof window !== 'undefined') {
    Font.register({
      family: 'Noto Sans SC',
      src: `${window.location.origin}/fonts/NotoSansSC-Regular.ttf`,
    });
    chineseFontRegistered = true;
  }
} catch (e) {
  // 字体加载失败 → fallback 到 Helvetica，中文会变方块但应用不崩
  if (typeof console !== 'undefined') console.warn('[pdf-template] 中文字体注册失败:', e);
  chineseFontRegistered = false;
}

const PRIMARY = '#0F172A';
const ACCENT = '#3B82F6';
const ACCENT_LIGHT = '#60A5FA';
const TEXT = '#0F172A';
const TEXT_SECONDARY = '#475569';
const BORDER = '#E2E8F0';
const ACCENT_BG = '#EFF6FF';

const FONT = chineseFontRegistered ? 'Noto Sans SC' : 'Helvetica';

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontSize: 9.5,
    fontFamily: FONT,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  // ===== Header =====
  header: {
    backgroundColor: PRIMARY,
    color: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderRadius: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  contactLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 9,
    color: '#CBD5E1',
  },
  contactItem: {
    marginRight: 12,
  },
  // ===== Section =====
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: `1 solid ${BORDER}`,
  },
  sectionBar: {
    width: 3,
    height: 12,
    backgroundColor: ACCENT,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  // ===== Summary =====
  summary: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: TEXT_SECONDARY,
  },
  // ===== Education / Experience / Project entries =====
  entry: {
    marginBottom: 7,
  },
  entryHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: PRIMARY,
  },
  entryPeriod: {
    fontSize: 9,
    color: TEXT_SECONDARY,
  },
  entrySubtitle: {
    fontSize: 9.5,
    color: ACCENT,
    marginBottom: 2,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 8,
    color: ACCENT,
    fontSize: 9.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: TEXT,
  },
  // ===== Skills (chips) =====
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillCategory: {
    fontSize: 9.5,
    fontWeight: 700,
    color: PRIMARY,
    marginRight: 6,
  },
  skillChip: {
    fontSize: 8.5,
    color: ACCENT,
    backgroundColor: ACCENT_BG,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 3,
  },
  skillRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 3,
  },
});

interface Props {
  parsed: ParsedResume;
}

export function ResumePDF({ parsed }: Props) {
  const { contact, summary, education, experience, projects, skills } = parsed;

  const contactParts: Array<{ label: string; value: string }> = [];
  if (contact.phone) contactParts.push({ label: '📱', value: contact.phone });
  if (contact.email) contactParts.push({ label: '✉', value: contact.email });
  if (contact.city) contactParts.push({ label: '📍', value: contact.city });
  if (contact.links && contact.links.length > 0) {
    contact.links.forEach((l) => contactParts.push({ label: '🔗', value: l }));
  }

  const skillRows = renderSkillRows(skills);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{contact.name || '未命名'}</Text>
          <View style={styles.contactLine}>
            {contactParts.map((p, i) => (
              <Text key={i} style={styles.contactItem}>
                {p.value}
              </Text>
            ))}
          </View>
        </View>

        {/* Summary */}
        {summary && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>个人总结</Text>
            </View>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>工作经历</Text>
            </View>
            {experience.map((exp, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryTitle}>
                    {exp.company} · {exp.title}
                  </Text>
                  <Text style={styles.entryPeriod}>{exp.period}</Text>
                </View>
                {exp.bullets.map((b, j) => (
                  <View key={j} style={styles.bullet} wrap={false}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>项目经验</Text>
            </View>
            {projects.map((p, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryTitle}>{p.name}</Text>
                  {p.period && <Text style={styles.entryPeriod}>{p.period}</Text>}
                </View>
                {p.tech.length > 0 && (
                  <Text style={styles.entrySubtitle}>
                    技术栈：{p.tech.join(' · ')}
                  </Text>
                )}
                {p.bullets.map((b, j) => (
                  <View key={j} style={styles.bullet} wrap={false}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {education.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>教育背景</Text>
            </View>
            {education.map((e, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryTitle}>
                    {e.school} · {e.major}
                  </Text>
                  <Text style={styles.entryPeriod}>{e.period}</Text>
                </View>
                <Text style={styles.entrySubtitle}>{e.degree}</Text>
                {(e.gpa || (e.awards && e.awards.length > 0)) && (
                  <Text style={styles.summary}>
                    {e.gpa ? `GPA: ${e.gpa}` : ''}
                    {e.gpa && e.awards && e.awards.length > 0 ? '  ·  ' : ''}
                    {e.awards && e.awards.length > 0 ? e.awards.join(' · ') : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {skillRows.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>技能</Text>
            </View>
            {skillRows.map((row, i) => (
              <View key={i} style={styles.skillRowContainer}>
                <Text style={styles.skillCategory}>{row.label}：</Text>
                {row.items.map((it, j) => (
                  <Text key={j} style={styles.skillChip}>
                    {it}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

function renderSkillRows(skills: ParsedResume['skills']): Array<{ label: string; items: string[] }> {
  const rows: Array<{ label: string; items: string[] }> = [];
  if (skills.languages && skills.languages.length) rows.push({ label: '编程语言', items: skills.languages });
  if (skills.frameworks && skills.frameworks.length) rows.push({ label: '框架', items: skills.frameworks });
  if (skills.tools && skills.tools.length) rows.push({ label: '工具', items: skills.tools });
  if (skills.other && skills.other.length) rows.push({ label: '其他', items: skills.other });
  return rows;
}