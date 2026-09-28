import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { storage } from '../services/api';
import { authService } from '../services/authService';

/**
 * AuthContext — sesión JWT persistida en AsyncStorage (CP-USR-01).
 * El refresco de tokens lo maneja el interceptor de api.js; si la sesión
 * expira, api.js limpia el storage y marca error.sessionExpired → las
 * pantallas deben llamar logout() para volver al Login.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Restaurar sesión al arrancar la app.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await storage.getUser();
        if (stored && alive) setUser(stored);
      } finally {
        if (alive) setInitializing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * login(rut, password) → { ok, user? , message? }
   * 401 → 'Credenciales inválidas.' | 423 → 'Cuenta bloqueada temporalmente...'
   * (mensajes estandarizados por apiErrorMessage).
   */
  const login = useCallback(async (rut, password) => {
    const result = await authService.login(rut, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout(); // best-effort en backend + storage.clear()
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout }),
    [user, initializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
