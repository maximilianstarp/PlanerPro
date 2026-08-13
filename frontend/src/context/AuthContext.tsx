"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '@/lib/axios';
import type { AuthUser } from '@/types';

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const res = await axios.post('/api/login', credentials);
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout');
      setUser(null);
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
