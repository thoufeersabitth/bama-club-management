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

export default function App() {
  React.useEffect(() => {
    const APP_VERSION = 'bama_v2026_08_26_final_sync';
    if (localStorage.getItem('bama_app_cache_version') !== APP_VERSION) {
      localStorage.removeItem('bama_cadets_roster');
      localStorage.removeItem('bama_students');
      localStorage.removeItem('bama_cadets');
      localStorage.removeItem('bama_students_list');
      localStorage.setItem('bama_app_cache_version', APP_VERSION);
    }
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
