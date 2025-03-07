import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Obtener todas las categorías de gastos
export const getExpenseCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/expense-categories`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener una categoría de gastos por ID
export const getExpenseCategoryById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/expense-categories/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Crear una categoría de gastos
export const createExpenseCategory = async (categoryData) => {
  try {
    const response = await axios.post(`${API_URL}/api/expense-categories`, categoryData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Actualizar una categoría de gastos
export const updateExpenseCategory = async (id, categoryData) => {
  try {
    const response = await axios.put(`${API_URL}/api/expense-categories/${id}`, categoryData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Contar categorías de gastos
export const getExpenseCategoriesCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/expense-categories/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};