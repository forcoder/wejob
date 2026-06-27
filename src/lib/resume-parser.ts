/**
 * 简历解析器（客户端 .txt / .md / .docx → ParsedResume）
 *
 * 设计取舍：
 * - 不依赖服务端，浏览器端即可完成
 * - 用启发式正则识别段落；不完美但能覆盖 90% 常见模板
 * - docx 通过 mammoth 提取纯文本（保留段落结构）后再走相同的解析逻辑
 * - 不接 PDF（M1+M2 范围之外，放到 v3）
 */

import mammoth from 'mammoth';
import type { ParsedResume } from '@/types';

const MAX_RAW_CHARS = 20_000;

const SECTION_HEADERS = {
  education: ['教育背景', '教育经历', '教育', 'Education'],
  experience: ['工作经历', '工作经验', '工作', 'Experience', 'Employment', 'Work Experience'],
  projects: ['项目经历', '项目经验', '项目', 'Projects', 'Project'],
  skills: ['技能特长', '专业技能', '技能', '技术栈', 'Skills'],
  summary: ['个人总结', '个人简介', '自我介绍', 'Summary', 'Profile', 'About'],
} as const;

const SKIP_HEADERS = ['联系方式', '联系信息', 'Contact', '基本信息'];

/** 解析入口：根据 file 对象自动判断类型 */
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const name = file.name.toLowerCase();
  let text = '';

  if (name.endsWith('.docx')) {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    text = result.value;
  } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
    text = await file.text();
    // markdown 标题去掉前缀 #，但解析时按行走不影响
    text = text
      .split('\n')
      .map((l) => l.replace(/^#{1,6}\s*/, ''))
      .join('\n');
  } else if (name.endsWith('.txt') || name.endsWith('.text')) {
    text = await file.text();
  } else {
    throw new Error(
      `暂不支持的文件格式：${name.split('.').pop() || '未知'}。请使用 .txt / .md / .docx。`
    );
  }

  if (!text.trim()) {
    throw new Error('文件内容为空，无法识别简历字段。');
  }
  if (text.length > MAX_RAW_CHARS) {
    text = text.slice(0, MAX_RAW_CHARS);
  }

  return parseResumeText(text);
}

/** 从纯文本解析结构化简历（暴露给"粘贴文本"场景） */
export function parseResumeText(text: string): ParsedResume {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const contact = parseContact(lines);
  const sections = splitSections(lines);

  return {
    contact,
    summary: sections.summary ? joinLines(sections.summary) : undefined,
    education: sections.education ? parseEducation(sections.education) : [],
    experience: sections.experience ? parseExperience(sections.experience) : [],
    projects: sections.projects ? parseProjects(sections.projects) : [],
    skills: sections.skills ? parseSkills(sections.skills) : { languages: [], frameworks: [], tools: [], other: [] },
    raw: text,
  };
}

/* ============== 段落切分 ============== */

type SectionKey = keyof typeof SECTION_HEADERS;
type Sections = Partial<Record<SectionKey, string[]>>;

function isHeader(line: string): { key: SectionKey; index: number } | null {
  // 去掉中括号/冒号/项目符号后匹配
  let cleaned = line
    .replace(/^[【\[\(【《]\s*/, '')
    .replace(/[\s】\]\)：:。.]+$/, '')
    .replace(/^#+\s*/, '') // markdown 标题前缀
    .replace(/^[-=*•·]+\s*/, '') // bullet 前缀
    .trim();
  if (!cleaned) return null;

  // 去掉前导 emoji（如 "💼 核心工作经历" → "核心工作经历"）
  // emoji 范围：\u{1F300}-\u{1FAFF}、\u{2600}-\u{27BF} 等
  cleaned = cleaned.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27FF}\u{1F1E6}-\u{1F1FF}]\s*/u, '').trim();
  if (!cleaned) return null;

  // 必须很短（<= 16 字符，宽松一点兼容"项目经验"等）
  if (cleaned.length > 16) return null;

  // 精确匹配
  for (const key of Object.keys(SECTION_HEADERS) as SectionKey[]) {
    if (SECTION_HEADERS[key].some((h) => h.toLowerCase() === cleaned.toLowerCase())) {
      return { key, index: 0 };
    }
  }

  // 子串匹配：处理"核心工作经历"包含"工作经历"、"过往项目经验"包含"项目经验"等情况
  for (const key of Object.keys(SECTION_HEADERS) as SectionKey[]) {
    if (SECTION_HEADERS[key].some((h) => cleaned.toLowerCase().includes(h.toLowerCase()))) {
      return { key, index: 0 };
    }
  }
  return null;
}

