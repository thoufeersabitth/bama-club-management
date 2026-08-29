import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, MapPin, Phone, Mail, Clock, Shield, Check, X, Search,
  UserCheck, Users, ExternalLink, MessageSquare, Edit, Trash2, Award, Calendar,
  Sparkles, Eye, Camera, Upload, Image as ImageIcon
} from 'lucide-react';
import { fetchBranches, fetchStudents, createBranchBackend, updateBranchBackend, deleteBranchBackend, openWhatsApp } from '../../services/api';
import { INITIAL_BRANCHES, SHIFT_OPTIONS } from '../../services/initialData';

const INITIAL_TRAINING_SCHEDULES = [
  {
    id: 'shift-101',
    name: 'Evening Regular Karate Batch',
    branch: 'Pulikkal Branch (Head Office)',
    days: 'Mon, Wed, Fri',
    time: '5:00 PM - 7:00 PM',
    instructor: 'Sensei Abdul Rahman (5th Dan)',
    targetGroup: 'All Belts & Cadets',
    status: 'Active'
  },
  {
    id: 'shift-102',
    name: 'Morning Fitness & Kata Batch',
    branch: 'Pulikkal Branch (Head Office)',
    days: 'Mon, Wed, Fri',
    time: '6:00 AM - 7:30 AM',
    instructor: 'Sensei Rahul Kumar (3rd Dan)',
    targetGroup: 'Adults & Senior Cadets',
    status: 'Active'
  },
  {
    id: 'shift-103',
    name: 'Weekend Intensive Sparring & Belt Camp',
    branch: 'Pulikkal Branch (Head Office)',
    days: 'Sat & Sun',
    time: '7:00 AM - 9:00 AM',
    instructor: 'Sensei Abdul Rahman (5th Dan)',
    targetGroup: 'Green Belt & Above',
    status: 'Active'
  },
  {
    id: 'shift-104',
    name: 'Chungam Evening Karate & Kickboxing',
    branch: 'Chungam Branch Dojo',
    days: 'Tue, Thu, Sat',
    time: '5:30 PM - 7:30 PM',
    instructor: 'Sensei Rahul Kumar (3rd Dan)',
    targetGroup: 'Kids & Beginners',
    status: 'Active'
  },
  {
    id: 'shift-105',
    name: 'Mongam Dawn Kickboxing Batch',
    branch: 'Mongam Branch Dojo',
    days: 'Mon, Wed, Fri',
    time: '6:00 AM - 7:30 AM',
    instructor: 'Sensei Muhammed Haneen (2nd Dan)',
    targetGroup: 'All Cadets',
    status: 'Active'
  }
];

