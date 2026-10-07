import { apiClient } from "./apiClient";

export interface Contact {
  id: number;
  name: string;
  email: string;
  role: string;
  unread_count?: number;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export const messagesApi = {
  getContacts: () => apiClient.get<Contact[]>("/api/v1/messages/contacts"),
  getConversation: (userId: number) =>
    apiClient.get<Message[]>(`/api/v1/messages/${userId}`),
  sendMessage: (receiverId: number, content: string) =>
    apiClient.post<Message>("/api/v1/messages", { receiver_id: receiverId, content }),
};