function splitSections(lines: string[]): Sections {
  const sections: Sections = {};
  let current: SectionKey | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current && buffer.length > 0) {
      sections[current] = [...(sections[current] || []), ...buffer];
    }
    buffer = [];
  };

  for (const line of lines) {
    // 跳过 SKIP headers（联系方式已经单独解析）
    if (SKIP_HEADERS.some((h) => line.includes(h))) {
      continue;
    }

    const header = isHeader(line);
    if (header) {
      flush();
      current = header.key;
      continue;
    }

    if (current) buffer.push(line);
    // 没有 header 之前的内容当作 contact 区，不进 buffer
  }
  flush();

  return sections;
}

/* ============== 联系信息 ============== */

// 名字提取的"非名字"黑名单：包含这些词就不当名字
// 解决问题：上传"技术总监"等岗位/标题开头的简历时被误识别成姓名
const NAME_BLACKLIST = [
  // 简历类通用标题
  '个人简历', '简历', '我的简历', '求职简历',
  'Resume', 'Curriculum Vitae', 'CV',
  // 常见岗位头衔
  '工程师', '高级工程师', '资深工程师', '初级工程师', '助理工程师',
  '架构师', '技术总监', '总监', '主管', '经理', '副总经理', '总裁', 'CEO', 'CTO', 'COO', 'CFO', 'VP',
  '产品', '产品经理', '产品助理', '产品总监', '产品运营',
  '运营', '运营经理', '运营总监', '运营专员',
  '设计', '设计师', '设计经理', 'UI', 'UX', 'UE', 'UI设计师', 'UX设计师',
  '开发', '前端', '后端', '全栈', '客户端', '服务端', '测试', '运维', 'DBA', 'DevOps',
  '前端工程师', '后端工程师', '全栈工程师', '测试工程师', '运维工程师', 'iOS', 'Android',
  '行政', '人事', 'HR', 'HRBP', '财务', '会计', '出纳', '市场', '营销', '销售', '客服',
  '实习生', '实习', '管培生', '储备干部',
  // 常见城市/省份（避免 "北京" "上海" "广东" 等被当名字）
  // 含"市"的城市在"长度 <= 4 中文"时很可疑
  '北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '武汉', '成都', '重庆', '西安', '天津',
  '青岛', '厦门', '宁波', '无锡', '佛山', '东莞', '长沙', '郑州', '济南', '合肥', '福州', '昆明',
  '哈尔滨', '沈阳', '大连', '南昌', '南宁', '贵阳', '太原', '石家庄', '兰州', '海口', '三亚', '银川',
  '西宁', '乌鲁木齐', '拉萨', '香港', '澳门', '台湾',
  '广东', '江苏', '浙江', '山东', '河南', '四川', '湖北', '湖南', '河北', '福建', '安徽', '江西',
  '陕西', '辽宁', '吉林', '黑龙江', '云南', '贵州', '广西', '山西', '内蒙古', '新疆', '西藏', '甘肃', '青海', '宁夏', '海南',
];

function looksLikeName(line: string): boolean {
  // 长度 2-15
  if (line.length < 2 || line.length > 15) return false;
  // 必须是纯中英文 + 间隔点 ·，不能含数字、邮箱、@、等
  if (!/^[\u4e00-\u9fa5A-Za-z\s·\.\u00B7]+$/.test(line)) return false;
  // 黑名单关键词匹配
  for (const bad of NAME_BLACKLIST) {
    if (line.includes(bad)) return false;
  }
  // 排除开头是英文头衔/前缀的：Mr. / Ms. / Dr. / Prof.
  if (/^(Mr|Ms|Mrs|Dr|Prof)\b/i.test(line)) return false;
  // 排除含"市"或"省"等行政区域后缀的（防止"北京市""广东省"等同上未列举的）
  if (/[省市县区州]$/.test(line)) return false;
  return true;
}

