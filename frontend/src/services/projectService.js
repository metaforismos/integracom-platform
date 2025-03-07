import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Obtener todos los proyectos
export const getProjects = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/projects`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener un proyecto por ID
export const getProjectById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/projects/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Crear un proyecto
export const createProject = async (projectData) => {
  try {
    const response = await axios.post(`${API_URL}/api/projects`, projectData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Actualizar un proyecto
export const updateProject = async (id, projectData) => {
  try {
    const response = await axios.put(`${API_URL}/api/projects/${id}`, projectData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Contar todos los proyectos
export const getProjectsCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/projects/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Contar proyectos activos
export const getActiveProjectsCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/projects/active/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};