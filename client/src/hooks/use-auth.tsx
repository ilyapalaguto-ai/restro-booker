import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import { getAuthToken, setAuthToken, removeAuthToken } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; confirmPassword: string; firstName: string; lastName: string; phone?: string; role?: string; }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            removeAuthToken();
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          removeAuthToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const data = await response.json();
      
      setAuthToken(data.token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: { email: string; password: string; confirmPassword: string; firstName: string; lastName: string; phone?: string; role?: string; }) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', data);
      const resData = await response.json();
      setAuthToken(resData.token);
      setUser(resData.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
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
