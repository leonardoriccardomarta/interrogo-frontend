import { Card } from '@/components/ui/Card';
import { TrendingUp, Target, Zap, Clock, Award } from 'lucide-react';

interface AdvancedStatsProps {
  sessions: any[];
  user: any;
}

export function AdvancedStats({ sessions, user }: AdvancedStatsProps) {
  const totalExams = sessions.length;
  const completedExams = sessions.filter(s => s.finalScore !== null).length;
  const avgScore = completedExams > 0
    ? (sessions.reduce((acc, s) => acc + (s.finalScore || 0), 0) / completedExams).toFixed(1)
    : 0;

  const lastFiveScores = sessions
    .filter(s => s.finalScore !== null)
    .slice(0, 5)
    .map(s => s.finalScore);
  
  const newestScore = lastFiveScores[0] || 0;
  const oldestScore = lastFiveScores[lastFiveScores.length - 1] || 0;
  const baseline = Math.max(1, oldestScore);
  const improvementTrend = lastFiveScores.length >= 2
    ? parseFloat((((newestScore - oldestScore) / baseline) * 100).toFixed(1))
    : 0;

  const difficultyStats: Record<number, number> = {};
  sessions.forEach(s => {
    difficultyStats[s.difficulty] = (difficultyStats[s.difficulty] || 0) + 1;
  });
  const favoriteDifficulty = Object.entries(difficultyStats).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

  const strictCount = sessions.filter(s => s.personality === 'strict').length;
  const supportiveCount = sessions.filter(s => s.personality === 'supportive').length;
  const topicsSet = new Set(sessions.map(s => s.topic));
  const bestScore = Math.max(...sessions.filter(s => s.finalScore).map(s => s.finalScore || 0), 0);

  const criterionBuckets: Record<string, { label: string; total: number; count: number }> = {};
  sessions.forEach((s) => {
    if (!s.finalFeedback) return;
    try {
      const feedback = JSON.parse(s.finalFeedback);
      const criteria = feedback?.rubric?.criteria || [];
      criteria.forEach((c: any) => {
        if (!c?.key || typeof c?.score !== 'number') return;
        if (!criterionBuckets[c.key]) {
          criterionBuckets[c.key] = { label: c.label || c.key, total: 0, count: 0 };
        }
        criterionBuckets[c.key].total += c.score;
        criterionBuckets[c.key].count += 1;
      });
    } catch {
      // Ignore malformed historical feedback entries
    }
  });

  const criterionAverages = Object.entries(criterionBuckets).map(([key, value]) => ({
    key,
    label: value.label,
    avg: value.count > 0 ? value.total / value.count : 0,
  }));

  const weakestCriterion = criterionAverages.sort((a, b) => a.avg - b.avg)[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-success-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Progresso</h3>
            <TrendingUp className="w-5 h-5 text-success-600" />
          </div>
          <p className="text-3xl font-bold text-success-600 mb-1">
            {improvementTrend > 0 ? '+' : ''}{improvementTrend}%
          </p>
          <p className="text-sm text-gray-600">Miglioramento ultimi esami</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-primary-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Preferito</h3>
            <Target className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-primary-600 mb-1">Lvl {favoriteDifficulty}</p>
          <p className="text-sm text-gray-600">Difficoltà più testata</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-warning-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Massimo</h3>
            <Award className="w-5 h-5 text-warning-600" />
          </div>
          <p className="text-3xl font-bold text-warning-600 mb-1">{bestScore.toFixed(1)}/10</p>
          <p className="text-sm text-gray-600">Miglior voto ottenuto</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-secondary-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Professore</h3>
            <Zap className="w-5 h-5 text-secondary-600" />
          </div>
          <p className="text-3xl font-bold text-secondary-600 mb-1">
            {strictCount > supportiveCount ? '😤' : '😊'}
          </p>
          <p className="text-sm text-gray-600">
            {strictCount > supportiveCount 
              ? `Rigoroso: ${strictCount}` 
              : `Incoraggiante: ${supportiveCount}`}
          </p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-primary-400 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Argomenti</h3>
            <Clock className="w-5 h-5 text-primary-400" />
          </div>
          <p className="text-3xl font-bold text-primary-400 mb-1">{topicsSet.size}</p>
          <p className="text-sm text-gray-600">Argomenti diversi testati</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-success-400 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Completati</h3>
            <Award className="w-5 h-5 text-success-400" />
          </div>
          <p className="text-3xl font-bold text-success-400 mb-1">
            {totalExams > 0 ? ((completedExams / totalExams) * 100).toFixed(0) : 0}%
          </p>
          <p className="text-sm text-gray-600">{completedExams}/{totalExams}</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-error-400 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Gap Principale</h3>
            <Target className="w-5 h-5 text-error-500" />
          </div>
          <p className="text-xl font-bold text-error-600 mb-1">
            {weakestCriterion ? weakestCriterion.label : 'In analisi'}
          </p>
          <p className="text-sm text-gray-600">
            {weakestCriterion ? `Media ${weakestCriterion.avg.toFixed(1)}/10` : 'Completa più esami per avere trend competenze'}
          </p>
        </div>
      </Card>
    </div>
  );
}
