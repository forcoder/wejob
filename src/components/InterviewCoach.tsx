'use client';

import { useState } from 'react';
import { MessageSquare, Play, SkipForward, CheckCircle, XCircle, Clock, Lightbulb, AlertCircle } from 'lucide-react';
import { generateInterviewQuestions, evaluateAnswer } from '@/lib/ai-service';

interface Question {
  id: string;
  type: 'behavioral' | 'technical' | 'situational';
  question: string;
  expectedAnswer?: string;
  userAnswer?: string;
  feedback?: string;
  score?: number;
}

const MOCK_RESUME = `张三，3年前端开发经验，擅长React、Vue，曾在字节跳动工作。`;

const AI_TIMEOUT_MS = 60_000;

interface AiError { message: string; }

// 带超时的 fetch 包装
const fetchWithTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: any;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`请求超时（${ms / 1000} 秒未返回），请重试或缩短输入`)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

export default function InterviewCoach() {
  const [position, setPosition] = useState('前端工程师');
  const [companyType, setCompanyType] = useState('互联网大厂');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [generateError, setGenerateError] = useState<AiError | null>(null);
  const [evaluateError, setEvaluateError] = useState<AiError | null>(null);

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const generatedQuestions = await fetchWithTimeout(
        generateInterviewQuestions(position, companyType, MOCK_RESUME),
        AI_TIMEOUT_MS
      );
      setQuestions(generatedQuestions);
      setSessionStarted(true);
      setCurrentIndex(0);
      setUserAnswer('');
    } catch (error: any) {
      console.error('Failed to generate questions:', error);
      setGenerateError({ message: error?.message || '生成面试题失败' });
    }
    setIsGenerating(false);
  };

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) return;

    setIsEvaluating(true);
    setEvaluateError(null);
    try {
      const result = await fetchWithTimeout(
        evaluateAnswer(questions[currentIndex].question, userAnswer),
        AI_TIMEOUT_MS
      );

      setQuestions(prev => prev.map((q, i) =>
        i === currentIndex
          ? { ...q, userAnswer, feedback: result.feedback, score: result.score }
          : q
      ));
    } catch (error: any) {
      console.error('Evaluation failed:', error);
      setEvaluateError({ message: error?.message || '评估失败' });
    }
    setIsEvaluating(false);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => q.userAnswer).length;
  const averageScore = questions.filter(q => q.score).length > 0
    ? Math.round(
        questions.filter(q => q.score).reduce((sum, q) => sum + (q.score || 0), 0) /
        questions.filter(q => q.score).length
      )
    : 0;

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-slate-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          AI 模拟面试
        </h1>
        <p className="text-xl text-slate-600">
          模拟真实面试场景，即时反馈薄弱点
        </p>
      </div>

      {!sessionStarted ? (
        /* 开始界面 */
        <div className="max-w-2xl mx-auto">
          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <MessageSquare className="text-blue-600" />
              设置面试场景
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  目标岗位
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="input"
                  placeholder="例如：前端工程师"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  公司类型
                </label>
                <select
                  value={companyType}
                  onChange={(e) => setCompanyType(e.target.value)}
                  className="input"
                >
                  <option value="互联网大厂">互联网大厂（字节/腾讯/阿里）</option>
                  <option value="中小型公司">中小型公司</option>
                  <option value="外企">外企</option>
                  <option value="创业公司">创业公司</option>
                  <option value="国企/央企">国企/央企</option>
                </select>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-700 mb-2">面试将包含：</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    行为面试题（STAR法则应用）
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    专业能力题
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    情景模拟题
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    即时AI评分与反馈
                  </li>
                </ul>
              </div>

              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="btn btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AI 正在生成面试题，预计 10-30 秒...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    开始模拟面试
                  </>
                )}
              </button>

              {generateError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">生成失败</div>
                    <div className="text-sm mt-1">{generateError.message}</div>
                    <button
                      onClick={handleGenerateQuestions}
                      className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                    >
                      重试
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 面试进行中 */
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 左侧：题目列表 */}
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="font-semibold mb-4">面试进度</h3>
              <div className="flex justify-between text-sm text-slate-600 mb-4">
                <span>已回答: {answeredCount}/{questions.length}</span>
                {averageScore > 0 && (
                  <span className="font-semibold">平均分: {averageScore}</span>
                )}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(i);
                    setUserAnswer(q.userAnswer || '');
                  }}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    currentIndex === i
                      ? 'border-blue-500 bg-blue-50'
                      : q.userAnswer
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">问题 {i + 1}</span>
                    {q.score && (
                      <span className={`font-bold ${getScoreColor(q.score)}`}>
                        {q.score}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                    q.type === 'behavioral' ? 'bg-blue-100 text-blue-700' :
                    q.type === 'technical' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {q.type === 'behavioral' ? '行为' :
                     q.type === 'technical' ? '专业' : '情景'}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSessionStarted(false);
                setQuestions([]);
                setCurrentIndex(0);
              }}
              className="btn btn-secondary w-full"
            >
              重新开始
            </button>
          </div>

          {/* 中间：当前问题 */}
          <div className="lg:col-span-2 space-y-6">
            {currentQuestion && (
              <>
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      currentQuestion.type === 'behavioral' ? 'bg-blue-100 text-blue-700' :
                      currentQuestion.type === 'technical' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {currentQuestion.type === 'behavioral' ? '📋 行为面试' :
                       currentQuestion.type === 'technical' ? '💻 专业能力' :
                       '🎯 情景模拟'}
                    </span>
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock size={14} />
                      建议回答时间: 2-3分钟
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-slate-900 mb-4">
                    {currentQuestion.question}
                  </h3>

                  {!currentQuestion.feedback ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        你的回答
                      </label>
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="input h-40"
                        placeholder="输入你的回答..."
                      />

                      <div className="flex gap-4 mt-4">
                        <button
                          onClick={handleEvaluate}
                          disabled={isEvaluating || !userAnswer.trim()}
                          className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                          {isEvaluating ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              AI 评分中，预计 10-20 秒...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={18} />
                              提交评分
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleNext}
                          disabled={currentIndex === questions.length - 1}
                          className="btn btn-secondary flex items-center justify-center gap-2"
                        >
                          <SkipForward size={18} />
                          跳过
                        </button>
                      </div>

                      {evaluateError && (
                        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                          <AlertCircle size={18} className="mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">评分失败</div>
                            <div className="text-sm mt-1">{evaluateError.message}</div>
                            <button
                              onClick={handleEvaluate}
                              className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                            >
                              重试
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fadeIn">
                      <div className={`p-4 rounded-lg ${
                        (currentQuestion.score || 0) >= 80 ? 'bg-green-50 border border-green-200' :
                        (currentQuestion.score || 0) >= 60 ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">AI评分</span>
                          <span className={`text-2xl font-bold ${getScoreColor(currentQuestion.score)}`}>
                            {currentQuestion.score}
                          </span>
                        </div>
                        <p className="text-slate-700">{currentQuestion.feedback}</p>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                          <Lightbulb size={16} />
                          改进建议
                        </h4>
                        <ul className="text-sm text-slate-700 space-y-1">
                          <li>• 用STAR法则重新组织你的回答</li>
                          <li>• 添加具体的量化数据支撑你的观点</li>
                          <li>• 突出你在团队中的贡献和影响力</li>
                        </ul>
                      </div>

                      <button
                        onClick={handleNext}
                        disabled={currentIndex === questions.length - 1}
                        className="btn btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {currentIndex === questions.length - 1 ? (
                          <>面试完成</>
                        ) : (
                          <>
                            <SkipForward size={18} />
                            下一题
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* 历史回答 */}
                {answeredCount > 1 && (
                  <div className="card p-4">
                    <h4 className="font-medium text-slate-700 mb-3">其他回答摘要</h4>
                    <div className="space-y-2">
                      {questions.filter(q => q.userAnswer && q.id !== currentQuestion.id).slice(0, 3).map((q, i) => (
                        <div key={q.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm text-slate-600">
                            问题 {(questions.indexOf(q)) + 1}
                          </span>
                          <span className={`font-semibold ${getScoreColor(q.score)}`}>
                            {q.score || '待评分'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
