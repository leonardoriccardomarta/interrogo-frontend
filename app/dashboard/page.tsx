'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LogOut, Plus, Zap, TrendingUp, Clock, Trophy, Zap as Lightning } from 'lucide-react';
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
    const topic = prompt('📚 Inserisci l\'argomento per la prova veloce (3 domande):');
    if (!topic) return;

    try {
      setIsQuickTestLoading(true);
      const response = await apiService.startQuickTest(topic, 5, 'supportive');
      
      if (response.sessionId) {
        // Salva session info
        localStorage.setItem('quick_test_session_id', response.sessionId);
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
  const totalMessages = sessions.reduce((acc, s) => acc + s._count.messages, 0);

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
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                🎓 Il Tuo Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Bentornato, <span className="font-semibold">{user?.firstName || user?.email || 'Studente'}</span>!
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-end">
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
                variant="outline"
                className="border-secondary-300 text-secondary-700 hover:bg-secondary-50"
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
                    <h3 className="text-gray-600 font-medium">Domande Risposte</h3>
                    <Zap className="w-5 h-5 text-secondary-600" />
                  </div>
                  <p className="text-3xl font-bold text-secondary-700">{totalMessages}</p>
                  <p className="text-sm text-gray-600 mt-2">Interazioni totali</p>
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

        {/* Advanced Statistics Section */}
        {sessions.length > 0 && (
          <div className="mb-12 animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Statistiche Avanzate</h2>
            <AdvancedStats sessions={sessions} user={user} />
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
                  Start your first exam to begin improving your knowledge!
                </p>
              </div>
              <Button
                onClick={() => router.push('/interrogo')}
                size="lg"
                className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
              >
                <Zap className="w-5 h-5 mr-2" />
                Take Your First Exam
              </Button>
            </Card>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Exams</h2>
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
                            💬 {session._count.messages} messages
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
    </div>
  );
}
