import apiClient from './axios';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const checkHealth = async () => {
  return apiClient.get('/health');
};
