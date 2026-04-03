'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Header, Footer } from '@/components/ui';
import { BookOpen, Brain, TrendingUp, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiService } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const user = await apiService.getCurrentUser();
          setIsAuthenticated(!!user);
        }
      } catch (error) {
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <Header showHome={!isAuthenticated} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pb-28 px-4 overflow-hidden">
          {/* Background Gradient Blobs */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/3 w-96 h-96 bg-primary-200 rounded-full blur-3xl opacity-20 animate-float"></div>
            <div className="absolute top-40 right-1/4 w-80 h-80 bg-secondary-200 rounded-full blur-3xl opacity-10 animate-pulse"></div>
          </div>

          <div className="container-max text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100/50 border border-primary-200/80">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-semibold text-primary-700">AI-Powered Oral Exam Training</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-slide-up">
              Master Your
              <br />
              <span className="text-gradient">Oral Exams</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Practice with an AI teacher. Get real-time feedback, identify strengths, and improve weak points with personalized practice sessions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {!isAuthenticated ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => router.push('/signup')}
                    className="gap-2"
                  >
                    Start Free <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push('/login')}
                  >
                    Login
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => router.push('/interrogo')}
                    className="gap-2"
                  >
                    Start Exam <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push('/dashboard')}
                  >
                    Dashboard
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section-padding bg-gradient-to-b from-gray-50 to-white">
          <div className="container-max">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Powerful Features
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to improve oral exam performance
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: BookOpen,
                  title: 'Custom Topics',
                  description: 'Upload any PDF or text. Practice directly on your own study material.',
                  color: 'from-primary-500 to-primary-600',
                },
                {
                  icon: Brain,
                  title: 'Smart AI Teacher',
                  description: 'An advanced AI teacher that adapts question difficulty to your current level.',
                  color: 'from-secondary-500 to-secondary-600',
                },
                {
                  icon: TrendingUp,
                  title: 'Detailed Feedback',
                  description: 'Receive full scoring, strengths, and specific improvement areas after each session.',
                  color: 'from-success-500 to-success-600',
                },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <Card key={idx} variant="elevated" size="lg" className="hover:shadow-xl transition-shadow">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="section-padding">
          <div className="container-max">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600">
                Simple, effective, and practical
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                { num: '1', title: 'Upload Content', description: 'Paste text or upload a PDF for your topic' },
                { num: '2', title: 'Set Options', description: 'Choose difficulty and teacher personality' },
                { num: '3', title: 'Practice', description: 'Answer AI questions naturally and progressively' },
                { num: '4', title: 'Get Score', description: 'Receive detailed evaluation and next steps' },
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 border-2 border-primary-200 flex items-center justify-center mx-auto mb-6 shadow-md">
                      <span className="text-2xl font-bold text-primary-600">{step.num}</span>
                    </div>
                    <p className="font-bold text-lg text-gray-900 mb-2">{step.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                  {idx < 3 && (
                    <div className="hidden md:block absolute top-8 -right-4 text-primary-300">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="section-padding bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
          {/* Gradient blob background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="container-max relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 text-center">
              Why Choose Interrogo?
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                'Unlimited practice sessions',
                'Adaptive difficulty based on your progress',
                'Actionable feedback after every exam',
                'Track improvement across sessions',
                'Practice anywhere on any device',
                'Consistent and structured teacher behavior',
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                  <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-white mt-0.5" />
                  <span className="text-lg text-white">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="section-padding bg-gradient-to-b from-white to-gray-50">
          <div className="container-max text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Ready to Level Up Your Oral Exams?
              </h2>
              <p className="text-xl text-gray-600 mb-10">
                Join students improving exam performance with realistic oral simulations.
              </p>

              {!isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={() => router.push('/signup')}
                  className="gap-2"
                >
                  Start Free <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => router.push('/interrogo')}
                  className="gap-2"
                >
                  Start Your First Exam <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
