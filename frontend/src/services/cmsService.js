import api from './api';

const LOCAL_STORAGE_KEY = 'bama_cms_config';

export const getCmsConfig = async () => {
  try {
    const response = await api.get(`/cms-config/?_t=${Date.now()}`);
    if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(response.data));
      return response.data;
    }
  } catch (err) {
    console.warn('Backend CMS fetch fallback to localStorage:', err);
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}

  return null;
};

export const saveCmsConfig = async (config) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('cms_updated'));
  } catch (e) {}

  try {
    const res = await api.post('/cms-config/', config);
    if (res.data && res.data.data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.data.data));
    }
    window.dispatchEvent(new Event('cms_updated'));
  } catch (err) {
    console.warn('Backend CMS save error:', err);
  }

  return config;
};
