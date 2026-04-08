'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiService } from '@/lib/api';

type Role = 'assistant' | 'user';

interface ChatMessage {
  role: Role;
  content: string;
}

const quickPrompts = [
  'Show me a quick demo flow',
  'What makes this better than generic chat apps?',
  'Can I use it in Italian and English?',
  'How does Free vs Pro work?',
];

export default function LandingChatbot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi, I am the Interrogo assistant. Ask me about demo, features, pricing, or launch setup in your language.',
    },
  ]);

  const conversation = useMemo(() => messages.slice(-10), [messages]);

  const sendMessage = async (rawText: string) => {
    const text = String(rawText || '').trim();
    if (!text || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const locale = typeof window !== 'undefined' ? navigator.language : 'en';
      const response = await apiService.chatWithLandingAssistant(text, conversation, locale);
      const reply = response?.reply || 'I am temporarily unavailable. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error: any) {
      const fallback = error?.response?.data?.error || 'Assistant is busy right now. Please retry in a moment.';
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="mb-3 w-[22rem] max-w-[92vw] rounded-2xl border border-primary-200 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
          <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-secondary-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">Interrogo Live Assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-white/90 hover:bg-white/20"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto px-3 py-3 space-y-2 bg-gradient-to-b from-white to-primary-50/40">
            {messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'assistant'
                    ? 'bg-white border border-gray-200 text-gray-700'
                    : 'bg-primary-600 text-white ml-8'
                }`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="rounded-xl px-3 py-2 text-sm bg-white border border-gray-200 text-gray-500">
                Thinking...
              </div>
            )}
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-gray-200 bg-white">
            <div className="mb-2 flex flex-wrap gap-2">
              {quickPrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                >
                  {prompt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className="rounded-full border border-secondary-200 bg-secondary-50 px-3 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-100"
              >
                Start demo
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about features, pricing, or tutorial"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 px-4 py-3 text-white shadow-xl transition-transform hover:scale-[1.03]"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-semibold">Live Demo Chat</span>
      </button>
    </div>
  );
}
