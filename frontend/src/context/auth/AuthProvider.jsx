import { useState } from 'react';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);

  const login = (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
  };

  return <AuthContext.Provider value={{ user, tokens, login, logout }}>{children}</AuthContext.Provider>;
}
