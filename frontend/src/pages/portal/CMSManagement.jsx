import React, { useState, useEffect } from 'react';
import {
  Globe, Save, CheckCircle2, Sparkles, Image as ImageIcon, Plus, Trash2, Edit,
  Shield, Award, Users, MapPin, ExternalLink, Bell, Eye, Layers, Flame, Target, Dumbbell, Star, Camera, Upload, X, Building2,
  Clock, Phone, Mail, Check, Search
} from 'lucide-react';
import { ACADEMY_INFO, INITIAL_BRANCHES } from '../../services/initialData';
import { getCmsConfig, saveCmsConfig } from '../../services/cmsService';
import { fetchBranches, saveBranchImageBackend, getBranchPhotoUrl } from '../../services/api';

const INITIAL_CMS_CONFIG = {
  hero: {
    badgeText: 'JKA INDIA • KICK BOXING ASSOC. OF KERALA • KKA',
    titleLine1: 'DISCIPLINE TODAY',
    titleLine2: 'STRENGTH FOREVER',
    subTitle: 'Empowering cadets through authentic Shotokan Karate, Kickboxing & Martial Arts excellence across Malappuram & Kerala.',
    heroImage: '/assets/reference_hero.jpg',
    ctaText: '🥋 Join B.A.M.A. Academy Today',
    phoneCta: '+91 95440 85442'
  },
  announcement: {
    enabled: true,
    text: '🔥 New Batch Admissions Open for 2026! Join Pulikkal, Chungam & Mongam Dojos Today. Contact: +91 95440 85442',
    link: '/contact'
  },
  stats: [
    { label: 'Active Cadets Enrolled', value: '350+' },
    { label: 'Black Belt Graduates', value: '25+' },
    { label: 'State & National Medals', value: '120+' },
    { label: 'Dojo Training Branches', value: '3' }
  ],
  programs: [
    {
      id: 'prog-kids',
      title: 'KIDS KARATE',
      desc: 'Special training for kids to improve discipline, focus and self-confidence.',
      img: '/assets/prog_kids.jpg'
    },
    {
      id: 'prog-adults',
      title: 'ADULTS KARATE',
      desc: 'Traditional karate training for fitness, self-defense and mental strength.',
      img: '/assets/prog_adults.jpg'
    },
    {
      id: 'prog-self-defence',
      title: 'SELF DEFENCE',
      desc: 'Practical self-defence techniques for daily life safety and protection.',
      img: '/assets/prog_self_defence.jpg'
    },
    {
      id: 'prog-kickboxing',
      title: 'KICK BOXING',
      desc: 'Powerful cardio and strike training to improve stamina, strength and agility.',
      img: '/assets/prog_kickboxing.jpg'
    },
    {
      id: 'prog-fitness',
      title: 'FITNESS TRAINING',
      desc: 'Stay fit, strong and healthy with our professional conditioning programs.',
      img: '/assets/prog_fitness.jpg'
    },
    {
      id: 'prog-competition',
      title: 'COMPETITION COACHING',
      desc: 'Specialized sparring and kata coaching for state & national championships.',
      img: '/assets/prog_competition.jpg'
    }
  ],
  gallery: [
    {
      id: 'gal-1',
      title: 'Annual Belt Exam 2026',
      category: 'GRADING',
      desc: 'Sensei Abdul Rahman examining green & brown belt candidates in Pulikkal Dojo.',
      img: '/assets/prog_competition.jpg'
    },
    {
      id: 'gal-2',
      title: 'Kerala State Karate Championship',
      category: 'COMPETITION',
      desc: 'B.A.M.A. cadets winning 12 Gold Medals in Kata & Kumite events.',
      img: '/assets/prog_adults.jpg'
    },
    {
      id: 'gal-3',
      title: "Women's Self-Defence Workshop",
      category: 'EVENTS',
      desc: 'Special situational defense seminar conducted at Chungam branch.',
      img: '/assets/prog_self_defence.jpg'
    },
    {
      id: 'gal-4',
      title: 'Kick Boxing Sparring Session',
      category: 'TRAINING',
      desc: 'High-intensity conditioning session with heavy bags and pad drills.',
      img: '/assets/prog_kickboxing.jpg'
    }
  ],
  instructors: [
    {
      id: 'inst-1',
      name: 'Sensei Abdul Rahman',
      rank: '5th Dan Black Belt',
      role: 'Chief Instructor & Founder',
      branch: 'Pulikkal Head Office'
    },
    {
      id: 'inst-2',
      name: 'Sensei Rahul Kumar',
      rank: '3rd Dan Black Belt',
      role: 'Senior Instructor',
      branch: 'Chungam Branch'
    },
    {
      id: 'inst-3',
      name: 'Sensei Muhammed Haneen',
      rank: '2nd Dan Black Belt',
      role: 'Instructor',
      branch: 'Mongam Branch'
    }
  ]
};

