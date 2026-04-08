import { Card } from '@/components/ui/Card';
import { TrendingUp, Target, Zap, Clock, Award } from 'lucide-react';

interface AdvancedStatsProps {
  sessions: any[];
  user: any;
  analytics?: any;
}

export function AdvancedStats({ sessions, user, analytics }: AdvancedStatsProps) {
  const translateCompetencyLabel = (label: string) => {
    const normalized = String(label || '').trim().toLowerCase();
    const map: Record<string, string> = {
      'lessico disciplinare': 'Subject Vocabulary',
      'collegamenti': 'Concept Linking',
      'esposizione': 'Explanation Clarity',
      'completezza': 'Completeness',
      'accuratezza': 'Accuracy',
      'rigore': 'Rigor',
      'struttura': 'Structure',
      'precisione': 'Precision',
    };
    return map[normalized] || label;
  };

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
    label: translateCompetencyLabel(value.label),
    avg: value.count > 0 ? value.total / value.count : 0,
  }));

  const weakestCriterion = criterionAverages.sort((a, b) => a.avg - b.avg)[0];
  const weakTopics = analytics?.weakTopics || [];
  const competencyTimeline = analytics?.competencyTimeline || [];

  const getTimelineCellClass = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-400';
    if (score >= 8) return 'bg-success-100 text-success-700';
    if (score >= 6) return 'bg-warning-100 text-warning-700';
    return 'bg-error-100 text-error-700';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-success-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Progress</h3>
            <TrendingUp className="w-5 h-5 text-success-600" />
          </div>
          <p className="text-3xl font-bold text-success-600 mb-1">
            {improvementTrend > 0 ? '+' : ''}{improvementTrend}%
          </p>
          <p className="text-sm text-gray-600">Improvement across recent exams</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-primary-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Preferred Difficulty</h3>
            <Target className="w-5 h-5 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-primary-600 mb-1">Lvl {favoriteDifficulty}</p>
          <p className="text-sm text-gray-600">Most frequently tested level</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-warning-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Peak Score</h3>
            <Award className="w-5 h-5 text-warning-600" />
          </div>
          <p className="text-3xl font-bold text-warning-600 mb-1">{bestScore.toFixed(1)}/10</p>
          <p className="text-sm text-gray-600">Highest score achieved</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-secondary-500 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Teacher Style</h3>
            <Zap className="w-5 h-5 text-secondary-600" />
          </div>
          <p className="text-3xl font-bold text-secondary-600 mb-1">
            {strictCount > supportiveCount ? 'Strict' : 'Supportive'}
          </p>
          <p className="text-sm text-gray-600">
            {strictCount > supportiveCount 
              ? `Strict sessions: ${strictCount}` 
              : `Supportive sessions: ${supportiveCount}`}
          </p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-primary-400 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Topics Explored</h3>
            <Clock className="w-5 h-5 text-primary-400" />
          </div>
          <p className="text-3xl font-bold text-primary-400 mb-1">{topicsSet.size}</p>
          <p className="text-sm text-gray-600">Unique topics tested</p>
        </div>
      </Card>

      <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
        <div className="border-l-4 border-l-success-400 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Completed Sessions</h3>
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
            <h3 className="font-bold text-gray-900">Primary Gap</h3>
            <Target className="w-5 h-5 text-error-500" />
          </div>
          <p className="text-xl font-bold text-error-600 mb-1">
            {weakestCriterion ? weakestCriterion.label : 'Analyzing'}
          </p>
          <p className="text-sm text-gray-600">
            {weakestCriterion ? `Average ${weakestCriterion.avg.toFixed(1)}/10` : 'Complete more exams to unlock competency trends'}
          </p>
        </div>
      </Card>
      </div>

      {weakTopics.length > 0 && (
        <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Weak Topics Heatmap</h3>
            <div className="space-y-3">
              {weakTopics.slice(0, 6).map((topic: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{topic.topic}</p>
                    <p className="text-sm font-bold text-error-600">
                      {translateCompetencyLabel(topic.weakestCriterion || '') || 'Analyzing'}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
                    <span>Average: {topic.avgScore ?? '--'}/10</span>
                    <span>Exams: {topic.exams}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {competencyTimeline.length > 0 && (
        <Card className="border-0 overflow-hidden hover:shadow-lg transition-all">
          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Competency Timeline (4 weeks)</h3>
            <div className="space-y-3">
              {competencyTimeline.slice(0, 6).map((criterion: any) => (
                <div key={criterion.key} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{translateCompetencyLabel(criterion.label)}</p>
                    <p className="text-xs text-gray-500">From 4 weeks ago to today</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(criterion.weeklyScores || []).map((score: number | null, index: number) => (
                      <div
                        key={`${criterion.key}-${index}`}
                        className={`rounded-md px-2 py-2 text-center text-sm font-semibold ${getTimelineCellClass(score)}`}
                        title={`Week ${index + 1}`}
                      >
                        {score === null ? '--' : `${score.toFixed(1)}`}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