function parseContact(lines: string[]): ParsedResume['contact'] {
  // 默认值
  const result: ParsedResume['contact'] = { name: '', phone: '', email: '', city: '', links: [] };

  // 把"包装层"剥掉：markdown 标题前缀 / 粗体外壳 / 前后装饰
  // 让 "# 张三" / "**张三**" / "【张三】" 都变成 "张三"
  const stripWrapping = (s: string) =>
    s
      .replace(/^#+\s*/, '') // markdown H1-H6
      .replace(/^[*_~`]+|[*_~`]+$/g, '') // 粗体/斜体/删除线/代码 markdown 符号
      .replace(/^[\s【\[(\-=*•·]+|[\s】\]\)】\-=*•·]+$/g, '') // 装饰字符
      .replace(/^[A-Za-z]+[:：]\s*/, '') // "Name: xxx" 显式 prefix
      .trim();

  // 姓名：取前几行非空、非 header 的（剥掉包装后再判）
  for (const raw of lines.slice(0, 8)) {
    if (isHeader(raw)) break;
    const line = stripWrapping(raw);
    if (!line) continue;
    // 1. 优先匹配 "姓名：xxx" 显式声明
    const m = line.match(/^姓名[::]\s*(.+)$/i) || line.match(/^Name[::]\s*(.+)$/i);
    if (m) {
      result.name = m[1].trim();
      break;
    }
    // 2. 第一行直接是名字的情况（无前缀）
    if (!result.name && looksLikeName(line)) {
      result.name = line;
      break;
    }
  }

  // 整个文本里抓手机号/邮箱/城市
  const fullText = lines.join('\n');

  // 手机号：接受带 - 或空格分隔（如 "138-0000-0000" "138 1234 5678"）
  const phoneMatch = fullText.match(/(?:\+?86[-\s]?)?(1[3-9]\d)[-\s]?(\d{4})[-\s]?(\d{4})/);
  if (phoneMatch) {
    result.phone = `${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`;
  } else {
    // 兜底：11 位连续手机号
    const phoneMatch2 = fullText.match(/(?:\+?86[-\s]?)?(1[3-9]\d{9})/);
    if (phoneMatch2) result.phone = phoneMatch2[1];
  }

  const emailMatch = fullText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) result.email = emailMatch[0];

  // 城市：在 "城市：" "City:" 后面取值；否则从文本里抽
  const cityLine = fullText.match(/(?:城市|City|Location|地点)[::]\s*([^\n\r,，]+)/i);
  if (cityLine) {
    result.city = cityLine[1].trim();
  } else {
    // 先剥 markdown 装饰再匹配（让"**深圳**"也能匹配）
    const cleanedText = fullText
      .replace(/\*\*/g, '').replace(/(?<!\*)\*(?!\*)/g, '')
      .replace(/__/g, '').replace(/(?<!_)_(?!_)/g, '');
    // 1. 优先匹配 "X市"（"北京市" "上海市"）
    const withShi = cleanedText.match(/([\u4e00-\u9fa5]{2,5}市)/);
    if (withShi) {
      result.city = withShi[1];
    } else {
      // 2. 常见热门城市（无"市"后缀）
      const hotCities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '武汉', '成都', '重庆',
        '西安', '天津', '青岛', '厦门', '宁波', '无锡', '佛山', '东莞', '长沙', '郑州', '济南', '合肥',
        '福州', '昆明', '哈尔滨', '沈阳', '大连', '南昌', '南宁', '贵阳', '太原', '石家庄', '兰州',
        '海口', '三亚', '银川', '西宁', '乌鲁木齐', '拉萨', '香港', '澳门', '台北'];
      for (const city of hotCities) {
        if (cleanedText.includes(city)) {
          result.city = city;
          break;
        }
      }
    }
  }

  // 链接：github / linkedin / 个人站
  const links: string[] = [];
  const linkPatterns = [
    /https?:\/\/(?:www\.)?github\.com\/[\w-]+/gi,
    /https?:\/\/(?:www\.)?linkedin\.com\/[\w\-\/]+/gi,
    /https?:\/\/[\w.-]+\.(?:com|cn|me|io|dev|net|org)\b[^\s]*/gi,
  ];
  for (const pat of linkPatterns) {
    const ms = fullText.match(pat);
    if (ms) links.push(...ms);
  }
  if (links.length > 0) result.links = Array.from(new Set(links)).slice(0, 5);

  return result;
}

