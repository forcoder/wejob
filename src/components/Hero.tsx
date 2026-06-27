'use client';

import { Sparkles } from 'lucide-react';

const stats = [
  { value: '50,000+', label: '服务用户' },
  { value: '95%', label: '简历通过率提升' },
  { value: '¥15,000', label: '平均薪资涨幅' },
  { value: '4.9/5', label: '用户满意度' },
];

interface HeroProps {
  onNavigate: (tab: 'resume' | 'salary' | 'interview') => void;
}

export default function Hero({ onNavigate }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* 简洁背景 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-[#FAFBFC]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Hero Content */}
        <div className="text-center max-w-3xl mx-auto">
          {/* 标签 */}
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>AI驱动的智能求职平台</span>
          </div>

          {/* 标题 */}
          <h1 className="hero-title">
            让求职更简单，<br />
            <span className="highlight">让机会不再错过</span>
          </h1>

          {/* 副标题 */}
          <p className="hero-subtitle">
            WeJob整合AI简历优化、真实薪资数据、智能面试辅导，
            帮助每一位求职者找到心仪的工作。
          </p>

          {/* CTA按钮 */}
          <div className="hero-cta">
            <button
              onClick={() => onNavigate('resume')}
              className="btn btn-primary text-base px-8 py-3.5"
            >
              立即优化简历
            </button>
            <button
              onClick={() => onNavigate('salary')}
              className="btn btn-secondary text-base px-8 py-3.5"
            >
              查看薪资行情
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
