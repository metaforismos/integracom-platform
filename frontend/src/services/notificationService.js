import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Contar notificaciones no leídas
export const getUnreadNotificationsCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/notifications/unread/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener todas las notificaciones
export const getNotifications = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/notifications`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener una notificación por ID
export const getNotificationById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/notifications/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Crear una notificación
export const createNotification = async (notificationData) => {
  try {
    const response = await axios.post(`${API_URL}/api/notifications`, notificationData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Marcar notificación como leída
export const markNotificationAsRead = async (id) => {
  try {
    const response = await axios.put(`${API_URL}/api/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener lista de notificaciones no leídas (nueva función añadida)
export const getUnreadNotifications = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/notifications/unread`);
    return response.data;
  } catch (error) {
    throw error;
  }
};