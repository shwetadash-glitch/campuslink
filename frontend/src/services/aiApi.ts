import { apiClient } from "./apiClient";

export interface AiMessage {
  role: "user" | "ai";
  content: string;
}

export const aiApi = {
  chat: (message: string, sessionHistory: AiMessage[]) =>
    apiClient.post<AiMessage>("/api/v1/ai-interview/chat", {
      message,
      session_history: sessionHistory,
    }),
};
