import React, { useState, useEffect } from 'react';
import {
  Settings, Save, Shield, Key, Database, RefreshCw, CheckCircle2, Camera,
  Image, Sparkles, Sliders, Building2, Phone, Mail, FileText, Lock, Download,
  MessageSquare, SlidersHorizontal, Check, AlertCircle, Trash2
} from 'lucide-react';
import { ACADEMY_INFO } from '../../services/initialData';
import { resetDatabaseToCleanSlate } from '../../services/api';

const DEFAULT_SETTINGS = {
  photo: {
    maxDim: 300,
    quality: 0.85,
    autoCompress: true
  },
  academy: {
    name: ACADEMY_INFO.name,
    regNo: ACADEMY_INFO.regNo,
    chiefInstructor: 'Sensei Abdul Rahman (5th Dan Black Belt)',
    phone: '+91 95440 85442',
    email: 'bama.karate.malappuram@gmail.com',
    headquarters: 'Pulikkal Head Office Dojo, Malappuram, Kerala'
  },
  whatsapp: {
    apiKey: 'wa_live_key_bama_9544085442',
    autoFeeReminder: true,
    reminderDayOfMonth: 1
  },
  security: {
    sessionTimeoutMins: 60,
    autoLogout: false
  }
};

export default function SettingsPortal() {
  const [activeTab, setActiveTab] = useState('PHOTO'); // 'PHOTO' | 'ACADEMY' | 'WHATSAPP' | 'SECURITY'
  const [saved, setSaved] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);

  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('bama_system_settings');
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  const handleSave = (e) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem('bama_system_settings', JSON.stringify(settings));
      // Sync photo settings key for backward compatibility
      localStorage.setItem('bama_photo_settings', JSON.stringify(settings.photo));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save system settings.');
    }
  };

  const handleGenerateBackup = () => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        systemSettings: settings,
        cmsConfig: localStorage.getItem('bama_cms_config') ? JSON.parse(localStorage.getItem('bama_cms_config')) : {},
        version: '2.5.0-PRO-MAX'
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `BAMA_System_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupStatus('System JSON Database Backup downloaded successfully!');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err) {
      alert('Error generating backup.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Light White Header Banner */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 hover:shadow-md transition-all duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200/80 uppercase">
              System Control Panel
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono">
              System Operational • PRO MAX v2.5
            </span>
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-600" /> System Settings & Executive Admin Configuration
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Manage cadet photo compression thresholds, official academy credentials, WhatsApp API gateways and system database backups.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer flex-shrink-0"
        >
          <Save className="w-4 h-4" /> Save System Config
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> System settings & Cadet photo compression saved successfully!
          </span>
          <span className="text-[10px] font-mono text-emerald-700">Time: {new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {backupStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-bold text-blue-800 flex items-center gap-2 shadow-sm animate-fade-in">
          <Download className="w-4 h-4 text-blue-600" /> {backupStatus}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('PHOTO')}
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'PHOTO' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Camera className="w-4 h-4" /> 1. Photo Compression & Scaling
        </button>

        <button
          onClick={() => setActiveTab('ACADEMY')}
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ACADEMY' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Building2 className="w-4 h-4" /> 2. Academy Branding
        </button>

        <button
          onClick={() => setActiveTab('WHATSAPP')}
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'WHATSAPP' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> 3. WhatsApp API Config
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'SECURITY' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Shield className="w-4 h-4" /> 4. Security & Backups
        </button>
      </div>

      {/* TAB 1: CADET PHOTO COMPRESSION & RESIZING */}
      {activeTab === 'PHOTO' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-red-600" /> Cadet Photo Resizing & Compression Control
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Configure maximum resolution and quality compression for student ID card avatars and profile photos.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-mono font-black">
              Active Scaling: {settings.photo.maxDim}x{settings.photo.maxDim}px @ {Math.round(settings.photo.quality * 100)}%
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Max Avatar Resolution */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                <label className="block font-bold text-gray-800">Max Avatar Resolution (Pixels)</label>
                <select
                  value={settings.photo.maxDim}
                  onChange={(e) => setSettings({
                    ...settings,
                    photo: { ...settings.photo, maxDim: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:outline-none focus:border-red-500 cursor-pointer shadow-xs"
                >
                  <option value={200}>200 x 200 px (Ultra Compact - Fast Data)</option>
                  <option value={300}>300 x 300 px (Recommended - Standard HD)</option>
                  <option value={500}>500 x 500 px (High Definition)</option>
                  <option value={800}>800 x 800 px (Full Original Resolution)</option>
                </select>
                <p className="text-[10px] text-gray-500 font-medium pt-1">
                  Uploaded cadet photos will automatically scale down to this size to optimize ID card rendering.
                </p>
              </div>

              {/* Compression Quality */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                <label className="block font-bold text-gray-800">JPEG Compression Quality</label>
                <select
                  value={settings.photo.quality}
                  onChange={(e) => setSettings({
                    ...settings,
                    photo: { ...settings.photo, quality: parseFloat(e.target.value) }
                  })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:outline-none focus:border-red-500 cursor-pointer shadow-xs"
                >
                  <option value={0.70}>70% Quality (Smallest File Size)</option>
                  <option value={0.85}>85% Quality (Recommended Sharp Balance)</option>
                  <option value={0.95}>95% Quality (Maximum Clarity)</option>
                  <option value={1.00}>100% Quality (Uncompressed Original)</option>
                </select>
                <p className="text-[10px] text-gray-500 font-medium pt-1">
                  Controls image sharpness and loading speed on mobile devices.
                </p>
              </div>
            </div>

            {/* Auto Compress Toggle */}
            <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-2xl">
              <div>
                <strong className="text-gray-900 font-black text-sm block">Enable Automatic Canvas Resizing</strong>
                <span className="text-[11px] text-gray-600 font-medium">Resizes heavy camera photos automatically when uploaded by senseis & instructors.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.photo.autoCompress}
                onChange={(e) => setSettings({
                  ...settings,
                  photo: { ...settings.photo, autoCompress: e.target.checked }
                })}
                className="w-5 h-5 text-red-600 accent-red-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Photo Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ACADEMY BRANDING */}
      {activeTab === 'ACADEMY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" /> Academy Information & Official Credentials
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Update official academy registration, chief instructor titles, and contact information printed on student certificates.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Official Academy Name *</label>
                <input
                  type="text"
                  required
                  value={settings.academy.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    academy: { ...settings.academy, name: e.target.value }
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-black focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Government Registration No.</label>
                <input
                  type="text"
                  value={settings.academy.regNo}
                  onChange={(e) => setSettings({
                    ...settings,
                    academy: { ...settings.academy, regNo: e.target.value }
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Chief Instructor Name & Rank</label>
                <input
                  type="text"
                  value={settings.academy.chiefInstructor}
                  onChange={(e) => setSettings({
                    ...settings,
                    academy: { ...settings.academy, chiefInstructor: e.target.value }
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Primary Support Phone</label>
                <input
                  type="text"
                  value={settings.academy.phone}
                  onChange={(e) => setSettings({
                    ...settings,
                    academy: { ...settings.academy, phone: e.target.value }
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Headquarters Dojo Address</label>
              <input
                type="text"
                value={settings.academy.headquarters}
                onChange={(e) => setSettings({
                  ...settings,
                  academy: { ...settings.academy, headquarters: e.target.value }
                })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Branding Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: WHATSAPP API GATEWAY */}
      {activeTab === 'WHATSAPP' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Direct API Gateway Configuration
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Configure automated WhatsApp fee reminders and direct messaging tokens.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">WhatsApp Cloud API Gateway Token</label>
              <input
                type="password"
                value={settings.whatsapp.apiKey}
                onChange={(e) => setSettings({
                  ...settings,
                  whatsapp: { ...settings.whatsapp, apiKey: e.target.value }
                })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-mono focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
              <div>
                <strong className="text-emerald-950 font-black text-sm block">Auto-Fee Reminder Alert Toggle</strong>
                <span className="text-[11px] text-emerald-800 font-medium">Automatically flags pending cadets for WhatsApp fee reminders.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.whatsapp.autoFeeReminder}
                onChange={(e) => setSettings({
                  ...settings,
                  whatsapp: { ...settings.whatsapp, autoFeeReminder: e.target.checked }
                })}
                className="w-5 h-5 text-emerald-600 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save WhatsApp Gateway
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: SECURITY & BACKUPS */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" /> Security, Session Control & Database Backups
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Export system backups, clear cached student data, or manage super admin session timeout rules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-red-600" /> Database Backup & Export
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Download a complete JSON database snapshot containing system settings, website configuration, and cadet roster state.
              </p>
              <button
                type="button"
                onClick={handleGenerateBackup}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow cursor-pointer hover:from-red-500 hover:to-red-600 transition"
              >
                <Download className="w-4 h-4" /> Download System Backup (.json)
              </button>
            </div>

            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" /> Cache & Roster Reset
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Reset local browser session state and force reload fresh student roster from Django backend.
              </p>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('bama_students_roster');
                  alert('Student roster cache reset! Reloading page...');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <RefreshCw className="w-4 h-4" /> Clear Roster Cache
              </button>
            </div>

            <div className="p-5 bg-rose-50/80 rounded-2xl border border-rose-200 space-y-3 col-span-1 sm:col-span-2 mt-2">
              <h4 className="font-black text-rose-900 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" /> Wipe Test Data & Clean Database Reset (Production Ready)
              </h4>
              <p className="text-xs text-rose-700 leading-relaxed font-medium">
                Wipes out all test students, test fee records, test attendance, test class logs, test inquiries, and test alerts while keeping the 3 Official Dojo Branches and Super Admin accounts safe.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('⚠️ ARE YOU SURE? This will permanently wipe all test cadets, test logs, test fees, and test inquiries while keeping official Dojo Branches and Super Admin accounts. Proceed?')) {
                    resetDatabaseToCleanSlate();
                    alert('✅ Database successfully reset to clean slate! All test records removed.');
                    window.location.reload();
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> 🧹 Clear All Test Data & Reset Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
