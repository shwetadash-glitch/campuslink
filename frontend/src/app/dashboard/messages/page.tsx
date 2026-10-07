"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { messagesApi, Contact, Message } from "@/services/messagesApi";
import { useAuth } from "@/context/AuthContext";

export default function MessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts
  useEffect(() => {
    messagesApi.getContacts().then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, []);

  // Polling messages
  useEffect(() => {
    if (!activeContact) return;

    const fetchMsgs = () => {
      messagesApi.getConversation(activeContact.id).then((data) => {
        setMessages(data);
        scrollToBottom();
      });
      // Also silently update contacts to get latest unread counts
      messagesApi.getContacts().then((data) => setContacts(data));
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, [activeContact]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    const content = newMessage.trim();
    setNewMessage("");

    // Optimistic update
    const optimisticMsg: Message = {
      id: Date.now(),
      sender_id: user?.id || 0,
      receiver_id: activeContact.id,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    await messagesApi.sendMessage(activeContact.id, content);
  };

  return (
    <AppLayout allowedRoles={["STUDENT", "PLACEMENT_OFFICER", "SUPER_ADMIN"]}>
      <PageHeader
        title={user?.role === "STUDENT" ? "TPO Connect" : "Student Support / Messages"}
        subtitle="Direct real-time messaging channel."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />

      <div className="bg-white rounded-lg border border-campusblue-100 shadow-sm font-serif overflow-hidden flex h-[600px]">
        {/* Contacts Sidebar */}
        <div className="w-1/3 border-r border-campusblue-100 bg-campusblue-50/50 flex flex-col">
          <div className="p-4 border-b border-campusblue-100 bg-white">
            <h3 className="font-bold text-campusblue-900">Conversations</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-campusblue-500">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="p-4 text-sm text-campusblue-500">No contacts available.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <li
                    key={contact.id}
                    onClick={() => setActiveContact(contact)}
                    className={`p-4 cursor-pointer hover:bg-campusblue-50 transition \${
                      activeContact?.id === contact.id ? "bg-campusblue-50 border-l-4 border-campusblue-500" : ""
                    }`}
                  >
                    <div className="font-semibold text-sm text-campusblue-900 flex items-center justify-between">
                        <span>{contact.name}</span>
                        {contact.unread_count ? (
                          <span className="w-2.5 h-2.5 bg-campusblue-700 rounded-full"></span>
                        ) : null}
                      </div>
                    <div className="text-xs text-campusblue-500">{contact.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-2/3 flex flex-col bg-white">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-campusblue-100 bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-campusblue-100 text-campusblue-900 flex items-center justify-center font-bold text-lg">
                  {activeContact.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-campusblue-900">{activeContact.name}</h3>
                  <span className="text-xs text-campusblue-800 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-campusblue-500"></span> Online
                  </span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-campusblue-50/20">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-campusblue-500">
                    No messages yet. Say hi!
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = Number(msg.sender_id) === Number(user?.id);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: '8px 16px',
                            fontSize: '14px',
                            borderRadius: '16px',
                            borderBottomRightRadius: isMe ? '0px' : '16px',
                            borderBottomLeftRadius: !isMe ? '0px' : '16px',
                            backgroundColor: isMe ? '#2563eb' : '#e5e7eb',
                            color: isMe ? '#ffffff' : '#1f2937'
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-campusblue-100 bg-white">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border border-campusblue-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-campusblue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="shrink-0 w-10 h-10 rounded-full bg-campusblue-700 text-white flex items-center justify-center hover:bg-campusblue-800 disabled:opacity-50 transition"
                  >
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-campusblue-300">
              <svg className="w-16 h-16 mb-4 text-campusblue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Select a contact to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}