/* ============== 教育 ============== */

function parseEducation(lines: string[]): ParsedResume['education'] {
  // 常见格式："2020.09 - 2024.06  北京大学  计算机科学与技术  本科"
  // 或多行：日期行 + 学校行 + 描述行
  const groups = groupByDate(lines);
  const out: ParsedResume['education'] = [];

  for (const grp of groups) {
    const firstLine = grp[0] || '';
    const periodMatch = firstLine.match(
      /(\d{4}[.\-/年]?\d{0,2}\s*[-–—~到至]\s*(?:\d{4}[.\-/年]?\d{0,2}|至今|现在|present))/i
    );
    const period = periodMatch ? periodMatch[1].replace(/\s/g, '') : firstLine.slice(0, 20);

    // 提取学校/专业/学历：先去掉日期，剩下的按空格切
    const rest = period ? firstLine.replace(periodMatch![0], '').trim() : firstLine;
    const tokens = rest.split(/\s{2,}|\s+/).filter(Boolean);

    const school = tokens[0] || '';
    const major = tokens[1] || '';
    const degree = tokens[2] || '';

    // GPA / 奖项
    const tailText = grp.slice(1).join(' ');
    const gpaMatch = tailText.match(/(?:GPA|绩点)[::]?\s*([\d.]+\s*\/\s*\d+(?:\.\d+)?)/i);
    const awards = tailText
      .split(/[,，。；;、]/)
      .map((s) => s.trim())
      .filter((s) => /奖|scholar|honor|merit/i.test(s) && s.length < 30);

    out.push({
      school,
      major,
      degree,
      period,
      gpa: gpaMatch ? gpaMatch[1].trim() : undefined,
      awards: awards.length > 0 ? awards : undefined,
    });
  }

  return out;
}

/* ============== 工作经历 ============== */

function parseExperience(lines: string[]): ParsedResume['experience'] {
  const groups = groupByDate(lines);

  // 合并相邻的"日期段"和"非日期段"：
  // 用户场景："**公司** | **职位**" 是单独一段（无日期），下一行 "*2020.7 – 至今*" 又是单独一段（有日期）
  // 需要把后一段的 period 合并到前一段
  const merged: string[][] = [];
  for (const grp of groups) {
    const firstLine = stripMarkdownDecor(grp[0] || '');
    const hasDate = /^\d{4}[.\-/年]?\d{0,2}\s*[-–—~到至]/.test(firstLine);
    const noCompany = !firstLine.includes('|') && !firstLine.includes('｜') &&
      firstLine.split(/[,\s]{2,}|[\u3000]+/).length <= 2 &&
      !/(公司|集团|科技|有限|股份|工作室|工作室|Co\.|Inc\.|Ltd\.|LLC)/i.test(firstLine);

    // 如果当前 group 主要是日期 / 单个词，合并到上一个 group
    if (hasDate && merged.length > 0) {
      merged[merged.length - 1] = [...merged[merged.length - 1], ...grp];
    } else {
      merged.push([...grp]);
    }
  }

  return merged.map((grp) => {
    let firstLine = stripMarkdownDecor(grp[0] || '');

    // 抽日期（可能在 grp 任意行）
    let period = '';
    let periodSourceIdx = -1;
    for (let i = 0; i < grp.length; i++) {
      const m = stripMarkdownDecor(grp[i]).match(
        /(\d{4}[.\-/年]?\d{0,2}\s*[-–—~到至]\s*(?:\d{4}[.\-/年]?\d{0,2}|至今|现在|present))/i
      );
      if (m) {
        period = m[1].replace(/\s/g, '');
        periodSourceIdx = i;
        break;
      }
    }

    // 找公司名：从 grp 找包含分隔符（| 或 ｜）的行；找不到则用 firstLine
    let companyLine = firstLine;
    for (const raw of grp) {
      const s = stripMarkdownDecor(raw);
      if (s.includes('|') || s.includes('｜')) {
        companyLine = s;
        break;
      }
    }
    // 从 companyLine 抽公司
    let company = '';
    let title = '';
    const pipeSplit = companyLine.split(/\s*[|｜]\s*/);
    if (pipeSplit.length >= 2) {
      company = pipeSplit[0].trim();
      title = pipeSplit.slice(1).join(' | ').trim();
    } else {
      // 兜底：按 2+ 空格 / 全角空格
      const tokens = companyLine.split(/[,\s]{2,}|[\u3000]+/).filter(Boolean);
      company = tokens[0] || '';
      title = tokens.slice(1).join(' ').trim();
    }

    // 收集 bullets：去掉 period 行和公司行，剩的就是描述
    const bullets = grp
      .filter((_, i) => i !== periodSourceIdx)
      .filter((raw) => {
        const s = stripMarkdownDecor(raw);
        return s !== stripMarkdownDecor(companyLine);
      })
      .map((l) => stripMarkdownDecor(l).replace(/^[-•·*]\s*/, '').trim())
      .filter((l) => l.length > 0);

    return { company, title, period, bullets };
  });
}

