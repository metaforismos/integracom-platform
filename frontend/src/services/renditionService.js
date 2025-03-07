import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const getRenditionsToReviewCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/renditions/review/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRenditions = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/renditions`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRenditionById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/renditions/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createRendition = async (renditionData) => {
  try {
    const response = await axios.post(`${API_URL}/api/renditions`, renditionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateRendition = async (id, renditionData) => {
  try {
    const response = await axios.put(`${API_URL}/api/renditions/${id}`, renditionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addExpenseToRendition = async (renditionId, expenseData) => {
  try {
    const response = await axios.post(`${API_URL}/api/renditions/${renditionId}/expenses`, expenseData);
    return response.data;
  } catch (error) {
    throw error;
  }
};