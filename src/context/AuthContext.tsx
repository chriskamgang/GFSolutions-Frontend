import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  agency: string;
  language: string;
  permissions: string[];
  twoFactorEnabled?: boolean;
  sessionTimeout?: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, totpCode?: string) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  remainingTime: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [remainingTime, setRemainingTime] = useState(0);

  // Demarrer le timer de session au chargement
  useEffect(() => {
    if (user) {
      authService.startSessionTimer();
    }
  }, []);

  // Mettre a jour le temps restant toutes les 30 secondes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const remaining = authService.getRemainingTime();
      setRemainingTime(remaining);
      if (remaining <= 0) {
        authService.logout();
      }
    }, 30000);
    setRemainingTime(authService.getRemainingTime());
    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string, totpCode?: string) => {
    const data = await authService.login(email, password, totpCode);
    if (!data.requires2FA) {
      setUser(data.user);
      setRemainingTime(data.expiresIn || 0);
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    authService.logout();
  };

  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        remainingTime,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
