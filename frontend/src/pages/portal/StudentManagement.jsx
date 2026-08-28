import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Search, Filter, Plus, QrCode, Edit, Eye, Trash2,
  X, Check, Shield, Award, MapPin, Phone, Mail, FileText,
  Calendar, CreditCard, MessageSquare, UserCheck, Upload, Camera, Image as ImageIcon,
  AlertTriangle, RefreshCw, Scissors, Sparkles, Settings, ZoomIn, Move, Send, CheckCircle2,
  DollarSign, AlertCircle, Clock, Printer, Briefcase
} from 'lucide-react';
import { fetchStudents, getStoredStudents, createStudent, updateStudent, deleteStudent, saveStoredStudents, getGlobalFeeSettings, saveGlobalFeeSettings, saveFeeSettingsBackend, fetchFeeSettings, isMonthOnOrAfterEffective, fetchBranches, getApplicableFees, promoteStudent, openWhatsApp, getPreferredWhatsAppChannel, setPreferredWhatsAppChannel } from '../../services/api';
import { BELT_LEVELS, INITIAL_BRANCHES, SHIFT_OPTIONS, getDynamicShiftOptions } from '../../services/initialData';
import { useAuth } from '../../context/AuthContext';

const FIXED_AVATAR_DIM = 300;

// Helper to calculate exact Age automatically from Date of Birth
const calculateAgeFromDOB = (dobString) => {
  if (!dobString) return 12;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 12;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(4, Math.min(age, 75));
};

// Helper to get dynamically active training shift options for a specific branch
const getActiveShiftOptions = (branchName = '') => {
  if (!branchName) return SHIFT_OPTIONS;

  const results = [];
  const bStr = String(branchName).toLowerCase().trim();

  // 1. Check custom branches stored in localStorage 'bama_custom_branches'
  try {
    const storedBranches = localStorage.getItem('bama_custom_branches');
    if (storedBranches) {
      const parsedBranches = JSON.parse(storedBranches);
      if (Array.isArray(parsedBranches)) {
        const matchedB = parsedBranches.find(b => {
          const nameStr = String(b.name || '').toLowerCase().trim();
          return nameStr === bStr || nameStr.includes(bStr) || bStr.includes(nameStr);
        });

        if (matchedB && matchedB.timings) {
          const timingParts = String(matchedB.timings)
            .split('|')
            .map(t => t.trim())
            .filter(Boolean);

          timingParts.forEach(t => results.push(t));
        }
      }
    }
  } catch (e) {}

  // 2. Check custom stored training schedules created in Branch Management for THIS branch
  try {
    const storedSchedules = localStorage.getItem('bama_training_schedules');
    if (storedSchedules) {
      const parsedSchedules = JSON.parse(storedSchedules);
      if (Array.isArray(parsedSchedules)) {
        const matchedShifts = parsedSchedules.filter(s => {
          const sBranch = String(s.branch || s.branchName || '').toLowerCase().trim();
          return sBranch === bStr || sBranch.includes(bStr) || bStr.includes(sBranch);
        });

        matchedShifts.forEach(s => {
          if (s.name && s.time) {
            results.push(`${s.name} (${s.time})`);
          } else if (s.name || s.time) {
            results.push(s.name || s.time);
          }
        });
      }
    }
  } catch (e) {}

  if (results.length > 0) {
    return Array.from(new Set(results));
  }

  // 3. Preset fallback defaults per branch if no custom timing was parsed
  let targetKey = 'pulikkal';
  if (bStr.includes('chungam')) targetKey = 'chungam';
  else if (bStr.includes('mongam')) targetKey = 'mongam';
  else if (bStr.includes('feroke')) targetKey = 'feroke';

  if (targetKey === 'chungam') {
    return [
      "Evening Batch (5:30 PM - 7:30 PM)",
      "Tue, Thu, Sat Batch (5:00 PM - 7:00 PM)",
      "Kids Special Batch (4:00 PM - 5:00 PM)",
      "Ladies Special Batch",
      "Custom Shift / Flexible"
    ];
  }
  if (targetKey === 'mongam') {
    return [
      "Morning Batch (6:00 AM - 7:30 AM)",
      "Evening Batch (5:00 PM - 7:00 PM)",
      "Mon, Wed, Fri Batch (5:00 PM - 7:00 PM)",
      "Kids Special Batch (4:00 PM - 5:00 PM)",
      "Custom Shift / Flexible"
    ];
  }
  if (targetKey === 'pulikkal') {
    return [
      "Evening Batch (5:00 PM - 7:00 PM)",
      "Morning Batch (6:00 AM - 7:30 AM)",
      "Weekend Special Batch (Sat & Sun: 7:00 AM - 9:00 AM)",
      "Kids Special Batch (4:00 PM - 5:00 PM)",
      "Ladies Special Batch",
      "Night / Late Evening Batch (7:00 PM - 8:30 PM)",
      "Custom Shift / Flexible"
    ];
  }

  return SHIFT_OPTIONS;
};

