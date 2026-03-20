'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header({ showHome = false }: { showHome?: boolean }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-2 z-30 w-full md:top-6">
      <div className="container-max">
        <div className="relative flex h-14 items-center justify-between gap-3 rounded-2xl bg-white px-3 shadow-lg shadow-black/[0.03] backdrop-blur-sm border border-gray-200/50">
          {/* Site branding */}
          <div className="flex flex-1 items-center shrink-0">
            <button
              onClick={() => router.push('/')}
              className="text-lg font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
              🎓 Interrogo
            </button>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex flex-1 items-center justify-end gap-3">
            {!showHome && (
              <Link
                href="/dashboard"
                className="btn-sm bg-white text-gray-800 shadow-sm hover:bg-gray-50 border border-gray-200"
              >
                Dashboard
              </Link>
            )}
            {showHome ? (
              <Link
                href="/"
                className="btn-sm bg-gray-800 text-gray-200 shadow-sm hover:bg-gray-900"
              >
                Home
              </Link>
            ) : (
              <>
                <Link
                  href="/interrogo"
                  className="btn-sm bg-white text-gray-800 shadow-sm hover:bg-gray-50 border border-gray-200"
                >
                  Start Exam
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('auth_token');
                    router.push('/login');
                  }}
                  className="btn-sm bg-primary-600 text-white shadow-sm hover:bg-primary-700"
                >
                  Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-50"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="mt-2 rounded-2xl bg-white border border-gray-200/50 shadow-lg md:hidden">
            <div className="p-4 space-y-3">
              {!showHome && (
                <Link
                  href="/dashboard"
                  className="block w-full py-2 px-4 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
              )}
              {!showHome && (
                <Link
                  href="/interrogo"
                  className="block w-full py-2 px-4 text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Start Exam
                </Link>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  router.push('/login');
                  setMobileMenuOpen(false);
                }}
                className="block w-full py-2 px-4 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
