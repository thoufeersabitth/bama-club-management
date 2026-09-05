import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, MapPin, Phone, Mail, Clock, Shield, Check, X, Search,
  UserCheck, Users, ExternalLink, MessageSquare, Edit, Trash2, Award, Calendar,
  Sparkles, Eye, Camera, Upload, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { fetchBranches, fetchTrainingSchedules, fetchStudents, createBranchBackend, updateBranchBackend, deleteBranchBackend, saveBranchImageBackend, createTrainingScheduleBackend, updateTrainingScheduleBackend, deleteTrainingScheduleBackend, saveTrainingSchedulesBackend, filterOutDummyShifts, openWhatsApp, generateUniqueBranchCode, safeLocalStorageSet } from '../../services/api';
import { INITIAL_BRANCHES, SHIFT_OPTIONS, PROGRAM_OPTIONS } from '../../services/initialData';

export default function BranchManagement() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [syncingSchedules, setSyncingSchedules] = useState(false);
  const [schedules, setSchedules] = useState(() => {
    try {
      const stored = localStorage.getItem('bama_training_schedules');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return filterOutDummyShifts(parsed);
      }
    } catch (e) {}
    return [];
  });
  
  const [activeTab, setActiveTab] = useState('BRANCHES'); // 'BRANCHES' | 'SCHEDULES'
  const [search, setSearch] = useState('');
  const [scheduleBranchFilter, setScheduleBranchFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [savingBranch, setSavingBranch] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(null);

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editShift, setEditShift] = useState(null);
  const [viewShiftDetails, setViewShiftDetails] = useState(null);
  const [shiftRosterSearch, setShiftRosterSearch] = useState('');

  // Roster Modal State
  const [rosterModal, setRosterModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    branchName: '',
    cadets: []
  });
  const [rosterSearch, setRosterSearch] = useState('');

  // Interactive Multi-Shift Builder Input in Branch Modal
  const [customShiftInput, setCustomShiftInput] = useState({
    days: 'Mon, Wed, Fri',
    time: '5:00 PM - 7:00 PM'
  });

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
    program: 'Karate (Shotokan)',
    branch: 'Pulikkal Branch (Head Office)',
    days: 'Mon, Wed, Fri',
    time: '5:00 PM - 7:00 PM',
    instructor: 'Sensei Abdul Rahman (5th Dan)',
    targetGroup: 'All Belts & Cadets'
  });

  // Smart Image Auto-Crop to 16:9 Banner, High-Def Compression & Base64
  const handleImageFilePick = (e, callback) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target.result;
        const img = new Image();
        img.onload = () => {
          try {
            const targetWidth = 600;
            const targetHeight = 338; // Standard 16:9 widescreen banner
            const targetAspect = targetWidth / targetHeight;
            const sourceAspect = img.width / img.height;

            let sx = 0;
            let sy = 0;
            let sWidth = img.width;
            let sHeight = img.height;

            // Smart Center Crop calculation:
            if (sourceAspect > targetAspect) {
              // Source is wider than 16:9 -> trim extra left/right
              sWidth = Math.round(img.height * targetAspect);
              sx = Math.round((img.width - sWidth) / 2);
            } else {
              // Source is taller than 16:9 (e.g. portrait/vertical phone photos) -> trim extra top/bottom
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

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
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
    // Proactively free megabytes from bloated duplicate storage keys
    try {
      ['bama_cadets_roster', 'bama_students', 'bama_cadets', 'bama_staff', 'bama_all_users', 'bama_backup_data'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {}

    const loadAll = () => {
      fetchBranches().then(data => {
        if (data && data.length > 0) {
          setBranches(data);
        } else {
          setBranches(INITIAL_BRANCHES);
        }
      });

      fetchTrainingSchedules().then(schs => {
        const cleanedShifts = filterOutDummyShifts(schs || []);
        setSchedules(cleanedShifts);
        if (cleanedShifts.length > 0) {
          saveTrainingSchedulesBackend(cleanedShifts).catch(() => {});
        }
      });

      fetchStudents().then(stds => setStudentsList(stds || []));
    };

    loadAll();
    window.addEventListener('bama_data_updated', loadAll);
    window.addEventListener('bama_branches_updated', loadAll);
    window.addEventListener('bama_schedules_updated', loadAll);
    window.addEventListener('storage', loadAll);
    return () => {
      window.removeEventListener('bama_data_updated', loadAll);
      window.removeEventListener('bama_branches_updated', loadAll);
      window.removeEventListener('bama_schedules_updated', loadAll);
      window.removeEventListener('storage', loadAll);
    };
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      code: generateUniqueBranchCode(branches),
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
    setSavingBranch(true);
    setBannerMessage(null);
    try {
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
          image: photoUrl || editBranch.image,
          img: photoUrl || editBranch.img,
          photo: photoUrl || editBranch.photo
        };
        if (photoUrl && !photoUrl.startsWith('/assets/')) {
          saveBranchImageBackend(editBranch.id, photoUrl, updatedItem.code, updatedItem.name).catch(() => {});
        }
        updatedList = branches.map(b => b.id === editBranch.id ? updatedItem : b);
        updateBranchBackend(editBranch.id, updatedItem).catch(() => {});
        setBannerMessage({ type: 'success', text: `Branch "${formData.name}" updated successfully!` });
      } else {
        // Prevent duplicate branch names (case-insensitive)
        const nameDuplicate = branches.find(b => b.name?.trim().toLowerCase() === formData.name?.trim().toLowerCase());
        if (nameDuplicate) {
          alert(`A branch named "${formData.name}" already exists! Please enter a distinct name.`);
          setSavingBranch(false);
          return;
        }

        // Ensure a collision-free code
        let bCode = formData.code?.trim();
        const existingCodes = new Set(branches.map(b => String(b.code || '').toUpperCase().trim()));
        if (!bCode || existingCodes.has(bCode.toUpperCase())) {
          bCode = generateUniqueBranchCode(branches);
        }

        const newB = {
          id: `branch-${Date.now()}`,
          ...formData,
          code: bCode,
          facilities: facilityArray,
          image: photoUrl,
          img: photoUrl,
          photo: photoUrl,
          status: 'Active'
        };
        
        const serverResult = await createBranchBackend(newB);
        if (serverResult?.error) {
          const cleanMsg = typeof serverResult.message === 'string' && !serverResult.message.includes('<')
            ? serverResult.message
            : 'Connection was momentarily reconnecting to database. Please tap "Save Branch Dojo" once more.';
          setBannerMessage({ type: 'error', text: cleanMsg });
          alert(`⚠️ ${cleanMsg}`);
          setSavingBranch(false);
          return;
        }

        const finalBranch = {
          ...newB,
          ...(serverResult?.id ? serverResult : {}),
          image: photoUrl || newB.image,
          img: photoUrl || newB.img,
          photo: photoUrl || newB.photo
        };
        if (photoUrl && !photoUrl.startsWith('/assets/')) {
          saveBranchImageBackend(finalBranch.id, photoUrl, finalBranch.code, finalBranch.name).catch(() => {});
        }
        updatedList = [...branches.filter(b => b.id !== finalBranch.id), finalBranch];
        setBannerMessage({ type: 'success', text: `Branch "${formData.name}" created successfully (Code: ${bCode})!` });
      }

      setBranches(updatedList);
      try {
        safeLocalStorageSet('bama_custom_branches', updatedList);
        safeLocalStorageSet('bama_branches', updatedList);
      } catch (storageErr) {
        console.warn('Storage sync warning:', storageErr);
      }

      window.dispatchEvent(new Event('bama_branches_updated'));
      window.dispatchEvent(new Event('bama_data_updated'));

      setShowAddModal(false);
      setEditBranch(null);
      resetForm();
    } catch (err) {
      console.error('Failed to save branch:', err);
      if (String(err.message || '').toLowerCase().includes('quota') || String(err.message || '').toLowerCase().includes('storage')) {
        // Backend creation already succeeded, dismiss modal smoothly without error popup
        setShowAddModal(false);
        setEditBranch(null);
        resetForm();
      } else {
        alert(`Error saving branch: ${err.message || 'Unknown error'}`);
        setBannerMessage({ type: 'error', text: `Error: ${err.message || 'Unknown error'}` });
      }
    } finally {
      setSavingBranch(false);
    }
  };

  const handleCreateOrUpdateShift = async (e) => {
    e.preventDefault();
    const finalShiftName = shiftData.name?.trim() || `${shiftData.branch || 'Dojo'} (${shiftData.time || shiftData.days || 'Regular Batch'})`;
    const cleanShiftData = {
      ...shiftData,
      name: finalShiftName
    };

    let updated = [];
    if (editShift) {
      const updatedItem = { ...editShift, ...cleanShiftData };
      updated = schedules.map(s => s.id === editShift.id ? updatedItem : s);
      await updateTrainingScheduleBackend(editShift.id, updatedItem);
    } else {
      const newS = {
        id: `shift-${Date.now()}`,
        ...cleanShiftData,
        status: 'Active'
      };
      await createTrainingScheduleBackend(newS);
      updated = [...schedules.filter(s => s.id !== newS.id), newS];
    }
    setSchedules(updated);
    localStorage.setItem('bama_training_schedules', JSON.stringify(updated));
    await saveTrainingSchedulesBackend(updated);
    window.dispatchEvent(new Event('bama_schedules_updated'));
    window.dispatchEvent(new Event('bama_data_updated'));
    setShowShiftModal(false);
    setEditShift(null);
  };

  const handleCloudSyncSchedules = async () => {
    setSyncingSchedules(true);
    setBannerMessage(null);
    try {
      if (schedules.length > 0) {
        await saveTrainingSchedulesBackend(schedules);
      }
      const latest = await fetchTrainingSchedules();
      const cleaned = filterOutDummyShifts(latest || []);
      setSchedules(cleaned);
      localStorage.setItem('bama_training_schedules', JSON.stringify(cleaned));
      window.dispatchEvent(new Event('bama_schedules_updated'));
      window.dispatchEvent(new Event('bama_data_updated'));
      setBannerMessage({
        type: 'success',
        text: `Cloud Sync Complete: ${cleaned.length} training batch schedule(s) synchronized across phone & laptop!`
      });
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: `Sync error: ${err.message || 'Failed to sync with cloud'}`
      });
    } finally {
      setSyncingSchedules(false);
    }
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
      program: s.program || s.course || s.discipline || 'Karate (Shotokan)',
      branch: s.branch || 'Pulikkal Branch (Head Office)',
      days: s.days || 'Mon, Wed, Fri',
      time: s.time || '5:00 PM - 7:00 PM',
      instructor: s.instructor || 'Sensei Abdul Rahman (5th Dan)',
      targetGroup: s.targetGroup || 'All Belts & Cadets'
    });
    setShowShiftModal(true);
  };

  const handleDeleteBranch = async (id) => {
    const targetBranch = branches.find(b => b.id === id);
    const branchName = targetBranch?.name || 'this Branch Dojo';
    const isHeadOffice = !!(targetBranch?.is_head_office || targetBranch?.isHeadOffice || targetBranch?.code === 'PLK-01');
    
    if (isHeadOffice) {
      alert('⚠️ The Primary Head Office Dojo cannot be deleted.');
      return;
    }

    const cadetCount = getBranchCadetCount(targetBranch);
    let confirmMsg = `Are you sure you want to permanently delete "${branchName}" from the database?`;
    if (cadetCount > 0) {
      confirmMsg = `⚠️ WARNING: "${branchName}" has ${cadetCount} enrolled cadet(s)!\n\nDeleting this branch will remove it permanently from the PostgreSQL database and mark these cadets as unassigned.\n\nAre you sure you want to proceed?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      setBannerMessage({ type: 'info', text: `Deleting "${branchName}" from database...` });
      await deleteBranchBackend(id, branchName);
      const updatedList = branches.filter(b => b.id !== id && b.name !== branchName);
      setBranches(updatedList);
      safeLocalStorageSet('bama_custom_branches', updatedList);
      safeLocalStorageSet('bama_branches', updatedList);
      window.dispatchEvent(new Event('bama_branches_updated'));
      window.dispatchEvent(new Event('bama_data_updated'));
      setBannerMessage({ type: 'success', text: `Branch "${branchName}" was permanently deleted from database!` });
    } catch (err) {
      console.error('Failed to delete branch:', err);
      setBannerMessage({ type: 'error', text: `Failed to delete branch: ${err.message || 'Server error'}` });
    }
  };

  const handleDeleteShift = async (id) => {
    const targetShift = schedules.find(s => s.id === id);
    const shiftName = targetShift?.name || '';
    if (window.confirm(`Are you sure you want to delete "${shiftName || 'this training shift schedule'}"?`)) {
      const updated = schedules.filter(s => s.id !== id && s.name !== shiftName);
      setSchedules(updated);
      localStorage.setItem('bama_training_schedules', JSON.stringify(updated));
      await deleteTrainingScheduleBackend(id, shiftName);
      await saveTrainingSchedulesBackend(updated);
      window.dispatchEvent(new Event('bama_schedules_updated'));
      window.dispatchEvent(new Event('bama_data_updated'));
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
    const matchesSearch = (
      (s.name || '').toLowerCase().includes(q) ||
      (s.branch || '').toLowerCase().includes(q) ||
      (s.instructor || '').toLowerCase().includes(q) ||
      (s.days || '').toLowerCase().includes(q) ||
      (s.time || '').toLowerCase().includes(q)
    );
    if (!matchesSearch) return false;
    if (scheduleBranchFilter && scheduleBranchFilter !== 'ALL') {
      const sBranch = String(s.branch || s.branch_name || '').toLowerCase().trim();
      const targetB = String(scheduleBranchFilter).toLowerCase().trim();
      return sBranch === targetB || sBranch.includes(targetB) || targetB.includes(sBranch);
    }
    return true;
  });

  // Parse timings string to individual slots array
  const getBranchTimingSlots = (timingsStr) => {
    if (!timingsStr || String(timingsStr).trim() === '') return [];
    return String(timingsStr).split('|').map(s => s.trim()).filter(Boolean);
  };

  const handleAddShiftToBranchForm = (slotToAdd) => {
    if (!slotToAdd || !slotToAdd.trim()) return;
    const cleanSlot = slotToAdd.trim();
    const currentSlots = getBranchTimingSlots(formData.timings);
    if (!currentSlots.includes(cleanSlot)) {
      const updated = [...currentSlots, cleanSlot];
      setFormData(prev => ({ ...prev, timings: updated.join(' | ') }));
    }
  };

  const handleRemoveShiftFromBranchForm = (slotToRemove) => {
    const currentSlots = getBranchTimingSlots(formData.timings);
    const updated = currentSlots.filter(s => s !== slotToRemove);
    setFormData(prev => ({ ...prev, timings: updated.join(' | ') }));
  };

  // Bulletproof cadet resolution for Branch or Shift Batch with strict UUID & Code isolation
  const getBranchCadets = (b, shiftFilter = null) => {
    if (!b) return [];
    let roster = studentsList;
    if (!roster || roster.length === 0) {
      try {
        const saved = localStorage.getItem('bama_students_list') || localStorage.getItem('bama_cadets_roster');
        if (saved) roster = JSON.parse(saved);
      } catch (e) {}
    }
    if (!roster || !Array.isArray(roster) || roster.length === 0) return [];

    const bObj = typeof b === 'object' ? b : branches.find(br => br.name === b || br.id === b || br.code === b) || { name: String(b) };
    const bName = String(bObj.name || (typeof b === 'string' ? b : '')).toLowerCase().trim();
    const bId = String(bObj.id || '').toLowerCase().trim();
    const bCode = String(bObj.code || '').toLowerCase().trim();
    const isHeadOffice = !!(bObj.is_head_office || bObj.isHeadOffice || bCode === 'plk-01' || bId === '4d04730d-8de9-4a3f-9dc4-705b31ef2630');

    const branchCadets = roster.filter(s => {
      const sBranchId = String(s.branch_id || (typeof s.branch === 'object' ? s.branch?.id : '') || s.branch_detail?.id || '').toLowerCase().trim();
      const sBranchName = String(s.branch_name || s.branchName || (typeof s.branch === 'object' ? s.branch?.name : s.branch) || s.branch_detail?.name || '').toLowerCase().trim();
      const sBranchCode = String(s.branch_code || s.branch_detail?.code || '').toLowerCase().trim();

      // 1. Direct ID / UUID match (most reliable)
      if (bId && sBranchId && bId === sBranchId) return true;

      // 2. Direct Code match (e.g. BAMA-DOJO-11, PLK-01)
      if (bCode && (sBranchCode === bCode || sBranchId === bCode || sBranchName === bCode)) return true;

      // 3. Exact full name match (case-insensitive)
      if (bName && sBranchName && bName === sBranchName) return true;

      // 4. Special case ONLY for the official Head Office Branch (PLK-01)
      if (isHeadOffice) {
        const isKickBoxing = sBranchName.includes('kick boxing') || sBranchName.includes('boxing');
        const isSchool = sBranchName.includes('school') || sBranchName.includes('ups') || sBranchName.includes('lps') || sBranchName.includes('neerad') || sBranchName.includes('pengad') || sBranchName.includes('airport');
        if (!isKickBoxing && !isSchool) {
          if (sBranchName === 'pulikkal branch (head office)' || sBranchName === 'pulikkal' || sBranchName === 'head office' || !sBranchName) {
            return true;
          }
        }
      }

      return false;
    });

    if (shiftFilter && String(shiftFilter).trim() !== '') {
      const sFilterLow = String(shiftFilter).toLowerCase().trim();
      return branchCadets.filter(s => {
        const sShift = String(s.shift || '').toLowerCase().trim();
        if (!sShift) return false;
        return sShift.includes(sFilterLow) || sFilterLow.includes(sShift);
      });
    }

    return branchCadets;
  };

  const getBranchCadetCount = (b) => {
    const cadets = getBranchCadets(b);
    if (cadets.length > 0) return cadets.length;
    if (typeof b === 'object' && typeof b.student_count === 'number' && b.student_count > 0) {
      return b.student_count;
    }
    return 0;
  };

  const openBranchCadetsRoster = (b) => {
    const list = getBranchCadets(b);
    setRosterModal({
      isOpen: true,
      title: b.name,
      subtitle: `Chief Sensei: ${b.branch_head || 'Sensei Abdul Rahman (5th Dan)'} • Total Enrolled: ${list.length} Cadets`,
      branchName: b.name,
      cadets: list
    });
    setRosterSearch('');
  };

  const openShiftCadetsRoster = (sch) => {
    const list = getBranchCadets(sch.branch, sch.time || sch.name);
    setRosterModal({
      isOpen: true,
      title: `${sch.name || 'Training Shift'} (${sch.branch})`,
      subtitle: `Timings: ${sch.time || sch.days} • Sensei: ${sch.instructor || 'Instructor'} • Enrolled: ${list.length} Cadets`,
      branchName: sch.branch,
      cadets: list
    });
    setRosterSearch('');
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

      {/* Action / Notification Banner */}
      {bannerMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold transition animate-in fade-in slide-in-from-top-2 ${
          bannerMessage.type === 'error'
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{bannerMessage.type === 'error' ? '⚠️' : '✅'}</span>
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer text-gray-500 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloudSyncSchedules}
                disabled={syncingSchedules}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer whitespace-nowrap"
                title="Synchronize training batches between phone & laptop via cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingSchedules ? 'animate-spin' : ''}`} />
                {syncingSchedules ? 'Syncing...' : '🔄 Cloud Sync Batches'}
              </button>
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
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: EXECUTIVE BRANCH DOJOS GRID */}
      {activeTab === 'BRANCHES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((b) => {
            const cadetCount = getBranchCadetCount(b);
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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openBranchCadetsRoster(b)}
                        className="text-xs font-black text-red-700 bg-white px-3 py-1 rounded-xl border border-red-200 shadow-xs hover:bg-red-600 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                        title="Quick view enrolled cadets in this branch"
                      >
                        <span>{cadetCount} Cadets</span>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/portal/students?branch=${encodeURIComponent(b.name)}`)}
                        className="p-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl transition cursor-pointer"
                        title="Open full Student Directory filtered to this branch"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

                    {/* Active Batches & Shift Slots */}
                    <div className="pt-2 border-t border-gray-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Active Batches / Shifts:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShiftData({
                              name: '',
                              program: 'Karate (Shotokan)',
                              branch: b.name,
                              days: 'Mon, Wed, Fri',
                              time: '5:00 PM - 7:00 PM',
                              instructor: b.branch_head || 'Sensei Abdul Rahman (5th Dan)',
                              targetGroup: 'All Belts & Cadets'
                            });
                            setEditShift(null);
                            setShowShiftModal(true);
                          }}
                          className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add Batch
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {getBranchTimingSlots(b.timings).map((slot, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 text-amber-900 font-bold text-[11px] rounded-xl shadow-2xs"
                          >
                            <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            <span>{slot}</span>
                          </span>
                        ))}
                      </div>
                    </div>
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
        <div className="space-y-4">
          {/* Branch Filter Pills Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setScheduleBranchFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scheduleBranchFilter === 'ALL'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>All Branches</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${scheduleBranchFilter === 'ALL' ? 'bg-red-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {schedules.length}
              </span>
            </button>

            {branches.map(b => {
              const bShiftCount = schedules.filter(s => {
                const sB = String(s.branch || s.branch_name || '').toLowerCase().trim();
                const bN = String(b.name || '').toLowerCase().trim();
                return sB === bN || sB.includes(bN) || bN.includes(sB);
              }).length;

              const isSel = scheduleBranchFilter === b.name;
              return (
                <button
                  key={b.id || b.name}
                  type="button"
                  onClick={() => setScheduleBranchFilter(b.name)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-amber-500 text-black font-black shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{b.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSel ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {bShiftCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contextual Banner when a branch is selected */}
          {scheduleBranchFilter !== 'ALL' && (
            <div className="bg-amber-50 border border-amber-200 p-3 sm:px-4 sm:py-2.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span className="font-black text-amber-900">Active Batches for: {scheduleBranchFilter}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditShift(null);
                  setShiftData({
                    name: '',
                    branch: scheduleBranchFilter,
                    program: 'Karate (Shotokan)',
                    days: 'Mon, Wed, Fri',
                    time: '5:00 PM - 7:00 PM',
                    instructor: branches.find(b => b.name === scheduleBranchFilter)?.branch_head || 'Sensei Abdul Rahman (5th Dan)',
                    targetGroup: 'All Belts & Cadets'
                  });
                  setShowShiftModal(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-xs w-full sm:w-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Add Batch for this Branch
              </button>
            </div>
          )}

          {filteredSchedules.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm space-y-3">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto border border-red-100">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-gray-900">
                {scheduleBranchFilter !== 'ALL'
                  ? `No Batches Found for ${scheduleBranchFilter}`
                  : 'No Training Shift Schedules Added Yet'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {scheduleBranchFilter !== 'ALL'
                  ? `Click the button below to add the first training batch for ${scheduleBranchFilter}.`
                  : 'Only the batch shifts and timings you explicitly add will be displayed here.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditShift(null);
                  setShiftData({
                    name: '',
                    branch: scheduleBranchFilter !== 'ALL' ? scheduleBranchFilter : (branches[0]?.name || 'Pulikkal Branch (Head Office)'),
                    days: 'Mon, Wed, Fri',
                    time: '5:00 PM - 7:00 PM',
                    instructor: (scheduleBranchFilter !== 'ALL' && branches.find(b => b.name === scheduleBranchFilter)?.branch_head) || 'Sensei Abdul Rahman (5th Dan)',
                    targetGroup: 'All Belts & Cadets'
                  });
                  setShowShiftModal(true);
                }}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-2xl shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Training Shift Batch
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSchedules.map((sch) => {
                const shiftCadetCount = getBranchCadets(sch.branch, sch.time || sch.name).length;

                return (
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
                          {sch.status || 'Active'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-gray-900 leading-snug">{sch.name || `${sch.branch} Batch`}</h3>
                        <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                          <Shield className="w-3.5 h-3.5 text-red-600" />
                          <span>Sensei: {sch.instructor}</span>
                        </p>
                      </div>

                      {/* Enrolled Cadets in this Shift */}
                      <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                        <span className="text-gray-700 font-bold flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-amber-600" /> Enrolled Cadets:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openShiftCadetsRoster(sch)}
                            className="text-xs font-black text-amber-800 bg-white px-3 py-1 rounded-xl border border-amber-300 shadow-xs hover:bg-amber-600 hover:text-white transition flex items-center gap-1 cursor-pointer"
                            title="Click to view all enrolled cadets in this batch"
                          >
                            <span>{shiftCadetCount} Cadets</span>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/portal/students?branch=${encodeURIComponent(sch.branch)}`)}
                            className="p-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl transition cursor-pointer"
                            title="Open in full Student Directory"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Create / Edit Branch Dojo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-gray-200 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    {editBranch ? `Edit Branch: ${editBranch.name}` : 'Add New Branch Dojo'}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">Configure branch dojo details, sensei, timings & facilities.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="branchDojoForm" onSubmit={handleCreateOrUpdateBranch} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Modal Scrollable Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Photo Upload & Preview */}
              <div className="space-y-2 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <label className="block text-gray-800 font-black mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-600" /> Official Dojo Photo / Banner *
                </label>

                {formData.image && (
                  <div className="h-28 w-full rounded-xl overflow-hidden border border-gray-300 relative shadow-xs">
                    <img src={formData.image} alt="Dojo Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <label className="px-3.5 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition">
                    <Upload className="w-3.5 h-3.5 text-red-600" /> Upload Image File
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
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 text-xs font-mono focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              {/* Branch Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manjeri Branch Dojo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 uppercase shadow-xs"
                  />
                </div>
              </div>

              {/* Chief Instructor & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Chief Instructor / Sensei *</label>
                  <input
                    type="text"
                    required
                    value={formData.branch_head}
                    onChange={(e) => setFormData({ ...formData, branch_head: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: formData.whatsapp || e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Full Location Address *</label>
                <textarea
                  required
                  rows="2"
                  placeholder="Street, Junction, Landmark, District, Pincode..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 font-medium shadow-xs resize-none"
                />
              </div>

              {/* Training Batch Shift Timings - Interactive Multi-Shift Batch Builder */}
              <div className="space-y-3 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-4 rounded-2xl border-2 border-amber-300 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-gray-900 font-black text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-amber-600" /> Branch Training Shifts & Batches *
                  </label>
                  <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300">
                    {getBranchTimingSlots(formData.timings).length} Batches Added
                  </span>
                </div>

                {/* 1. Visual Active Shift Cards List */}
                <div className="space-y-1.5">
                  {getBranchTimingSlots(formData.timings).length === 0 ? (
                    <div className="p-3 bg-white/80 rounded-xl border border-dashed border-amber-300 text-center text-xs text-gray-500">
                      No training shifts added yet. Pick a preset below or add a custom shift.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {getBranchTimingSlots(formData.timings).map((slot, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between gap-2 p-2.5 bg-white border border-amber-300 rounded-xl shadow-2xs group hover:border-red-300 transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {sIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {slot}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveShiftFromBranchForm(slot)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer flex-shrink-0"
                            title="Remove this training shift"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Quick 1-Click Preset Batches */}
                <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
                  <span className="text-[10px] text-gray-600 font-bold block uppercase tracking-wider">
                    ⚡ Quick 1-Click Batch Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
                      'Mon, Wed, Fri: 6:00 AM - 7:30 AM',
                      'Tue, Thu, Sat: 5:30 PM - 7:30 PM',
                      'Sat & Sun: 7:00 AM - 9:00 AM',
                      'Mon - Fri: 4:00 PM - 5:00 PM'
                    ].map((preset) => {
                      const isAdded = getBranchTimingSlots(formData.timings).includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddShiftToBranchForm(preset)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition flex items-center gap-1 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 opacity-60 cursor-default'
                              : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                          }`}
                        >
                          {isAdded ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-amber-600" />}
                          <span>{preset}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Add Custom Shift Adder Form */}
                <div className="pt-2 border-t border-amber-200/70 space-y-2">
                  <span className="text-[10px] text-gray-600 font-bold block uppercase tracking-wider">
                    + Add Custom Shift Timing:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Days (e.g. Mon, Wed, Fri)"
                        value={customShiftInput.days}
                        onChange={(e) => setCustomShiftInput({ ...customShiftInput, days: e.target.value })}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-red-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Time (e.g. 5:00 PM - 7:00 PM)"
                        value={customShiftInput.time}
                        onChange={(e) => setCustomShiftInput({ ...customShiftInput, time: e.target.value })}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-red-500 shadow-2xs"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (customShiftInput.days && customShiftInput.time) {
                        handleAddShiftToBranchForm(`${customShiftInput.days.trim()}: ${customShiftInput.time.trim()}`);
                      }
                    }}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Shift to this Branch
                  </button>
                </div>
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Facilities & Equipment (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="🥋 Tatami Safety Mats, 🥊 Punching Heavy Bags, ❄️ AC Dojo Hall"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 font-medium shadow-xs"
                />
              </div>

              {/* Google Maps Location */}
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
                    <span>🔍 Open Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. https://maps.app.goo.gl/... or paste Google Maps link"
                    value={formData.mapUrl}
                    onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 font-medium shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const autoUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((formData.name || '') + ' ' + (formData.address || 'Malappuram Kerala'))}`;
                      setFormData({ ...formData, mapUrl: autoUrl });
                    }}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] rounded-xl flex-shrink-0 transition cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    ⚡ Auto-Fill
                  </button>
                </div>
              </div>

              {/* Head office checkbox */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="isHeadOffice"
                  checked={formData.isHeadOffice}
                  onChange={(e) => setFormData({ ...formData, isHeadOffice: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded accent-red-600 cursor-pointer"
                />
                <label htmlFor="isHeadOffice" className="text-gray-900 font-bold cursor-pointer select-none">
                  Mark as Primary Head Office Dojo
                </label>
              </div>
            </div>

            {/* Modal Sticky Bottom Actions Footer */}
            <div className="p-4 sm:px-6 sm:py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 z-10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={savingBranch}
                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 cursor-pointer shadow-xs transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingBranch}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Building2 className="w-4 h-4" /> {savingBranch ? 'Saving Dojo Branch...' : (editBranch ? 'Save Changes' : 'Create Dojo Branch')}
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
                <label className="block text-gray-700 font-bold mb-1">
                  Shift Batch Name <span className="text-gray-400 font-normal">(Optional - auto-generated from timing)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular Batch (or leave empty to auto-name)"
                  value={shiftData.name}
                  onChange={(e) => setShiftData({ ...shiftData, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Discipline / Course Program *</label>
                <select
                  value={shiftData.program || 'Karate (Shotokan)'}
                  onChange={(e) => setShiftData({ ...shiftData, program: e.target.value })}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  {PROGRAM_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
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

      {/* MODAL: Branch / Shift Cadets Roster */}
      {rosterModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-2xl relative flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    {rosterModal.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {rosterModal.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRosterModal({ ...rosterModal, isOpen: false })}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Actions Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search cadet by name, phone, admission no..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 transition font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setRosterModal({ ...rosterModal, isOpen: false });
                  navigate(`/portal/students?branch=${encodeURIComponent(rosterModal.branchName)}`);
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Open in Full Cadet Directory</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cadets List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(() => {
                const filteredList = rosterModal.cadets.filter(c => {
                  const q = rosterSearch.toLowerCase();
                  return (
                    (c.name || c.student_name || '').toLowerCase().includes(q) ||
                    (c.admissionNumber || c.admission_number || '').toLowerCase().includes(q) ||
                    (c.phone || '').includes(q) ||
                    (c.currentBelt || c.current_belt || '').toLowerCase().includes(q)
                  );
                });

                if (filteredList.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400 text-xs">
                      No cadets found matching your search.
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
                    {filteredList.map((cadet, idx) => (
                      <div
                        key={cadet.id || idx}
                        className="p-3 bg-white hover:bg-gray-50 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={cadet.photo || '/assets/prog_adults.jpg'}
                            alt={cadet.name}
                            className="w-9 h-9 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => { e.target.src = '/assets/prog_adults.jpg'; }}
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-gray-900 truncate">
                              {cadet.name || cadet.student_name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                              <span className="font-mono bg-gray-100 px-1 rounded">{cadet.admissionNumber || cadet.admission_number || 'N/A'}</span>
                              <span>•</span>
                              <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {cadet.currentBelt || cadet.current_belt || 'White Belt'}
                              </span>
                              <span>•</span>
                              <span className="text-gray-600 truncate">{cadet.shift || 'Regular Shift'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            (cadet.feeStatus || cadet.fee_status) === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {(cadet.feeStatus || cadet.fee_status) === 'Paid' ? 'Paid' : 'Dues'}
                          </span>
                          {cadet.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(cadet.phone, `Hello from B.A.M.A Academy!`)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg border border-emerald-200 transition cursor-pointer"
                              title="Message Parent on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-3 sm:px-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span className="font-bold">Total Cadets: {rosterModal.cadets.length}</span>
              <button
                type="button"
                onClick={() => setRosterModal({ ...rosterModal, isOpen: false })}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