/* ============== 项目 ============== */

function parseProjects(lines: string[]): ParsedResume['projects'] {
  // 项目通常以"项目名"开头（短行），后面跟技术栈和 bullet
  // 启发式：找一个短行（<= 25 字符）作为名字，下面的 bullet 归到该项目
  const out: ParsedResume['projects'] = [];
  let cur: ParsedResume['projects'][number] | null = null;

  for (const line of lines) {
    const clean = line.replace(/^[-•·*]\s*/, '').trim();
    if (!clean) continue;

    // 检测技术栈行（包含 [] / () / 顿号 / 逗号 且 token 短）
    const techMatch = clean.match(
      /^[\[【\(]?技术栈[::]?[\]】\)]?\s*[:：]?\s*(.+)$/i
    );

    if (techMatch) {
      if (!cur) continue;
      cur.tech = techMatch[1]
        .split(/[、,，;；/]/)
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }

    // 名字候选：短行 + 不以 -/•/· 开头 + 没有标点结尾
    const isShortTitle =
      clean.length <= 25 &&
      !/^[•·*-]/.test(clean) &&
      !/[。！？，；：]$/.test(clean) &&
      !/^(负责|使用|开发|实现|完成|参与)/.test(clean);

    if (isShortTitle) {
      if (cur) out.push(cur);
      cur = { name: clean, tech: [], bullets: [] };
      continue;
    }

    // 否则当作 bullet
    if (!cur) {
      // 没有项目名兜底
      cur = { name: '项目经历', tech: [], bullets: [] };
    }
    cur.bullets.push(clean);
  }
  if (cur) out.push(cur);

  return out;
}

/* ============== 技能 ============== */