export default function CMSManagement() {
  const [cmsConfig, setCmsConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_cms_config');
      return saved ? JSON.parse(saved) : INITIAL_CMS_CONFIG;
    } catch (e) {
      return INITIAL_CMS_CONFIG;
    }
  });

  useEffect(() => {
    getCmsConfig().then((cfg) => {
      if (cfg && Object.keys(cfg).length > 0) {
        setCmsConfig(cfg);
      }
    });
    fetchBranches().then(b => {
      if (b && b.length > 0) setBranchesList(b);
    });
  }, []);

  const [activeTab, setActiveTab] = useState('HERO'); // 'HERO' | 'ANNOUNCEMENT' | 'PROGRAMS' | 'STATS' | 'GALLERY' | 'BRANCHES'
  const [saveNotification, setSaveNotification] = useState(false);

  // Branches State for CMS
  const [branchesList, setBranchesList] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_custom_branches');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_BRANCHES;
  });

  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({
    id: '',
    name: '',
    code: '',
    address: '',
    phone: '+91 95440 85442',
    head: 'Sensei Abdul Rahman (5th Dan)',
    timings: 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
    mapUrl: '',
    img: '/assets/prog_adults.jpg',
    isHeadOffice: false
  });

  // New Program Course Form State
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProg, setEditingProg] = useState(null);
  const [progForm, setProgForm] = useState({ title: '', desc: '', img: '/assets/prog_kids.jpg' });

  // Gallery Item Form State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingGal, setEditingGal] = useState(null);
  const [galForm, setGalForm] = useState({
    title: '',
    category: 'GRADING',
    desc: '',
    img: '/assets/prog_competition.jpg'
  });

  // Smart Image Compression & Conversion to Base64 (Prevents LocalStorage Quota Crashes)
  const handleImageFilePick = (e, callback) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target.result;
        const img = new Image();
        img.onload = () => {
          try {
            const targetWidth = 540;
            const targetHeight = 304; // Standard 16:9 widescreen banner
            const targetAspect = targetWidth / targetHeight;
            const sourceAspect = img.width / img.height;

            let sx = 0;
            let sy = 0;
            let sWidth = img.width;
            let sHeight = img.height;

            // Smart Center Crop calculation:
            if (sourceAspect > targetAspect) {
              sWidth = Math.round(img.height * targetAspect);
              sx = Math.round((img.width - sWidth) / 2);
            } else {
              sHeight = Math.round(img.width / targetAspect);
              sy = Math.round((img.height - sHeight) / 2);
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
            callback(compressedDataUrl);
          } catch (err) {
            callback(rawDataUrl);
          }
        };
        img.onerror = () => {
          callback(rawDataUrl);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  // Branch CMS Save Handler
  const handleSaveBranchCMS = async (e) => {
    e.preventDefault();
    const photoUrl = branchForm.img || branchForm.image || '/assets/prog_adults.jpg';
    let updated = branchesList;
    if (editingBranch) {
      updated = branchesList.map(b => b.id === editingBranch.id ? {
        ...b,
        ...branchForm,
        image: photoUrl,
        img: photoUrl,
        photo: photoUrl
      } : b);
    } else {
      const newB = {
        id: `branch-${Date.now()}`,
        ...branchForm,
        image: photoUrl,
        img: photoUrl,
        photo: photoUrl,
        status: 'Active'
      };
      updated = [...branchesList, newB];
    }
    setBranchesList(updated);
    localStorage.setItem('bama_custom_branches', JSON.stringify(updated));
    localStorage.setItem('bama_branches', JSON.stringify(updated));

    // Save image directly first for fast cross-device sync
    const targetId = editingBranch ? editingBranch.id : (updated[updated.length - 1]?.id);
    if (photoUrl && !photoUrl.startsWith('/assets/')) {
      saveBranchImageBackend(targetId, photoUrl, branchForm.code, branchForm.name).catch(() => {});
    }

    const updatedCms = { ...cmsConfig, branches: updated };
    setCmsConfig(updatedCms);
    saveCmsConfig(updatedCms).catch(() => {});

    window.dispatchEvent(new Event('bama_branches_updated'));
    window.dispatchEvent(new Event('bama_data_updated'));
    window.dispatchEvent(new Event('cms_updated'));
    setShowBranchModal(false);
    setEditingBranch(null);
    setSaveNotification(true);
    setTimeout(() => setSaveNotification(false), 3000);
  };

  // Save Config to LocalStorage & Central Django Backend
  const handleSaveCMS = async (e) => {
    if (e) e.preventDefault();
    try {
      const payload = { ...cmsConfig, branches: branchesList };
      setCmsConfig(payload);
      localStorage.setItem('bama_custom_branches', JSON.stringify(branchesList));
      localStorage.setItem('bama_branches', JSON.stringify(branchesList));
      await saveCmsConfig(payload);
      window.dispatchEvent(new Event('bama_branches_updated'));
      window.dispatchEvent(new Event('bama_data_updated'));
      window.dispatchEvent(new Event('cms_updated'));
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 4000);
      alert('✅ SUCCESS!\n\nAll live website changes (Hero, Gallery, Courses, Branches, Stats) have been successfully published to the cloud database!\n\nAll mobile phones and computers will now see your updates immediately.');
    } catch (err) {
      alert('Error saving CMS configuration.');
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Reset all website CMS sections to default factory configuration?')) {
      setCmsConfig(INITIAL_CMS_CONFIG);
      await saveCmsConfig(INITIAL_CMS_CONFIG);
      setSaveNotification(true);
      setTimeout(() => setSaveNotification(false), 3000);
    }
  };

  // Program Add / Edit
  const handleSaveProgram = async (e) => {
    e.preventDefault();
    let updatedPrograms = cmsConfig.programs || [];
    if (editingProg) {
      updatedPrograms = updatedPrograms.map(p => p.id === editingProg.id ? { ...p, ...progForm } : p);
    } else {
      const newP = {
        id: `prog-${Date.now()}`,
        ...progForm
      };
      updatedPrograms = [...updatedPrograms, newP];
    }
    const newCfg = { ...cmsConfig, programs: updatedPrograms };
    setCmsConfig(newCfg);
    await saveCmsConfig(newCfg);
    setShowProgramModal(false);
    setEditingProg(null);
    setSaveNotification(true);
    setTimeout(() => setSaveNotification(false), 3000);
  };

  const handleDeleteProgram = async (id) => {
    if (window.confirm('Are you sure you want to remove this course section from the website?')) {
      const updated = (cmsConfig.programs || []).filter(p => p.id !== id);
      const newCfg = { ...cmsConfig, programs: updated };
      setCmsConfig(newCfg);
      await saveCmsConfig(newCfg);
    }
  };

  // Gallery Add / Edit
  const handleSaveGallery = async (e) => {
    e.preventDefault();
    let updatedGallery = cmsConfig.gallery || INITIAL_CMS_CONFIG.gallery;
    if (editingGal) {
      updatedGallery = updatedGallery.map(g => g.id === editingGal.id ? { ...g, ...galForm } : g);
    } else {
      const newG = {
        id: `gal-${Date.now()}`,
        ...galForm
      };
      updatedGallery = [...updatedGallery, newG];
    }
    const newCfg = { ...cmsConfig, gallery: updatedGallery };
    setCmsConfig(newCfg);
    await saveCmsConfig(newCfg);
    setShowGalleryModal(false);
    setEditingGal(null);
    setSaveNotification(true);
    setTimeout(() => setSaveNotification(false), 3000);
  };

  const handleDeleteGallery = async (id) => {
    if (window.confirm('Are you sure you want to delete this photo from the website gallery?')) {
      const updated = (cmsConfig.gallery || INITIAL_CMS_CONFIG.gallery).filter(g => g.id !== id);
      const newCfg = { ...cmsConfig, gallery: updated };
      setCmsConfig(newCfg);
      await saveCmsConfig(newCfg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Light White Header Banner */}
      <div className="bg-white p-4 sm:px-5 sm:py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 w-full">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200/80 uppercase">
              Super Admin CMS Manager
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono">
              Live Website Sync Active
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-red-600 flex-shrink-0" /> Website Live Content & Gallery Manager
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Upload course photos, add photo gallery memories, edit hero banners, announcements & stats live without code.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto flex-shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
            title="Preview Home Page"
          >
            <Eye className="w-3.5 h-3.5 text-red-600" /> Preview Home <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
          <a
            href="/branches"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
            title="Preview Dojo Branches Page"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" /> Preview Branches <ExternalLink className="w-3 h-3 text-blue-600/60" />
          </a>
          <a
            href="/gallery"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
            title="Preview Photo Gallery Page"
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" /> Preview Gallery <ExternalLink className="w-3 h-3 text-amber-600/60" />
          </a>
          <button
            onClick={handleSaveCMS}
            className="col-span-2 sm:col-span-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Live Changes
          </button>
        </div>
      </div>

      {saveNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Website content saved live! Open website preview to verify changes.
          </span>
          <span className="text-[10px] font-mono text-emerald-700">Sync Time: {new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {/* Primary Section Tabs */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs w-full">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('HERO')}
            className={`px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'HERO' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> 1. Hero
          </button>

          <button
            onClick={() => setActiveTab('ANNOUNCEMENT')}
            className={`px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ANNOUNCEMENT' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Bell className="w-4 h-4" /> 2. Alert
          </button>

          <button
            onClick={() => setActiveTab('PROGRAMS')}
            className={`px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'PROGRAMS' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" /> 3. Courses ({(cmsConfig.programs || []).length})
          </button>

          <button
            onClick={() => setActiveTab('GALLERY')}
            className={`px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'GALLERY' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Camera className="w-4 h-4 text-amber-500" /> 4. Gallery ({(cmsConfig.gallery || INITIAL_CMS_CONFIG.gallery).length})
          </button>

          <button
            onClick={() => setActiveTab('STATS')}
            className={`px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'STATS' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Award className="w-4 h-4" /> 5. Stats
          </button>

          <button
            onClick={() => setActiveTab('BRANCHES')}
            className={`px-3 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'BRANCHES' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-500" /> 6. Branches ({branchesList.length})
          </button>
        </div>

        <button
          onClick={handleResetToDefault}
          className="px-3 py-1.5 text-gray-500 hover:text-red-600 text-[11px] font-bold underline cursor-pointer text-center sm:text-right sm:ml-auto whitespace-nowrap"
        >
          Reset Factory Defaults
        </button>
      </div>

      {/* SECTION 1: HERO BANNER CONFIG */}
      {activeTab === 'HERO' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-600" /> Homepage Main Hero Banner Configuration
            </h3>
            <p className="text-xs text-gray-500">Live edit the top headline text, affiliations pill badge, hero image URL and CTA buttons.</p>
          </div>

          <form onSubmit={handleSaveCMS} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Affiliations Pill Badge Text</label>
              <input
                type="text"
                value={cmsConfig.hero.badgeText}
                onChange={(e) => setCmsConfig({ ...cmsConfig, hero: { ...cmsConfig.hero, badgeText: e.target.value } })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Headline Line 1 *</label>
                <input
                  type="text"
                  required
                  value={cmsConfig.hero.titleLine1}
                  onChange={(e) => setCmsConfig({ ...cmsConfig, hero: { ...cmsConfig.hero, titleLine1: e.target.value } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-black focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Headline Line 2 (Highlighted) *</label>
                <input
                  type="text"
                  required
                  value={cmsConfig.hero.titleLine2}
                  onChange={(e) => setCmsConfig({ ...cmsConfig, hero: { ...cmsConfig.hero, titleLine2: e.target.value } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-red-600 font-black focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Subtitle Description *</label>
              <textarea
                rows={3}
                required
                value={cmsConfig.hero.subTitle}
                onChange={(e) => setCmsConfig({ ...cmsConfig, hero: { ...cmsConfig.hero, subTitle: e.target.value } })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-red-500 shadow-sm leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Hero Background Image Path / URL</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={cmsConfig.hero.heroImage}
                    onChange={(e) => setCmsConfig({ ...cmsConfig, hero: { ...cmsConfig.hero, heroImage: e.target.value } })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-mono focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFilePick(e, (dataUrl) => setCmsConfig({ ...cmsConfig, hero: { ...cmsConfig.hero, heroImage: dataUrl } }))}
                    className="text-xs text-gray-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Primary CTA Button Label</label>
                <input
                  type="text"
                  value={cmsConfig.hero.ctaText}
                  onChange={(e) => setCmsConfig({ ...cmsConfig, hero: { ...cmsConfig.hero, ctaText: e.target.value } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Hero Section
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 2: ANNOUNCEMENT ALERT BANNER */}
      {activeTab === 'ANNOUNCEMENT' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" /> Website Live Announcement & Alert Banner
            </h3>
            <p className="text-xs text-gray-500">Enable a broadcast notice banner at the top of the public website.</p>
          </div>

          <form onSubmit={handleSaveCMS} className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <input
                type="checkbox"
                id="enableNotice"
                checked={cmsConfig.announcement.enabled}
                onChange={(e) => setCmsConfig({
                  ...cmsConfig,
                  announcement: { ...cmsConfig.announcement, enabled: e.target.checked }
                })}
                className="w-5 h-5 text-amber-600 accent-amber-600 rounded cursor-pointer"
              />
              <label htmlFor="enableNotice" className="text-amber-900 font-black cursor-pointer text-sm">
                Display Live Announcement Banner on Public Website Header
              </label>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Announcement Message Text *</label>
              <textarea
                rows={2}
                required
                value={cmsConfig.announcement.text}
                onChange={(e) => setCmsConfig({
                  ...cmsConfig,
                  announcement: { ...cmsConfig.announcement, text: e.target.value }
                })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Alert Banner
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 3: TRAINING COURSES & PROGRAMS */}
      {activeTab === 'PROGRAMS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600" /> Website Training Programs & Courses ({(cmsConfig.programs || []).length})
              </h3>
              <p className="text-xs text-gray-500 font-medium">Add, edit, or remove public website martial art courses and upload custom course photos.</p>
            </div>

            <button
              onClick={() => {
                setEditingProg(null);
                setProgForm({ title: '', desc: '', img: '/assets/prog_kids.jpg' });
                setShowProgramModal(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Course Section
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(cmsConfig.programs || []).map((p) => (
              <div key={p.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs hover:border-red-300 transition-all">
                <div className="h-32 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-300">
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-white font-mono font-black text-[10px] rounded">
                    {p.title}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-gray-900 text-sm">{p.title}</h4>
                  <p className="text-xs text-gray-600 font-medium leading-snug mt-0.5">{p.desc}</p>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => {
                      setEditingProg(p);
                      setProgForm({ title: p.title, desc: p.desc, img: p.img });
                      setShowProgramModal(true);
                    }}
                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit & Change Photo
                  </button>

                  <button
                    onClick={() => handleDeleteProgram(p.id)}
                    className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition cursor-pointer"
                    title="Remove Program"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: ACADEMY PHOTO GALLERY MANAGER */}
      {activeTab === 'GALLERY' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-red-600" /> Public Website Photo Gallery Manager ({(cmsConfig.gallery || INITIAL_CMS_CONFIG.gallery).length} Photos)
              </h3>
              <p className="text-xs text-gray-500 font-medium">Add, edit, or delete photos from the public website gallery with custom category tags and descriptions.</p>
            </div>

            <button
              onClick={() => {
                setEditingGal(null);
                setGalForm({ title: '', category: 'GRADING', desc: '', img: '/assets/prog_competition.jpg' });
                setShowGalleryModal(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Photo to Gallery
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(cmsConfig.gallery || INITIAL_CMS_CONFIG.gallery).map((g) => (
              <div key={g.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 shadow-xs hover:border-red-300 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-36 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-300">
                    <img src={g.img} alt={g.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white font-mono font-black text-[9px] rounded uppercase shadow-xs">
                      {g.category}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-gray-900 text-sm leading-snug">{g.title}</h4>
                    <p className="text-xs text-gray-600 font-medium leading-snug mt-0.5">{g.desc}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => {
                      setEditingGal(g);
                      setGalForm({ title: g.title, category: g.category, desc: g.desc, img: g.img });
                      setShowGalleryModal(true);
                    }}
                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Photo
                  </button>

                  <button
                    onClick={() => handleDeleteGallery(g.id)}
                    className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 transition cursor-pointer"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: ACADEMY STATS MANAGER */}
      {activeTab === 'STATS' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" /> Academy Key Stats & Counters
            </h3>
            <p className="text-xs text-gray-500">Customize the numbers and labels displayed on the website stats counter.</p>
          </div>

          <form onSubmit={handleSaveCMS} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cmsConfig.stats.map((st, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <label className="block text-gray-700 font-bold">Stat #{idx + 1} Label</label>
                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => {
                      const updated = [...cmsConfig.stats];
                      updated[idx].label = e.target.value;
                      setCmsConfig({ ...cmsConfig, stats: updated });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold focus:outline-none focus:border-red-500 shadow-sm"
                  />

                  <label className="block text-gray-700 font-bold pt-1">Displayed Value (e.g. 350+)</label>
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) => {
                      const updated = [...cmsConfig.stats];
                      updated[idx].value = e.target.value;
                      setCmsConfig({ ...cmsConfig, stats: updated });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-red-600 font-black text-lg focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Stats Counters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 6: DOJO BRANCHES & PHOTOS CONFIG */}
      {activeTab === 'BRANCHES' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-600" /> Dojo Branches & Photo Manager
              </h3>
              <p className="text-xs text-gray-500">Upload branch photos, edit branch contact info, timings, sensei head, and google maps locations.</p>
            </div>

            <button
              onClick={() => {
                setEditingBranch(null);
                setBranchForm({
                  id: '',
                  name: '',
                  code: `BAMA-DOJO-0${branchesList.length + 1}`,
                  address: '',
                  phone: '+91 95440 85442',
                  head: 'Sensei Abdul Rahman (5th Dan)',
                  timings: 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
                  mapUrl: '',
                  img: '/assets/prog_adults.jpg',
                  isHeadOffice: false
                });
                setShowBranchModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 hover:from-red-500 hover:to-red-600 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Branch Dojo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branchesList.map((branch) => {
              const branchImg = getBranchPhotoUrl(branch);
              return (
                <div
                  key={branch.id}
                  className="bg-gray-50 border border-gray-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group"
                >
                  {/* Dojo Photo Banner with Upload Button */}
                  <div className="h-44 w-full relative overflow-hidden bg-gray-200">
                    <img
                      src={branchImg}
                      alt={branch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                    
                    {/* Branch Code & Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-black/70 text-amber-300 border border-amber-400/40 backdrop-blur-xs font-mono">
                        {branch.code || 'BAMA-DOJO'}
                      </span>
                      {branch.isHeadOffice && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black font-mono">
                          HEAD OFFICE
                        </span>
                      )}
                    </div>

                    {/* Instant Image Upload Button overlay on photo */}
                    <label
                      className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/80 hover:bg-red-600 text-white rounded-xl text-[11px] font-bold border border-white/30 backdrop-blur-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
                      title="Upload Photo for this Branch"
                    >
                      <Camera className="w-3.5 h-3.5" /> Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        onClick={(e) => { e.target.value = null; }}
                        onChange={(e) => {
                          handleImageFilePick(e, async (dataUrl) => {
                            const updated = branchesList.map(b => b.id === branch.id ? { ...b, image: dataUrl, img: dataUrl, photo: dataUrl } : b);
                            setBranchesList(updated);
                            localStorage.setItem('bama_custom_branches', JSON.stringify(updated));
                            localStorage.setItem('bama_branches', JSON.stringify(updated));
                            await saveBranchImageBackend(branch.id, dataUrl, branch.code, branch.name);
                            const updatedCms = { ...cmsConfig, branches: updated };
                            setCmsConfig(updatedCms);
                            saveCmsConfig(updatedCms).catch(() => {});
                            window.dispatchEvent(new Event('bama_branches_updated'));
                            window.dispatchEvent(new Event('bama_data_updated'));
                            window.dispatchEvent(new Event('cms_updated'));
                            setSaveNotification(true);
                            setTimeout(() => setSaveNotification(false), 3000);
                          });
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Branch Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-black text-sm text-gray-900 group-hover:text-red-600 transition">
                        {branch.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="truncate">{branch.address}</span>
                      </p>
                      <p className="text-[11px] text-gray-600 font-bold flex items-center gap-1 mt-1">
                        <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span>{branch.head || branch.branch_head || 'Sensei In-Charge'}</span>
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{branch.timings}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setEditingBranch(branch);
                          setBranchForm({
                            id: branch.id,
                            name: branch.name,
                            code: branch.code,
                            address: branch.address,
                            phone: branch.phone || '+91 95440 85442',
                            head: branch.head || branch.branch_head || 'Sensei Abdul Rahman',
                            timings: branch.timings || 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
                            mapUrl: branch.mapUrl || '',
                            img: branch.image || branch.img || '/assets/prog_adults.jpg',
                            isHeadOffice: branch.isHeadOffice || false
                          });
                          setShowBranchModal(true);
                        }}
                        className="flex-1 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit Details & Photo
                      </button>

                      <a
                        href="/branches"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        title="View on Website"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Program Course Section */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowProgramModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900">
              {editingProg ? 'Edit Website Course Section' : 'Add New Course Section'}
            </h3>

            <form onSubmit={handleSaveProgram} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LADIES SELF DEFENCE"
                  value={progForm.title}
                  onChange={(e) => setProgForm({ ...progForm, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Course Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Brief overview of course training and benefits..."
                  value={progForm.desc}
                  onChange={(e) => setProgForm({ ...progForm, desc: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-red-500 shadow-sm leading-relaxed"
                />
              </div>

              {/* Course Photo Upload / Picker */}
              <div className="space-y-2">
                <label className="block text-gray-700 font-bold mb-1">Course Cover Image *</label>
                {progForm.img && (
                  <div className="h-32 w-full rounded-xl overflow-hidden border border-gray-300 relative shadow-sm">
                    <img src={progForm.img} alt="Course Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4 text-red-600" /> Upload Image File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFilePick(e, (dataUrl) => setProgForm({ ...progForm, img: dataUrl }))}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">OR</span>
                </div>

                <input
                  type="text"
                  placeholder="Paste Image URL..."
                  value={progForm.img}
                  onChange={(e) => setProgForm({ ...progForm, img: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProgramModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Course Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Photo Gallery Item */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowGalleryModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900">
              {editingGal ? 'Edit Gallery Photo' : 'Add Photo to Public Gallery'}
            </h3>

            <form onSubmit={handleSaveGallery} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Photo Title / Caption *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Belt Exam 2026 Pulikkal Dojo"
                  value={galForm.title}
                  onChange={(e) => setGalForm({ ...galForm, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Category Tag *</label>
                <select
                  value={galForm.category}
                  onChange={(e) => setGalForm({ ...galForm, category: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer shadow-sm"
                >
                  <option value="GRADING">GRADING (Belt Examinations)</option>
                  <option value="COMPETITION">COMPETITION (Championships & Medals)</option>
                  <option value="TRAINING">TRAINING (Dojo Practice Sessions)</option>
                  <option value="EVENTS">EVENTS (Seminars & Inaugrations)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Event highlights or location details..."
                  value={galForm.desc}
                  onChange={(e) => setGalForm({ ...galForm, desc: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-red-500 shadow-sm leading-relaxed"
                />
              </div>

              {/* Photo Upload / Picker */}
              <div className="space-y-2">
                <label className="block text-gray-700 font-bold mb-1">Gallery Photo *</label>
                {galForm.img && (
                  <div className="h-36 w-full rounded-xl overflow-hidden border border-gray-300 relative shadow-sm">
                    <img src={galForm.img} alt="Gallery Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4 text-red-600" /> Upload Image File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFilePick(e, (dataUrl) => setGalForm({ ...galForm, img: dataUrl }))}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">OR</span>
                </div>

                <input
                  type="text"
                  placeholder="Paste Image URL..."
                  value={galForm.img}
                  onChange={(e) => setGalForm({ ...galForm, img: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGalleryModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Save Gallery Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Dojo Branch & Upload Photo */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowBranchModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-red-600" />
              {editingBranch ? `Edit ${editingBranch.name}` : 'Add New Dojo Branch'}
            </h3>
            <p className="text-xs text-gray-500">Configure branch details and upload official dojo photo for public website.</p>

            <form onSubmit={handleSaveBranchCMS} className="space-y-3.5 text-xs">
              {/* Photo Upload & Preview */}
              <div className="space-y-2 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <label className="block text-gray-800 font-black mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-600" /> Official Dojo Photo / Banner *
                </label>

                {branchForm.img && (
                  <div className="h-40 w-full rounded-xl overflow-hidden border border-gray-300 relative shadow-sm">
                    <img src={branchForm.img} alt="Dojo Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <label className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition">
                    <Upload className="w-4 h-4 text-red-600" /> Choose Image File from Device
                    <input
                      type="file"
                      accept="image/*"
                      onClick={(e) => { e.target.value = null; }}
                      onChange={(e) => handleImageFilePick(e, (dataUrl) => setBranchForm(prev => ({ ...prev, img: dataUrl })))}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">OR</span>
                </div>

                <input
                  type="text"
                  placeholder="Paste Image URL..."
                  value={branchForm.img}
                  onChange={(e) => setBranchForm({ ...branchForm, img: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono text-xs focus:outline-none focus:border-red-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Branch Dojo Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pulikkal Branch (Head Office)"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Dojo Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAMA-DOJO-01"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold font-mono focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Branch Head / Sensei *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sensei Abdul Rahman (5th Dan)"
                    value={branchForm.head}
                    onChange={(e) => setBranchForm({ ...branchForm, head: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 95440 85442"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Full Location Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calicut Airport Road, Pulikkal, Malappuram, Kerala - 673637"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Training Batch Timings</label>
                <input
                  type="text"
                  placeholder="e.g. Mon, Wed, Fri: 5:00 PM - 7:00 PM | Sat: 7:00 AM - 9:00 AM"
                  value={branchForm.timings}
                  onChange={(e) => setBranchForm({ ...branchForm, timings: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isHeadOffice"
                  checked={branchForm.isHeadOffice}
                  onChange={(e) => setBranchForm({ ...branchForm, isHeadOffice: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
                <label htmlFor="isHeadOffice" className="text-gray-800 font-bold cursor-pointer">
                  Mark as Head Office & Academy Headquarters
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Branch & Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
