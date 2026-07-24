import { createContext, useContext, useState, ReactNode } from 'react';
import { login as apiLogin, changePassword as apiChangePassword, LoginResponse } from '../../services/api';

interface AuthState {
  token: string | null;
  user: { email: string; first_name: string; last_name: string } | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    const mustChange = localStorage.getItem('must_change_password') === 'true';
    return {
      token,
      user: user ? JSON.parse(user) : null,
      mustChangePassword: mustChange,
      isAuthenticated: !!token,
    };
  });

  const login = async (email: string, password: string) => {
    const response: LoginResponse = await apiLogin(email, password);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    localStorage.setItem('must_change_password', String(response.must_change_password));
    setState({
      token: response.token,
      user: response.user,
      mustChangePassword: response.must_change_password,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('must_change_password');
    setState({ token: null, user: null, mustChangePassword: false, isAuthenticated: false });
  };

  const changePasswordFn = async (oldPassword: string, newPassword: string) => {
    if (!state.token) throw new Error('Not authenticated');
    const response = await apiChangePassword(state.token, oldPassword, newPassword);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('must_change_password', 'false');
    setState(prev => ({ ...prev, token: response.token, mustChangePassword: false }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, changePassword: changePasswordFn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
