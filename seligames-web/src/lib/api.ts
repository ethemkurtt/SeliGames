import axios from 'axios';

// Allow override via Vite env (set VITE_API_URL in .env.production)
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
const API_URL = `${API_BASE}/api`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
