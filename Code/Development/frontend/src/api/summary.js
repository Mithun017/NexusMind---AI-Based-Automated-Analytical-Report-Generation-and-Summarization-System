import apiClient from './axios';

export const generateSummary = async (analysisId) => {
  return apiClient.post(`/summary/${analysisId}`);
};
