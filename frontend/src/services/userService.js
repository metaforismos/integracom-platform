import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Obtener todos los usuarios
export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/users`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Contar usuarios
export const getUsersCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/users/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener un usuario por ID
export const getUserById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/users/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Actualizar un usuario
export const updateUser = async (id, userData) => {
  try {
    const response = await axios.put(`${API_URL}/api/users/${id}`, userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};