import React, { createContext, useState, useContext, useEffect } from 'react';
import { verifyToken } from '../services/authService';
import { setAuthToken } from '../utils/authToken';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          logout();
          setLoading(false);
          return;
        }
        setAuthToken(token);
        try {
          const response = await verifyToken();
          setCurrentUser(response.data);
        } catch (err) {
          logout();
          setError('Sesión expirada. Por favor inicie sesión nuevamente.');
        }
      } catch (err) {
        logout();
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    setCurrentUser,
    loading,
    error,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;