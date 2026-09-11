import apiClient from './axios';

export const getHistory = async (page = 1, limit = 20) => {
  return apiClient.get(`/history?page=${page}&limit=${limit}`);
};
