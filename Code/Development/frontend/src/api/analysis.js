import apiClient from './axios';

export const runAnalysis = async (uploadId) => {
  return apiClient.post(`/analyze/${uploadId}`);
};

export const getAnalysis = async (analysisId) => {
  return apiClient.get(`/analysis/${analysisId}`);
};

export const getKPIs = async (analysisId) => {
  return apiClient.get(`/kpi/${analysisId}`);
};

export const getAnomalies = async (analysisId) => {
  return apiClient.get(`/anomaly/${analysisId}`);
};
