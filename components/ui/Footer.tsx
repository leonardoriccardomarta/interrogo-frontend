'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200 bg-white py-8 md:py-12">
      <div className="container-max">
        <div className="grid gap-8 md:grid-cols-3 mb-8">
          {/* Brand */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-primary-600">🎓 Interrogo</h3>
            <p className="text-sm text-gray-600">
              Master Italian oral exams with AI-powered feedback and practice.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Product</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/dashboard" className="text-gray-600 hover:text-primary-600 transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/interrogo" className="text-gray-600 hover:text-primary-600 transition">
                  Start Exam
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Legal</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-primary-600 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-primary-600 transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-500">© 2026 Interrogo AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
