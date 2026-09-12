import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL,
  timeout: 180000,
  headers: {
    'Accept': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data || {
      message: error.message || 'An unexpected network error occurred',
    };
    return Promise.reject(errorData);
  }
);

export default apiClient;
export { baseURL };
