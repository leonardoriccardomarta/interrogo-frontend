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
  personality: 'strict' | 'supportive';
  mode?: 'STANDARD' | 'QUICK_TEST';
}

export default function InterrogoPage() {
  const router = useRouter();

  // Input phase
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState(5);
  const [personality, setPersonality] = useState<'strict' | 'supportive'>('supportive');
  const [inputMethod, setInputMethod] = useState<'text' | 'pdf'>('text');
  const [fileName, setFileName] = useState('');

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
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

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
      const response = await apiService.startSession(topic, difficulty, personality, content);
      setSession({
        id: response.sessionId,
        topic: response.topic,
        difficulty: response.difficulty,
        personality: response.personality,
        mode: 'STANDARD',
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
        const response = await apiService.sendMessage(session.id, messageToSend);
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

    const dontKnowMessage = 'Non lo so.';
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
              ← Torna al Dashboard
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">🎓 Inizia il Tuo Esame</h1>
            <p className="text-gray-600 text-lg">Prepara il tuo contenuto e configura i parametri dell'esame</p>
          </div>

          {error && (
            <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-6 text-error-700 flex items-start gap-3 animate-slide-up">
              <span className="text-xl mt-1">⚠️</span>
              <div>{error.includes('Please enter') ? 'Per favore inserisci un argomento' : error.includes('Please paste') ? 'Per favore incolla testo o carica un PDF' : error.includes('Content must') ? 'Il contenuto deve essere almeno 20 caratteri' : error}</div>
            </div>
          )}

          {/* Study Material Section */}
          <Card variant="elevated" className="mb-6 p-6 shadow-lg animate-slide-up overflow-hidden">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📚</span>
                <h2 className="text-2xl font-bold text-gray-900">1. Il Tuo Materiale di Studio</h2>
              </div>
              <p className="text-gray-600">Scegli come caricare il tuo contenuto</p>
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
                  📝 Incolla Testo
                </button>
                <button
                  onClick={() => setInputMethod('pdf')}
                  className={`flex-1 p-3 rounded-md border-2 transition-all font-medium ${
                    inputMethod === 'pdf'
                      ? 'border-primary-500 bg-white text-primary-600 shadow-md'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📄 Carica PDF
                </button>
              </div>

              {/* Content Input Area */}
              {inputMethod === 'text' ? (
                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Incolla il tuo materiale di studio qui... (minimo 20 caratteri)"
                    className="w-full h-48 p-4 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all resize-none font-mono text-sm"
                  />
                  {content && (
                    <div className="mt-3 flex items-center justify-between bg-primary-50 p-3 rounded-lg">
                      <span className="text-sm text-primary-700">
                        ✓ {content.length} caratteri caricati
                      </span>
                      {content.length < 20 && (
                        <span className="text-xs text-warning-600">
                          Servono almeno 20 caratteri
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
                        {fileName ? `✓ ${fileName}` : 'Clicca per caricare un PDF'}
                      </p>
                      <p className="text-sm text-gray-500">Max 10MB • Un file</p>
                    </label>
                  </div>
                  {content && (
                    <div className="mt-3 bg-success-50 p-3 rounded-lg text-sm text-success-700">
                      ✓ PDF elaborato: {content.length} caratteri estratti
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
                <h2 className="text-2xl font-bold text-gray-900">2. Impostazioni Esame</h2>
              </div>
              <p className="text-gray-600">Configura come vuoi essere interrogato</p>
            </div>

            <div className="space-y-6">
              {/* Topic Input */}
              <Input
                label="📖 Argomento/Materia"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="es. Storia del Rinascimento Italiano, Fisica Quantistica, ecc."
              />

              {/* Difficulty Slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    ⚡ Livello di Difficoltà
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
                    <span>Facile</span>
                    <span>Difficile</span>
                  </div>
                </div>
              </div>

              {/* Teacher Personality */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">
                  👨‍🏫 Personalità del Professore
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPersonality('strict')}
                    className={`p-4 rounded-lg border-2 transition-all font-medium ${
                      personality === 'strict'
                        ? 'border-error-500 bg-error-50 text-error-700 shadow-md'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">😤</div>
                    <div>Rigoroso</div>
                    <div className="text-xs text-gray-600 mt-1">Esigente e severo</div>
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
                    <div>Incoraggiante</div>
                    <div className="text-xs text-gray-600 mt-1">Supportivo e paziente</div>
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
                Annulla
              </Button>
              <Button
                fullWidth={true}
                isLoading={isLoading}
                onClick={handleStartSession}
                size="lg"
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
              >
                🚀 Inizia Interrogazione
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
              ← Torna al Dashboard
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {session.topic}
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>⚡ Livello {session.difficulty}/10</span>
                  <span>•</span>
                  <span>{session.personality === 'strict' ? '😤 Professore Rigoroso' : '😊 Professore Incoraggiante'}</span>
                </div>
                {isQuickTestMode && (
                  <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-primary-700">
                      <span>⚡ Prova Veloce</span>
                      <span>Domanda {quickTestCurrentQuestion}/3</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-primary-100">
                      <div
                        className="h-2 rounded-full bg-primary-600 transition-all duration-300"
                        style={{ width: `${quickTestProgress}%` }}
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
                Termina Esame
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
                  placeholder="Digita la tua risposta... (Premi Invio per inviare, Shift+Invio per nuova riga)"
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
                  Non lo so
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
            <p>💡 Consiglio: Dai risposte dettagliate per migliori feedback</p>
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
            <h1 className="text-5xl font-bold text-gray-900 mb-3">Esame Completato!</h1>
            <p className="text-xl text-gray-600">Ecco il tuo rapporto di valutazione dettagliato</p>
          </div>

          {/* Main Score Card */}
          <Card
            variant="elevated"
            className="mb-12 p-12 text-center bg-gradient-to-br from-primary-50 to-success-50 border-0 shadow-xl animate-slide-up overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-100/20 to-success-100/20 opacity-0 hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
                <p className="text-gray-600 text-lg mb-3">Il Tuo Voto</p>
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
                  {results.score >= 8 && '🏆 Prestazione Eccellente!'}
                  {results.score >= 6 && results.score < 8 && '👍 Buon Lavoro!'}
                  {results.score < 6 && '💪 Continua a Praticare!'}
                </p>
              </div>
            </div>
          </Card>

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
                    <h3 className="text-xl font-bold text-success-700">Punti di Forza</h3>
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
                    <h3 className="text-xl font-bold text-warning-700">Aree da Migliorare</h3>
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
                    <h3 className="text-xl font-bold text-primary-700">Suggerimenti</h3>
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
              📥 Scarica PDF
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              size="lg"
              variant="outline"
              className="sm:flex-1"
            >
              📊 Bacheca
            </Button>
            <Button
              onClick={handleRestartSession}
              size="lg"
              className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 sm:flex-1"
            >
              🚀 Nuovo Esame
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
