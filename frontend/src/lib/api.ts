import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL });

type RequestConfigWithAuthRedirect = {
  skipAuthRedirect?: boolean;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const skipAuthRedirect = (err.config as RequestConfigWithAuthRedirect | undefined)?.skipAuthRedirect;

    if (err.response?.status === 401 && !skipAuthRedirect) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
