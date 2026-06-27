'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import SalaryTable from '@/components/SalaryTable';
import ResumeAnalyzer from '@/components/ResumeAnalyzer';
import SalaryExplorer from '@/components/SalaryExplorer';
import InterviewCoach from '@/components/InterviewCoach';
import Footer from '@/components/Footer';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'resume' | 'salary' | 'interview'>('home');

  return (
    <div className="min-h-screen">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main>
        {activeTab === 'home' && (
          <>
            <Hero onNavigate={setActiveTab} />
            <Features onNavigate={setActiveTab} />
            <SalaryTable />
          </>
        )}

        {activeTab === 'resume' && <ResumeAnalyzer />}
        {activeTab === 'salary' && <SalaryExplorer />}
        {activeTab === 'interview' && <InterviewCoach />}
      </main>

      <Footer />
    </div>
  );
}
