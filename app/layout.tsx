import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './css/style.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Interrogo AI - Italian Oral Exam Simulator',
  description: 'Practice Italian oral exams with AI-powered feedback',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-secondary-50 font-sans antialiased tracking-tight text-gray-900">
        {children}
      </body>
    </html>
  );
}
