'use client';

import { FileText, TrendingUp, MessageSquare, ArrowRight } from 'lucide-react';

interface FeaturesProps {
  onNavigate: (tab: 'resume' | 'salary' | 'interview') => void;
}

const features = [
  {
    icon: FileText,
    title: 'AI简历优化',
    description: '智能分析简历薄弱点，生成优化版本，提升面试邀请率',
    tab: 'resume' as const,
    iconBg: 'feature-icon-blue',
    iconEmoji: '📄',
  },
  {
    icon: TrendingUp,
    title: '薪资情报',
    description: '真实薪资数据，帮你了解市场行情，谈出理想薪资',
    tab: 'salary' as const,
    iconBg: 'feature-icon-green',
    iconEmoji: '💰',
  },
  {
    icon: MessageSquare,
    title: '模拟面试',
    description: 'AI模拟真实面试，即时反馈薄弱点，自信应对面试',
    tab: 'interview' as const,
    iconBg: 'feature-icon-amber',
    iconEmoji: '🎯',
  },
];

const painPoints = [
  { emoji: '📄', text: '海投100份简历，回复寥寥无几' },
  { emoji: '💸', text: '不知道自己的市场价，面试时底气不足' },
  { emoji: '🎯', text: '不知道目标公司到底看重什么能力' },
  { emoji: '😰', text: '面试紧张，准备不充分频频失误' },
  { emoji: '🤝', text: '没有内推渠道，只能靠海投' },
  { emoji: '📈', text: '拿到offer不知道怎么谈判薪资' },
];

export default function Features({ onNavigate }: FeaturesProps) {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="section-title">为什么选择 WeJob？</h2>
          <p className="section-subtitle">
            我们用AI技术解决求职过程中的痛点，让每一份努力都有回报
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card cursor-pointer"
              onClick={() => onNavigate(feature.tab)}
            >
              <div className={`feature-icon ${feature.iconBg}`}>
                {feature.iconEmoji}
              </div>

              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                {feature.title}
              </h3>

              <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                {feature.description}
              </p>

              <button className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:gap-3 transition-all">
                立即体验
                <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Pain Points Section */}
        <div className="mt-20">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-10">
            求职者面临的真实困境
          </h3>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {painPoints.map((pain, index) => (
              <div key={index} className="pain-item">
                <span className="pain-emoji">{pain.emoji}</span>
                <span className="pain-text">{pain.text}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <div className="inline-block px-8 py-4 bg-slate-900 rounded-xl text-white">
              <p className="text-base font-medium">
                WeJob 帮你解决以上所有问题 ✨
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