export default function BranchManagement() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [schedules, setSchedules] = useState(() => {
    try {
      const stored = localStorage.getItem('bama_training_schedules');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return INITIAL_TRAINING_SCHEDULES;
  });
  
  const [activeTab, setActiveTab] = useState('BRANCHES'); // 'BRANCHES' | 'SCHEDULES'
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [viewShiftDetails, setViewShiftDetails] = useState(null);
  const [shiftRosterSearch, setShiftRosterSearch] = useState('');

  // Branch Form Data
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '+91 95440 85442',
    whatsapp: '+91 95440 85442',
    email: '',
    branch_head: 'Sensei Abdul Rahman (5th Dan)',
    timings: 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
    facilities: '🥋 Tatami Safety Mats, 🥊 Punching Heavy Bags, ❄️ AC Dojo Hall',
    mapUrl: '',
    image: '/assets/prog_adults.jpg',
    isHeadOffice: false
  });

  // Shift Form Data
  const [shiftData, setShiftData] = useState({
    name: '',
    branch: 'Pulikkal Branch (Head Office)',
    days: 'Mon, Wed, Fri',
    time: '5:00 PM - 7:00 PM',
    instructor: 'Sensei Abdul Rahman (5th Dan)',
    targetGroup: 'All Belts & Cadets'
  });

  // Smart Image Compression & Conversion to Base64
  const handleImageFilePick = (e, callback) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target.result;
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width || 800;
            let height = img.height || 600;
            const maxDim = 900;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
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

  useEffect(() => {
    fetchBranches().then(data => {
      if (data && data.length > 0) {
        setBranches(data);
      } else {
        setBranches(INITIAL_BRANCHES);
      }
    });

    fetchStudents().then(stds => setStudentsList(stds || []));
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      code: `BAMA-DOJO-0${branches.length + 1}`,
      address: '',
      phone: '+91 95440 85442',
      whatsapp: '+91 95440 85442',
      email: '',
      branch_head: 'Sensei Abdul Rahman (5th Dan)',
      timings: 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
      facilities: '🥋 Tatami Safety Mats, 🥊 Punching Heavy Bags, ❄️ AC Dojo Hall',
      mapUrl: '',
      image: '/assets/prog_adults.jpg',
      isHeadOffice: false
    });
  };

  const handleCreateOrUpdateBranch = async (e) => {
    e.preventDefault();
    const facilityArray = typeof formData.facilities === 'string'
      ? formData.facilities.split(',').map(f => f.trim()).filter(Boolean)
      : formData.facilities;

    const photoUrl = formData.image || '/assets/prog_adults.jpg';

    let updatedList = [];
    if (editBranch) {
      const updatedItem = {
        ...editBranch,
        ...formData,
        facilities: facilityArray,
        image: photoUrl,
        img: photoUrl,
        photo: photoUrl
      };
      updatedList = branches.map(b => b.id === editBranch.id ? updatedItem : b);
      updateBranchBackend(editBranch.id, updatedItem).catch(() => {});
    } else {
      const newB = {
        id: `branch-${Date.now()}`,
        ...formData,
        facilities: facilityArray,
        image: photoUrl,
        img: photoUrl,
        photo: photoUrl,
        status: 'Active'
      };
      
      const serverCreated = await createBranchBackend(newB);
      const finalBranch = serverCreated?.id ? serverCreated : newB;
      updatedList = [...branches, finalBranch];
    }

    setBranches(updatedList);
    localStorage.setItem('bama_custom_branches', JSON.stringify(updatedList));
    localStorage.setItem('bama_branches', JSON.stringify(updatedList));
    window.dispatchEvent(new Event('bama_branches_updated'));
    window.dispatchEvent(new Event('bama_data_updated'));

    setShowAddModal(false);
    setEditBranch(null);
    resetForm();
  };

  const handleCreateOrUpdateShift = (e) => {
    e.preventDefault();
    let updated = [];
    if (editShift) {
      updated = schedules.map(s => s.id === editShift.id ? { ...s, ...shiftData } : s);
    } else {
      const newS = {
        id: `shift-${Date.now()}`,
        ...shiftData,
        status: 'Active'
      };
      updated = [...schedules, newS];
    }
    setSchedules(updated);
    localStorage.setItem('bama_training_schedules', JSON.stringify(updated));
    setShowShiftModal(false);
    setEditShift(null);
  };

  const openEdit = (b) => {
    setEditBranch(b);
    setFormData({
      name: b.name || '',
      code: b.code || '',
      address: b.address || '',
      phone: b.phone || '+91 95440 85442',
      whatsapp: b.whatsapp || b.phone || '+91 95440 85442',
      email: b.email || '',
      branch_head: b.branch_head || b.head || 'Sensei Abdul Rahman (5th Dan)',
      timings: b.timings || 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
      facilities: Array.isArray(b.facilities) ? b.facilities.join(', ') : (b.facilities || ''),
      mapUrl: b.mapUrl || '',
      image: b.image || b.img || b.photo || '/assets/prog_adults.jpg',
      isHeadOffice: !!b.isHeadOffice
    });
    setShowAddModal(true);
  };

  const openEditShift = (s) => {
    setEditShift(s);
    setShiftData({
      name: s.name || '',
      branch: s.branch || 'Pulikkal Branch (Head Office)',
      days: s.days || 'Mon, Wed, Fri',
      time: s.time || '5:00 PM - 7:00 PM',
      instructor: s.instructor || 'Sensei Abdul Rahman (5th Dan)',
      targetGroup: s.targetGroup || 'All Belts & Cadets'
    });
    setShowShiftModal(true);
  };

  const handleDeleteBranch = async (id) => {
    if (window.confirm('Are you sure you want to delete this Branch Dojo?')) {
      deleteBranchBackend(id).catch(() => {});
      const updatedList = branches.filter(b => b.id !== id);
      setBranches(updatedList);
      localStorage.setItem('bama_custom_branches', JSON.stringify(updatedList));
      localStorage.setItem('bama_branches', JSON.stringify(updatedList));
      window.dispatchEvent(new Event('bama_branches_updated'));
      window.dispatchEvent(new Event('bama_data_updated'));
    }
  };

  const handleDeleteShift = (id) => {
    if (window.confirm('Are you sure you want to delete this training shift schedule?')) {
      const updated = schedules.filter(s => s.id !== id);
      setSchedules(updated);
      localStorage.setItem('bama_training_schedules', JSON.stringify(updated));
    }
  };

  const sendShiftWhatsAppNotice = (sch) => {
    const text = encodeURIComponent(
      `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
      `📢 *TRAINING BATCH SHIFT SCHEDULE NOTICE*\n` +
      `📌 *Batch Shift:* ${sch.name}\n` +
      `🏢 *Dojo Branch:* ${sch.branch}\n` +
      `📅 *Training Days:* ${sch.days}\n` +
      `⏰ *Batch Timings:* ${sch.time}\n` +
      `👤 *Sensei:* ${sch.instructor}\n` +
      `🎯 *Target Cadets:* ${sch.targetGroup}\n\n` +
      `Dear Parent, please report on time in clean Karate Gi. Confirm participation with your Sensei. OSS 🥋`
    );
    openWhatsApp({ message: text });
  };

  // Filtered branches & schedules
  const filteredBranches = branches.filter(b => {
    const q = search.toLowerCase();
    return (
      (b.name || '').toLowerCase().includes(q) ||
      (b.code || '').toLowerCase().includes(q) ||
      (b.branch_head || '').toLowerCase().includes(q) ||
      (b.address || '').toLowerCase().includes(q)
    );
  });

  const filteredSchedules = schedules.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.branch || '').toLowerCase().includes(q) ||
      (s.instructor || '').toLowerCase().includes(q) ||
      (s.days || '').toLowerCase().includes(q)
    );
  });

  // Calculate cadet count per branch with 100% Bulletproof Fuzzy Matching
  // Calculate cadet count per branch with 100% Exact & Smart Fuzzy Matching
  const getBranchCadetCount = (branchName) => {
    if (!branchName) return 0;
    let roster = studentsList;
    if (!roster || roster.length === 0) {
      try {
        const saved = localStorage.getItem('bama_students_list');
        if (saved) roster = JSON.parse(saved);
      } catch (e) {}
    }
    if (!roster || roster.length === 0) return 0;

    const bStr = String(branchName).toLowerCase().trim();

    return roster.filter(s => {
      const cadetBranch = String(
        s.branch_name ||
        s.branch_detail?.name ||
        s.branchName ||
        (typeof s.branch === 'object' ? s.branch?.name : s.branch) ||
        ''
      ).toLowerCase().trim();

      if (!cadetBranch) {
        // Unassigned default cadets match Head Office (Pulikkal)
        return bStr.includes('pulikkal') || bStr.includes('head office');
      }

      if (bStr.includes('pulikkal') || bStr.includes('head office')) {
        return cadetBranch.includes('pulikkal') || cadetBranch.includes('head office') || cadetBranch === 'pulikkal';
      }

      if (bStr.includes('chungam')) return cadetBranch.includes('chungam');
      if (bStr.includes('mongam')) return cadetBranch.includes('mongam');
      if (bStr.includes('feroke')) return cadetBranch.includes('feroke');

      return cadetBranch === bStr || cadetBranch.includes(bStr) || bStr.includes(cadetBranch);
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Executive Light White Header Banner */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 hover:shadow-md transition-all duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200/80 uppercase">
              Dojo Network & Shift Manager
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 font-mono">
              Active Dojos: {branches.length} • Batches: {schedules.length}
            </span>
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-600" /> Branch Dojos & Training Shift Schedules
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Configure dojo locations, chief instructors, active training shifts, batch timing schedules, and contact details.
          </p>
        </div>

        {/* Primary Action Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold flex-shrink-0">
          <button
            onClick={() => setActiveTab('BRANCHES')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'BRANCHES' ? 'bg-red-600 text-white font-black shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏬 Branch Dojos ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('SCHEDULES')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              activeTab === 'SCHEDULES' ? 'bg-red-600 text-white font-black shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⏰ Training Schedules & Batches ({schedules.length})
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-red-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">BRANCH DOJOS</span>
            <strong className="text-xl font-black text-gray-900 leading-none block mt-0.5">{branches.length} Active</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">BATCH TIMING SHIFTS</span>
            <strong className="text-xl font-black text-amber-600 leading-none block mt-0.5">{schedules.length} Batches</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ENROLLED CADETS</span>
            <strong className="text-xl font-black text-emerald-600 leading-none block mt-0.5">{studentsList.length} Cadets</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">CHIEF SENSEIS</span>
            <strong className="text-xl font-black text-blue-600 leading-none block mt-0.5">{branches.filter(b => b.branch_head).length} Senseis</strong>
          </div>
        </div>
      </div>

      {/* Sleek Single-Line Search Toolbar & Actions */}
      <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-3 text-xs overflow-x-auto">
        <div className="relative w-64 sm:w-80 flex-shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder={activeTab === 'BRANCHES' ? "Search dojos by name, code, sensei..." : "Search batch timings, days, instructor..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition shadow-sm font-medium"
          />
        </div>

        <div className="flex items-center gap-2 flex-nowrap flex-shrink-0 justify-end ml-auto">
          {activeTab === 'BRANCHES' ? (
            <button
              onClick={() => { resetForm(); setEditBranch(null); setShowAddModal(true); }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Branch Dojo
            </button>
          ) : (
            <button
              onClick={() => {
                setEditShift(null);
                setShiftData({
                  name: '',
                  branch: 'Pulikkal Branch (Head Office)',
                  days: 'Mon, Wed, Fri',
                  time: '5:00 PM - 7:00 PM',
                  instructor: 'Sensei Abdul Rahman (5th Dan)',
                  targetGroup: 'All Belts & Cadets'
                });
                setShowShiftModal(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Training Shift Schedule
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: EXECUTIVE BRANCH DOJOS GRID */}
      {activeTab === 'BRANCHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((b) => {
            const cadetCount = getBranchCadetCount(b.name);
            const facList = Array.isArray(b.facilities) ? b.facilities : (b.facilities || '').split(',').map(f => f.trim()).filter(Boolean);
            const branchImg = b.image || b.img || b.photo || (b.isHeadOffice ? '/assets/prog_adults.jpg' : '/assets/prog_kids.jpg');

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-xl hover:border-red-300 transition-all duration-200 relative group overflow-hidden"
              >
                {/* Branch Photo Header */}
                <div className="h-44 w-full relative rounded-2xl overflow-hidden bg-gray-200 border border-gray-100 shadow-inner">
                  <img
                    src={branchImg}
                    alt={b.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-black/70 text-amber-300 border border-amber-400/40 backdrop-blur-xs font-mono">
                      {b.code || 'BAMA-DOJO'}
                    </span>
                    {b.isHeadOffice && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black font-mono">
                        HEAD OFFICE
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-black text-gray-900 leading-snug group-hover:text-red-600 transition">
                      {b.name}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold flex items-center gap-1 mt-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>Chief Instructor: {b.branch_head || 'Sensei Abdul Rahman (5th Dan)'}</span>
                    </p>
                  </div>

                  {/* Enrolled Cadets Pill */}
                  <div className="p-3 bg-gradient-to-r from-red-50 to-amber-50 border border-red-100 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-bold flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-red-600" /> Enrolled Cadets:
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/portal/students?branch=${encodeURIComponent(b.name)}`)}
                      className="text-xs font-black text-red-700 bg-white px-3 py-1 rounded-xl border border-red-200 shadow-xs hover:bg-red-600 hover:text-white transition flex items-center gap-1 cursor-pointer"
                      title="Click to view all enrolled cadets in this branch"
                    >
                      <span>{cadetCount} Cadets</span>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Contact & Address Box */}
                  <div className="space-y-2 text-xs text-gray-700 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200">
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-gray-800 leading-relaxed">{b.address}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span className="font-mono font-bold text-gray-900">{b.phone || '+91 95440 85442'}</span>
                    </p>
                    <p className="flex items-start gap-2 pt-1 border-t border-gray-200/80">
                      <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-gray-800">{b.timings || 'Mon, Wed, Fri: 5:00 PM - 7:00 PM'}</span>
                    </p>
                  </div>

                  {/* Facilities Badges */}
                  {facList.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">DOJO FACILITIES:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {facList.map((fac, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-[10px] border border-gray-200">
                            {fac}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(b)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Dojo
                    </button>
                    {!b.isHeadOffice && (
                      <button
                        onClick={() => handleDeleteBranch(b.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl transition cursor-pointer shadow-xs"
                        title="Delete Branch Dojo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <a
                    href={b.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Map <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TRAINING SHIFT SCHEDULES & BATCH TIMINGS */}
      {activeTab === 'SCHEDULES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchedules.map((sch) => (
            <div
              key={sch.id}
              className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-black text-[11px] rounded-xl font-mono">
                    {sch.branch}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] rounded-full">
                    {sch.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-gray-900 leading-snug">{sch.name}</h3>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                    <Shield className="w-3.5 h-3.5 text-red-600" />
                    <span>Sensei: {sch.instructor}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                  <p className="flex items-center gap-2 font-bold text-gray-800">
                    <Calendar className="w-4 h-4 text-red-600" />
                    <span>Days: {sch.days}</span>
                  </p>
                  <p className="flex items-center gap-2 font-bold text-gray-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Timings: {sch.time}</span>
                  </p>
                  <p className="flex items-center gap-2 text-gray-600 pt-1 border-t border-gray-200">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Target: {sch.targetGroup}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditShift(sch)}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => sendShiftWhatsAppNotice(sch)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Send WhatsApp Notice to Parents"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Notice
                  </button>
                  <button
                    onClick={() => handleDeleteShift(sch.id)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl transition cursor-pointer shadow-xs"
                    title="Delete Training Shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Create / Edit Branch Dojo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  {editBranch ? `Edit Branch: ${editBranch.name}` : 'Add New Branch Dojo'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">Configure branch dojo photo, address, sensei, timings & facilities.</p>
              </div>
            </div>

            <form onSubmit={handleCreateOrUpdateBranch} className="space-y-3.5 text-xs">
              {/* Photo Upload & Preview */}
              <div className="space-y-2 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <label className="block text-gray-800 font-black mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-600" /> Official Dojo Photo / Banner *
                </label>

                {formData.image && (
                  <div className="h-36 w-full rounded-xl overflow-hidden border border-gray-300 relative shadow-sm">
                    <img src={formData.image} alt="Dojo Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <label className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition">
                    <Upload className="w-4 h-4 text-red-600" /> Upload Image File from Device
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFilePick(e, (dataUrl) => setFormData({ ...formData, image: dataUrl }))}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">OR</span>
                </div>

                <input
                  type="text"
                  placeholder="Paste Image URL..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono text-xs focus:outline-none focus:border-red-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manjeri Branch Dojo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 font-bold text-xs shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Dojo Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="BAMA-DOJO-04"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Chief Instructor / Sensei *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sensei Rahul Kumar (3rd Dan)"
                    value={formData.branch_head}
                    onChange={(e) => setFormData({ ...formData, branch_head: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Full Location Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Street, Junction, Landmark, District, Pincode..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 font-medium shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>Training Batch Shift Timings *</span>
                  <span className="text-[10px] text-amber-800 font-black bg-amber-100 px-2 py-0.5 rounded border border-amber-300">⚡ Multi-Shift Supported</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mon, Wed, Fri: 5:00 PM - 7:00 PM | Sat & Sun: 7:00 AM - 9:00 AM"
                  value={formData.timings}
                  onChange={(e) => setFormData({ ...formData, timings: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-sm text-xs sm:text-sm mb-2"
                />
                
                {/* ⚡ Quick Preset Shift Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-500 font-bold self-center">⚡ Add Presets:</span>
                  {[
                    'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
                    'Mon, Wed, Fri: 6:00 AM - 7:30 AM',
                    'Tue, Thu, Sat: 5:30 PM - 7:30 PM',
                    'Sat & Sun: 7:00 AM - 9:00 AM',
                    'Mon - Fri: 4:00 PM - 5:00 PM'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        if (!formData.timings || formData.timings === 'Mon, Wed, Fri: 5:00 PM - 7:00 PM') {
                          setFormData({ ...formData, timings: preset });
                        } else if (!formData.timings.includes(preset)) {
                          setFormData({ ...formData, timings: `${formData.timings} | ${preset}` });
                        }
                      }}
                      className="text-[10px] bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-lg border border-red-200 transition cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Facilities & Equipment (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="🥋 Tatami Safety Mats, 🥊 Punching Heavy Bags, ❄️ AC Dojo Hall"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 font-medium shadow-sm"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between mb-1 gap-1">
                  <label className="text-gray-700 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span>Google Maps Location Link / Directions URL</span>
                  </label>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((formData.name || '') + ' ' + (formData.address || 'Malappuram Kerala'))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-lg border border-red-200 transition flex items-center gap-1 cursor-pointer"
                    title="Open Google Maps in a new tab to find/pick exact dojo location"
                  >
                    <span>🔍 Open Google Maps to Pick Location</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. https://maps.app.goo.gl/... or paste Google Maps link"
                    value={formData.mapUrl}
                    onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 font-medium shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const autoUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((formData.name || '') + ' ' + (formData.address || 'Malappuram Kerala'))}`;
                      setFormData({ ...formData, mapUrl: autoUrl });
                    }}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] rounded-xl flex-shrink-0 transition cursor-pointer shadow-xs whitespace-nowrap"
                    title="Auto-fill Google Maps search link based on branch name & address"
                  >
                    ⚡ Auto-Fill Link
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 font-medium mt-1">
                  💡 Click <b>"🔍 Open Google Maps"</b> to pick exact location & paste link, or click <b>"⚡ Auto-Fill Link"</b> for automatic map search link.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isHeadOffice"
                  checked={formData.isHeadOffice}
                  onChange={(e) => setFormData({ ...formData, isHeadOffice: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded accent-red-600 cursor-pointer"
                />
                <label htmlFor="isHeadOffice" className="text-gray-900 font-bold cursor-pointer">
                  Mark as Primary Head Office Dojo
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4" /> {editBranch ? 'Save Changes' : 'Create Dojo Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Training Shift Schedule */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowShiftModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  {editShift ? 'Edit Training Shift Schedule' : 'Add New Training Shift Schedule'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">Configure batch shift timing, training days & instructor.</p>
              </div>
            </div>

            <form onSubmit={handleCreateOrUpdateShift} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Shift Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Evening Regular Karate Batch"
                  value={shiftData.name}
                  onChange={(e) => setShiftData({ ...shiftData, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Assigned Dojo Branch *</label>
                <select
                  value={shiftData.branch}
                  onChange={(e) => setShiftData({ ...shiftData, branch: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Training Days *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mon, Wed, Fri"
                    value={shiftData.days}
                    onChange={(e) => setShiftData({ ...shiftData, days: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Batch Timings *</label>
                  <input
                    type="text"
                    required
                    placeholder="5:00 PM - 7:00 PM"
                    value={shiftData.time}
                    onChange={(e) => setShiftData({ ...shiftData, time: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Lead Instructor / Sensei</label>
                <input
                  type="text"
                  required
                  value={shiftData.instructor}
                  onChange={(e) => setShiftData({ ...shiftData, instructor: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Cadet Group</label>
                <input
                  type="text"
                  placeholder="e.g. All Belts / Beginners / Green Belt & Above"
                  value={shiftData.targetGroup}
                  onChange={(e) => setShiftData({ ...shiftData, targetGroup: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4" /> {editShift ? 'Save Shift Schedule' : 'Create Training Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
