import apiClient, { baseURL } from './axios';

export const generateReport = async (analysisId) => {
  return apiClient.post(`/report/${analysisId}`);
};

export const getReportStatus = async (analysisId) => {
  return apiClient.get(`/report/by-analysis/${analysisId}`);
};

export const getReportDownloadUrl = (reportId) => {
  return `${baseURL}/report/${reportId}/download`;
};
