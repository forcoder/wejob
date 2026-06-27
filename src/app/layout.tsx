import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WeJob - 智能求职辅助系统',
  description: 'AI驱动的简历优化、模拟面试、薪资情报平台，帮助求职者提升竞争力',
  keywords: ['求职', '简历优化', '模拟面试', '薪资情报', 'AI助手'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#FAFBFC]">
        {children}
      </body>
    </html>
  );
}
