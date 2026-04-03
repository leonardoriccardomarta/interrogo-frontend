'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Download, BarChart3, Users, AlertTriangle } from 'lucide-react';
import { apiService } from '@/lib/api';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [moderationAudit, setModerationAudit] = useState<any>(null);
  const [slaAlerts, setSlaAlerts] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const user = await apiService.getCurrentUser();
        if (!['tutor', 'admin'].includes(String(user?.role || ''))) {
          setError('Teacher access only. Select tutor role during signup or update your account role.');
          setIsLoading(false);
          return;
        }

        const [overview, audit, alerts] = await Promise.all([
          apiService.getTeacherOverview(),
          apiService.getModerationAudit(),
          apiService.getSlaAlerts(),
        ]);
        setData(overview);
        setModerationAudit(audit);
        setSlaAlerts(alerts);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Unable to load teacher dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router]);

  const handleExport = async () => {
    try {
      const blob = await apiService.getTeacherReportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teacher-report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Report export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">🏫 Teacher Dashboard</h1>
            <p className="text-gray-600">Class view, at-risk students, and critical topics.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to dashboard</Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV Report
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border border-error-200 bg-error-50 p-4 text-error-700">
            {error}
          </Card>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="p-6 border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">Total Students</p>
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-primary-700">{data.kpis?.totalStudents ?? 0}</p>
              </Card>
              <Card className="p-6 border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">Total Sessions</p>
                  <BarChart3 className="w-5 h-5 text-secondary-600" />
                </div>
                <p className="text-3xl font-bold text-secondary-700">{data.kpis?.totalSessions ?? 0}</p>
              </Card>
              <Card className="p-6 border-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">"I don't know" rate</p>
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                </div>
                <p className="text-3xl font-bold text-warning-700">{Math.round((data.kpis?.dontKnowRate ?? 0) * 100)}%</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="p-6 border-0">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Moderation Audit</h2>
                <p className="text-sm text-gray-600 mb-4">Recorded content-blocking events.</p>
                <p className="text-3xl font-bold text-rose-700 mb-3">{moderationAudit?.total ?? 0}</p>
                <div className="space-y-2 text-xs text-gray-600 max-h-40 overflow-auto">
                  {(moderationAudit?.recent || []).slice(0, 5).map((evt: any, idx: number) => (
                    <div key={idx} className="rounded border border-gray-200 p-2">
                      <p className="font-semibold text-gray-800">{evt.endpoint} • {evt.level}</p>
                      <p>{(evt.matches || []).map((m: any) => m.key).join(', ') || 'n/a'}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 border-0">
                <h2 className="text-xl font-bold text-gray-900 mb-3">SLA Alerts</h2>
                <p className="text-sm text-gray-600 mb-4">Current operational monitoring status.</p>
                {(slaAlerts?.alerts || []).length === 0 ? (
                  <p className="text-lg font-semibold text-emerald-700">No active alerts</p>
                ) : (
                  <div className="space-y-2">
                    {(slaAlerts?.alerts || []).map((alert: any) => (
                      <div key={alert.code} className="rounded border border-warning-200 bg-warning-50 p-2 text-warning-800 text-sm">
                        <p className="font-semibold">{alert.code}</p>
                        <p>{alert.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6 border-0">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Classes (real profile)</h2>
                <div className="space-y-3">
                  {(data.classOverview || []).map((row: any) => (
                    <div key={row.className} className="rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{row.className}</p>
                        <p className="text-sm text-gray-600">{row.organization} • {row.students} students • {row.sessions} sessions</p>
                      </div>
                      <p className="font-bold text-primary-700">{row.avgScore ?? '--'}/10</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 border-0">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Weakest topics</h2>
                <div className="space-y-3">
                  {(data.weakTopics || []).slice(0, 10).map((topic: any, idx: number) => (
                    <div key={`${topic.topic}-${idx}`} className="rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{topic.topic}</p>
                        <p className="text-sm text-gray-600">{topic.exams} exams</p>
                      </div>
                      <p className="font-bold text-error-600">{topic.avgScore ?? '--'}/10</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6 border-0">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Students needing support (sorted by average)</h2>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-4">Student</th>
                      <th className="py-2 pr-4">Class</th>
                      <th className="py-2 pr-4">Average</th>
                      <th className="py-2 pr-4">Exams</th>
                      <th className="py-2 pr-4">"I don't know"</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.students || []).slice(0, 30).map((s: any) => (
                      <tr key={s.studentEmail} className="border-b border-gray-100">
                        <td className="py-2 pr-4">
                          <p className="font-medium text-gray-900">{s.studentName}</p>
                          <p className="text-gray-500">{s.studentEmail}</p>
                        </td>
                        <td className="py-2 pr-4">{s.className}</td>
                        <td className="py-2 pr-4 font-semibold text-primary-700">{s.avgScore ?? '--'}</td>
                        <td className="py-2 pr-4">{s.exams}</td>
                        <td className="py-2 pr-4">{Math.round((s.dontKnowRate ?? 0) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
