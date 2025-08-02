import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('civictrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('civictrack_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
    verify: '/auth/verify',
  },
  issues: {
    list: '/issues',
    create: '/issues',
    get: (id: string) => `/issues/${id}`,
    updateStatus: (id: string) => `/issues/${id}/status`,
    flag: (id: string) => `/issues/${id}/flag`,
    stats: '/issues/stats/overview',
  },
  admin: {
    dashboard: '/admin/dashboard',
    issues: '/admin/issues',
    users: '/admin/users',
    analytics: '/admin/analytics',
  },
  users: {
    issues: '/users/issues',
    stats: '/users/stats',
  },
} as const; 