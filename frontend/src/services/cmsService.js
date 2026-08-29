import api from './api';

const LOCAL_STORAGE_KEY = 'bama_cms_config';

export const getCmsConfig = async (retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await api.get(`/cms-config/?_t=${Date.now()}`, { timeout: 10000 });
      if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(response.data));
        } catch (e) {}
        return response.data;
      }
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
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
    const res = await api.post('/cms-config/', config, { timeout: 20000 });
    if (res.data && res.data.data) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(res.data.data));
      } catch (e) {}
    }
    window.dispatchEvent(new Event('cms_updated'));
  } catch (err) {
    console.warn('Backend CMS save error:', err);
  }

  return config;
};
