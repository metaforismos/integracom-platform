import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const getServiceRequestsCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/service-requests/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPendingServiceRequestsCount = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/service-requests/pending/count`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getServiceRequestsCountByProject = async (projectId) => {
  try {
    const response = await axios.get(`${API_URL}/api/service-requests/count?project=${projectId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getServiceRequests = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/service-requests`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createServiceRequest = async (requestData) => {
  try {
    const response = await axios.post(`${API_URL}/api/service-requests`, requestData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Nueva función añadida
export const getServiceRequestById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/service-requests/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};