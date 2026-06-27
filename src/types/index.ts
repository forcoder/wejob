// 用户信息
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'job_seeker' | 'recruiter' | 'admin';
  createdAt: Date;
}

// 简历
export interface Resume {
  id: string;
  userId: string;
  title: string;
  personalInfo: {
    name: string;
    phone: string;
    email: string;
    location: string;
    age?: number;
  };
  education: Education[];
  experience: Experience[];
  skills: string[];
  projects: Project[];
  summary?: string;
  optimizedVersion?: string;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements?: string[];
}

export interface Project {
  name: string;
  role: string;
  description: string;
  techStack: string[];
  url?: string;
}

// 薪资数据
export interface SalaryData {
  id: string;
  company: string;
  position: string;
  level: string;
  city: string;
  minSalary: number;
  maxSalary: number;
  medianSalary: number;
  count: number;
  source: string;
  updatedAt: Date;
}

// 模拟面试
export interface Interview {
  id: string;
  userId: string;
  targetCompany?: string;
  targetPosition: string;
  type: 'behavioral' | 'technical' | 'mixed';
  questions: InterviewQuestion[];
  feedback?: InterviewFeedback;
  score?: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

export interface InterviewQuestion {
  id: string;
  type: 'behavioral' | 'technical';
  question: string;
  expectedAnswer?: string;
  userAnswer?: string;
  feedback?: string;
  score?: number;
}

export interface InterviewFeedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

// 内推信息
export interface Referral {
  id: string;
  company: string;
  position: string;
  referrerId: string;
  referrerName: string;
  description: string;
  requirements: string[];
  contact?: string;
  status: 'active' | 'closed';
  createdAt: Date;
}

// 简历分析结果
export interface ResumeAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  keywordAnalysis: {
    found: string[];
    missing: string[];
    suggested: string[];
  };
  atsCompatibility: number;
}

// API响应
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===================== 简历优化（M1+M2 改造） =====================

/** 简历结构化数据（解析/编辑/导出的统一形态） */
export interface ParsedResume {
  contact: {
    name: string;
    phone: string;
    email: string;
    city: string;
    links?: string[];
  };
  summary?: string;
  education: Array<{
    school: string;
    major: string;
    degree: string;
    period: string;
    gpa?: string;
    awards?: string[];
  }>;
  experience: Array<{
    company: string;
    title: string;
    period: string;
    bullets: string[]; // 每条 bullet 一行
  }>;
  projects: Array<{
    name: string;
    period?: string;
    tech: string[];
    bullets: string[];
  }>;
  skills: {
    languages?: string[];
    frameworks?: string[];
    tools?: string[];
    other?: string[];
  };
  raw: string; // 原始文本（兜底，AI 优化后可丢弃）
}

/** 单条改造点（AI 返回 + 用户在 UI 里编辑） */
export interface ResumeChange {
  section: 'summary' | 'experience' | 'projects' | 'skills' | 'education';
  sectionIndex: number; // 第几条
  field?: string; // bullets 数组里第几条（仅 experience/projects 有意义）
  original: string;
  optimized: string;
  reason: string;
  aiAdded?: boolean; // true = AI 添加了原文没有的内容，需人工确认
}

/** AI 优化完整结果 */
export interface OptimizeResult {
  optimized: ParsedResume; // 包装后的完整结构（normalizeOptimizeResult 会兜底成完整）
  changes: ResumeChange[]; // 改造点列表
  jdKeywordsMatched: string[]; // JD 中识别出的关键词，被简历覆盖了
  jdKeywordsMissing: string[]; // 简历没覆盖的关键词（建议添加但要人工确认）
}

/** localStorage 版本记录 */
export interface ResumeVersion {
  id: string; // uuid
  createdAt: string; // ISO
  label: string; // 用户标签："针对字节前端 JD v2"
  parsed: ParsedResume; // 编辑后 / 解析后的结构
  jd: string; // 当时的 JD
  optimized?: OptimizeResult; // 包装后（如果有）
  notes?: string; // 用户备注
}
