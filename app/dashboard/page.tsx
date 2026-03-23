'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LogOut, Plus, Zap, TrendingUp, Clock, Trophy, Zap as Lightning, Sparkles, BookOpen, X } from 'lucide-react';
import { apiService } from '@/lib/api';
import { AdvancedStats } from '@/components/dashboard/AdvancedStats';

interface Session {
  id: string;
  topic: string;
  difficulty: number;
  personality: string;
  finalScore: number | null;
  createdAt: string;
  endedAt: string | null;
  studentAnswerCount?: number;
  teacherQuestionCount?: number;
  _count: {
    messages: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isQuickTestLoading, setIsQuickTestLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [retentionPolicy, setRetentionPolicy] = useState<any>(null);
  const [slaSnapshot, setSlaSnapshot] = useState<any>(null);
  const [isQuickTestModalOpen, setIsQuickTestModalOpen] = useState(false);
  const [quickTestTopic, setQuickTestTopic] = useState('');
  const [quickTestDifficulty, setQuickTestDifficulty] = useState(5);
  const [quickTestPersonality, setQuickTestPersonality] = useState<'strict' | 'supportive' | 'socratic'>('supportive');

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const [userData, sessionsData] = await Promise.all([
          apiService.getCurrentUser(),
          apiService.getUserSessions(),
        ]);

        setUser(userData);
        setSessions(sessionsData);

        try {
          const analyticsData = await apiService.getAnalyticsOverview();
          setAnalytics(analyticsData);
        } catch (analyticsError) {
          console.warn('Analytics unavailable:', analyticsError);
        }

        try {
          const [policy, sla] = await Promise.all([
            apiService.getRetentionPolicy(),
            apiService.getSlaSnapshot(),
          ]);
          setRetentionPolicy(policy);
          setSlaSnapshot(sla);
        } catch (governanceError) {
          console.warn('Governance snapshot unavailable:', governanceError);
        }
      } catch (err: any) {
        setError('Failed to load dashboard');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  const handleQuickTest = async () => {
    setIsQuickTestModalOpen(true);
  };

  const handleStartQuickTest = async () => {
    if (!quickTestTopic.trim()) {
      setError('Inserisci un argomento per la prova veloce');
      return;
    }

    try {
      setIsQuickTestLoading(true);
      const response = await apiService.startQuickTest(quickTestTopic.trim(), quickTestDifficulty, quickTestPersonality);
      
      if (response.sessionId) {
        // Salva session info
        localStorage.setItem('quick_test_session_id', response.sessionId);
        setIsQuickTestModalOpen(false);
        setQuickTestTopic('');
        router.push('/interrogo');
      }
    } catch (err: any) {
      console.error('Quick test error:', err);
      setError('Errore nell\'avvio della prova veloce');
    } finally {
      setIsQuickTestLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-100 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary-200 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Calculate stats
  const totalExams = sessions.length;
  const completedExams = sessions.filter((s) => s.finalScore !== null).length;
  const avgScore =
    completedExams > 0
      ? (sessions.reduce((acc, s) => acc + (s.finalScore || 0), 0) / completedExams).toFixed(1)
      : 0;
  const totalStudentAnswers = sessions.reduce(
    (acc, s) => acc + (s.studentAnswerCount ?? Math.floor(s._count.messages / 2)),
    0
  );
  const avgResponseTime = analytics?.kpis?.avgResponseTimeSeconds;
  const dontKnowRate = analytics?.kpis?.dontKnowRate ?? 0;
  const latestWeeklyScore = analytics?.weeklyTrend?.length
    ? analytics.weeklyTrend[analytics.weeklyTrend.length - 1]?.avgScore
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-100 p-4 md:p-8 relative overflow-hidden">
      {/* Background animated blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary-200 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 animate-slide-up">
          <Card className="border-0 bg-gradient-to-r from-white/95 via-primary-50 to-secondary-50 shadow-xl p-6 md:p-8">
            <div className="flex justify-between items-start gap-6 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-3">
                  <Sparkles className="w-3 h-3" />
                  Learning Command Center
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                  🎓 Il Tuo Dashboard
                </h1>
                <p className="text-gray-600 text-lg">
                  Bentornato, <span className="font-semibold">{user?.firstName || user?.email || 'Studente'}</span>! Qui controlli progresso, KPI e prossime mosse.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap justify-end">
              {user?.role === 'tutor' && (
                <Button
                  onClick={() => router.push('/teacher')}
                  size="lg"
                  variant="outline"
                  className="border-primary-300 text-primary-700 hover:bg-primary-50"
                >
                  🏫 Vista Docente
                </Button>
              )}
              <Button
                onClick={() => router.push('/interrogo')}
                size="lg"
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nuovo Esame
              </Button>
              <Button
                onClick={handleQuickTest}
                disabled={isQuickTestLoading}
                size="lg"
                className="bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800 text-white"
              >
                <Lightning className="w-5 h-5 mr-2" />
                ⚡ Prova Veloce
              </Button>
              <Button variant="outline" onClick={handleLogout} size="lg">
                <LogOut className="w-5 h-5 mr-2" />
                Esci
              </Button>
              </div>
            </div>
          </Card>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 bg-white/85 shadow-md p-4 hover:shadow-lg transition-all">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Focus consigliato</p>
                  <p className="text-xs text-gray-600">Ripasso mirato su gap principali</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 bg-white/85 shadow-md p-4 hover:shadow-lg transition-all" style={{ animationDelay: '0.06s' }}>
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-secondary-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Modalità top</p>
                  <p className="text-xs text-gray-600">Extended/Deep per simulazioni realistiche</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 bg-white/85 shadow-md p-4 hover:shadow-lg transition-all" style={{ animationDelay: '0.12s' }}>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-success-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Obiettivo settimana</p>
                  <p className="text-xs text-gray-600">Aumenta copertura fonte oltre il 40%</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-8 text-error-700 flex items-start gap-3 animate-slide-up">
            <span className="text-xl mt-1">⚠️</span>
            <div>{error === 'Failed to load dashboard' ? 'Errore nel caricamento del dashboard' : error}</div>
          </div>
        )}

        {/* Stats Cards */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-slide-up">
            {/* Total Exams Card */}
            <Card
              variant="elevated"
              className="bg-gradient-to-br from-primary-50 to-primary-100/50 border-0 overflow-hidden group hover:shadow-lg transition-all"
            >
              <div className="p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-600 font-medium">Esami Totali</h3>
                    <Trophy className="w-5 h-5 text-primary-600" />
                  </div>
                  <p className="text-3xl font-bold text-primary-700">{totalExams}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {completedExams} completati
                  </p>
                </div>
              </div>
            </Card>

            {/* Average Score Card */}
            <Card
              variant="elevated"
              className="bg-gradient-to-br from-success-50 to-success-100/50 border-0 overflow-hidden group hover:shadow-lg transition-all"
            >
              <div className="p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-success-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-600 font-medium">Voto Medio</h3>
                    <TrendingUp className="w-5 h-5 text-success-600" />
                  </div>
                  <p className="text-3xl font-bold text-success-700">{avgScore}/10</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {completedExams > 0 ? 'Basato su ' + completedExams + ' esame/i' : 'Nessun esame completato'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Questions Card */}
            <Card
              variant="elevated"
              className="bg-gradient-to-br from-secondary-50 to-secondary-100/50 border-0 overflow-hidden group hover:shadow-lg transition-all"
            >
              <div className="p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-600 font-medium">Risposte Date</h3>
                    <Zap className="w-5 h-5 text-secondary-600" />
                  </div>
                  <p className="text-3xl font-bold text-secondary-700">{totalStudentAnswers}</p>
                  <p className="text-sm text-gray-600 mt-2">Messaggi studente</p>
                </div>
              </div>
            </Card>

            {/* Exam Streak Card */}
            <Card
              variant="elevated"
              className="bg-gradient-to-br from-warning-50 to-warning-100/50 border-0 overflow-hidden group hover:shadow-lg transition-all"
            >
              <div className="p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-warning-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-600 font-medium">Sequenza</h3>
                    <Clock className="w-5 h-5 text-warning-600" />
                  </div>
                  <p className="text-3xl font-bold text-warning-700">Bravissimo!</p>
                  <p className="text-sm text-gray-600 mt-2">Take another exam</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-slide-up">
            <Card variant="elevated" className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50">
              <div className="p-6">
                <h3 className="text-gray-600 font-medium mb-2">Tempo Medio Risposta AI</h3>
                <p className="text-3xl font-bold text-blue-700">{avgResponseTime ?? '--'}s</p>
                <p className="text-sm text-gray-600 mt-2">SLA percepita durante l'orale</p>
              </div>
            </Card>

            <Card variant="elevated" className="border-0 bg-gradient-to-br from-rose-50 to-rose-100/50">
              <div className="p-6">
                <h3 className="text-gray-600 font-medium mb-2">Tasso "Non lo so"</h3>
                <p className="text-3xl font-bold text-rose-700">{(dontKnowRate * 100).toFixed(0)}%</p>
                <p className="text-sm text-gray-600 mt-2">Indicatore sicurezza espositiva</p>
              </div>
            </Card>

            <Card variant="elevated" className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
              <div className="p-6">
                <h3 className="text-gray-600 font-medium mb-2">Trend 4 Settimane</h3>
                <p className="text-3xl font-bold text-emerald-700">{latestWeeklyScore ?? '--'}/10</p>
                <p className="text-sm text-gray-600 mt-2">Ultima media settimanale</p>
              </div>
            </Card>
          </div>
        )}

        {(retentionPolicy || slaSnapshot) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-slide-up">
            {retentionPolicy && (
              <Card variant="elevated" className="border-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50">
                <div className="p-6">
                  <h3 className="text-gray-600 font-medium mb-2">Privacy & Retention</h3>
                  <p className="text-2xl font-bold text-indigo-700">{retentionPolicy.sessionRetentionDays} giorni</p>
                  <p className="text-sm text-gray-600 mt-2">Conservazione sessioni didattiche</p>
                </div>
              </Card>
            )}
            {slaSnapshot && (
              <Card variant="elevated" className="border-0 bg-gradient-to-br from-teal-50 to-teal-100/50">
                <div className="p-6">
                  <h3 className="text-gray-600 font-medium mb-2">SLA Snapshot</h3>
                  <p className="text-2xl font-bold text-teal-700">{(Number(slaSnapshot.successRate || 0) * 100).toFixed(1)}%</p>
                  <p className="text-sm text-gray-600 mt-2">Success rate API da ultimo avvio</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Advanced Statistics Section */}
        {sessions.length > 0 && (
          <div className="mb-12 animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Statistiche Avanzate</h2>
            <AdvancedStats sessions={sessions} user={user} analytics={analytics} />
          </div>
        )}

        {/* Recent Exams Section */}
        <div className="animate-slide-up">
          {sessions.length === 0 ? (
            <Card
              variant="elevated"
              className="text-center py-16 bg-gradient-to-br from-primary-50/50 to-secondary-50/50 border border-gray-200/50 shadow-lg"
            >
              <div className="mb-6">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Exams Yet</h2>
                <p className="text-gray-600 mb-8">
                  Inizia la tua prima interrogazione per avviare il percorso di miglioramento.
                </p>
              </div>
              <Button
                onClick={() => router.push('/interrogo')}
                size="lg"
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
              >
                <Zap className="w-5 h-5 mr-2" />
                Fai la tua prima interrogazione
              </Button>
            </Card>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Interrogazioni Recenti</h2>
              <div className="space-y-4">
                {sessions.map((session, idx) => (
                  <Card
                    key={session.id}
                    variant="elevated"
                    className="cursor-pointer hover:shadow-xl transition-all transform hover:scale-102 border-0 overflow-hidden group"
                    onClick={() => router.push(`/interrogo?sessionId=${session.id}`)}
                  >
                    <div className="p-6 flex items-start justify-between">
                      {/* Left Section - Session Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {session.topic}
                          </h3>
                          <span className="text-sm px-3 py-1 rounded-full bg-primary-100 text-primary-700 font-medium">
                            {session.personality === 'strict' ? '😤 Strict' : '😊 Supportive'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            📅 {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            💬 {session.studentAnswerCount ?? Math.floor(session._count.messages / 2)} risposte
                          </span>
                          <span className="flex items-center gap-1">
                            ⚡ Level {session.difficulty}/10
                          </span>
                        </div>
                        {session.finalScore === null && (
                          <div className="inline-block">
                            <span className="text-sm px-3 py-1 rounded-full bg-warning-100 text-warning-700 font-medium">
                              ⏳ In Progress
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right Section - Score */}
                      {session.finalScore !== null ? (
                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">Score</p>
                          <div className="text-4xl font-bold">
                            <span
                              className={
                                session.finalScore >= 8
                                  ? 'text-success-600'
                                  : session.finalScore >= 6
                                    ? 'text-warning-600'
                                    : 'text-error-600'
                              }
                            >
                              {session.finalScore.toFixed(1)}
                            </span>
                            <span className="text-gray-400 text-lg">/10</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {session.finalScore >= 8
                              ? '🎉 Excellent'
                              : session.finalScore >= 6
                                ? '👍 Good'
                                : '💪 Keep going'}
                          </p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-warning-200 to-warning-300 flex items-center justify-center">
                            <div className="animate-spin text-warning-600">
                              <Zap className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress bar for in-progress exams */}
                    {session.finalScore === null && (
                      <div className="h-1 bg-gradient-to-r from-primary-200 to-secondary-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isQuickTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl border-0 shadow-2xl animate-slide-up">
            <div className="p-6 md:p-7">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">⚡ Avvia Prova Veloce</h3>
                  <p className="text-sm text-gray-600 mt-1">Setup rapido, look professionale, risultato immediato.</p>
                </div>
                <button
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  onClick={() => {
                    setIsQuickTestModalOpen(false);
                    setQuickTestTopic('');
                  }}
                  aria-label="Chiudi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                <Input
                  label="Argomento"
                  value={quickTestTopic}
                  onChange={(e) => setQuickTestTopic(e.target.value)}
                  placeholder="es. Moto uniformemente accelerato"
                />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Difficoltà</label>
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-700">{quickTestDifficulty}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={quickTestDifficulty}
                    onChange={(e) => setQuickTestDifficulty(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Personalità docente</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'supportive', label: '😊 Supportivo' },
                      { key: 'strict', label: '😤 Rigoroso' },
                      { key: 'socratic', label: '🧠 Socratico' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setQuickTestPersonality(opt.key)}
                        className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                          quickTestPersonality === opt.key
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  fullWidth={true}
                  onClick={() => setIsQuickTestModalOpen(false)}
                >
                  Annulla
                </Button>
                <Button
                  fullWidth={true}
                  isLoading={isQuickTestLoading}
                  onClick={handleStartQuickTest}
                  className="bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800"
                >
                  Inizia Prova Veloce
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
