import apiClient from './axios';

export const getGraphData = async (analysisId) => {
  return apiClient.get(`/graph/${analysisId}`);
};
