"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, refresh: string, userData?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If user is directly on the login or register page, do not send background token verification requests
    if (pathname === '/login' || pathname === '/register') {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      const storedToken = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      setToken(storedToken);

      try {
        const { apiClient } = await import("@/services/apiClient");
        const data = await apiClient.get<User | { data: User }>("/api/v1/auth/me");
        setUser("data" in data && data.data ? data.data : (data as User));
      } catch (err: any) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        setUser(null);
        if (err?.status && err.status !== 401) {
          console.warn('Failed to restore user session:', err?.message || err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [pathname]);

  const login = (authToken: string, refresh: string, userData?: User) => {
    localStorage.setItem('access_token', authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('refresh_token', refresh);
    setToken(authToken);
    if (userData) {
      setUser(userData);
    }
    window.location.href = '/dashboard';
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