export default function StudentManagement() {
  const [students, setStudents] = useState(getStoredStudents);
  const [search, setSearch] = useState('');
  const [selectedBelt, setSelectedBelt] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTab, setSelectedTab] = useState('All');
  const [inspectorStudent, setInspectorStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [activeCardStudent, setActiveCardStudent] = useState(null);
  const [detailStudent, setDetailStudent] = useState(null);
  const [globalFeeSettings, setGlobalFeeSettings] = useState(getGlobalFeeSettings());
  const [showGlobalFeeModal, setShowGlobalFeeModal] = useState(false);
  const [showInquiriesModal, setShowInquiriesModal] = useState(false);
  const [inquiriesList, setInquiriesList] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_admission_inquiries');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'INQ-101', name: 'Rahul V.K.', phone: '+91 98470 12345', email: 'rahul@gmail.com', branch: 'Chungam Dojo Branch', program: 'Adult Fitness & Sparring', message: 'Want to join evening karate batch for fitness.', date: '2026-08-23', time: '10:15 PM', status: 'PENDING' },
      { id: 'INQ-102', name: 'Fathima Riya (Parent)', phone: '+91 95440 85442', email: 'riya@gmail.com', branch: 'Pulikkal Dojo (Head Office)', program: 'Kids Karate (Ages 5-12)', message: 'Enquiring about kids karate fee and timings.', date: '2026-08-23', time: '11:20 PM', status: 'PENDING' }
    ];
  });

  useEffect(() => {
    const handleInquiryUpdate = () => {
      try {
        const saved = localStorage.getItem('bama_admission_inquiries');
        if (saved) setInquiriesList(JSON.parse(saved));
      } catch (e) {}
    };

    const handleFeeSettingsUpdate = () => {
      setGlobalFeeSettings(getGlobalFeeSettings());
    };

    fetchFeeSettings().then(res => {
      if (res?.settings) {
        setGlobalFeeSettings(res.settings);
      }
    });

    window.addEventListener('bama_notification_updated', handleInquiryUpdate);
    window.addEventListener('bama_fee_settings_updated', handleFeeSettingsUpdate);
    return () => {
      window.removeEventListener('bama_notification_updated', handleInquiryUpdate);
      window.removeEventListener('bama_fee_settings_updated', handleFeeSettingsUpdate);
    };
  }, []);

  // Automatic WhatsApp Welcome Dispatch State
  const [autoWhatsAppWelcome, setAutoWhatsAppWelcome] = useState(true);
  const [welcomeDispatchModal, setWelcomeDispatchModal] = useState(null);

  // Promote Cadet Modal State
  const [promoteModalStudent, setPromoteModalStudent] = useState(null);
  const [promoTargetBelt, setPromoTargetBelt] = useState('Yellow Belt');
  const [promoExamDate, setPromoExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [promoExaminer, setPromoExaminer] = useState('Sensei Abdul Rahman (5th Dan)');
  const [promoCertNo, setPromoCertNo] = useState('');
  const [promoRemarks, setPromoRemarks] = useState('Promoted on merit via Academy Examination');


  // Inline Photo Resizer State for New Admission Form
  const [addPhotoState, setAddPhotoState] = useState({
    rawSrc: '',
    zoom: 1.0,
    panX: 0,
    panY: 0
  });

  // Inline Photo Resizer State for Edit Form
  const [editPhotoState, setEditPhotoState] = useState({
    rawSrc: '',
    zoom: 1.0,
    panX: 0,
    panY: 0
  });

  const addCanvasRef = useRef(null);
  const editCanvasRef = useRef(null);

  const { user, activeBranch } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'STAFF' || user?.role === 'BRANCH_STAFF' || user?.role === 'BRANCH_ADMIN' || (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN' && user?.role !== 'HEAD_OFFICE');

  // Form State containing all student fields including Shift Batch & Admission Fee = 1000 & Custom Paid Amount Inputs
  const [formData, setFormData] = useState({
    name: '',
    photo: '',
    guardianName: '',
    occupation: '',
    phone: '',
    whatsapp: '',
    dob: '',
    age: 12,
    currentBelt: 'White Belt',
    branch: '',
    shift: 'Evening Batch (5:00 PM - 7:00 PM)',
    joiningDate: new Date().toISOString().split('T')[0],
    admissionFee: 1000,
    admissionFeePaidAmount: 1000,
    feeAmount: 500,
    initialPaidAmount: 500,
    feeStatus: 'Paid',
    gender: 'Male',
    bloodGroup: 'O+',
    address: ''
  });

  const [branchesList, setBranchesList] = useState(INITIAL_BRANCHES);

  const loadBranchesList = () => {
    fetchBranches().then(data => {
      if (data && data.length > 0) setBranchesList(data);
    });
  };

  useEffect(() => {
    loadBranchesList();
    window.addEventListener('bama_branches_updated', loadBranchesList);
    return () => window.removeEventListener('bama_branches_updated', loadBranchesList);
  }, []);

  useEffect(() => {
    const loadRoster = () => {
      fetchStudents().then(data => {
        setStudents(data || []);
        if (data && data.length > 0 && !inspectorStudent) {
          setInspectorStudent(data[0]);
        }
      });
    };

    loadRoster();

    window.addEventListener('bama_data_updated', loadRoster);
    window.addEventListener('bama_active_branch_changed', loadRoster);
    window.addEventListener('focus', loadRoster);
    document.addEventListener('visibilitychange', loadRoster);
    return () => {
      window.removeEventListener('bama_data_updated', loadRoster);
      window.removeEventListener('bama_active_branch_changed', loadRoster);
      window.removeEventListener('focus', loadRoster);
      document.removeEventListener('visibilitychange', loadRoster);
    };
  }, [user, activeBranch]);

  // Handle Photo Pick for New Cadet Form
  const handleAddPhotoPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAddPhotoState({
          rawSrc: event.target.result,
          zoom: 1.0,
          panX: 0,
          panY: 0
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to extract canvas image data safely upon form submission
  const getCanvasDataUrl = (canvasRef, fallbackPhoto) => {
    if (canvasRef.current) {
      try {
        return canvasRef.current.toDataURL('image/jpeg', 0.85);
      } catch (e) {}
    }
    return fallbackPhoto || '';
  };

  // Render Canvas Preview for Add Form
  useEffect(() => {
    if (!addPhotoState.rawSrc || !addCanvasRef.current) return;
    const canvas = addCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const dim = FIXED_AVATAR_DIM;
      canvas.width = dim;
      canvas.height = dim;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, dim, dim);

      const scale = Math.max(dim / img.width, dim / img.height) * addPhotoState.zoom;
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (dim - w) / 2 + addPhotoState.panX;
      const y = (dim - h) / 2 + addPhotoState.panY;

      ctx.drawImage(img, x, y, w, h);
    };
    img.src = addPhotoState.rawSrc;
  }, [addPhotoState]);

  // Handle Photo Pick for Edit Form
  const handleEditPhotoPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditPhotoState({
          rawSrc: event.target.result,
          zoom: 1.0,
          panX: 0,
          panY: 0
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Render Canvas Preview for Edit Form
  useEffect(() => {
    if (!editPhotoState.rawSrc || !editCanvasRef.current) return;
    const canvas = editCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const dim = FIXED_AVATAR_DIM;
      canvas.width = dim;
      canvas.height = dim;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, dim, dim);

      const scale = Math.max(dim / img.width, dim / img.height) * editPhotoState.zoom;
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (dim - w) / 2 + editPhotoState.panX;
      const y = (dim - h) / 2 + editPhotoState.panY;

      ctx.drawImage(img, x, y, w, h);
    };
    img.src = editPhotoState.rawSrc;
  }, [editPhotoState]);

  // Submit New Cadet Admission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Strict Validation on Mandatory Fields
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      alert('⚠️ Cadet Name is required! ദയവായി കുട്ടിയുടെ മുഴുവൻ പേര് നൽകുക.');
      return;
    }

    const trimmedGuardian = (formData.guardianName || '').trim();
    if (!trimmedGuardian || trimmedGuardian.length < 2) {
      alert('⚠️ Parent / Guardian Name is required! ദയവായി രക്ഷാകർത്താവിന്റെ പേര് നൽകുക.');
      return;
    }

    const cleanPhone = (formData.phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('⚠️ Valid 10-digit Phone Number is required! ദയവായി 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.');
      return;
    }

    if (!formData.branch || formData.branch.trim() === '') {
      alert('⚠️ Dojo Branch is required! ദയവായി ഒരു ബ്രാഞ്ച് സെലക്ട് ചെയ്യുക.');
      return;
    }

    if (!formData.shift || formData.shift.trim() === '') {
      alert('⚠️ Training Shift is required! ദയവായി ട്രെയിനിങ് ഷിഫ്റ്റ് ബാച്ച് സെലക്ട് ചെയ്യുക.');
      return;
    }

    if (!formData.address || formData.address.trim().length < 3) {
      alert('⚠️ Residential Address is required! ദയവായി മേൽവിലാസം നൽകുക.');
      return;
    }

    const finalPhoto = addPhotoState.rawSrc ? getCanvasDataUrl(addCanvasRef, formData.photo) : formData.photo;
    const admissionFeeAmt = formData.admissionFee !== undefined && formData.admissionFee !== '' ? Math.max(0, parseInt(formData.admissionFee) || 0) : 1000;
    const admissionFeePaidAmt = parseInt(formData.admissionFeePaidAmount) || 0;
    const monthlyFeeAmt = parseInt(formData.feeAmount) || 500;
    const monthlyFeePaidAmt = parseInt(formData.initialPaidAmount) || 0;

    const totalRequired = admissionFeeAmt + monthlyFeeAmt;
    const totalCollectedNow = admissionFeePaidAmt + monthlyFeePaidAmt;
    const totalPendingDues = Math.max(0, totalRequired - totalCollectedNow);
    const isAdmissionPaid = admissionFeeAmt === 0 || admissionFeePaidAmt >= admissionFeeAmt;
    const calculatedFeeStatus = totalPendingDues === 0 ? 'Paid' : totalCollectedNow > 0 ? 'Partial' : 'Pending';

    const admNoGenerated = `BAMA-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Robust & Bulletproof Branch Target Resolution
    const rawBranchInput = formData.branch_id || formData.branch || formData.branch_name || formData.branchName || user?.branch || 'Pulikkal Branch (Head Office)';
    let branchTargetName = 'Pulikkal Branch (Head Office)';
    let branchTargetId = '4d04730d-8de9-4a3f-9dc4-705b31ef2630';

    const rawStr = String(rawBranchInput).toLowerCase().trim();
    if (rawStr.includes('chungam') || rawStr.includes('cgm') || rawStr.includes('dojo-02') || rawStr.includes('20c924cd') || rawStr.includes('a9e9ccd7')) {
      branchTargetName = 'Chungam Branch Dojo';
      branchTargetId = 'a9e9ccd7-27c4-4fd5-bf69-5a487cbf2b9e';
    } else if (rawStr.includes('mongam') || rawStr.includes('dojo-03') || rawStr.includes('d4639193')) {
      branchTargetName = 'Mongam Branch Dojo';
      branchTargetId = 'd4639193-c693-46e2-a46e-5e25dcf427a1';
    } else if (rawStr.includes('feroke') || rawStr.includes('dojo-04') || rawStr.includes('5f429f1f') || rawStr.includes('67b5ad14')) {
      branchTargetName = 'Feroke Branch';
      branchTargetId = '67b5ad14-f63f-4be4-9df8-f541bff86b12';
    } else if (rawStr.includes('pulikkal') || rawStr.includes('plk') || rawStr.includes('dojo-01') || rawStr.includes('283e0cc2') || rawStr.includes('4d04730d')) {
      branchTargetName = 'Pulikkal Branch (Head Office)';
      branchTargetId = '4d04730d-8de9-4a3f-9dc4-705b31ef2630';
    } else {
      const matchedB = branchesList.find(b => b.id === rawBranchInput || b.name === rawBranchInput || b.code === rawBranchInput);
      if (matchedB) {
        branchTargetName = matchedB.name;
        branchTargetId = matchedB.id;
      }
    }

    const newStudentData = {
      ...formData,
      name: trimmedName,
      guardianName: trimmedGuardian,
      guardian_name: trimmedGuardian,
      phone: cleanPhone,
      whatsapp: (formData.whatsapp || cleanPhone).replace(/[^0-9]/g, '') || cleanPhone,
      branch: branchTargetId,
      branch_id: branchTargetId,
      branch_name: branchTargetName,
      branchName: branchTargetName,
      dojo_branch: branchTargetName,
      photo: finalPhoto,
      admissionNo: admNoGenerated,
      admission_no: admNoGenerated,
      admissionFee: admissionFeeAmt,
      admission_fee: admissionFeeAmt,
      admissionFeePaidAmount: admissionFeePaidAmt,
      admission_fee_paid_amount: admissionFeePaidAmt,
      admissionFeePaid: isAdmissionPaid,
      admission_fee_paid: isAdmissionPaid,
      feeAmount: monthlyFeeAmt,
      fee_amount: monthlyFeeAmt,
      initialPaidAmount: monthlyFeePaidAmt,
      initial_paid_amount: monthlyFeePaidAmt,
      feeStatus: calculatedFeeStatus,
      fee_status: calculatedFeeStatus,
      pendingAmount: totalPendingDues,
      pending_amount: totalPendingDues,
      totalCollectedNow: totalCollectedNow,
      attendanceRate: 100,
      status: 'Active'
    };

    try {
      const saved = await createStudent(newStudentData);
      const updatedList = [saved, ...students];
      setStudents(updatedList);
      saveStoredStudents(updatedList);

      setShowAddModal(false);

      // Trigger Auto WhatsApp Welcome Modal
      if (autoWhatsAppWelcome) {
        const cleanPhone = (formData.phone || '').replace(/[^0-9]/g, '');
        const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        const rawText = 
          `🥋 *WELCOME TO BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
          `Dear Parent (${formData.guardianName}),\n\n` +
          `We are delighted to confirm the successful admission of cadet *${formData.name}*!\n\n` +
          `📋 *OFFICIAL ADMISSION & FEE RECEIPT DETAILS:*\n` +
          `• Admission No: *${saved.admissionNo || saved.admission_no}*\n` +
          `• Belt Rank: *${formData.currentBelt}*\n` +
          `• Branch Dojo: *${formData.branch}*\n` +
          `• Training Shift: *${formData.shift}*\n` +
          `• Admission Fee Total: *₹${admissionFeeAmt}* (Paid Now: *₹${admissionFeePaidAmt}*)\n` +
          `• Monthly Tuition Fee: *₹${monthlyFeeAmt}* (Paid Now: *₹${monthlyFeePaidAmt}*)\n` +
          `• Total Amount Collected Now: *₹${totalCollectedNow}*\n` +
          `• Remaining Dues Balance: *₹${totalPendingDues}* (${calculatedFeeStatus})\n` +
          `• Residential Address: *${formData.address || 'N/A'}*\n` +
          `• Joining Date: *${formData.joiningDate}*\n\n` +
          `Thank you for trusting B.A.M.A.! Discipline • Respect • Excellence. OSS 🥋`;

        setWelcomeDispatchModal({
          studentName: formData.name,
          parentName: formData.guardianName,
          phone: waPhone,
          rawMessage: rawText,
          admNo: saved.admissionNo || saved.admission_no
        });
      }

      // Reset form
      setFormData({
        name: '',
        photo: '',
        guardianName: '',
        occupation: '',
        phone: '',
        whatsapp: '',
        age: 12,
        currentBelt: 'White Belt',
        branch: user?.branch || 'Pulikkal Branch (Head Office)',
        shift: 'Evening Batch (5:00 PM - 7:00 PM)',
        joiningDate: new Date().toISOString().split('T')[0],
        admissionFee: 1000,
        admissionFeePaidAmount: 1000,
        feeAmount: 500,
        initialPaidAmount: 500,
        feeStatus: 'Paid',
        gender: 'Male',
        bloodGroup: 'O+',
        address: ''
      });
    } catch (err) {
      alert('Error creating student. Saved locally.');
    }
  };

  // Save Global Fee Defaults and Update Roster Across Backend & Frontend
  const handleSaveGlobalFeeSettings = async () => {
    saveGlobalFeeSettings(globalFeeSettings);
    await saveFeeSettingsBackend(globalFeeSettings);

    const newMonthly = parseInt(globalFeeSettings.defaultMonthlyFee) || 500;
    const newAdmission = parseInt(globalFeeSettings.defaultAdmissionFee) || 1000;

    if (globalFeeSettings.updateExistingStudents) {
      const currentStudents = students.length > 0 ? students : getStoredStudents();

      const updatedRoster = currentStudents.map(s => {
        const currentPaid = parseInt(s.initialPaidAmount || s.initial_paid_amount || 0);
        const newPending = Math.max(0, newMonthly - currentPaid);
        const newFeeStatus = newPending === 0 ? 'Paid' : currentPaid > 0 ? 'Partial' : 'Pending';

        const updatedObj = {
          ...s,
          feeAmount: newMonthly,
          fee_amount: newMonthly,
          monthlyFee: newMonthly,
          monthly_fee: newMonthly,
          admissionFee: newAdmission,
          admission_fee: newAdmission,
          pendingAmount: newPending,
          pending_amount: newPending,
          feeStatus: newFeeStatus,
          fee_status: newFeeStatus
        };

        if (s.id) {
          updateStudent(s.id, {
            fee_amount: newMonthly,
            feeAmount: newMonthly,
            admission_fee: newAdmission,
            admissionFee: newAdmission,
            pending_amount: newPending,
            pendingAmount: newPending,
            fee_status: newFeeStatus,
            feeStatus: newFeeStatus
          }).catch(() => {});
        }

        return updatedObj;
      });

      setStudents(updatedRoster);
      saveStoredStudents(updatedRoster);
    }

    window.dispatchEvent(new Event('bama_fee_settings_updated'));
    window.dispatchEvent(new Event('bama_data_updated'));

    setShowGlobalFeeModal(false);
    alert(`✅ Global Academy Fee Defaults updated & Backend Synced! New rate (₹${newMonthly}/Month) is effective from ${globalFeeSettings.effectiveMonth || 'August'} ${globalFeeSettings.effectiveYear || 2026}.`);
  };

  const STANDARD_BELT_RANKS = [
    'White Belt',
    'Yellow Belt',
    'Orange Belt',
    'Green Belt',
    'Blue Belt',
    'Purple Belt',
    'Brown Belt (4th Kyu)',
    'Brown Belt (3rd Kyu)',
    'Brown Belt (2nd Kyu)',
    'Brown Belt (1st Kyu)',
    'Black Belt (1st Dan)',
    'Black Belt (2nd Dan)'
  ];

  const getNextBeltRank = (currBelt = '') => {
    const c = String(currBelt).toLowerCase();
    for (let i = 0; i < STANDARD_BELT_RANKS.length; i++) {
      if (c.includes(STANDARD_BELT_RANKS[i].toLowerCase()) || STANDARD_BELT_RANKS[i].toLowerCase().includes(c)) {
        return STANDARD_BELT_RANKS[Math.min(i + 1, STANDARD_BELT_RANKS.length - 1)];
      }
    }
    return 'Yellow Belt';
  };

  // Open Belt Promotion Modal
  const handleOpenPromoteModal = (std) => {
    const currentB = std.currentBelt || std.current_belt || 'White Belt';
    const nextB = getNextBeltRank(currentB);
    setPromoteModalStudent(std);
    setPromoTargetBelt(nextB);
    setPromoExamDate(new Date().toISOString().split('T')[0]);
    setPromoExaminer('Sensei Abdul Rahman (5th Dan)');
    setPromoCertNo(`CERT-BAMA-${Math.floor(1000 + Math.random() * 9000)}`);
    setPromoRemarks(`Promoted from ${currentB} to ${nextB} on merit.`);
  };

  // Submit Belt Promotion
  const handleConfirmPromotion = async (e) => {
    e.preventDefault();
    if (!promoteModalStudent) return;

    try {
      await promoteStudent(promoteModalStudent.id, {
        target_belt: promoTargetBelt,
        exam_date: promoExamDate,
        examiner: promoExaminer,
        certificate_no: promoCertNo,
        remarks: promoRemarks
      });

      const updatedList = students.map(s => {
        if (s.id === promoteModalStudent.id || s.admissionNo === promoteModalStudent.admissionNo || s.admission_no === promoteModalStudent.admission_no) {
          return {
            ...s,
            currentBelt: promoTargetBelt,
            current_belt: promoTargetBelt
          };
        }
        return s;
      });

      setStudents(updatedList);
      saveStoredStudents(updatedList);

      const parentName = promoteModalStudent.guardianName || promoteModalStudent.guardian_name || 'Parent';
      const cadetName = promoteModalStudent.name;
      const phone = (promoteModalStudent.whatsapp || promoteModalStudent.phone || '').replace(/[^0-9]/g, '');
      const waPhone = phone.length === 10 ? '91' + phone : phone;

      const text = encodeURIComponent(
        `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
        `🎉 *OFFICIAL BELT PROMOTION CONGRATULATIONS!*\n\n` +
        `Dear Parent (${parentName}),\n` +
        `We are thrilled to announce that cadet *${cadetName}* (${promoteModalStudent.admissionNo || promoteModalStudent.admission_no}) has successfully passed the examination and is promoted to:\n\n` +
        `🏅 *Promoted Rank:* *${promoTargetBelt}*\n` +
        `📜 *Certificate No:* *${promoCertNo}*\n` +
        `📅 *Exam Date:* *${promoExamDate}*\n` +
        `🥋 *Chief Examiner:* *${promoExaminer}*\n\n` +
        `Keep up the dedication and spirit of Karate-Do! Discipline • Respect • Excellence. OSS 🥋`
      );

      const targetCadet = promoteModalStudent;
      setPromoteModalStudent(null);

      if (window.confirm(`🎉 ${cadetName} promoted to ${promoTargetBelt} successfully!\n\nWould you like to send WhatsApp congratulations to parent (+91 ${phone})?`)) {
        openWhatsApp({ phone: waPhone, message: text });
      }
    } catch (err) {
      alert('Promotion recorded locally.');
      setPromoteModalStudent(null);
    }
  };

  // Open Edit Modal & Pre-populate ALL Personal Details
  const handleOpenEditModal = (student) => {
    const cleanBranch = student.branch_name || student.branch_detail?.name || student.branchName || (typeof student.branch === 'object' ? student.branch?.name : student.branch) || '';
    const bStr = String(cleanBranch).toLowerCase();
    let exactBranchName = 'Pulikkal Branch (Head Office)';
    if (bStr.includes('chungam')) exactBranchName = 'Chungam Branch Dojo';
    else if (bStr.includes('mongam')) exactBranchName = 'Mongam Branch Dojo';

    setEditingStudent({
      ...student,
      name: student.name || '',
      guardianName: student.guardianName || student.guardian_name || '',
      guardian_name: student.guardianName || student.guardian_name || '',
      occupation: student.occupation || student.guardian_occupation || '',
      phone: student.phone || '',
      whatsapp: student.whatsapp || student.phone || '',
      age: student.age || 10,
      gender: student.gender || 'Male',
      bloodGroup: student.bloodGroup || student.blood_group || 'O+',
      currentBelt: student.currentBelt || student.current_belt || 'White Belt',
      current_belt: student.currentBelt || student.current_belt || 'White Belt',
      branch: exactBranchName,
      branch_name: exactBranchName,
      shift: student.shift || 'Evening Batch (5:00 PM - 7:00 PM)',
      admissionFee: student.admission_fee ?? student.admissionFee ?? 1000,
      admission_fee: student.admission_fee ?? student.admissionFee ?? 1000,
      admissionFeePaid: student.admission_fee_paid ?? student.admissionFeePaid ?? true,
      feeAmount: student.fee_amount ?? student.feeAmount ?? 500,
      fee_amount: student.fee_amount ?? student.feeAmount ?? 500,
      address: student.address || '',
      medicalNotes: student.medicalNotes || student.medical_notes || ''
    });
    setEditPhotoState({ rawSrc: '', zoom: 1.0, panX: 0, panY: 0 });
  };

  // Submit Update Cadet Profile (All 10+ Personal Detail Fields)
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const finalPhoto = editPhotoState.rawSrc ? getCanvasDataUrl(editCanvasRef, editingStudent.photo) : editingStudent.photo;
    const initialPaid = parseInt(editingStudent.initialPaidAmount || editingStudent.initial_paid_amount || 0);
    const feeAmt = parseInt(editingStudent.feeAmount || editingStudent.fee_amount || 500);
    const admissionFeeAmt = editingStudent.admissionFee !== undefined ? Math.max(0, parseInt(editingStudent.admissionFee) || 0) : (editingStudent.admission_fee !== undefined ? Math.max(0, parseInt(editingStudent.admission_fee) || 0) : 1000);
    const isAdmissionPaid = admissionFeeAmt === 0 || !!(editingStudent.admissionFeePaid ?? editingStudent.admission_fee_paid ?? true);
    const pending = Math.max(0, feeAmt - initialPaid);
    const calculatedFeeStatus = pending === 0 ? 'Paid' : initialPaid > 0 ? 'Partial' : 'Pending';

    const rawEditBranch = editingStudent.branch_id || editingStudent.branch || editingStudent.branch_name || 'Pulikkal Branch (Head Office)';
    let editBranchName = 'Pulikkal Branch (Head Office)';
    let editBranchId = '283e0cc2-0009-494f-a3e1-7d8b14356213';
    const rawEditStr = String(rawEditBranch).toLowerCase().trim();
    if (rawEditStr.includes('chungam') || rawEditStr.includes('cgm') || rawEditStr.includes('dojo-02') || rawEditStr.includes('20c924cd')) {
      editBranchName = 'Chungam Branch Dojo';
      editBranchId = '20c924cd-2dc7-4f82-a459-5e86286748c5';
    } else if (rawEditStr.includes('mongam') || rawEditStr.includes('dojo-03') || rawEditStr.includes('d4639193')) {
      editBranchName = 'Mongam Branch Dojo';
      editBranchId = 'd4639193-c693-46e2-a46e-5e25dcf427a1';
    } else if (rawEditStr.includes('feroke') || rawEditStr.includes('dojo-04') || rawEditStr.includes('5f429f1f')) {
      editBranchName = 'Feroke Branch';
      editBranchId = '5f429f1f-1a33-40af-a621-cae5ecbccb41';
    } else if (rawEditStr.includes('pulikkal') || rawEditStr.includes('plk') || rawEditStr.includes('dojo-01') || rawEditStr.includes('283e0cc2')) {
      editBranchName = 'Pulikkal Branch (Head Office)';
      editBranchId = '283e0cc2-0009-494f-a3e1-7d8b14356213';
    }

    const updatedData = {
      ...editingStudent,
      hasCustomFee: true,
      has_custom_fee: true,
      photo: finalPhoto,
      name: editingStudent.name,
      guardianName: editingStudent.guardianName || editingStudent.guardian_name,
      guardian_name: editingStudent.guardianName || editingStudent.guardian_name,
      occupation: editingStudent.occupation || '',
      guardian_occupation: editingStudent.occupation || '',
      phone: editingStudent.phone,
      whatsapp: editingStudent.whatsapp || editingStudent.phone,
      age: parseInt(editingStudent.age) || 10,
      gender: editingStudent.gender || 'Male',
      bloodGroup: editingStudent.bloodGroup || editingStudent.blood_group || 'O+',
      blood_group: editingStudent.bloodGroup || editingStudent.blood_group || 'O+',
      currentBelt: editingStudent.currentBelt || editingStudent.current_belt || 'White Belt',
      current_belt: editingStudent.currentBelt || editingStudent.current_belt || 'White Belt',
      branch: editBranchId,
      branch_id: editBranchId,
      branch_name: editBranchName,
      branchName: editBranchName,
      dojo_branch: editBranchName,
      shift: editingStudent.shift || 'Evening Batch (5:00 PM - 7:00 PM)',
      admissionFee: admissionFeeAmt,
      admission_fee: admissionFeeAmt,
      admissionFeePaid: isAdmissionPaid,
      admission_fee_paid: isAdmissionPaid,
      feeAmount: feeAmt,
      fee_amount: feeAmt,
      pendingAmount: pending,
      pending_amount: pending,
      feeStatus: calculatedFeeStatus,
      fee_status: calculatedFeeStatus,
      address: editingStudent.address || '',
      medicalNotes: editingStudent.medicalNotes || editingStudent.medical_notes || '',
      medical_notes: editingStudent.medicalNotes || editingStudent.medical_notes || ''
    };

    const isMatch = (s) => String(s.id).trim() === String(editingStudent.id).trim() ||
      (s.admissionNo && editingStudent.admissionNo && String(s.admissionNo).trim() === String(editingStudent.admissionNo).trim()) ||
      (s.admission_no && editingStudent.admission_no && String(s.admission_no).trim() === String(editingStudent.admission_no).trim());

    try {
      const saved = await updateStudent(editingStudent.id, updatedData);
      const updatedList = students.map(s => isMatch(s) ? { ...s, ...saved } : s);
      setStudents(updatedList);
      saveStoredStudents(updatedList);
      setEditingStudent(null);
      setEditPhotoState({ rawSrc: '', zoom: 1.0, panX: 0, panY: 0 });
    } catch (err) {
      const updatedList = students.map(s => isMatch(s) ? { ...s, ...updatedData } : s);
      setStudents(updatedList);
      saveStoredStudents(updatedList);
      setEditingStudent(null);
      setEditPhotoState({ rawSrc: '', zoom: 1.0, panX: 0, panY: 0 });
    }
  };

  // Confirm Delete Student
  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    const stdId = deletingStudent.id;
    const admNo = deletingStudent.admissionNo || deletingStudent.admission_no;
    
    // 1. Instantly remove from local React UI state & localStorage
    const updatedList = students.filter(s => 
      String(s.id).trim() !== String(stdId).trim() && 
      String(s.admissionNo || '').trim() !== String(stdId).trim() && 
      String(s.admission_no || '').trim() !== String(stdId).trim() &&
      (!admNo || (String(s.admissionNo || '').trim() !== String(admNo).trim() && String(s.admission_no || '').trim() !== String(admNo).trim()))
    );
    setStudents(updatedList);
    saveStoredStudents(updatedList);
    setDeletingStudent(null);
    if (inspectorStudent && (String(inspectorStudent.id) === String(stdId) || String(inspectorStudent.admissionNo || inspectorStudent.admission_no) === String(admNo))) {
      setInspectorStudent(updatedList.length > 0 ? updatedList[0] : null);
    }

    // 2. Permanently delete from live database
    try {
      await deleteStudent(stdId, admNo);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Filter cadets based on Search, Belt, Branch, Shift Batch, Category, and Selected Tab
  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (s.admissionNo || s.admission_no || '').toLowerCase().includes(search.toLowerCase()) ||
                          (s.phone || '').includes(search);
    const matchesBelt = selectedBelt === 'ALL' || (s.currentBelt || s.current_belt) === selectedBelt;
    
    // Strict & Bulletproof Branch Filtering (Supports Active Branch Scope system-wide)
    const getCadetBranchKey = (cadet) => {
      if (!cadet) return 'pulikkal';
      const bObj = cadet.branch_detail || (typeof cadet.branch === 'object' ? cadet.branch : null);
      const bObjName = bObj ? (bObj.name || bObj.title || '') : '';
      const bId = cadet.branch_id || (typeof cadet.branch === 'object' ? cadet.branch?.id : '');
      const rawBranch = cadet.branch_name || cadet.branchName || cadet.dojo_branch || cadet.dojoBranch || cadet.branch_dojo || bObjName || cadet.branch || '';
      const bStr = (String(rawBranch) + ' ' + String(bId) + ' ' + String(cadet.branch || '')).toLowerCase().trim();

      if (bStr.includes('chungam') || bStr.includes('cgm') || bStr.includes('dojo-02') || bStr.includes('20c924cd')) return 'chungam';
      if (bStr.includes('mongam') || bStr.includes('dojo-03') || bStr.includes('d4639193')) return 'mongam';
      if (bStr.includes('feroke') || bStr.includes('dojo-04') || bStr.includes('5f429f1f')) return 'feroke';
      if (bStr.includes('pulikkal') || bStr.includes('plk') || bStr.includes('dojo-01') || bStr.includes('283e0cc2')) return 'pulikkal';
      
      return 'pulikkal';
    };

    const cadetBranchKey = getCadetBranchKey(s);
    
    // Active Branch Resolution
    const userRole = user?.role || '';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'HEAD_OFFICE';

    let activeScope = 'ALL';
    if (!isSuperAdmin && (user?.branch || user?.assigned_branch_id)) {
      activeScope = user.branch || user.assigned_branch_id;
    } else if (selectedBranch && selectedBranch !== 'ALL') {
      activeScope = selectedBranch;
    } else if (activeBranch && activeBranch !== 'ALL') {
      activeScope = activeBranch;
    }

    const scopeLower = String(activeScope).toLowerCase().trim();
    let matchesBranch = true;

    if (scopeLower && !scopeLower.includes('all')) {
      if (scopeLower.includes('chungam') || scopeLower.includes('cgm') || scopeLower.includes('dojo-02') || scopeLower.includes('20c924cd')) {
        matchesBranch = (cadetBranchKey === 'chungam');
      } else if (scopeLower.includes('mongam') || scopeLower.includes('dojo-03') || scopeLower.includes('d4639193')) {
        matchesBranch = (cadetBranchKey === 'mongam');
      } else if (scopeLower.includes('feroke') || scopeLower.includes('dojo-04') || scopeLower.includes('5f429f1f')) {
        matchesBranch = (cadetBranchKey === 'feroke');
      } else if (scopeLower.includes('pulikkal') || scopeLower.includes('plk') || scopeLower.includes('dojo-01') || scopeLower.includes('283e0cc2')) {
        matchesBranch = (cadetBranchKey === 'pulikkal');
      } else {
        matchesBranch = (cadetBranchKey === scopeLower || String(s.branch_id) === String(activeScope) || String(s.branch) === String(activeScope));
      }
    }

    const cadetShift = s.shift || 'Evening Batch (5:00 PM - 7:00 PM)';
    const matchesShift = selectedShift === 'ALL' || cadetShift.toLowerCase().includes(selectedShift.toLowerCase());

    const cadetCat = s.category || (s.age <= 13 ? 'Kids' : s.age <= 17 ? 'Teens' : 'Adults');
    const matchesCategory = selectedCategory === 'ALL' || cadetCat.toLowerCase() === selectedCategory.toLowerCase();

    // Tab Filter
    const isInactive = s.status === 'Inactive';
    const totalAdmFee = parseFloat(s.admissionFee ?? s.admission_fee ?? 1000);
    const paidAdmFee = parseFloat(s.admissionFeePaidAmount ?? s.admission_fee_paid_amount ?? 0);
    const isAdmissionFeePending = totalAdmFee > 0 && (s.admissionFeePaid === false || s.admission_fee_paid === false || paidAdmFee < totalAdmFee);
    let matchesTab = true;
    if (selectedTab === 'Active') matchesTab = !isInactive;
    if (selectedTab === 'Inactive') matchesTab = isInactive;
    if (selectedTab === 'AdmissionFeePending') matchesTab = isAdmissionFeePending;

    return matchesSearch && matchesBelt && matchesBranch && matchesShift && matchesCategory && matchesTab;
  });

  // Pagination Calculations (10 per page)
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const indexOfLastStudent = Math.min(currentPage * itemsPerPage, filteredStudents.length);
  const indexOfFirstStudent = (currentPage - 1) * itemsPerPage;
  const currentPaginatedStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);

  return (
    <div className="space-y-6">
      {/* Sleek Compact Top Banner */}
      <div className="bg-white p-4 sm:px-5 sm:py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 w-full">
        <div>
          <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight">Cadet Admissions & Profiles</h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Manage cadet admissions, photos, training shifts, belts, and digital profile cards.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!isInstructor && (
            <button
              onClick={() => setShowGlobalFeeModal(true)}
              className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Settings className="w-4 h-4 text-amber-600 flex-shrink-0" /> <span className="whitespace-nowrap">Fee Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowInquiriesModal(true)}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition transform hover:-translate-y-0.5 cursor-pointer relative"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-200 flex-shrink-0" />
            <span className="whitespace-nowrap">Inquiries</span>
            <span className="px-1.5 py-0.2 bg-white text-red-700 font-black text-[10px] rounded-md shadow-xs">
              {inquiriesList.filter(i => i.status === 'PENDING').length}
            </span>
          </button>

          <button
            onClick={async () => {
              const currentGlobal = getGlobalFeeSettings();
              const activeBranchScope = (activeBranch && !activeBranch.toLowerCase().includes('all')) 
                ? activeBranch 
                : (selectedBranch && selectedBranch !== 'ALL' ? selectedBranch : (user?.branch || 'Pulikkal Branch (Head Office)'));

              const matchedB = branchesList.find(b => 
                b.name === activeBranchScope || 
                b.id === activeBranchScope ||
                (String(activeBranchScope).toLowerCase().includes('chungam') && String(b.name).toLowerCase().includes('chungam')) ||
                (String(activeBranchScope).toLowerCase().includes('mongam') && String(b.name).toLowerCase().includes('mongam')) ||
                (String(activeBranchScope).toLowerCase().includes('pulikkal') && String(b.name).toLowerCase().includes('pulikkal'))
              ) || branchesList[0] || INITIAL_BRANCHES[0];

              const defaultBranchId = matchedB?.id || matchedB?.name || 'branch-pulikkal';
              const defaultBranchName = matchedB?.name || 'Pulikkal Branch (Head Office)';

              const initialShifts = getActiveShiftOptions(defaultBranchName);
              const defaultShift = initialShifts.length > 0 ? initialShifts[0] : 'Evening Batch (5:00 PM - 7:00 PM)';

              const feeInfo = await getApplicableFees(defaultBranchId);
              const finalAdmFee = feeInfo.admissionFee || currentGlobal.defaultAdmissionFee || 1000;
              const finalMonthlyFee = feeInfo.monthlyFee || currentGlobal.defaultMonthlyFee || 500;

              setFormData({
                name: '',
                photo: '',
                guardianName: '',
                occupation: '',
                phone: '',
                whatsapp: '',
                dob: '',
                age: 12,
                currentBelt: 'White Belt',
                branch: defaultBranchName,
                branch_id: defaultBranchId,
                branch_name: defaultBranchName,
                shift: defaultShift,
                joiningDate: new Date().toISOString().split('T')[0],
                admissionFee: finalAdmFee,
                admissionFeePaidAmount: finalAdmFee,
                feeAmount: finalMonthlyFee,
                initialPaidAmount: finalMonthlyFee,
                feeStatus: 'Paid',
                gender: 'Male',
                bloodGroup: 'O+',
                address: ''
              });
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-red-600/20 transition transform hover:-translate-y-0.5 cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">New Cadet Admission</span>
          </button>

          <button
            type="button"
            title="Sync live from central database"
            onClick={() => {
              fetchStudents().then(data => {
                setStudents(data || []);
              });
            }}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Quick Metrics KPI Summary Row (Clean 4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-red-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL CADETS</span>
            <strong className="text-xl font-black text-gray-900 leading-none block mt-0.5">{filteredStudents.length}</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TRAINING SHIFTS</span>
            <strong className="text-xl font-black text-gray-900 leading-none block mt-0.5">{getDynamicShiftOptions().length} Batches</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">FEES PAID</span>
            <strong className="text-xl font-black text-emerald-600 leading-none block mt-0.5">
              {filteredStudents.filter(s => (s.feeStatus || s.fee_status) === 'Paid').length} Cadets
            </strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-rose-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">MONTHLY DUES</span>
            <strong className="text-xl font-black text-rose-600 leading-none block mt-0.5">
              {filteredStudents.filter(s => (s.feeStatus || s.fee_status) !== 'Paid').length} Cadets
            </strong>
          </div>
        </div>
      </div>

      {/* Sleek Single-Line Search & Filter Toolbar */}
      <div className="bg-white p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 text-xs w-full">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search cadet by name, admission no, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-bold text-gray-700 w-full sm:w-auto">
          {/* Shift Batch Filter */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[120px]">
            <Clock className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <span className="text-[11px] whitespace-nowrap">Shift:</span>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer transition shadow-sm truncate"
            >
              <option value="ALL">All Shifts</option>
              {getDynamicShiftOptions().map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Belt Filter */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[110px]">
            <Filter className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <span className="text-[11px] whitespace-nowrap">Belt:</span>
            <select
              value={selectedBelt}
              onChange={(e) => setSelectedBelt(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer transition shadow-sm truncate"
            >
              <option value="ALL">All Belts</option>
              {BELT_LEVELS.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {!isInstructor && (
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[120px]">
              <span className="text-[11px] whitespace-nowrap">Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer transition shadow-sm truncate"
              >
                <option value="ALL">All Branches</option>
                {INITIAL_BRANCHES.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Cadets Roster Table Container */}
      <div className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100/90 text-gray-800 font-black text-[11px] uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-4 px-5">Adm No</th>
                <th className="py-4 px-5">Cadet Name & Guardian</th>
                <th className="py-4 px-5">Belt Rank</th>
                <th className="py-4 px-5">Shift Batch</th>
                <th className="py-4 px-5">Branch Dojo</th>
                <th className="py-4 px-5">Monthly Amount</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {currentPaginatedStudents.map((std) => (
                <tr 
                  key={std.id} 
                  onClick={() => setDetailStudent(std)}
                  className="hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-white transition-all duration-150 group cursor-pointer"
                >
                  <td className="py-4 px-5">
                    <span className="font-mono font-black text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-xl inline-block shadow-sm group-hover:border-red-400">
                      {std.admissionNo || std.admission_no}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3.5">
                      {std.photo ? (
                        <img src={std.photo} alt={std.name} className="w-11 h-11 rounded-full object-cover border-2 border-red-500/30 shadow-md group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white font-black text-sm flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          {std.name ? std.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <strong className="text-gray-900 font-black text-sm block leading-tight group-hover:text-red-600 transition-colors flex items-center gap-1.5">
                          <span>{std.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-gray-100 text-gray-500 rounded font-normal group-hover:bg-red-100 group-hover:text-red-700">360° Profile</span>
                        </strong>
                        <span className="text-[11px] text-gray-500 font-medium block">
                          Parent: {std.guardianName || std.guardian_name} ({std.phone})
                          {(std.occupation || std.guardian_occupation) && (
                            <span className="text-red-600 font-bold ml-1.5">• {std.occupation || std.guardian_occupation}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="px-3.5 py-1.5 rounded-full bg-gray-100/90 border border-gray-200 text-gray-800 font-bold text-xs inline-flex items-center gap-1 shadow-sm">
                      🥋 {std.currentBelt || std.current_belt || 'White Belt'}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px] inline-block shadow-sm">
                      ⏰ {std.shift || 'Evening Batch'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-gray-700 font-bold text-xs">
                    {std.branch_name || std.branch_detail?.name || (typeof std.branch === 'object' ? std.branch?.name : (String(std.branch || '').length > 20 ? 'Pulikkal Branch (Head Office)' : std.branch)) || 'Pulikkal Branch (Head Office)'}
                  </td>
                  <td className="py-4 px-5">
                    {(() => {
                      const rawRate = parseFloat(std.feeAmount ?? std.fee_amount ?? globalFeeSettings?.defaultMonthlyFee ?? 500);
                      const monthlyRate = (isNaN(rawRate) || rawRate < 100) 
                        ? (parseFloat(globalFeeSettings?.defaultMonthlyFee) || 500) 
                        : rawRate;

                      const admFee = parseFloat(std.admissionFee ?? std.admission_fee ?? 1000);
                      const admPaid = parseFloat(std.admissionFeePaidAmount ?? std.admission_fee_paid_amount ?? (std.admissionFeePaid ? admFee : 0));
                      const admPending = (admFee === 0 || std.admissionFeePaid === true || std.admission_fee_paid === true) ? 0 : Math.max(0, admFee - admPaid);
                      const monthlyPaid = parseFloat(std.initialPaidAmount ?? std.initial_paid_amount ?? 0);
                      const monthlyPending = Math.max(0, monthlyRate - monthlyPaid);
                      const totalPending = admPending + monthlyPending;

                      return (
                        <div className="space-y-1">
                          <span className="px-2.5 py-0.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300/80 text-[11px] font-black shadow-xs inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ₹{monthlyRate}/mo
                          </span>
                          <div>
                            {totalPending > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black inline-block">
                                Dues: ₹{totalPending}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-block">
                                ✓ All Clear
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="bg-gray-100/80 p-1 rounded-2xl border border-gray-200/80 inline-flex items-center gap-1 shadow-sm" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDetailStudent(std)}
                        title="Inspect 360° Cadet Profile & Full Fee Breakdown"
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl border border-indigo-200 transition shadow-xs cursor-pointer inline-flex items-center gap-1 text-[11px] font-black"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>360°</span>
                      </button>
                      <button
                        onClick={() => handleOpenPromoteModal(std)}
                        title="Promote Cadet Belt Rank & Issue Certificate"
                        className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl border border-emerald-300/80 transition shadow-xs cursor-pointer inline-flex items-center gap-1 text-[11px] font-black"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setActiveCardStudent(std)}
                        title="View Digital QR Profile Card"
                        className="p-1.5 bg-white text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl border border-gray-200 transition shadow-xs cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(std)}
                        title="Edit Cadet Details & Photo"
                        className="p-1.5 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl border border-gray-200 transition shadow-xs cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingStudent(std)}
                        title="Remove Cadet from Academy"
                        className="p-1.5 bg-white text-red-600 hover:bg-red-600 hover:text-white rounded-xl border border-gray-200 transition shadow-xs cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Working Pagination Bar */}
        <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-gray-700">
          <div className="flex items-center gap-3">
            <span>
              Showing {filteredStudents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {indexOfLastStudent} of {filteredStudents.length} cadets
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none cursor-pointer shadow-sm"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 font-bold">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer shadow-sm"
            >
              ‹ Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-xl font-black text-xs transition cursor-pointer shadow-sm ${
                  currentPage === page
                    ? 'bg-red-600 text-white shadow-red-500/30'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer shadow-sm"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Automatic WhatsApp Welcome Dispatch Confirmation */}
      {welcomeDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-300 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">Cadet Registered Successfully!</h3>
              <p className="text-xs text-gray-600">
                Admission No <strong className="text-red-600 font-mono">{welcomeDispatchModal.admNo}</strong> for <strong className="text-gray-900">{welcomeDispatchModal.studentName}</strong> has been saved.
              </p>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80 space-y-2 text-left">
              <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">Choose WhatsApp Sender:</span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp({ phone: welcomeDispatchModal.phone, message: welcomeDispatchModal.rawMessage, channel: 'BUSINESS' });
                    setWelcomeDispatchModal(null);
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> 🟢 Send via WhatsApp Business (Official)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp({ phone: welcomeDispatchModal.phone, message: welcomeDispatchModal.rawMessage, channel: 'REGULAR' });
                    setWelcomeDispatchModal(null);
                  }}
                  className="w-full py-2 px-4 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" /> 💬 Send via Personal WhatsApp
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setWelcomeDispatchModal(null)}
                className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Cadet Admission Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Plus className="w-6 h-6 text-red-600" /> New Cadet Admission Form
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Photo Upload & Inline Resizer Canvas Box */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <label className="text-gray-700 font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-red-600" /> Cadet Photo (Fixed {FIXED_AVATAR_DIM}x{FIXED_AVATAR_DIM} px HD Resizer)
                </label>

                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-red-500/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm relative">
                    {addPhotoState.rawSrc ? (
                      <canvas ref={addCanvasRef} className="w-full h-full object-cover rounded-xl" />
                    ) : formData.photo ? (
                      <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[9px]">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-grow">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl text-xs shadow-md transition">
                      <Upload className="w-4 h-4" /> Select Cadet Photo File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAddPhotoPick}
                        className="hidden"
                      />
                    </label>

                    {/* Inline Zoom & Pan Controls Sliders */}
                    {addPhotoState.rawSrc && (
                      <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200 space-y-2 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] text-gray-500 font-bold block">Zoom ({addPhotoState.zoom.toFixed(1)}x)</label>
                            <input
                              type="range"
                              min="0.4"
                              max="3.0"
                              step="0.1"
                              value={addPhotoState.zoom}
                              onChange={(e) => setAddPhotoState({ ...addPhotoState, zoom: parseFloat(e.target.value) })}
                              className="w-full accent-red-600 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 font-bold block">Move X ({addPhotoState.panX}px)</label>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              step="5"
                              value={addPhotoState.panX}
                              onChange={(e) => setAddPhotoState({ ...addPhotoState, panX: parseInt(e.target.value) })}
                              className="w-full accent-red-600 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 font-bold block">Move Y ({addPhotoState.panY}px)</label>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              step="5"
                              value={addPhotoState.panY}
                              onChange={(e) => setAddPhotoState({ ...addPhotoState, panY: parseInt(e.target.value) })}
                              className="w-full accent-red-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full cadet name..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    placeholder="Father / Mother name..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-red-600" /> Occupation
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="Student, Govt Job, Business..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: formData.whatsapp || e.target.value })}
                    placeholder="+91 98460..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+91 98460..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-red-600" /> Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dob || ''}
                    onChange={(e) => {
                      const dobVal = e.target.value;
                      const calculatedAge = calculateAgeFromDOB(dobVal);
                      setFormData({ ...formData, dob: dobVal, age: calculatedAge });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-red-500 transition cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Age (Auto) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 12 })}
                    className="w-full bg-emerald-50/80 border border-emerald-300 rounded-xl px-3 py-2.5 text-emerald-900 font-black text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Belt Level</label>
                  <select
                    value={formData.currentBelt}
                    onChange={(e) => setFormData({ ...formData, currentBelt: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer transition"
                  >
                    {BELT_LEVELS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1 text-red-600">Branch Dojo *</label>
                  <select
                    required
                    disabled={isInstructor}
                    value={formData.branch_id || formData.branch}
                    onChange={async (e) => {
                      const selVal = e.target.value;
                      const matchedB = branchesList.find(b => b.id === selVal || b.name === selVal);
                      const bId = matchedB?.id || selVal;
                      const bName = matchedB?.name || selVal;
                      const branchShifts = getActiveShiftOptions(bName);
                      const defaultShift = branchShifts.length > 0 ? branchShifts[0] : 'Evening Batch (5:00 PM - 7:00 PM)';
                      
                      const feeInfo = await getApplicableFees(bId);
                      setFormData(prev => ({
                        ...prev,
                        branch: bName,
                        branch_id: bId,
                        branch_name: bName,
                        shift: defaultShift,
                        admissionFee: feeInfo.admissionFee,
                        admissionFeePaidAmount: feeInfo.admissionFee,
                        feeAmount: feeInfo.monthlyFee,
                        initialPaidAmount: feeInfo.monthlyFee
                      }));
                    }}
                    className="w-full bg-gray-50 border-2 border-red-200 rounded-xl px-3 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 disabled:opacity-50 cursor-pointer transition"
                  >
                    <option value="">-- Select Dojo Branch * --</option>
                    {branchesList.map(b => (
                      <option key={b.id || b.name} value={b.id || b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Training Shift Batch Selector Field */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                <label className="text-amber-800 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-amber-600" /> Training Shift / Batch *
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {!formData.branch ? (
                    <option value="">-- Select Dojo Branch First --</option>
                  ) : (
                    getActiveShiftOptions(formData.branch).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Full Residential Address Details Field */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <label className="text-gray-700 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-red-600" /> Full Residential Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="House Name / House No, Street, Locality, Place, City, Pincode..."
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              {/* One-Time Admission Fee (Total & Custom Amount Paid) */}
              <div className="p-4 bg-amber-50/80 border-2 border-amber-200/90 rounded-2xl space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-amber-900 font-black text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <Award className="w-4 h-4 text-amber-600" /> One-Time Admission Fee (Total: ₹{formData.admissionFee}) *
                      {formData.admissionFee === 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider ml-1">
                          🎁 FREE / WAIVED
                        </span>
                      )}
                    </label>
                    <p className="text-[10px] text-amber-700/80">
                      {formData.admissionFee === 0 
                        ? 'Admission Fee is waived (₹0 Free). Cadet will not have admission fee pending dues.' 
                        : 'Enter exact admission fee collected from parent now.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600 font-bold">Total:</span>
                      <input
                        type="number"
                        disabled={isInstructor}
                        value={formData.admissionFee}
                        onChange={(e) => {
                          const val = e.target.value;
                          const total = val === '' ? '' : Math.max(0, parseInt(val) || 0);
                          const prevTotal = formData.admissionFee;
                          const wasFullPaid = formData.admissionFeePaidAmount === prevTotal || formData.admissionFeePaidAmount === 0;
                          setFormData({
                            ...formData,
                            admissionFee: total,
                            admissionFeePaidAmount: total === 0 ? 0 : (wasFullPaid && formData.admissionFeePaidAmount !== 0 ? total : (formData.admissionFeePaidAmount > total ? total : formData.admissionFeePaidAmount))
                          });
                        }}
                        className={`w-24 bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-amber-900 font-black text-xs font-mono text-right focus:outline-none focus:border-amber-500 ${isInstructor ? 'opacity-70 cursor-not-allowed bg-amber-50/50' : ''}`}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-emerald-700 font-bold">Amount Paid Now:</span>
                      <input
                        type="number"
                        disabled={formData.admissionFee === 0}
                        value={formData.admissionFee === 0 ? 0 : formData.admissionFeePaidAmount}
                        onChange={(e) => setFormData({ ...formData, admissionFeePaidAmount: parseInt(e.target.value) || 0 })}
                        className={`w-28 bg-white border-2 border-emerald-500 rounded-xl px-2.5 py-1.5 text-emerald-700 font-black text-sm font-mono text-right focus:outline-none focus:border-emerald-600 shadow-sm ${formData.admissionFee === 0 ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
                  <span className="text-[10px] text-gray-600 font-bold">Quick Presets:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, admissionFee: 0, admissionFeePaidAmount: 0 })}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                        formData.admissionFee === 0
                          ? 'bg-emerald-700 text-white shadow ring-2 ring-emerald-500'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                      }`}
                    >
                      🎁 Free / Waived (₹0)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const baseTotal = formData.admissionFee === 0 ? 1000 : formData.admissionFee;
                        setFormData({ ...formData, admissionFee: baseTotal, admissionFeePaidAmount: baseTotal });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formData.admissionFee > 0 && formData.admissionFeePaidAmount === formData.admissionFee
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      ✓ Full Paid (₹{formData.admissionFee === 0 ? 1000 : formData.admissionFee})
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const baseTotal = formData.admissionFee === 0 ? 1000 : formData.admissionFee;
                        setFormData({ ...formData, admissionFee: baseTotal, admissionFeePaidAmount: Math.floor(baseTotal / 2) });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formData.admissionFee > 0 && formData.admissionFeePaidAmount === Math.floor(formData.admissionFee / 2)
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      Half Paid (₹{Math.floor((formData.admissionFee === 0 ? 1000 : formData.admissionFee) / 2)})
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const baseTotal = formData.admissionFee === 0 ? 1000 : formData.admissionFee;
                        setFormData({ ...formData, admissionFee: baseTotal, admissionFeePaidAmount: 0 });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formData.admissionFee > 0 && formData.admissionFeePaidAmount === 0
                          ? 'bg-red-100 text-red-700 border border-red-300 shadow'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      ❌ ₹0 (Pending ₹{formData.admissionFee === 0 ? 1000 : formData.admissionFee})
                    </button>
                  </div>
                </div>
              </div>

              {/* Monthly Tuition Fee & Custom Amount Paid Field */}
              <div className="p-4 bg-emerald-50/80 border-2 border-emerald-200/90 rounded-2xl space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-emerald-900 font-black text-xs flex items-center gap-1.5 uppercase tracking-wider">
                      <CreditCard className="w-4 h-4 text-emerald-600" /> First Month Tuition Fee (Total: ₹{formData.feeAmount}) *
                    </label>
                    <p className="text-[10px] text-emerald-700/80">Enter monthly tuition fee collected from parent now.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600 font-bold">Monthly Fee:</span>
                      <input
                        type="number"
                        disabled={isInstructor}
                        value={formData.feeAmount}
                        onChange={(e) => {
                          const amt = parseInt(e.target.value) || 0;
                          const prevAmt = formData.feeAmount;
                          const wasFullPaid = formData.initialPaidAmount === prevAmt || formData.initialPaidAmount === 0;
                          setFormData({
                            ...formData,
                            feeAmount: amt,
                            initialPaidAmount: wasFullPaid && formData.initialPaidAmount !== 0 ? amt : (formData.initialPaidAmount > amt ? amt : formData.initialPaidAmount)
                          });
                        }}
                        className={`w-24 bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-amber-900 font-black text-xs font-mono text-right focus:outline-none focus:border-emerald-500 ${isInstructor ? 'opacity-70 cursor-not-allowed bg-emerald-50/50' : ''}`}
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-emerald-700 font-bold">Amount Paid Now:</span>
                      <input
                        type="number"
                        value={formData.initialPaidAmount}
                        onChange={(e) => setFormData({ ...formData, initialPaidAmount: parseInt(e.target.value) || 0 })}
                        className="w-28 bg-white border-2 border-emerald-500 rounded-xl px-2.5 py-1.5 text-emerald-700 font-black text-sm font-mono text-right focus:outline-none focus:border-emerald-600 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60">
                  <span className="text-[10px] text-gray-600 font-bold">Quick Presets:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, initialPaidAmount: formData.feeAmount })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formData.initialPaidAmount === formData.feeAmount
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      ✓ Full Paid (₹{formData.feeAmount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, initialPaidAmount: 0 })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formData.initialPaidAmount === 0
                          ? 'bg-red-100 text-red-700 border border-red-300 shadow'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      ❌ ₹0 (Pending)
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Payment Balance Summary Box */}
              <div className="p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-2xl border border-gray-700 flex items-center justify-between text-xs font-bold shadow-xl">
                <div className="space-y-0.5">
                  <span className="text-gray-300 block text-[10px] uppercase font-bold tracking-wider">TOTAL COLLECTED NOW AT ADMISSION</span>
                  <span className="text-emerald-400 font-black text-lg font-mono">
                    ₹{(parseInt(formData.admissionFeePaidAmount) || 0) + (parseInt(formData.initialPaidAmount) || 0)} Paid
                  </span>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-gray-300 block text-[10px] uppercase font-bold tracking-wider">REMAINING PENDING DUES</span>
                  <span className={`font-black text-lg font-mono ${
                    Math.max(0, ((parseInt(formData.admissionFee) || 0) + (parseInt(formData.feeAmount) || 0)) - ((parseInt(formData.admissionFeePaidAmount) || 0) + (parseInt(formData.initialPaidAmount) || 0))) === 0
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    ₹{Math.max(0, ((parseInt(formData.admissionFee) || 0) + (parseInt(formData.feeAmount) || 0)) - ((parseInt(formData.admissionFeePaidAmount) || 0) + (parseInt(formData.initialPaidAmount) || 0)))} Dues
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs shadow-lg shadow-red-500/25 flex items-center gap-2 transform hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Admit New Cadet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Cadet Profile - FULL PRO MAX ALL PERSONAL DETAILS EDITABLE */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Edit className="w-6 h-6 text-blue-600" /> Edit Cadet Profile Details
              </h2>
              <button onClick={() => setEditingStudent(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              {/* Photo Upload & Resizer Box */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                <label className="text-gray-700 font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" /> Cadet Photo (Fixed {FIXED_AVATAR_DIM}x{FIXED_AVATAR_DIM} px HD)
                </label>

                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-blue-500/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm relative">
                    {editingStudent.photo ? (
                      <img src={editingStudent.photo} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : editPhotoState.rawSrc ? (
                      <canvas ref={editCanvasRef} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[9px]">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                        <Upload className="w-4 h-4" /> Select / Change Photo File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditPhotoPick}
                          className="hidden"
                        />
                      </label>

                      {(editingStudent.photo || editPhotoState.rawSrc) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudent({ ...editingStudent, photo: '' });
                            setEditPhotoState({ rawSrc: '', zoom: 1.0, panX: 0, panY: 0 });
                          }}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Pic
                        </button>
                      )}
                    </div>

                    {editPhotoState.rawSrc && (
                      <div className="mt-2 p-3 bg-white rounded-xl border border-gray-200 space-y-2 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] text-gray-500 font-bold block">Zoom ({editPhotoState.zoom.toFixed(1)}x)</label>
                            <input
                              type="range"
                              min="0.4"
                              max="3.0"
                              step="0.1"
                              value={editPhotoState.zoom}
                              onChange={(e) => setEditPhotoState({ ...editPhotoState, zoom: parseFloat(e.target.value) })}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 font-bold block">Move X ({editPhotoState.panX}px)</label>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              step="5"
                              value={editPhotoState.panX}
                              onChange={(e) => setEditPhotoState({ ...editPhotoState, panX: parseInt(e.target.value) })}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 font-bold block">Move Y ({editPhotoState.panY}px)</label>
                            <input
                              type="range"
                              min="-100"
                              max="100"
                              step="5"
                              value={editPhotoState.panY}
                              onChange={(e) => setEditPhotoState({ ...editPhotoState, panY: parseInt(e.target.value) })}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 1: Student Name, Parent Name & Occupation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.name || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.guardianName || editingStudent.guardian_name || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, guardianName: e.target.value, guardian_name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Occupation
                  </label>
                  <input
                    type="text"
                    value={editingStudent.occupation || editingStudent.guardian_occupation || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, occupation: e.target.value, guardian_occupation: e.target.value })}
                    placeholder="Student, Govt Job, Business..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Row 2: Phone & WhatsApp Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editingStudent.phone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={editingStudent.whatsapp || editingStudent.phone || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, whatsapp: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Row 3: DOB & Age & Belt Level & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={editingStudent.dob || ''}
                    onChange={(e) => {
                      const dobVal = e.target.value;
                      const calculatedAge = calculateAgeFromDOB(dobVal);
                      setEditingStudent({ ...editingStudent, dob: dobVal, age: calculatedAge });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Age (Auto) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    required
                    value={editingStudent.age || 10}
                    onChange={(e) => setEditingStudent({ ...editingStudent, age: parseInt(e.target.value) || 10 })}
                    className="w-full bg-emerald-50/80 border border-emerald-300 rounded-xl px-3 py-2.5 text-emerald-900 font-black text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Belt Level</label>
                  <select
                    value={editingStudent.currentBelt || editingStudent.current_belt || 'White Belt'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, currentBelt: e.target.value, current_belt: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer transition"
                  >
                    {BELT_LEVELS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1 truncate flex items-center justify-between">
                    <span>Branch Dojo *</span>
                    <span className="text-[9px] text-amber-800 font-black bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-300 ml-1">🔒 Locked</span>
                  </label>
                  <select
                    disabled={true}
                    value={editingStudent.branch || editingStudent.branch_name || 'Pulikkal Branch (Head Office)'}
                    className="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-2.5 text-gray-700 font-bold text-xs cursor-not-allowed transition truncate"
                  >
                    {branchesList.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clean Full-Width Branch Locked Info Banner */}
              <div className="px-3.5 py-2 bg-amber-50/90 border border-amber-200/90 rounded-xl text-[11px] text-amber-900 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>ℹ️ <strong>Branch Dojo Locked:</strong> To transfer cadet to another branch, delete profile & re-add under new branch.</span>
              </div>

              {/* Row 4: Training Shift Batch Field */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                <label className="text-amber-800 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-amber-600" /> Training Shift / Batch *
                </label>
                <select
                  value={editingStudent.shift || (getActiveShiftOptions(editingStudent.branch || editingStudent.branch_name)[0] || 'General Training Batch (Regular)')}
                  onChange={(e) => setEditingStudent({ ...editingStudent, shift: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {getActiveShiftOptions(editingStudent.branch || editingStudent.branch_name).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Row 5: Monthly Fee Field & Presets */}
              <div className="p-3.5 bg-emerald-50/80 border-2 border-emerald-200/90 rounded-2xl space-y-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-emerald-900 font-black text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> Monthly Cadet Fee (₹)
                    {isInstructor && <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">🔒 Admin Only</span>}
                  </label>
                  <input
                    type="number"
                    disabled={isInstructor}
                    value={editingStudent.fee_amount ?? editingStudent.feeAmount ?? 500}
                    onChange={(e) => setEditingStudent({ ...editingStudent, feeAmount: parseInt(e.target.value) || 0, fee_amount: parseInt(e.target.value) || 0 })}
                    className="w-32 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-emerald-900 font-black text-sm font-mono focus:outline-none focus:border-blue-500 text-right disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/60">
                  <span className="text-[10px] text-gray-600 font-bold">Fee Presets:</span>
                  {[500, 600, 700, 800, 1000, 1200, 1500, 2000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setEditingStudent({ ...editingStudent, feeAmount: amt, fee_amount: amt })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        (editingStudent.feeAmount ?? editingStudent.fee_amount ?? 500) === amt
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 6: Address & Medical Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                  <label className="text-gray-700 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-red-600" /> Full Address
                  </label>
                  <textarea
                    rows={2}
                    value={editingStudent.address || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                    placeholder="Full residential address..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                  <label className="text-gray-700 font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5 text-blue-600" /> Medical Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={editingStudent.medicalNotes || editingStudent.medical_notes || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, medicalNotes: e.target.value, medical_notes: e.target.value })}
                    placeholder="Any medical conditions or notes..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 flex items-center gap-2 transform hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Updated Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Cadet */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-red-500/50 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-950/80 text-red-500 border border-red-500/50 rounded-full flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">Remove Cadet Record?</h3>
              <p className="text-xs text-gray-300">
                Are you sure you want to delete <strong className="text-red-400">{deletingStudent.name}</strong> ({deletingStudent.admissionNo || 'BAMA Cadet'}) from the roster? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white text-xs font-bold"
              >
                Cancel Keep Cadet
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-900/50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Remove Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Comprehensive Cadet 360° Profile & Financial Dues Statement (PRO MAX) */}
      {detailStudent && (() => {
        const std = detailStudent;
        const rawMonthlyRate = parseFloat(std.feeAmount ?? std.fee_amount ?? globalFeeSettings?.defaultMonthlyFee ?? 500);
        const monthlyRate = (isNaN(rawMonthlyRate) || rawMonthlyRate < 100) 
          ? (parseFloat(globalFeeSettings?.defaultMonthlyFee) || 500) 
          : rawMonthlyRate;

        const admFee = parseFloat(std.admissionFee ?? std.admission_fee ?? 1000);
        const admPaid = parseFloat(std.admissionFeePaidAmount ?? std.admission_fee_paid_amount ?? (std.admissionFeePaid ? admFee : 0));
        const admPending = (admFee === 0 || std.admissionFeePaid === true || std.admission_fee_paid === true) ? 0 : Math.max(0, admFee - admPaid);

        const monthlyPaid = parseFloat(std.initialPaidAmount ?? std.initial_paid_amount ?? 0);
        const monthlyPending = Math.max(0, monthlyRate - monthlyPaid);
        const totalPending = admPending + monthlyPending;
        const totalCollected = admPaid + monthlyPaid;

        const parentName = std.guardianName || std.guardian_name || 'Parent';
        const contactPhone = std.phone || 'N/A';
        const cleanPhone = (std.whatsapp || std.phone || '').replace(/[^0-9]/g, '');

        const sendWhatsAppStatement = () => {
          const text = 
            `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
            `📌 *OFFICIAL CADET 360° STATEMENT & FEE SUMMARY*\n` +
            `Cadet Name: *${std.name}*\n` +
            `Admission No: *${std.admissionNo || std.admission_no}*\n` +
            `Rank: *${std.currentBelt || std.current_belt || 'White Belt'}*\n` +
            `Branch Dojo: *${std.branch_name || std.branch || 'Pulikkal Head Office'}*\n` +
            `Shift: *${std.shift || 'Evening Batch'}*\n\n` +
            `📋 *FINANCIAL DUES BREAKDOWN:*\n` +
            (admFee === 0 
              ? `• Admission Fee: *🎁 FREE / WAIVED (₹0)*\n` 
              : `• Admission Fee: *₹${admFee}* (Paid: *₹${admPaid}*, Pending: *₹${admPending}*)\n`) +
            `• Monthly Tuition Fee: *₹${monthlyRate}* (Paid: *₹${monthlyPaid}*, Pending: *₹${monthlyPending}*)\n` +
            `-----------------------------------\n` +
            `💰 *TOTAL OUTSTANDING BALANCE: ₹${totalPending}*\n\n` +
            (totalPending === 0 
              ? `✅ All dues are 100% cleared! Thank you. OSS 🥋` 
              : `Dear Parent (${parentName}), kindly clear the pending dues of ₹${totalPending} at the academy office or via GooglePay to +91 95440 85442. OSS 🥋`);

          openWhatsApp({
            phone: cleanPhone || contactPhone,
            message: text
          });
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border-2 border-amber-500/40 overflow-hidden animate-in fade-in zoom-in duration-200 my-auto max-h-[92vh] flex flex-col">
              
              {/* Modal Top Banner */}
              <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-red-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-amber-500/40 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-amber-600 to-yellow-500 p-0.5 shadow-md flex-shrink-0">
                    {std.photo ? (
                      <img src={std.photo} alt={std.name} className="w-full h-full object-cover rounded-[14px]" />
                    ) : (
                      <div className="w-full h-full bg-gray-900 rounded-[14px] flex items-center justify-center font-black text-amber-400 text-lg">
                        {std.name ? std.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-white leading-tight capitalize">{std.name}</h2>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase shadow-xs">
                        🥋 {std.currentBelt || std.current_belt || 'White Belt'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-mono font-bold mt-0.5 flex items-center gap-2">
                      <span className="text-amber-400 font-black">{std.admissionNo || std.admission_no}</span>
                      <span>•</span>
                      <span className="text-gray-300">{std.branch_name || std.branch || 'Head Office'}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDetailStudent(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
                
                {/* 1. FINANCIAL 360° SUMMARY & DUES BANNER */}
                <div className={`p-4 rounded-2xl border-2 shadow-sm ${
                  totalPending === 0 
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900' 
                    : 'bg-rose-50/90 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                        {totalPending === 0 ? '✓ Financial Account Status' : '⚠️ Outstanding Balance Warning'}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black font-mono">
                          {totalPending === 0 ? '₹0 (All Clear)' : `₹${totalPending.toLocaleString()} Dues Pending`}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 opacity-90">
                        Total Collected: <strong>₹{totalCollected.toLocaleString()}</strong> • Monthly Tuition: <strong>₹{monthlyRate}/mo</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={sendWhatsAppStatement}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send WhatsApp Notice</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. ITEMIZED FINANCIAL LEDGER (ADMISSION & MONTHLY FEES) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Monthly Tuition Fee Card */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                      <span className="font-black text-gray-900 text-xs flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-600" /> Monthly Tuition Fee
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        monthlyPending === 0 ? 'bg-emerald-100 text-emerald-800' : monthlyPaid > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {monthlyPending === 0 ? 'Paid' : monthlyPaid > 0 ? 'Partial' : 'Pending'}
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] font-bold">
                      <div className="flex justify-between text-gray-600">
                        <span>Rate:</span>
                        <span className="font-mono text-gray-900">₹{monthlyRate} / Month</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Paid So Far:</span>
                        <span className="font-mono text-emerald-700">₹{monthlyPaid}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
                        <span>Pending Monthly:</span>
                        <span className="font-mono font-black text-rose-600">₹{monthlyPending}</span>
                      </div>
                    </div>
                  </div>

                  {/* One-Time Admission Fee Card */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                      <span className="font-black text-gray-900 text-xs flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-600" /> One-Time Admission Fee
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        admFee === 0 ? 'bg-emerald-600 text-white' : admPending === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {admFee === 0 ? '🎁 Free / Waived' : admPending === 0 ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] font-bold">
                      <div className="flex justify-between text-gray-600">
                        <span>Total Admission:</span>
                        <span className="font-mono text-gray-900">{admFee === 0 ? '🎁 ₹0 (Waived)' : `₹${admFee}`}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Paid Amount:</span>
                        <span className="font-mono text-emerald-700">₹{admPaid}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
                        <span>Pending Admission:</span>
                        <span className="font-mono font-black text-rose-600">₹{admPending}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PERSONAL, GUARDIAN & CONTACT DETAILS */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                    <Users className="w-4 h-4 text-blue-600" /> Cadet & Guardian Information
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Parent / Guardian:</span>
                        <strong className="text-gray-900 font-black">{std.guardianName || std.guardian_name || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Relationship:</span>
                        <span className="text-gray-900 font-bold">{std.relationship || 'Father'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Occupation:</span>
                        <span className="text-gray-900 font-bold">{std.occupation || std.guardian_occupation || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Contact Phone:</span>
                        <a href={`tel:${std.phone}`} className="text-emerald-700 font-black font-mono hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {std.phone || 'N/A'}
                        </a>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Age & Gender:</span>
                        <span className="text-gray-900 font-black">{std.age || 12} Yrs • {std.gender || 'Male'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Date of Birth:</span>
                        <span className="text-gray-900 font-mono font-bold">{std.dob || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Blood Group:</span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-black text-[10px] inline-block">{std.bloodGroup || std.blood_group || 'O+'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Shift Batch:</span>
                        <span className="text-amber-800 font-bold">{std.shift || 'Evening Batch'}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Bottom Action Bar */}
              <div className="bg-gray-100/90 px-4 sm:px-6 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailStudent(null);
                      handleOpenPromoteModal(std);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" /> Promote Belt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailStudent(null);
                      setActiveCardStudent(std);
                    }}
                    className="px-3 py-1.5 bg-white text-amber-700 hover:bg-amber-50 rounded-xl font-bold text-xs border border-gray-200 flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" /> ID Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDetailStudent(null);
                      handleOpenEditModal(std);
                    }}
                    className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-bold text-xs border border-gray-200 flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailStudent(null)}
                  className="px-4 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: Official Cadet Digital Profile & ID Card - EXECUTIVE LIGHT WHITE PRO MAX */}
      {activeCardStudent && (
        <div className="print-modal-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static min-h-screen py-6 sm:py-8">
          {/* Print Style Rule */}
          <style>{`
            @media print {
              @page {
                size: 85mm 120mm;
                margin: 0 !important;
              }
              body {
                background: white !important;
                color: black !important;
              }
              .no-print, header, nav, aside, main > div > div:not(.print-modal-overlay), table, form {
                display: none !important;
              }
              .print-modal-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                z-index: 999999 !important;
                display: block !important;
              }
              .bama-print-id-card {
                position: relative !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 16px !important;
                border: 4px solid #d97706 !important;
                box-shadow: none !important;
                background-color: #ffffff !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: block !important;
                visibility: visible !important;
                max-height: none !important;
                overflow: visible !important;
              }
              .bama-print-id-card * {
                visibility: visible !important;
              }
            }
          `}</style>

          <div className="bama-print-id-card w-full max-w-sm bg-white border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 relative shadow-2xl space-y-3.5 text-gray-900 font-sans max-h-[90vh] overflow-y-auto my-auto">
            {/* Close Button */}
            <button
              onClick={() => setActiveCardStudent(null)}
              className="no-print absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-900 bg-gray-100 p-1.5 rounded-full border border-gray-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Academy Header with Logo */}
            <div className="flex items-center gap-2.5 border-b border-gray-200 pb-3">
              <img
                src="/logo bama_240616_200739.jpg.jpeg"
                alt="B.A.M.A. Logo"
                className="w-10 h-10 rounded-xl object-cover border-2 border-amber-500 shadow-sm flex-shrink-0"
              />
              <div>
                <h3 className="font-black text-xs sm:text-sm text-gray-900 tracking-wider uppercase leading-tight">
                  BRAVE ACADEMY OF MARTIAL ARTS
                </h3>
                <p className="text-[9px] text-amber-700 font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-600" /> OFFICIAL CADET ID CARD
                </p>
              </div>
            </div>

            {/* Profile Avatar & Primary Credentials */}
            <div className="text-center space-y-2.5">
              <div className="w-24 h-24 bg-gradient-to-br from-red-600 via-amber-600 to-yellow-500 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl text-white shadow-md overflow-hidden border-4 border-amber-400">
                {activeCardStudent.photo ? (
                  <img src={activeCardStudent.photo} alt={activeCardStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{activeCardStudent.name ? activeCardStudent.name.charAt(0).toUpperCase() : 'C'}</span>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-gray-900 capitalize leading-tight">
                  {activeCardStudent.name}
                </h4>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="px-2.5 py-0.5 bg-red-50 text-red-700 font-mono font-black text-[11px] rounded-lg border border-red-200 shadow-xs">
                    ID: {activeCardStudent.admissionNo || activeCardStudent.admission_no}
                  </span>
                  <span className="px-3 py-0.5 bg-amber-500 text-black font-black text-[11px] rounded-full uppercase shadow-xs">
                    🥋 {activeCardStudent.currentBelt || activeCardStudent.current_belt || 'White Belt'}
                  </span>
                </div>
              </div>
            </div>

            {/* Essential Personal Data Card */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-200/80">
                <span className="text-gray-600 font-bold flex items-center gap-1.5 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-red-600" /> Branch Dojo:
                </span>
                <span className="text-gray-900 font-black text-right text-[11px]">
                  {activeCardStudent.branch_name || activeCardStudent.branch_detail?.name || (typeof activeCardStudent.branch === 'object' ? activeCardStudent.branch?.name : (String(activeCardStudent.branch || '').length > 20 ? 'Pulikkal Branch (Head Office)' : activeCardStudent.branch)) || 'Pulikkal Branch (Head Office)'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-1.5 border-b border-gray-200/80">
                <span className="text-gray-600 font-bold flex items-center gap-1.5 text-[11px]">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Parent / Guardian:
                </span>
                <span className="text-gray-900 font-black text-[11px]">
                  {activeCardStudent.guardianName || activeCardStudent.guardian_name || 'N/A'}
                  {(activeCardStudent.occupation || activeCardStudent.guardian_occupation) && (
                    <span className="text-[9px] text-amber-800 font-medium block text-right">
                      ({activeCardStudent.occupation || activeCardStudent.guardian_occupation})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center pb-1.5 border-b border-gray-200/80">
                <span className="text-gray-600 font-bold flex items-center gap-1.5 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Contact Phone:
                </span>
                <span className="text-emerald-800 font-mono font-black text-[11px]">
                  {activeCardStudent.phone || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-bold flex items-center gap-1.5 text-[11px]">
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" /> Age & Gender:
                </span>
                <span className="text-gray-900 font-black text-[11px]">
                  {activeCardStudent.age || 10} Yrs &bull; {activeCardStudent.gender || 'Male'} ({activeCardStudent.bloodGroup || activeCardStudent.blood_group || 'O+'})
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => openWhatsApp({ 
                  phone: activeCardStudent.phone, 
                  message: `OSS Cadet ${activeCardStudent.name} (Admission No: ${activeCardStudent.admissionNo || activeCardStudent.admission_no}) - Welcome to B.A.M.A Karate Academy!` 
                })}
                className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white rounded-xl font-black text-xs text-center flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Parent
              </button>
              <button
                onClick={() => window.print()}
                className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print ID Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Academy Fee & Tariff Configuration Modal (Super Admin Only) */}
      {showGlobalFeeModal && !isInstructor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-red-950 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black tracking-widest text-red-400 uppercase">Academy Administration</span>
                <h2 className="text-base font-black flex items-center gap-2 mt-0.5">
                  <Settings className="w-5 h-5 text-red-500" /> Global Fee & Tariff Settings
                </h2>
              </div>
              <button
                onClick={() => setShowGlobalFeeModal(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-gray-600 font-medium">
                Configure default fee rates for the entire academy. Changing these values updates default rates across all future admissions, online forms, and fee invoice generators.
              </p>

              {/* Global Default Admission Fee */}
              <div className="p-4 bg-amber-50/80 border-2 border-amber-200 rounded-2xl space-y-2">
                <label className="text-amber-900 font-black text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-600" /> Default One-Time Admission Fee (₹)</span>
                  <span className="text-amber-700 font-mono text-sm font-black">₹{globalFeeSettings.defaultAdmissionFee}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={globalFeeSettings.defaultAdmissionFee}
                    onChange={(e) => setGlobalFeeSettings({ ...globalFeeSettings, defaultAdmissionFee: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-gray-900 font-black text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[500, 1000, 1500, 2000, 2500, 3000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setGlobalFeeSettings({ ...globalFeeSettings, defaultAdmissionFee: amt })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        globalFeeSettings.defaultAdmissionFee === amt
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Global Default Monthly Cadet Fee */}
              <div className="p-4 bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl space-y-2">
                <label className="text-emerald-900 font-black text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-emerald-600" /> Default Monthly Cadet Fee (₹)</span>
                  <span className="text-emerald-700 font-mono text-sm font-black">₹{globalFeeSettings.defaultMonthlyFee} / Month</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={globalFeeSettings.defaultMonthlyFee}
                    onChange={(e) => setGlobalFeeSettings({ ...globalFeeSettings, defaultMonthlyFee: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2 text-gray-900 font-black text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[500, 600, 700, 800, 1000, 1200, 1500, 2000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setGlobalFeeSettings({ ...globalFeeSettings, defaultMonthlyFee: amt })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        globalFeeSettings.defaultMonthlyFee === amt
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white text-gray-700 hover:text-gray-900 border border-gray-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Effective Month & Scope Configuration */}
              <div className="p-4 bg-blue-50/80 border-2 border-blue-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-blue-900 font-black text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-blue-600" /> Effective Month for Fee Increase *
                  </label>

                  <select
                    value={`${globalFeeSettings.effectiveMonth && globalFeeSettings.effectiveMonth !== 'August' && globalFeeSettings.effectiveMonth !== 'Immediate All' ? globalFeeSettings.effectiveMonth : 'September'} ${globalFeeSettings.effectiveYear || 2026}`}
                    onChange={(e) => {
                      const [m, y] = e.target.value.split(' ');
                      setGlobalFeeSettings({ ...globalFeeSettings, effectiveMonth: m, effectiveYear: parseInt(y) || 2026 });
                    }}
                    className="bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs text-blue-950 font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                  >
                    <option value="September 2026">September 2026 (Next Month - Recommended)</option>
                    <option value="October 2026">October 2026</option>
                    <option value="November 2026">November 2026</option>
                    <option value="December 2026">December 2026</option>
                    <option value="January 2027">January 2027</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-blue-200/60">
                  <input
                    type="checkbox"
                    id="updateExistingStudentsCb"
                    checked={globalFeeSettings.updateExistingStudents ?? true}
                    onChange={(e) => setGlobalFeeSettings({ ...globalFeeSettings, updateExistingStudents: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="updateExistingStudentsCb" className="text-xs text-blue-950 font-bold cursor-pointer">
                    Apply new rate (₹{globalFeeSettings.defaultMonthlyFee}/Month) to all existing active cadets from {globalFeeSettings.effectiveMonth || 'August'} {globalFeeSettings.effectiveYear || 2026} onwards
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowGlobalFeeModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGlobalFeeSettings}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save Global Settings & Update Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 6: WEB ADMISSION INQUIRIES & LEADS REGISTER */}
      {showInquiriesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowInquiriesModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-white font-black flex items-center justify-center text-lg shadow-md">
                  <Sparkles className="w-5 h-5 text-yellow-200" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Web Admission Inquiries & Leads Register</h3>
                  <p className="text-xs text-gray-500 font-medium">Real-time incoming prospective student inquiries submitted via public website.</p>
                </div>
              </div>

              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-black font-mono">
                {inquiriesList.filter(i => i.status === 'PENDING').length} Pending Leads
              </span>
            </div>

            {/* Inquiries Roster Grid / Cards */}
            <div className="space-y-3">
              {inquiriesList.length === 0 ? (
                <div className="p-10 text-center text-gray-400 font-bold italic">
                  No public admission inquiries submitted yet.
                </div>
              ) : (
                inquiriesList.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className="p-4 bg-gray-50/90 hover:bg-amber-50/40 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3 transition"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-900">{inquiry.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                          inquiry.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          inquiry.status === 'ADMITTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inquiry.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono font-bold">{inquiry.date} {inquiry.time || ''}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Phone / WhatsApp:</span>
                        <strong className="text-gray-900 font-mono font-bold">{inquiry.phone}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Selected Dojo Branch:</span>
                        <strong className="text-amber-800 font-bold">{inquiry.branch}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Interested Program:</span>
                        <strong className="text-red-700 font-bold">{inquiry.program}</strong>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-gray-200/70 text-xs text-gray-700 italic">
                      💬 "{inquiry.message}"
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openWhatsApp({ 
                            phone: inquiry.phone, 
                            message: `Hello ${inquiry.name}, thank you for inquiring about B.A.M.A Karate Academy for ${inquiry.program} at ${inquiry.branch}. When would you like to visit for a trial class?` 
                          })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Sensei Chat
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const currentGlobal = getGlobalFeeSettings();
                            setFormData({
                              name: inquiry.name,
                              photo: '',
                              guardianName: '',
                              occupation: '',
                              phone: inquiry.phone,
                              whatsapp: inquiry.phone,
                              dob: '',
                              age: 12,
                              currentBelt: 'White Belt',
                              branch: inquiry.branch,
                              shift: 'Evening Batch (5:00 PM - 7:00 PM)',
                              joiningDate: new Date().toISOString().split('T')[0],
                              admissionFee: currentGlobal.defaultAdmissionFee || 1000,
                              admissionFeePaidAmount: currentGlobal.defaultAdmissionFee || 1000,
                              feeAmount: currentGlobal.defaultMonthlyFee || 500,
                              initialPaidAmount: currentGlobal.defaultMonthlyFee || 500,
                              feeStatus: 'Paid',
                              gender: 'Male',
                              bloodGroup: 'O+',
                              address: ''
                            });
                            setShowInquiriesModal(false);
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> 🥋 Convert to Registered Cadet
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = inquiriesList.filter(i => i.id !== inquiry.id);
                          setInquiriesList(updated);
                          localStorage.setItem('bama_admission_inquiries', JSON.stringify(updated));
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Lead
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowInquiriesModal(false)}
                className="px-5 py-2 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-gray-800 cursor-pointer"
              >
                Close Inquiries Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Promote Cadet Belt Rank & Issue Certificate */}
      {promoteModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPromoteModalStudent(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-sm flex-shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 leading-tight">Promote Cadet Belt Rank</h3>
                <p className="text-xs text-gray-500 font-medium">Record examination result & upgrade cadet belt rank in real-time.</p>
              </div>
            </div>

            {/* Cadet Info Summary Box */}
            <div className="p-4 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white border-2 border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                {promoteModalStudent.photo ? (
                  <img src={promoteModalStudent.photo} alt={promoteModalStudent.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                    {promoteModalStudent.name ? promoteModalStudent.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
                <div>
                  <h4 className="font-black text-gray-900 text-sm leading-tight">{promoteModalStudent.name}</h4>
                  <span className="text-[11px] text-gray-600 font-mono font-bold block">
                    {promoteModalStudent.admissionNo || promoteModalStudent.admission_no} • {promoteModalStudent.branch_name || promoteModalStudent.branch || 'Head Office'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-gray-400 font-bold uppercase block">Current Belt</span>
                <span className="px-2.5 py-1 bg-white text-gray-800 font-bold rounded-lg border border-gray-200 text-xs shadow-xs inline-block">
                  🥋 {promoteModalStudent.currentBelt || promoteModalStudent.current_belt || 'White Belt'}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPromotion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-gray-700 font-bold mb-1 text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Promoted Belt Rank *
                  </label>
                  <select
                    required
                    value={promoTargetBelt}
                    onChange={(e) => setPromoTargetBelt(e.target.value)}
                    className="w-full bg-emerald-50/50 border-2 border-emerald-300 rounded-xl px-3 py-2.5 text-emerald-900 font-black text-xs focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                  >
                    {STANDARD_BELT_RANKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" /> Exam Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={promoExamDate}
                    onChange={(e) => setPromoExamDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold text-xs focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-gray-500" /> Chief Examiner *
                  </label>
                  <input
                    type="text"
                    required
                    value={promoExaminer}
                    onChange={(e) => setPromoExaminer(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-gray-500" /> Certificate No
                  </label>
                  <input
                    type="text"
                    value={promoCertNo}
                    onChange={(e) => setPromoCertNo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Remarks / Merit Notes</label>
                <input
                  type="text"
                  value={promoRemarks}
                  onChange={(e) => setPromoRemarks(e.target.value)}
                  placeholder="e.g. Excellent Kata performance & sparring form"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPromoteModalStudent(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs shadow-md shadow-emerald-500/25 flex items-center gap-2 transform hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <Award className="w-4 h-4" /> Confirm Belt Promotion 🥋
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

