import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import type { User, AuthResponse } from '../types';
import { TOKEN_KEY } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

interface LocalUserRecord extends User {
  password: string;
}

const LOCAL_USERS_KEY = 'tricount_local_users';

const readLocalUsers = (): LocalUserRecord[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalUserRecord[]) : [];
  } catch {
    return [];
  }
};

const writeLocalUsers = (users: LocalUserRecord[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistAuth = (authToken: string, authUser: User) => {
    localStorage.setItem(TOKEN_KEY, authToken);
    setToken(authToken);
    setUser(authUser);
  };

  const validateSession = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      await api.get('/groups');
      const savedUser = localStorage.getItem('tricount_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch {
      // Si falla la validación en el backend, pero hay usuario guardado localmente, mantén la sesión
      const savedUser = localStorage.getItem('tricount_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        } catch {
          // Si no se puede parsear el usuario, limpia la sesión
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('tricount_user');
          setToken(null);
          setUser(null);
        }
      } else {
        // Sin usuario local y sin backend, limpia la sesión
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('tricount_user');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      persistAuth(data.token, data.user);
      localStorage.setItem('tricount_user', JSON.stringify(data.user));
    } catch (err: unknown) {
      const localUsers = readLocalUsers();
      const matchedUser = localUsers.find(
        (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password,
      );

      if (matchedUser) {
        const { password: _password, ...safeUser } = matchedUser;
        persistAuth(`local-${Date.now()}`, safeUser);
        localStorage.setItem('tricount_user', JSON.stringify(safeUser));
        return;
      }

      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Credenciales incorrectas. Inténtalo de nuevo.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password });
      persistAuth(data.token, data.user);
      localStorage.setItem('tricount_user', JSON.stringify(data.user));
    } catch (err: unknown) {
      const localUsers = readLocalUsers();
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = localUsers.find((user) => user.email.toLowerCase() === normalizedEmail);

      if (existingUser) {
        const message = 'Ya existe una cuenta con este correo.';
        setError(message);
        throw new Error(message);
      }

      const newUser: LocalUserRecord = {
        id: createLocalId(),
        name: name.trim(),
        email: normalizedEmail,
        created_at: new Date().toISOString(),
        password,
      };

      writeLocalUsers([...localUsers, newUser]);

      const { password: _password, ...safeUser } = newUser;
      persistAuth(`local-${Date.now()}`, safeUser);
      localStorage.setItem('tricount_user', JSON.stringify(safeUser));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('tricount_user');
    localStorage.removeItem('tricount_active_group');
    setToken(null);
    setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
