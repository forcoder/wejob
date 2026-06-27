'use client';

import { FileText, TrendingUp, MessageSquare, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: 'home' | 'resume' | 'salary' | 'interview') => void;
}

const navItems = [
  { id: 'home', label: '首页', icon: FileText },
  { id: 'resume', label: '简历优化', icon: FileText },
  { id: 'salary', label: '薪资情报', icon: TrendingUp },
  { id: 'interview', label: '模拟面试', icon: MessageSquare },
];

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/92 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="logo-icon">
              <span className="text-lg">W</span>
            </div>
            <span className="text-xl font-bold text-slate-900">WeJob</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`nav-item${activeTab === item.id ? ' active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button className="btn btn-secondary text-sm">
              登录
            </button>
            <button className="btn btn-primary text-sm">
              免费试用
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-fadeIn">
          <nav className="px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-gray-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-4 space-y-2">
              <button className="w-full btn btn-secondary">
                登录
              </button>
              <button className="w-full btn btn-primary">
                免费试用
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
