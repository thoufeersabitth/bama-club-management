/**
 * Google Drive Cloud Gallery Service for B.A.M.A.
 * Automatically synchronizes with the official Google Drive folder:
 * Folder ID: 1TzTKL_mLvwv6zUHOFgdkO2EIRh7PRsTW
 */

export const GOOGLE_DRIVE_FOLDER_ID = '1TzTKL_mLvwv6zUHOFgdkO2EIRh7PRsTW';
export const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

const CACHE_KEY = 'bama_gdrive_photos';
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

let _gdriveCache = null;
let _gdriveCacheTime = 0;

/**
 * Extracts a Google Drive File ID from any share URL or raw ID
 */
export const extractDriveFileId = (input) => {
  if (!input) return null;
  const str = String(input).trim();
  // If it's already an ID
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(str)) return str;

  // Patterns like /file/d/{id}, id={id}, open?id={id}
  const matchD = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD) return matchD[1];

  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];

  return null;
};

/**
 * Converts a Google Drive File ID or URL to a direct high-speed CDN image URL
 */
export const formatDriveImageUrl = (fileIdOrUrl, size = 1200) => {
  if (!fileIdOrUrl) return '';
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}=w${size}`;
  }
  return fileIdOrUrl;
};

/**
 * Converts a Google Drive File ID to a fast thumbnail URL
 */
export const formatDriveThumbnailUrl = (fileIdOrUrl, size = 600) => {
  if (!fileIdOrUrl) return '';
  const fileId = extractDriveFileId(fileIdOrUrl);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }
  return fileIdOrUrl;
};

/**
 * Gets cached Google Drive photos from local storage (0ms sync)
 */
export const getStoredDrivePhotos = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return [];
};

/**
 * Fetches Google Drive photos from the deployed Google Apps Script Web App
 */
export const fetchGoogleDrivePhotos = async (forceRefresh = false) => {
  if (!forceRefresh && _gdriveCache && (Date.now() - _gdriveCacheTime < CACHE_TTL_MS)) {
    return _gdriveCache;
  }

  // Pre-seed from local storage
  const localPhotos = getStoredDrivePhotos();
  if (!_gdriveCache && localPhotos.length > 0) {
    _gdriveCache = localPhotos;
    _gdriveCacheTime = Date.now();
  }

  // Get configured Webhook Script URL from CMS or localStorage
  let scriptUrl = localStorage.getItem('bama_gdrive_script_url') || '';
  try {
    const cmsSaved = localStorage.getItem('bama_cms_config');
    if (cmsSaved) {
      const cms = JSON.parse(cmsSaved);
      if (cms.google_drive_script_url) {
        scriptUrl = cms.google_drive_script_url;
      }
    }
  } catch (e) {}

  if (!scriptUrl) {
    return _gdriveCache || localPhotos;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const separator = scriptUrl.includes('?') ? '&' : '?';
    const fetchUrl = `${scriptUrl}${separator}_t=${Date.now()}`;

    const res = await fetch(fetchUrl, {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const files = Array.isArray(data) ? data : (data.files || []);

      const normalized = files.map((f, idx) => {
        const fileId = f.id || extractDriveFileId(f.url);
        return {
          id: `gdrive-${fileId || idx}`,
          driveId: fileId,
          title: f.title || f.name || `Academy Memory #${idx + 1}`,
          category: f.category || 'PHOTO GALLERY',
          desc: f.desc || f.description || 'Uploaded to official B.A.M.A. Google Drive',
          img: formatDriveImageUrl(fileId, 1400),
          thumbnail: formatDriveThumbnailUrl(fileId, 700),
          downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
          viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
          dateCreated: f.dateCreated || f.createdTime || f.lastUpdated || new Date().toISOString(),
          isDrive: true
        };
      });

      // Sort by newest upload date first (descending)
      normalized.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

      if (normalized.length > 0) {
        _gdriveCache = normalized;
        _gdriveCacheTime = Date.now();
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
        } catch (e) {}
        window.dispatchEvent(new Event('bama_gdrive_updated'));
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[GDrive] Background sync skipped:', err.message);
  }

  return _gdriveCache || localPhotos;
};
