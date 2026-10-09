"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

export function AiNavigator() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hi! I am your AI guide. Where would you like to go today?' }
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNavigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const userText = query.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch('/api/ai-nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText, userRole: user?.role || 'STUDENT' })
      });
      const data = await res.json();
      
      if (data.message) {
        setMessages(prev => [...prev, { role: 'ai', text: data.message }]);
      }

      if (data.route) {
        setTimeout(() => {
          router.push(data.route);
        }, 1500); // Give user time to read the message before routing
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, an error occurred while routing you.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-campusblue-100 overflow-hidden transform transition-all flex flex-col h-96">
          <div className="bg-campusblue-900 text-white p-4 flex justify-between items-center shadow-md z-10">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Guide
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-campusblue-100 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-campusblue-50/30">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-campusblue-800 text-white rounded-br-sm' : 'bg-white border border-campusblue-100 text-campusblue-900 rounded-bl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-2xl bg-white border border-campusblue-100 text-campusblue-500 rounded-bl-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-campusblue-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-campusblue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                  <span className="w-2 h-2 bg-campusblue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-campusblue-100">
            <form onSubmit={handleNavigate} className="flex gap-2 relative">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where to? (e.g. readiness score)"
                className="flex-1 text-sm p-3 pr-10 border border-campusblue-200 rounded-xl focus:outline-none focus:border-campusblue-500 focus:ring-1 focus:ring-campusblue-500 bg-campusblue-50/50"
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="absolute right-2 top-2 bg-campusblue-800 text-white p-1.5 rounded-lg hover:bg-campusblue-900 disabled:opacity-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </form>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-campusblue-900 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-campusblue-800 transition-all hover:scale-105 active:scale-95 ml-auto border-2 border-white/20"
      >
        {isOpen ? (
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        )}
      </button>
    </div>
  );
}
