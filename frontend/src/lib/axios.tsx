import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  withCredentials: true
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPage = window.location.pathname === '/login' || 
                         window.location.pathname === '/register' ||
                         window.location.pathname === '/';

      if (typeof window !== "undefined" && !isAuthPage) {
        console.warn("Not logged in. Redirecting to login...");
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;