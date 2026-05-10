import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  verifyEmail as apiVerifyEmail,
} from '../api/auth';
import { setToken, clearToken, getToken } from '../api/client';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<{ message: string; email: string }>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token } = await apiLogin(email, password);
    setToken(token);
    setUser(user);
  };

  const register = async (email: string, password: string, name?: string) => {
    return apiRegister(email, password, name);
  };

  const verifyEmail = async (token: string) => {
    const { user, token: jwtToken } = await apiVerifyEmail(token);
    setToken(jwtToken);
    setUser(user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    const updated = await getMe();
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, verifyEmail, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
