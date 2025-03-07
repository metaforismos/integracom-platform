import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Iniciar sesión
export const login = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener perfil de usuario
export const getProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Enviar solicitud de recuperación de contraseña
export const forgotPassword = async (email) => {
  try {
    const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Actualizar perfil de usuario
export const updateProfile = async (userData) => {
  try {
    const response = await axios.put(`${API_URL}/users/profile/update`, userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Subir imagen de perfil
export const uploadProfilePicture = async (id, formData) => {
  try {
    const response = await axios.put(
      `${API_URL}/users/${id}/profile-picture`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Verificar si el token es válido
export const verifyToken = async () => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`);
    return response.data;
  } catch (error) {
    throw error;
  }
};