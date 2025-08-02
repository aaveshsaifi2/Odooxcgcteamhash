'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('civictrack_token');
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await api.post('/auth/verify', { token: tokenToVerify });
      if (response.data.valid) {
        setUser(response.data.user);
        setToken(tokenToVerify);
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenToVerify}`;
      } else {
        localStorage.removeItem('civictrack_token');
      }
    } catch (error) {
      localStorage.removeItem('civictrack_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: tokenData } = response.data;
      
      setUser(userData);
      setToken(tokenData);
      localStorage.setItem('civictrack_token', tokenData);
      api.defaults.headers.common['Authorization'] = `Bearer ${tokenData}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await api.post('/auth/register', { email, password, name, phone });
      const { user: userData, token: tokenData } = response.data;
      
      setUser(userData);
      setToken(tokenData);
      localStorage.setItem('civictrack_token', tokenData);
      api.defaults.headers.common['Authorization'] = `Bearer ${tokenData}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('civictrack_token');
    delete api.defaults.headers.common['Authorization'];
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 