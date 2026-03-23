import { useState } from 'react';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [tokens, setTokens] = useState(() => {
    const saved = localStorage.getItem('tokens');
    return saved ? JSON.parse(saved) : null;
  });

  const [dietaryRestrictions, setDietaryRestrictions] = useState(() => {
    const saved = localStorage.getItem('dietary_restrictions');
    return saved ? JSON.parse(saved) : [];
  });

  const login = (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('tokens', JSON.stringify(tokenData));
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('user');
    localStorage.removeItem('tokens');
    localStorage.removeItem('dietary_restrictions');
  };

  const updateDietaryRestrictions = (restrictions) => {
    setDietaryRestrictions(restrictions);
    localStorage.setItem('dietary_restrictions', JSON.stringify(restrictions));
  };
  return (
    <AuthContext.Provider value={{ user, tokens, login, logout, dietaryRestrictions, updateDietaryRestrictions }}>
      {children}
    </AuthContext.Provider>
  );
}
