import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Programs from './pages/public/Programs';
import BeltSystem from './pages/public/BeltSystem';
import Branches from './pages/public/Branches';
import Gallery from './pages/public/Gallery';
import Contact from './pages/public/Contact';
import Login from './pages/public/Login';
import GradingRegistration from './pages/public/GradingRegistration';

// Portal Pages
import DashboardPortal from './pages/portal/DashboardPortal';
import StudentManagement from './pages/portal/StudentManagement';
import AttendanceManagement from './pages/portal/AttendanceManagement';
import FeeManagement from './pages/portal/FeeManagement';
import BeltGradingManagement from './pages/portal/BeltGradingManagement';
import AdminManagement from './pages/portal/AdminManagement';
import BranchManagement from './pages/portal/BranchManagement';
import WhatsAppManagement from './pages/portal/WhatsAppManagement';
import ReportsAnalytics from './pages/portal/ReportsAnalytics';
import CMSManagement from './pages/portal/CMSManagement';
import SettingsPortal from './pages/portal/SettingsPortal';
import OfficeGrading from './pages/office/OfficeGrading';
import { saveTrainingSchedulesBackend, fetchBranches, isValidBranchImage } from './services/api';
import { INITIAL_BRANCHES } from './services/initialData';

export default function App() {
  React.useEffect(() => {
    const APP_VERSION = 'bama_v2026_09_06_plan1_cdn_v12';
    if (localStorage.getItem('bama_app_cache_version') !== APP_VERSION) {
      try {
        const storedSchedules = localStorage.getItem('bama_training_schedules');
        if (storedSchedules) {
          const parsed = JSON.parse(storedSchedules);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveTrainingSchedulesBackend(parsed).catch(() => {});
          }
        }
      } catch (e) {}

      // Clean only stale cadet/user cache, sanitize branch images
      localStorage.removeItem('bama_cadets_roster');
      localStorage.removeItem('bama_students');
      localStorage.removeItem('bama_cadets');
      localStorage.removeItem('bama_students_list');
      localStorage.removeItem('bama_backup_data');

      // Purge any corrupted dummy pixels from localStorage
      try {
        const localImg = JSON.parse(localStorage.getItem('bama_branch_images') || '{}');
        let changed = false;
        Object.keys(localImg).forEach(k => {
          if (!isValidBranchImage(localImg[k])) {
            delete localImg[k];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('bama_branch_images', JSON.stringify(localImg));
        }
      } catch (e) {}

      try {
        const customB = JSON.parse(localStorage.getItem('bama_custom_branches') || '[]');
        if (Array.isArray(customB) && customB.length > 0) {
          let bChanged = false;
          const cleanedB = customB.map(b => {
            if (b.image && !isValidBranchImage(b.image)) {
              bChanged = true;
              return { ...b, image: (b.isHeadOffice || b.is_head_office) ? '/assets/prog_adults.jpg' : '/assets/prog_kids.jpg', img: null, photo: null };
            }
            return b;
          });
          if (bChanged) {
            localStorage.setItem('bama_custom_branches', JSON.stringify(cleanedB));
            localStorage.setItem('bama_branches', JSON.stringify(cleanedB));
          }
        }
      } catch (e) {}

      localStorage.setItem('bama_app_cache_version', APP_VERSION);
    }

    // Auto-update checker: when mobile phone resumes/wakes up or tab becomes visible
    const checkFreshness = async () => {
      try {
        const res = await fetch(`/?_chk=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
        const serverEtag = res.headers.get('etag') || res.headers.get('last-modified') || res.headers.get('x-vercel-id');
        const storedEtag = sessionStorage.getItem('bama_app_etag');
        if (serverEtag) {
          if (storedEtag && storedEtag !== serverEtag) {
            sessionStorage.setItem('bama_app_etag', serverEtag);
            window.location.reload();
          } else {
            sessionStorage.setItem('bama_app_etag', serverEtag);
          }
        }
      } catch (e) {}
    };

    // Pre-warm backend and keep-alive ping so Fly.io never goes to sleep while app is open
    const pingBackend = () => {
      fetch('https://bama-club-backend.fly.dev/api/branches/?_ping=1', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
    };
    pingBackend();
    const keepAliveInterval = setInterval(pingBackend, 3.5 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkFreshness();
        pingBackend();
        fetchBranches(true).then(() => {
          window.dispatchEvent(new Event('bama_branches_updated'));
          window.dispatchEvent(new Event('bama_data_updated'));
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/programs" element={<PublicLayout><Programs /></PublicLayout>} />
        <Route path="/belts" element={<PublicLayout><BeltSystem /></PublicLayout>} />
        <Route path="/branches" element={<PublicLayout><Branches /></PublicLayout>} />
        <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
        <Route path="/grading-registration" element={<PublicLayout><GradingRegistration /></PublicLayout>} />

        {/* Office Portal Routes */}
        <Route path="/portal" element={<AdminLayout><DashboardPortal /></AdminLayout>} />
        <Route path="/portal/students" element={<AdminLayout><StudentManagement /></AdminLayout>} />
        <Route path="/portal/attendance" element={<AdminLayout><AttendanceManagement /></AdminLayout>} />
        <Route path="/portal/fees" element={<AdminLayout><FeeManagement /></AdminLayout>} />
        <Route path="/portal/belts" element={<AdminLayout><BeltGradingManagement /></AdminLayout>} />
        <Route path="/portal/grading" element={<AdminLayout><OfficeGrading /></AdminLayout>} />
        <Route path="/office/grading" element={<AdminLayout><OfficeGrading /></AdminLayout>} />
        <Route path="/portal/admins" element={<AdminLayout><AdminManagement /></AdminLayout>} />
        <Route path="/portal/branches" element={<AdminLayout><BranchManagement /></AdminLayout>} />
        <Route path="/portal/whatsapp" element={<AdminLayout><WhatsAppManagement /></AdminLayout>} />
        <Route path="/portal/reports" element={<AdminLayout><ReportsAnalytics /></AdminLayout>} />
        <Route path="/portal/cms" element={<AdminLayout><CMSManagement /></AdminLayout>} />
        <Route path="/portal/settings" element={<AdminLayout><SettingsPortal /></AdminLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
