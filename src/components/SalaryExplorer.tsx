'use client';

import { useState } from 'react';
import { Search, Building2, TrendingUp, MapPin, DollarSign, ChevronDown, ArrowUpRight } from 'lucide-react';
import { salaryData, searchSalaryData, getCompanies, getPositions, getSalaryStats, getNegotiationTips } from '@/lib/data';

export default function SalaryExplorer() {
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [city, setCity] = useState('');
  const [searchResults, setSearchResults] = useState<typeof salaryData>([]);
  const [selectedItem, setSelectedItem] = useState<typeof salaryData[0] | null>(null);
  const [negotiationSalary, setNegotiationSalary] = useState('');

  const companies = getCompanies();
  const positions = getPositions();

  const handleSearch = () => {
    const results = searchSalaryData({ company, position, city });
    setSearchResults(results);
  };

  const handleSelectResult = (item: typeof salaryData[0]) => {
    setSelectedItem(item);
  };

  const negotiationResult = selectedItem && negotiationSalary
    ? getNegotiationTips(selectedItem.medianSalary, parseInt(negotiationSalary))
    : null;

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(salary);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          薪资行情情报
        </h1>
        <p className="text-xl text-slate-600">
          真实薪资数据，帮你谈出理想薪资
        </p>
      </div>

      {/* 搜索区域 */}
      <div className="card p-6 mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Building2 size={16} className="inline mr-1" />
              公司名称
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="input"
              placeholder="如：字节跳动"
              list="companies"
            />
            <datalist id="companies">
              {companies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <TrendingUp size={16} className="inline mr-1" />
              岗位名称
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="input"
              placeholder="如：前端工程师"
              list="positions"
            />
            <datalist id="positions">
              {positions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              城市
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input"
              placeholder="如：北京"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Search size={18} />
              查询薪资
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 搜索结果列表 */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">
            查询结果 ({searchResults.length} 条)
          </h2>

          {searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  className={`card p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedItem?.id === item.id
                      ? 'border-blue-500 shadow-md'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.company}</h3>
                      <p className="text-slate-600">{item.position}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {item.city}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded">
                          {item.level}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatSalary(item.medianSalary)}
                      </p>
                      <p className="text-sm text-slate-500">/月 (中位数)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <DollarSign className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">
                输入搜索条件，查看薪资行情
              </p>
              <p className="text-sm text-slate-400 mt-2">
                热门搜索：字节跳动 前端工程师 | 腾讯 产品经理 | 阿里巴巴 后端工程师
              </p>
            </div>
          )}
        </div>

        {/* 详情面板 */}
        <div className="space-y-6">
          {selectedItem ? (
            <>
              {/* 薪资详情卡片 */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">{selectedItem.company}</h2>
                <p className="text-slate-600 mb-4">{selectedItem.position}</p>

                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-1">薪资范围</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatSalary(selectedItem.minSalary)} - {formatSalary(selectedItem.maxSalary)}
                  </p>
                  <p className="text-slate-500">/月</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">样本数</p>
                    <p className="text-xl font-bold">{selectedItem.count}+</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-slate-500">数据来源</p>
                    <p className="text-sm font-medium text-blue-700">员工匿名</p>
                  </div>
                </div>

                <div className="text-sm text-slate-500">
                  <p>更新时间: {selectedItem.updatedAt.toLocaleDateString('zh-CN')}</p>
                </div>
              </div>

              {/* Offer谈判工具 */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <ArrowUpRight size={20} />
                  Offer谈判计算器
                </h3>

                <div className="mb-4">
                  <label className="block text-sm opacity-80 mb-2">
                    输入你的期望薪资 (/月)
                  </label>
                  <input
                    type="number"
                    value={negotiationSalary}
                    onChange={(e) => setNegotiationSalary(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="例如：50000"
                  />
                </div>

                {negotiationResult && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className={`p-3 rounded-lg ${negotiationResult.isReasonable ? 'bg-white/20' : 'bg-red-500/30'}`}>
                      <p className="font-medium">{negotiationResult.recommendation}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>谈判成功率</span>
                      <span className={`font-bold ${
                        negotiationResult.successRate === 'high' ? 'text-green-300' :
                        negotiationResult.successRate === 'medium' ? 'text-yellow-300' :
                        'text-red-300'
                      }`}>
                        {negotiationResult.successRate === 'high' ? '高' :
                         negotiationResult.successRate === 'medium' ? '中' : '低'}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/20">
                      <p className="text-sm font-medium mb-2">谈判要点</p>
                      <ul className="text-sm space-y-1 opacity-90">
                        {negotiationResult.talkingPoints.map((point, i) => (
                          <li key={i}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-6 text-center">
              <TrendingUp className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">
                选择左侧的薪资数据查看详情
              </p>
            </div>
          )}

          {/* 热门公司 */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">热门公司薪资</h3>
            <div className="space-y-3">
              {[
                { name: '字节跳动', avg: 45000 },
                { name: '腾讯', avg: 55000 },
                { name: '阿里巴巴', avg: 48000 },
                { name: '美团', avg: 40000 },
                { name: '百度', avg: 35000 },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setCompany(item.name);
                    handleSearch();
                  }}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-green-600 font-semibold">
                    {formatSalary(item.avg)}/月
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
