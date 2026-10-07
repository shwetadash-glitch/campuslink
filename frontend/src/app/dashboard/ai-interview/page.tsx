"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { aiApi, AiMessage } from "@/services/aiApi";
import { useAuth } from "@/context/AuthContext";

export default function AiInterviewPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setLoading(true);
      aiApi.chat("start", []).then((res) => {
        setMessages([res]);
        setLoading(false);
      });
    }
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: AiMessage = { role: "user", content: input.trim() };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const aiResponse = await aiApi.chat(userMsg.content, newHistory);
      setMessages([...newHistory, aiResponse]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout allowedRoles={["STUDENT"]}>
      <PageHeader
        title="AI Mock Interview"
        subtitle="Practice your technical communication skills."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-campusblue-100 shadow-sm font-serif overflow-hidden flex flex-col h-[600px] max-w-4xl mx-auto">
        {/* Chat Header */}
        <div className="p-4 border-b border-campusblue-100 bg-campusblue-50/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-campusblue-50 text-campusblue-900 flex items-center justify-center font-bold text-xl">
            ðŸ¤–
          </div>
          <div>
            <h3 className="font-bold text-campusblue-900">AI Helper</h3>
            <span className="text-xs text-campusblue-800 font-medium">Technical Interviewer</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/30">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-campusblue-50 text-campusblue-900 flex items-center justify-center mr-3 mt-1 shrink-0">
                    ðŸ¤–
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '12px 18px',
                    fontSize: '14.5px',
                    lineHeight: '1.5',
                    borderRadius: '16px',
                    borderBottomRightRadius: isUser ? '0px' : '16px',
                    borderBottomLeftRadius: !isUser ? '0px' : '16px',
                    backgroundColor: isUser ? '#2563eb' : '#ffffff',
                    color: isUser ? '#ffffff' : '#1f2937',
                    border: isUser ? 'none' : '1px solid #e5e7eb',
                    boxShadow: isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}
                />
              </div>
            );
          })}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div className="w-8 h-8 rounded-full bg-campusblue-50 text-campusblue-900 flex items-center justify-center mr-3 mt-1 shrink-0">
                ðŸ¤–
              </div>
              <div className="bg-white border border-campusblue-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center h-10">
                <div className="w-1.5 h-1.5 bg-campusblue-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-campusblue-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-campusblue-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-campusblue-100 bg-white">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer... (or 'I don't know' for hints)"
              className="flex-1 border border-campusblue-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-campusblue-500 focus:ring-1 focus:ring-campusblue-500 shadow-inner"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="shrink-0 w-12 h-12 rounded-full bg-campusblue-700 text-white flex items-center justify-center hover:bg-campusblue-800 disabled:opacity-50 transition shadow-md"
            >
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}









