'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Upload, Send, X, Download } from 'lucide-react';
import { apiService } from '@/lib/api';
import { extractTextFromPDF, validateFile } from '@/lib/pdfParser';
import { exportResultsToPDF } from '@/lib/pdfExport';

type SessionPhase = 'input' | 'chat' | 'results';

interface Message {
  role: 'teacher' | 'student';
  content: string;
}

interface SessionState {
  id: string;
  topic: string;
  difficulty: number;
  personality: 'strict' | 'supportive' | 'socratic';
  mode?: 'STANDARD' | 'QUICK_TEST';
  targetQuestions?: number;
  examMode?: 'standard' | 'extended' | 'deep';
}

export default function InterrogoPage() {
  const router = useRouter();

  // Input phase
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState(5);
  const [personality, setPersonality] = useState<'strict' | 'supportive' | 'socratic'>('supportive');
  const [inputMethod, setInputMethod] = useState<'text' | 'pdf'>('text');
  const [examMode, setExamMode] = useState<'standard' | 'extended' | 'deep'>('extended');
  const [fileName, setFileName] = useState('');
  const [objective, setObjective] = useState<'review' | 'assessment' | 'recovery'>('review');
  const [manualIndex, setManualIndex] = useState<any>(null);
  const [isBuildingManualIndex, setIsBuildingManualIndex] = useState(false);

  // Session & Chat
  const [phase, setPhase] = useState<SessionPhase>('input');
  const [session, setSession] = useState<SessionState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Results
  const [results, setResults] = useState<any>(null);
  const [isQuickTestMode, setIsQuickTestMode] = useState(false);

  const quickTestAnsweredCount = messages.filter((m) => m.role === 'student').length;
  const quickTestTotalQuestions = 3;
  const quickTestCurrentQuestion = Math.min(
    quickTestTotalQuestions,
    quickTestAnsweredCount + 1
  );
  const quickTestProgress = Math.min(
    100,
    (quickTestAnsweredCount / quickTestTotalQuestions) * 100
  );
  const standardAnsweredCount = messages.filter((m) => m.role === 'student').length;
  const standardTotalQuestions = session?.targetQuestions || 8;
  const standardCurrentQuestion = Math.min(standardTotalQuestions, Math.max(1, standardAnsweredCount + 1));
  const standardProgress = Math.min(100, (standardAnsweredCount / standardTotalQuestions) * 100);

  useEffect(() => {
    const bootstrapSession = async () => {
      // Check if user is logged in
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Restore quick test if it was started from dashboard
      const quickTestSessionId = localStorage.getItem('quick_test_session_id');
      if (!quickTestSessionId) {
        return;
      }

      try {
        setIsLoading(true);
        const quickSession = await apiService.getSession(quickTestSessionId);

        if (quickSession?.endedAt) {
          localStorage.removeItem('quick_test_session_id');
          return;
        }

        setSession({
          id: quickSession.id,
          topic: quickSession.topic,
          difficulty: quickSession.difficulty,
          personality: quickSession.personality,
          mode: 'QUICK_TEST',
          targetQuestions: 3,
        });

        setMessages(
          (quickSession.messages || []).map((m: any) => ({
            role: m.role,
            content: m.content,
          }))
        );

        setIsQuickTestMode(true);
        setPhase('chat');
      } catch {
        localStorage.removeItem('quick_test_session_id');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapSession();
  }, [router]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const text = await extractTextFromPDF(file);
      setContent(text);
      setFileName(file.name);
      setInputMethod('pdf');
    } catch (err: any) {
      setError(err.message || 'Failed to extract PDF text');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!content.trim()) {
      setError('Please paste text or upload a PDF');
      return;
    }

    if (content.length < 20) {
      setError('Content must be at least 20 characters');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const enrichedContent = `${content}\n\n[Learning objective: ${objective}]`;
      const fallbackTarget = examMode === 'deep' ? 12 : examMode === 'extended' ? 9 : 7;
      const response = await apiService.startSession(topic, difficulty, personality, enrichedContent, examMode, fallbackTarget);
      setSession({
        id: response.sessionId,
        topic: response.topic,
        difficulty: response.difficulty,
        personality: response.personality,
        mode: 'STANDARD',
        targetQuestions: response.targetQuestions,
        examMode: response.examMode || examMode,
      });
      setMessages([
        {
          role: 'teacher',
          content: response.firstQuestion,
        },
      ]);
      setPhase('chat');
      setIsQuickTestMode(false);
      localStorage.removeItem('quick_test_session_id');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !session) return;

    const messageToSend = userInput;
    setUserInput('');
    setMessages((prev) => [...prev, { role: 'student', content: messageToSend }]);
    setIsLoading(true);
    setError('');

    try {
      if (isQuickTestMode) {
        const response = await apiService.answerQuickTest(session.id, messageToSend);

        if (response.isComplete) {
          setResults(response);
          setPhase('results');
          localStorage.removeItem('quick_test_session_id');
          return;
        }

        setMessages((prev) => [
          ...prev,
          { role: 'teacher', content: response.teacherResponse },
        ]);
      } else {
        const response = await apiService.sendMessage(
          session.id,
          messageToSend,
          session.targetQuestions,
          session.examMode || examMode
        );

        if (response.isComplete) {
          setResults(response);
          setPhase('results');
          localStorage.removeItem('quick_test_session_id');
          return;
        }

        setMessages((prev) => [
          ...prev,
          { role: 'teacher', content: response.teacherResponse },
        ]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1)); // Remove last student message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleDontKnow = async () => {
    if (!session || isLoading) return;

    const dontKnowMessage = "I don't know.";
    setMessages((prev) => [...prev, { role: 'student', content: dontKnowMessage }]);
    setIsLoading(true);
    setError('');

    try {
      if (isQuickTestMode) {
        const response = await apiService.answerQuickTest(session.id, dontKnowMessage);

        if (response.isComplete) {
          setResults(response);
          setPhase('results');
          localStorage.removeItem('quick_test_session_id');
          return;
        }

        setMessages((prev) => [
          ...prev,
          { role: 'teacher', content: response.teacherResponse },
        ]);
      } else {
        const response = await apiService.explainConcept(session.id);
        setMessages((prev) => [
          ...prev,
          { role: 'teacher', content: response.teacherResponse },
        ]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to explain concept');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.endSession(session.id);
      setResults(response);
      setPhase('results');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to end session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartSession = () => {
    setPhase('input');
    setSession(null);
    setMessages([]);
    setUserInput('');
    setContent('');
    setTopic('');
    setDifficulty(5);
    setPersonality('supportive');
    setExamMode('extended');
    setObjective('review');
    setManualIndex(null);
    setFileName('');
    setResults(null);
    setIsQuickTestMode(false);
    localStorage.removeItem('quick_test_session_id');
  };

  // INPUT PHASE
  if (phase === 'input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-100 p-4 md:p-8 relative overflow-hidden">
        {/* Background blobs */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary-200 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="mb-8 animate-slide-up">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4"
            >
              ← Back to Dashboard
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">🎓 Start Your Exam</h1>
            <p className="text-gray-600 text-lg">Set up in under 60 seconds: upload material, choose objective, begin.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-primary-100 bg-primary-50 p-2 text-xs font-semibold text-primary-700">
              <div className="rounded-md bg-white p-2 text-center">1. Upload material</div>
              <div className="rounded-md bg-white p-2 text-center">2. Choose objective</div>
              <div className="rounded-md bg-white p-2 text-center">3. Start oral exam</div>
            </div>
          </div>

          {error && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6 text-error-700 flex items-start gap-3 animate-slide-up">
              <span className="text-xl mt-1">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {/* Study Material Section */}
          <Card variant="elevated" className="mb-6 p-6 shadow-lg animate-slide-up overflow-hidden">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📚</span>
                <h2 className="text-2xl font-bold text-gray-900">1. Your Study Material</h2>
              </div>
              <p className="text-gray-600">Choose how to load your content</p>
            </div>

            <div className="space-y-4">
              {/* Input Method Selector */}
              <div className="flex gap-3 bg-gray-50 p-1 rounded-lg">
                <button
                  onClick={() => setInputMethod('text')}
                  className={`flex-1 p-3 rounded-md border-2 transition-all font-medium ${
                    inputMethod === 'text'
                      ? 'border-primary-500 bg-white text-primary-600 shadow-md'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📝 Paste Text
                </button>
                <button
                  onClick={() => setInputMethod('pdf')}
                  className={`flex-1 p-3 rounded-md border-2 transition-all font-medium ${
                    inputMethod === 'pdf'
                      ? 'border-primary-500 bg-white text-primary-600 shadow-md'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📄 Upload PDF
                </button>
              </div>

              {/* Content Input Area */}
              {inputMethod === 'text' ? (
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your study material here... (minimum 20 characters)"
                    className="w-full h-48 p-4 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all resize-none font-mono text-sm"
                  />
                  {content && (
                    <div className="mt-3 flex items-center justify-between bg-primary-50 p-3 rounded-lg">
                      <span className="text-sm text-primary-700">
                        ✓ {content.length} characters loaded
                      </span>
                      {content.length < 20 && (
                        <span className="text-xs text-warning-600">
                          At least 20 characters required
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-primary-500 hover:bg-primary-50/30 transition-all cursor-pointer group">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="flex flex-col items-center cursor-pointer w-full">
                      <div className="p-3 bg-primary-100 rounded-lg mb-3 group-hover:bg-primary-200 transition-colors">
                        <Upload className="w-8 h-8 text-primary-600" />
                      </div>
                      <p className="text-gray-900 font-semibold mb-1">
                        {fileName ? `✓ ${fileName}` : 'Click to upload a PDF'}
                      </p>
                      <p className="text-sm text-gray-500">Max 10MB • Single file</p>
                    </label>
                  </div>
                  {content && (
                    <div className="mt-3 bg-success-50 p-3 rounded-lg text-sm text-success-700">
                      ✓ PDF processed: {content.length} characters extracted
                    </div>
                  )}
                </div>
              )}

              {content.length >= 120 && (
                <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-secondary-800">📘 Manual indexing mode</p>
                      <p className="text-xs text-secondary-700">Extract chapters, definitions, formulas, and dates from the material.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={isBuildingManualIndex}
                      onClick={async () => {
                        try {
                          setIsBuildingManualIndex(true);
                          const index = await apiService.buildManualIndex(content);
                          setManualIndex(index);
                        } catch {
                          setError('Unable to generate semantic manual index');
                        } finally {
                          setIsBuildingManualIndex(false);
                        }
                      }}
                    >
                      Generate Index
                    </Button>
                  </div>

                  {manualIndex?.summary && (
                    <div className="mt-3 space-y-3 text-xs">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="rounded-md bg-white p-2">Chapters: <span className="font-bold">{manualIndex.summary.chapterCount}</span></div>
                        <div className="rounded-md bg-white p-2">Definitions: <span className="font-bold">{manualIndex.summary.definitionCount}</span></div>
                        <div className="rounded-md bg-white p-2">Formulas: <span className="font-bold">{manualIndex.summary.formulaCount}</span></div>
                        <div className="rounded-md bg-white p-2">Dates: <span className="font-bold">{manualIndex.summary.dateCount}</span></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="rounded-md bg-white p-2">
                          <p className="font-semibold text-gray-800 mb-1">Detected chapters</p>
                          {(manualIndex.chapters || []).slice(0, 3).map((c: any, idx: number) => (
                            <p key={idx} className="text-gray-600">• {c.title} <span className="text-gray-400">({c.citation})</span></p>
                          ))}
                        </div>
                        <div className="rounded-md bg-white p-2">
                          <p className="font-semibold text-gray-800 mb-1">Semantic chunks</p>
                          {(manualIndex.chunks || []).slice(0, 3).map((c: any) => (
                            <p key={c.id} className="text-gray-600">• conf {Math.round((c.confidence || 0) * 100)}% • {c.citation}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Exam Settings Section */}
          <Card variant="elevated" className="p-6 shadow-lg animate-slide-up overflow-hidden">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚙️</span>
                <h2 className="text-2xl font-bold text-gray-900">2. Exam Settings</h2>
              </div>
              <p className="text-gray-600">Configure how you want to be tested</p>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-700">
                📌 Topic is automatically detected from your uploaded material (PDF or text).
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">🎯 Session objective</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setObjective('review')}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      objective === 'review'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    Targeted review
                  </button>
                  <button
                    onClick={() => setObjective('assessment')}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      objective === 'assessment'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    Pre-exam assessment
                  </button>
                  <button
                    onClick={() => setObjective('recovery')}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      objective === 'recovery'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    Gap recovery
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">🧭 Exam mode</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setExamMode('standard')}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      examMode === 'standard'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    Standard (7+ questions)
                  </button>
                  <button
                    onClick={() => setExamMode('extended')}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      examMode === 'extended'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    Extended (9+ questions)
                  </button>
                  <button
                    onClick={() => setExamMode('deep')}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      examMode === 'deep'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    Deep dive (12+ questions)
                  </button>
                </div>
              </div>

              {/* Difficulty Slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    ⚡ Difficulty Level
                  </label>
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full font-bold text-sm">
                    {difficulty}/10
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Easy</span>
                    <span>Hard</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {difficulty <= 3
                      ? 'Fundamental questions and baseline checks.'
                      : difficulty <= 7
                        ? 'Analytical questions with conceptual links.'
                        : 'Advanced questions, critical comparisons, and edge cases.'}
                  </p>
                </div>
              </div>

              {/* Teacher Personality */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">
                  👨‍🏫 Teacher Personality
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPersonality('strict')}
                    className={`p-4 rounded-lg border-2 transition-all font-medium ${
                      personality === 'strict'
                        ? 'border-error-500 bg-error-50 text-error-700 shadow-md'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">😤</div>
                    <div>Strict</div>
                    <div className="text-xs text-gray-600 mt-1">Demanding and rigorous</div>
                  </button>
                  <button
                    onClick={() => setPersonality('supportive')}
                    className={`p-4 rounded-lg border-2 transition-all font-medium ${
                      personality === 'supportive'
                        ? 'border-success-500 bg-success-50 text-success-700 shadow-md'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">😊</div>
                    <div>Supportive</div>
                    <div className="text-xs text-gray-600 mt-1">Patient and encouraging</div>
                  </button>
                  <button
                    onClick={() => setPersonality('socratic')}
                    className={`p-4 rounded-lg border-2 transition-all font-medium ${
                      personality === 'socratic'
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-md'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🧠</div>
                    <div>Socratic</div>
                    <div className="text-xs text-gray-600 mt-1">Progressive guiding questions</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                fullWidth={true}
                onClick={() => router.push('/dashboard')}
                size="lg"
              >
                Cancel
              </Button>
              <Button
                fullWidth={true}
                isLoading={isLoading}
                onClick={handleStartSession}
                size="lg"
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
              >
                🚀 Start Exam
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // CHAT PHASE
  if (phase === 'chat' && session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-100 p-4 md:p-8 flex flex-col relative overflow-hidden">
        {/* Background blobs */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary-200 rounded-full blur-3xl opacity-10"></div>
        </div>

        <div className="max-w-3xl mx-auto w-full flex flex-col flex-1">
          {/* Header with Session Info */}
          <div className="mb-6 animate-slide-up">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-4">
              ← Back to Dashboard
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {session.topic}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>⚡ Level {session.difficulty}/10</span>
                  <span>•</span>
                  <span>{session.personality === 'strict' ? '😤 Strict Teacher' : '😊 Supportive Teacher'}</span>
                </div>
                {isQuickTestMode && (
                  <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-primary-700">
                      <span>⚡ Quick Test</span>
                      <span>Question {quickTestCurrentQuestion}/3</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-primary-100">
                      <div
                        className="h-2 rounded-full bg-primary-600 transition-all duration-300"
                        style={{ width: `${quickTestProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {!isQuickTestMode && (
                  <div className="mt-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-secondary-700">
                      <span>🎯 Full Exam</span>
                      <span>Question {standardCurrentQuestion}/{standardTotalQuestions}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary-100">
                      <div
                        className="h-2 rounded-full bg-secondary-600 transition-all duration-300"
                        style={{ width: `${standardProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={handleEndSession}
                disabled={isLoading}
                variant="error"
                size="lg"
                className="whitespace-nowrap"
              >
                End Exam
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6 text-error-700 flex items-start gap-3">
              <span className="text-xl mt-1">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {/* Chat Container */}
          <div className="flex-1 bg-white rounded-lg shadow-lg border border-gray-200 mb-6 overflow-hidden flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 animate-fade-in ${msg.role === 'teacher' ? 'justify-start' : 'justify-end'}`}
                >
                  {/* Teacher Messages */}
                  {msg.role === 'teacher' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm">👨‍🏫</span>
                    </div>
                  )}

                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg ${
                      msg.role === 'teacher'
                        ? 'bg-gray-100 text-gray-900 border border-gray-200'
                        : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                  </div>

                  {/* Student Messages */}
                  {msg.role === 'student' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm">👤</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm">👨‍🏫</span>
                  </div>
                  <div className="bg-gray-100 text-gray-900 border border-gray-200 px-4 py-3 rounded-lg">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              <div className="flex gap-3">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your answer... (Press Enter to send, Shift+Enter for newline)"
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleDontKnow}
                  disabled={isLoading || !session}
                  size="lg"
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  I don't know
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !userInput.trim()}
                  size="lg"
                  className="bg-gradient-to-r from-primary-600 to-primary-700"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Tips */}
          <div className="text-center text-sm text-gray-600">
            <p>💡 Tip: Give detailed answers for better feedback</p>
          </div>
        </div>
      </div>
    );
  }

  // RESULTS PHASE
  if (phase === 'results' && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-100 p-4 md:p-8 relative overflow-hidden">
        {/* Background blobs */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-80 h-80 bg-success-200 rounded-full blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12 animate-slide-up">
            <div className="text-7xl mb-4">🎉</div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3">Exam Completed!</h1>
            <p className="text-xl text-gray-600">Here is your detailed evaluation report</p>
          </div>

          {/* Main Score Card */}
          <Card
            variant="elevated"
            className="mb-12 p-12 text-center bg-gradient-to-br from-primary-50 to-success-50 border-0 shadow-xl animate-slide-up overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-100/20 to-success-100/20 opacity-0 hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
                <p className="text-gray-600 text-lg mb-3">Your Score</p>
              <div className="text-center">
                <div className="text-8xl font-bold mb-2">
                  <span
                    className={
                      results.score >= 8
                        ? 'text-success-600'
                        : results.score >= 6
                          ? 'text-warning-600'
                          : 'text-error-600'
                    }
                  >
                    {results.score.toFixed(1)}
                  </span>
                  <span className="text-3xl text-gray-400">/10</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 mt-4">
                  {results.score >= 8 && '🏆 Excellent Performance!'}
                  {results.score >= 6 && results.score < 8 && '👍 Good Job!'}
                  {results.score < 6 && '💪 Keep Practicing!'}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card variant="elevated" className="border-0 p-6 bg-success-50/60">
              <h3 className="text-lg font-bold text-success-700 mb-3">What you did well</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {(results.strengths || []).slice(0, 3).map((item: string, idx: number) => (
                  <li key={idx}>✓ {item}</li>
                ))}
              </ul>
            </Card>
            <Card variant="elevated" className="border-0 p-6 bg-warning-50/60">
              <h3 className="text-lg font-bold text-warning-700 mb-3">What to review today</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {(results.weaknesses || []).slice(0, 3).map((item: string, idx: number) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </Card>
            <Card variant="elevated" className="border-0 p-6 bg-primary-50/60">
              <h3 className="text-lg font-bold text-primary-700 mb-3">Tomorrow's practice</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {(results.studyPlan || []).slice(0, 3).map((item: string, idx: number) => (
                  <li key={idx}>→ {item}</li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Strengths */}
            {results.strengths && results.strengths.length > 0 && (
              <Card
                variant="elevated"
                className="border-0 overflow-hidden hover:shadow-lg transition-all transform hover:scale-105 animate-slide-up"
              >
                <div className="border-l-4 border-l-success-500 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-2xl">✅</div>
                    <h3 className="text-xl font-bold text-success-700">Strengths</h3>
                  </div>
                  <ul className="space-y-3">
                    {results.strengths.slice(0, 3).map((strength: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-success-600 font-bold">✓</span>
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {/* Weaknesses */}
            {results.weaknesses && results.weaknesses.length > 0 && (
              <Card
                variant="elevated"
                className="border-0 overflow-hidden hover:shadow-lg transition-all transform hover:scale-105 animate-slide-up"
              >
                <div className="border-l-4 border-l-warning-500 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-2xl">⚠️</div>
                    <h3 className="text-xl font-bold text-warning-700">Areas to Improve</h3>
                  </div>
                  <ul className="space-y-3">
                    {results.weaknesses.slice(0, 3).map((weakness: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-warning-600 font-bold">•</span>
                        <span className="text-sm">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {/* Suggestions */}
            {results.suggestions && results.suggestions.length > 0 && (
              <Card
                variant="elevated"
                className="border-0 overflow-hidden hover:shadow-lg transition-all transform hover:scale-105 animate-slide-up"
              >
                <div className="border-l-4 border-l-primary-500 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-2xl">💡</div>
                    <h3 className="text-xl font-bold text-primary-700">Suggestions</h3>
                  </div>
                  <ul className="space-y-3">
                    {results.suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-primary-600 font-bold">→</span>
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}
          </div>

          {results.rubric?.criteria?.length > 0 && (
            <Card variant="elevated" className="mb-12 border-0 shadow-lg p-6 animate-slide-up">
              <h3 className="text-2xl font-bold text-gray-900 mb-5">📐 Evaluation Rubric</h3>
              <div className="space-y-5">
                {results.rubric.criteria.map((criterion: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-semibold text-gray-900">{criterion.label}</div>
                      <div className="text-sm font-bold text-primary-700">{criterion.score.toFixed(1)}/10</div>
                    </div>
                    <div className="mb-3 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-primary-600 transition-all"
                        style={{ width: `${Math.min(100, criterion.score * 10)}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-700"><span className="font-semibold">Why:</span> {criterion.reason}</p>
                    <p className="mt-1 text-sm text-gray-600"><span className="font-semibold">Evidence:</span> {criterion.evidence}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {results.studyPlan?.length > 0 && (
            <Card variant="elevated" className="mb-12 border-0 shadow-lg p-6 animate-slide-up">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🗓️ Automatic Study Plan</h3>
              <ul className="space-y-3">
                {results.studyPlan.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                      {idx + 1}
                    </span>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Full Lists (if more items) */}
          {(results.strengths?.length > 3 || results.weaknesses?.length > 3 || results.suggestions?.length > 3) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-slide-up">
              {results.strengths && results.strengths.length > 3 && (
                <Card variant="elevated" className="border-0 p-6 bg-success-50/50">
                  <h4 className="font-bold text-success-700 mb-3">All Strengths</h4>
                  <ul className="space-y-2">
                    {results.strengths.map((strength: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex gap-2">
                        <span>✓</span> {strength}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {results.weaknesses && results.weaknesses.length > 3 && (
                <Card variant="elevated" className="border-0 p-6 bg-warning-50/50">
                  <h4 className="font-bold text-warning-700 mb-3">All Areas to Improve</h4>
                  <ul className="space-y-2">
                    {results.weaknesses.map((weakness: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex gap-2">
                        <span>•</span> {weakness}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {results.suggestions && results.suggestions.length > 3 && (
                <Card variant="elevated" className="border-0 p-6 bg-primary-50/50">
                  <h4 className="font-bold text-primary-700 mb-3">All Suggestions</h4>
                  <ul className="space-y-2">
                    {results.suggestions.map((suggestion: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex gap-2">
                        <span>→</span> {suggestion}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Button
              onClick={async () => await exportResultsToPDF(results, session)}
              size="lg"
              variant="outline"
              className="sm:flex-1 border-primary-300 text-primary-700 hover:bg-primary-50"
            >
              <Download className="w-5 h-5 mr-2" />
              📥 Download PDF
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              size="lg"
              variant="outline"
              className="sm:flex-1"
            >
              📊 Dashboard
            </Button>
            <Button
              onClick={handleRestartSession}
              size="lg"
              className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 sm:flex-1"
            >
              🚀 New Exam
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