function parseSkills(lines: string[]): ParsedResume['skills'] {
  // 把所有行合并，按"分类：a, b, c"或"分类：a b c"切
  const text = lines.join(' | ');
  const out: ParsedResume['skills'] = {
    languages: [],
    frameworks: [],
    tools: [],
    other: [],
  };

  // 分类映射
  const categoryMap: Array<{ keys: RegExp; target: keyof ParsedResume['skills'] }> = [
    { keys: /(?:编程语言|语言|language|languages)/i, target: 'languages' },
    { keys: /(?:框架|framework|frameworks|前端框架|后端框架)/i, target: 'frameworks' },
    { keys: /(?:工具|tool|tools|开发工具)/i, target: 'tools' },
  ];

  const parts = text.split(/[|｜]|(?=\s*(?:编程语言|框架|工具|其他|数据库|技能))/g);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // 找分类
    let target: keyof ParsedResume['skills'] | null = null;
    for (const m of categoryMap) {
      if (m.keys.test(trimmed)) {
        target = m.target;
        break;
      }
    }

    // 取冒号后面的内容
    const colonIdx = trimmed.search(/[:：]/);
    let valueStr = colonIdx >= 0 ? trimmed.slice(colonIdx + 1) : trimmed;

    // 去掉分类前缀
    valueStr = valueStr.replace(/^(?:编程语言|语言|框架|工具|其他|数据库|技能)[:：]?\s*/, '');

    const tokens = valueStr
      .split(/[,，、;；/]|\s{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 40);

    if (tokens.length === 0) continue;

    if (target) {
      out[target] = Array.from(new Set([...(out[target] || []), ...tokens]));
    } else {
      out.other = Array.from(new Set([...(out.other || []), ...tokens]));
    }
  }

  // 完全没识别出分类 → 全部归到 other
  const total = (out.languages?.length || 0) + (out.frameworks?.length || 0) + (out.tools?.length || 0);
  if (total === 0 && out.other && out.other.length === 0) {
    const allTokens = text
      .replace(/^(?:技能特长|专业技能|技能|技术栈)[:：]?\s*/, '')
      .split(/[,，、;；/\s|]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 30);
    out.other = Array.from(new Set(allTokens)).slice(0, 30);
  }

  return out;
}

/* ============== 工具函数 ============== */

// 剥掉行的 markdown 装饰，让后续正则能匹配
// "*2020.7 – 至今*" → "2020.7 – 至今"
// "**XX科技有限公司**" → "XX科技有限公司"
// "**XX公司 | **技术总监** (19级)" → "XX公司 | 技术总监 (19级)"
function stripMarkdownDecor(line: string): string {
  let s = line;
  // 1. 整行成对粗体外壳（"**xxx**" 单独成行）
  const boldMatch = s.match(/^\*\*(.+?)\*\*$/);
  if (boldMatch) s = boldMatch[1];
  // 2. 整行成对斜体外壳（"*xxx*" 单独成行）
  const italicMatch = s.match(/^\*(.+?)\*$/);
  if (italicMatch) s = italicMatch[1];
  // 3. 行内成对粗体外壳（"**xxx**" 中间位置；先剥这个，避免单边残留）
  s = s.replace(/\*\*/g, '');
  // 4. 行内单个 *（斜体外壳）
  s = s.replace(/(?<!\*)\*(?!\*)/g, '');
  // 5. 行内成对 __
  s = s.replace(/__/g, '');
  // 6. 行内单个 _
  s = s.replace(/(?<!_)_(?!_)/g, '');
  // 7. 行内删除线 ~~
  s = s.replace(/~~/g, '');
  // 8. 行内代码 `
  s = s.replace(/`/g, '');
  // 9. 行首/行尾残留的装饰字符（前缀/后缀连续）
  s = s.replace(/^[*_~`>\s]+/, '').replace(/[*_~`>\s]+$/, '');
  // 10. 标题前缀
  s = s.replace(/^#+\s*/, '');
  // 11. bullet 前缀
  s = s.replace(/^[-•·]\s*/, '');
  return s.trim();
}

/** 把同一段落里的行按"日期行开头"分组（一条 entry 占用若干行直到下一个日期） */
function groupByDate(lines: string[]): string[][] {
  const groups: string[][] = [];
  let cur: string[] = [];

  const dateRegex =
    /^(\d{4}[.\-/年]?\d{0,2}\s*[-–—~到至]\s*(?:\d{4}[.\-/年]?\d{0,2}|至今|现在|present))/i;

  for (const raw of lines) {
    const line = stripMarkdownDecor(raw);
    if (dateRegex.test(line)) {
      if (cur.length > 0) groups.push(cur);
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) groups.push(cur);

  return groups;
}

function joinLines(lines: string[]): string {
  return lines
    .map((l) => l.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
}

/* ============== 内置空模板（"用模板"按钮） ============== */

export const RESUME_TEMPLATE_TEXT = `姓名：张三
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