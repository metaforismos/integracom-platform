import React, { createContext, useState, useContext, useEffect } from 'react';
import { verifyToken } from '../services/authService';
import { setAuthToken } from '../utils/authToken';
import jwt_decode from 'jwt-decode';

// Crear contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export const useAuth = () => useContext(AuthContext);

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar autenticación cuando se carga la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      // Verificar si el token ha expirado
      try {
        const decoded = jwt_decode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp < currentTime) {
          // Token expirado, limpiar
          logout();
          setLoading(false);
          return;
        }
        
        // Token válido, establecer en headers
        setAuthToken(token);
        
        // Verificar con el servidor
        try {
          const response = await verifyToken();
          setCurrentUser(response.data);
        } catch (err) {
          // Error al verificar, limpiar
          logout();
          setError('Sesión expirada. Por favor inicie sesión nuevamente.');
        }
      } catch (err) {
        // Error al decodificar, limpiar
        logout();
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // Función para cerrar sesión
  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setCurrentUser(null);
  };

  // Valores que provee el contexto
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