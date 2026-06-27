'use client';

import { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { salaryData, searchSalaryData } from '@/lib/data';

export default function SalaryTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(salaryData);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setResults(salaryData);
      return;
    }
    const filtered = searchSalaryData({ company: searchTerm });
    setResults(filtered);
  };

  const formatSalary = (salary: number) => {
    return `¥${(salary / 1000).toFixed(0)}K`;
  };

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title">真实薪资数据</h2>
          <p className="section-subtitle">
            基于公开报告整理，仅供参考
          </p>
        </div>

        {/* 数据来源说明 */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">数据来源说明</p>
            <p className="text-blue-700 leading-relaxed">
              数据整理自 <strong>BOSS直聘2024薪酬报告</strong>、<strong>国家统计局2023年就业人员工资统计</strong>、
              <strong>Levels.fyi</strong>、<strong>脉脉offer公示</strong> 等公开渠道。
              薪资受业务线、面试表现、学历背景等因素影响，实际offer可能与参考范围有偏差。
            </p>
          </div>
        </div>

        <div className="salary-card">
          <div className="salary-header">
            <h3>最新薪资行情</h3>
            <div className="salary-search">
              <input
                type="text"
                className="search-input"
                placeholder="搜索公司..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="btn btn-accent flex items-center gap-2"
              >
                <Search size={16} />
                查询
              </button>
            </div>
          </div>

          <table className="salary-table">
            <thead>
              <tr>
                <th>公司</th>
                <th>岗位</th>
                <th>城市</th>
                <th>薪资范围</th>
                <th>中位数</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.id}>
                  <td className="company">{item.company}</td>
                  <td>{item.position}</td>
                  <td>
                    <span className="badge">{item.city}</span>
                  </td>
                  <td>
                    {formatSalary(item.minSalary)} - {formatSalary(item.maxSalary)}
                  </td>
                  <td className="salary">{formatSalary(item.medianSalary)}/月</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    暂无匹配数据，请尝试其他关键词
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
