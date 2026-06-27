'use client';

import { Heart, Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          {/* 品牌 */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="logo-icon">
                <span className="text-lg">W</span>
              </div>
              <span className="text-xl font-bold">WeJob</span>
            </div>
            <p className="text-slate-400 mb-6 max-w-sm text-sm leading-relaxed">
              WeJob 致力于用AI技术帮助每一位求职者找到理想工作。
              简历优化、薪资情报、模拟面试，让求职更简单。
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* 产品 */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-400">产品功能</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">简历优化</a></li>
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">薪资情报</a></li>
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">模拟面试</a></li>
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">Offer谈判</a></li>
            </ul>
          </div>

          {/* 资源 */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-slate-400">求职资源</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">求职攻略</a></li>
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">面试题库</a></li>
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">简历模板</a></li>
              <li><a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">行业报告</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-slate-500">
            © 2025 WeJob. All rights reserved.
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-4 md:mt-0">
            Made with <Heart size={14} className="text-red-500" /> for job seekers
          </p>
        </div>
      </div>
    </footer>
  );
}
