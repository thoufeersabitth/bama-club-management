import React from 'react';
import axios from 'axios';
import { SAMPLE_STUDENTS, INITIAL_BRANCHES, BELT_LEVELS, WHATSAPP_TEMPLATES, INITIAL_STAFF } from './initialData';

const API_BASE = import.meta.env.VITE_API_URL || 
  ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://127.0.0.1:8000/api'
    : 'https://bama-club-backend.fly.dev/api');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

const DUMMY_EXACT_IDS = ['std-101', 'std-102', 'std-103', 'std-104', 'std-105'];
const DUMMY_ADMISSIONS = ['bama-2024-001', 'bama-2024-002', 'bama-2024-003', 'bama-2024-004', 'bama-2024-005'];

export const filterOutDummyCadets = (list) => {
  if (!Array.isArray(list)) return [];
  return list.filter(s => {
    if (!s) return false;
    const sName = s.name || s.student_name;
    if (!sName || String(sName).trim() === '') return false;
    const id = String(s.id || '').toLowerCase().trim();
    const adm = String(s.admissionNo || s.admission_no || '').toLowerCase().trim();
    if (DUMMY_EXACT_IDS.includes(id) || DUMMY_ADMISSIONS.includes(adm)) return false;
    return true;
  });
};

// Helper for global academy fee default settings
const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const isMonthOnOrAfterEffective = (monthStr, yearVal, effMonthStr, effYearVal) => {
  if (!effMonthStr || effMonthStr === 'Immediate All') return true;
  const mIdx = MONTH_ORDER.indexOf(monthStr);
  const effIdx = MONTH_ORDER.indexOf(effMonthStr);
  const y = parseInt(yearVal) || 2026;
  const effY = parseInt(effYearVal) || 2026;

  if (y > effY) return true;
  if (y < effY) return false;
  if (mIdx === -1 || effIdx === -1) return true;
  return mIdx >= effIdx;
};

export const getGlobalFeeSettings = () => {
  try {
    const stored = localStorage.getItem('bama_global_fee_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const adm = parseInt(parsed.defaultAdmissionFee);
        const monthly = parseInt(parsed.defaultMonthlyFee);
        if (adm === 1984 || isNaN(adm) || adm <= 0) parsed.defaultAdmissionFee = 1000;
        if (isNaN(monthly) || monthly <= 0) parsed.defaultMonthlyFee = 500;
        return parsed;
      }
    }
  } catch (e) {}
  return {
    defaultAdmissionFee: 1000,
    defaultMonthlyFee: 500,
    effectiveMonth: 'August',
    effectiveYear: 2026,
    updateExistingStudents: true,
    admissionFeePresets: [500, 1000, 1500, 2000, 2500, 3000],
    monthlyFeePresets: [500, 600, 700, 800, 1000, 1200, 1500, 2000]
  };
};

export const saveGlobalFeeSettings = (settings) => {
  try {
    localStorage.setItem('bama_global_fee_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('bama_fee_settings_updated'));
  } catch (e) {}
};

export const fetchFeeSettings = async () => {
  try {
    const res = await api.get('/fees/settings/');
    if (res.data && res.data.configuration) {
      const config = res.data.configuration;
      const settings = {
        defaultAdmissionFee: parseInt(config.default_admission_fee) || 1000,
        defaultMonthlyFee: parseInt(config.default_monthly_fee) || 500,
        effectiveMonth: config.effective_month || 'August 2026',
        effectiveYear: 2026,
        updateExistingStudents: config.apply_to_existing_cadets,
        admissionFeePresets: [500, 1000, 1500, 2000, 2500, 3000],
        monthlyFeePresets: [500, 600, 700, 800, 1000, 1200, 1500, 2000]
      };
      saveGlobalFeeSettings(settings);
      return { settings, rateHistory: res.data.rate_history };
    }
  } catch (err) {}
  return { settings: getGlobalFeeSettings(), rateHistory: [] };
};

export const saveFeeSettingsBackend = async (settings) => {
  saveGlobalFeeSettings(settings);
  try {
    const payload = {
      default_monthly_fee: settings.defaultMonthlyFee,
      default_admission_fee: settings.defaultAdmissionFee,
      effective_month: `${settings.effectiveMonth || 'September'} ${settings.effectiveYear || 2026}`,
      effective_from: settings.effectiveFrom || null
    };
    const res = await api.post('/fees/settings/', payload);
    return res.data;
  } catch (err) {}
};

// Helper for local persistent storage fallback (Unified across all storage keys & Normalized)
export const getStoredStudents = () => {
  try {
    const keys = ['bama_cadets_roster', 'bama_students', 'bama_cadets', 'bama_students_list'];
    for (const key of keys) {
      const stored = localStorage.getItem(key);
      if (stored !== null && stored !== '[]' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = filterOutDummyCadets(parsed).map(st => {
            const rawB = st.branch_name || st.branchName || st.dojo_branch || st.dojoBranch || st.branch_detail?.name || (typeof st.branch === 'object' ? st.branch?.name : st.branch) || '';
            const rawId = st.branch_id || st.branchId || (typeof st.branch === 'object' ? st.branch?.id : '');
            const bCombined = (String(rawB) + ' ' + String(rawId) + ' ' + String(st.branch || '')).toLowerCase().trim();

            let normBranch = 'Pulikkal Branch (Head Office)';
            let branchId = '283e0cc2-0009-494f-a3e1-7d8b14356213';

            if (bCombined.includes('chungam') || bCombined.includes('cgm') || bCombined.includes('dojo-02') || bCombined.includes('20c924cd')) {
              normBranch = 'Chungam Branch Dojo';
              branchId = '20c924cd-2dc7-4f82-a459-5e86286748c5';
            } else if (bCombined.includes('mongam') || bCombined.includes('dojo-03') || bCombined.includes('d4639193')) {
              normBranch = 'Mongam Branch Dojo';
              branchId = 'd4639193-c693-46e2-a46e-5e25dcf427a1';
            } else if (bCombined.includes('feroke') || bCombined.includes('dojo-04') || bCombined.includes('5f429f1f')) {
              normBranch = 'Feroke Branch';
              branchId = '5f429f1f-1a33-40af-a621-cae5ecbccb41';
            } else if (bCombined.includes('pulikkal') || bCombined.includes('plk') || bCombined.includes('dojo-01') || bCombined.includes('283e0cc2')) {
              normBranch = 'Pulikkal Branch (Head Office)';
              branchId = '283e0cc2-0009-494f-a3e1-7d8b14356213';
            } else if (rawB && rawB.length > 0 && !rawB.includes('-')) {
              normBranch = rawB;
            }

            const adm = st.admissionNo || st.admission_no || st.registration_no || '';
            const admFee = parseFloat(st.admissionFee ?? st.admission_fee ?? 1000);
            const admPaid = parseFloat(st.admissionFeePaidAmount ?? st.admission_fee_paid_amount ?? admFee);
            let monthlyFee = parseFloat(st.feeAmount ?? st.fee_amount ?? 500);
            if (isNaN(monthlyFee) || monthlyFee < 100) {
              monthlyFee = 500;
            }
            const monthlyPaid = parseFloat(st.initialPaidAmount ?? st.initial_paid_amount ?? 0);
            const pendingDues = parseFloat(st.pendingAmount ?? st.pending_amount ?? Math.max(0, monthlyFee - monthlyPaid));
            const feeStat = st.feeStatus || st.fee_status || (pendingDues === 0 ? 'Paid' : monthlyPaid > 0 ? 'Partial' : 'Pending');

            return {
              ...st,
              name: st.name || st.student_name || 'Cadet',
              student_name: st.student_name || st.name || 'Cadet',
              admissionNo: adm,
              admission_no: adm,
              admissionFee: admFee,
              admission_fee: admFee,
              admissionFeePaidAmount: admPaid,
              admission_fee_paid_amount: admPaid,
              admissionFeePaid: st.admissionFeePaid ?? st.admission_fee_paid ?? (admPaid >= admFee),
              admission_fee_paid: st.admissionFeePaid ?? st.admission_fee_paid ?? (admPaid >= admFee),
              feeAmount: monthlyFee,
              fee_amount: monthlyFee,
              initialPaidAmount: monthlyPaid,
              initial_paid_amount: monthlyPaid,
              pendingAmount: pendingDues,
              pending_amount: pendingDues,
              feeStatus: feeStat,
              fee_status: feeStat,
              branch: normBranch,
              branch_id: branchId,
              branch_name: normBranch,
              branchName: normBranch,
              dojo_branch: normBranch
            };
          });
          return cleaned;
        }
      }
    }
  } catch (e) {}
  return SAMPLE_STUDENTS;
};

export const saveStoredStudents = (students) => {
  try {
    if (!Array.isArray(students)) return;
    const normalized = students.map(st => {
      const rawB = st.branch_name || st.branchName || st.dojo_branch || st.dojoBranch || st.branch_detail?.name || (typeof st.branch === 'object' ? st.branch?.name : st.branch) || '';
      const rawId = st.branch_id || st.branchId || (typeof st.branch === 'object' ? st.branch?.id : '');
      const bCombined = (String(rawB) + ' ' + String(rawId) + ' ' + String(st.branch || '')).toLowerCase().trim();

      let normBranch = 'Pulikkal Branch (Head Office)';
      let branchId = '283e0cc2-0009-494f-a3e1-7d8b14356213';

      if (bCombined.includes('chungam') || bCombined.includes('cgm') || bCombined.includes('dojo-02') || bCombined.includes('20c924cd')) {
        normBranch = 'Chungam Branch Dojo';
        branchId = '20c924cd-2dc7-4f82-a459-5e86286748c5';
      } else if (bCombined.includes('mongam') || bCombined.includes('dojo-03') || bCombined.includes('d4639193')) {
        normBranch = 'Mongam Branch Dojo';
        branchId = 'd4639193-c693-46e2-a46e-5e25dcf427a1';
      } else if (bCombined.includes('feroke') || bCombined.includes('dojo-04') || bCombined.includes('5f429f1f')) {
        normBranch = 'Feroke Branch';
        branchId = '5f429f1f-1a33-40af-a621-cae5ecbccb41';
      } else if (bCombined.includes('pulikkal') || bCombined.includes('plk') || bCombined.includes('dojo-01') || bCombined.includes('283e0cc2')) {
        normBranch = 'Pulikkal Branch (Head Office)';
        branchId = '283e0cc2-0009-494f-a3e1-7d8b14356213';
      } else if (rawB && rawB.length > 0 && !rawB.includes('-')) {
        normBranch = rawB;
      }

      const adm = st.admissionNo || st.admission_no || st.registration_no || '';
      const admFee = parseFloat(st.admissionFee ?? st.admission_fee ?? 1000);
      const admPaid = parseFloat(st.admissionFeePaidAmount ?? st.admission_fee_paid_amount ?? admFee);
      const monthlyFee = parseFloat(st.feeAmount ?? st.fee_amount ?? 500);
      const monthlyPaid = parseFloat(st.initialPaidAmount ?? st.initial_paid_amount ?? 0);
      const pendingDues = parseFloat(st.pendingAmount ?? st.pending_amount ?? Math.max(0, (admFee + monthlyFee) - (admPaid + monthlyPaid)));
      const feeStat = st.feeStatus || st.fee_status || (pendingDues === 0 ? 'Paid' : (admPaid + monthlyPaid) > 0 ? 'Partial' : 'Pending');

      return {
        ...st,
        name: st.name || st.student_name || 'Cadet',
        student_name: st.student_name || st.name || 'Cadet',
        admissionNo: adm,
        admission_no: adm,
        admissionFee: admFee,
        admission_fee: admFee,
        admissionFeePaidAmount: admPaid,
        admission_fee_paid_amount: admPaid,
        admissionFeePaid: st.admissionFeePaid ?? st.admission_fee_paid ?? (admPaid >= admFee),
        admission_fee_paid: st.admissionFeePaid ?? st.admission_fee_paid ?? (admPaid >= admFee),
        feeAmount: monthlyFee,
        fee_amount: monthlyFee,
        initialPaidAmount: monthlyPaid,
        initial_paid_amount: monthlyPaid,
        pendingAmount: pendingDues,
        pending_amount: pendingDues,
        feeStatus: feeStat,
        fee_status: feeStat,
        branch: normBranch,
        branch_id: branchId,
        branch_name: normBranch,
        branchName: normBranch,
        dojo_branch: normBranch
      };
    });
    const cleaned = filterOutDummyCadets(normalized);
    const serialized = JSON.stringify(cleaned);
    localStorage.setItem('bama_cadets_roster', serialized);
    localStorage.setItem('bama_students', serialized);
    localStorage.setItem('bama_cadets', serialized);
    localStorage.setItem('bama_students_list', serialized);
  } catch (e) {}
};

export const getApplicableFees = async (branchId = null, month = 'August', year = 2026) => {
  try {
    const params = { month, year };
    if (branchId) params.branch = branchId;
    const res = await api.get('/fees/applicable-rate/', { params });
    if (res.data) {
      const serverMonthly = parseFloat(res.data.applicable_monthly_fee) || 500;
      const serverAdmission = parseFloat(res.data.applicable_admission_fee) || 1000;

      const current = getGlobalFeeSettings();
      saveGlobalFeeSettings({
        ...current,
        defaultAdmissionFee: serverAdmission,
        defaultMonthlyFee: serverMonthly
      });

      return { monthlyFee: serverMonthly, admissionFee: serverAdmission };
    }
  } catch (err) {}

  const globalSettings = getGlobalFeeSettings();
  return {
    monthlyFee: parseFloat(globalSettings.defaultMonthlyFee) || 500,
    admissionFee: parseFloat(globalSettings.defaultAdmissionFee) || 1000
  };
};

// 100% Clean Database Reset Helper (Keeps Super Admin & 3 Dojo Branches)
export const resetDatabaseToCleanSlate = () => {
  try {
    const keysToClear = [
      'bama_cadets_roster',
      'bama_students_list',
      'bama_students',
      'bama_fee_records',
      'bama_fees',
      'bama_latest_attendance_summary',
      'bama_class_logs',
      'bama_admission_inquiries',
      'bama_admin_notifications',
      'bama_monthly_staff_history',
      'bama_belt_grading_applications',
      'bama_belt_exams'
    ];

    keysToClear.forEach(k => localStorage.removeItem(k));

    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('bama_attendance_')) {
        localStorage.removeItem(k);
      }
    });

    localStorage.setItem('bama_cadets_roster', JSON.stringify([]));

    try {
      api.post('/students/clear-test-data/').catch(() => {});
    } catch(e) {}

    window.dispatchEvent(new Event('bama_data_updated'));
    window.dispatchEvent(new Event('bama_notification_updated'));
    return true;
  } catch (e) {
    return false;
  }
};

export const fetchDashboardStats = async () => {
  try {
    const res = await api.get('/dashboard/stats/');
    return res.data;
  } catch (err) {
    const cadets = getStoredStudents();
    const pendingDues = cadets.filter(c => c.feeStatus === 'Pending' || (c.pendingAmount && c.pendingAmount > 0));
    const totalPending = pendingDues.reduce((acc, c) => acc + (c.feeAmount || 1500), 0);

    return {
      totalStudents: cadets.length,
      activeStudents: cadets.length,
      branchCount: 3,
      todaysAttendanceRate: 100.0,
      todaysAbsentCount: 0,
      monthlyCollection: 0.00,
      pendingFeesAmount: totalPending || 0.00,
      upcomingBeltExams: 0
    };
  }
};

export const fetchStudents = async (params = {}) => {
  try {
    const res = await api.get('/students/', { params });
    const serverData = res.data.results || res.data;

    if (Array.isArray(serverData)) {
      const filteredServer = filterOutDummyCadets(serverData);
      const normalizedServer = filteredServer.map(s => {
        const sBranchName = s.branch_detail?.name || s.branch_name || (typeof s.branch === 'object' ? s.branch?.name : s.branch) || 'Pulikkal Branch (Head Office)';
        const sBranchId = s.branch_id || s.branch_detail?.id || (typeof s.branch === 'object' ? s.branch?.id : s.branch);

        const adm = s.admissionNo || s.admission_no || '';
        const admFee = parseFloat(s.admissionFee ?? s.admission_fee ?? 1000);
        const admPaid = parseFloat(s.admissionFeePaidAmount ?? s.admission_fee_paid_amount ?? admFee);
        const monthlyFee = parseFloat(s.feeAmount ?? s.fee_amount ?? 500);
        const monthlyPaid = parseFloat(s.initialPaidAmount ?? s.initial_paid_amount ?? 0);
        const pendingDues = parseFloat(s.pendingAmount ?? s.pending_amount ?? Math.max(0, (admFee + monthlyFee) - (admPaid + monthlyPaid)));
        const feeStat = s.feeStatus || s.fee_status || (pendingDues === 0 ? 'Paid' : (admPaid + monthlyPaid) > 0 ? 'Partial' : 'Pending');

        return {
          ...s,
          name: s.name || s.student_name || 'Cadet',
          student_name: s.student_name || s.name || 'Cadet',
          admissionNo: adm,
          admission_no: adm,
          admissionFee: admFee,
          admission_fee: admFee,
          admissionFeePaidAmount: admPaid,
          admission_fee_paid_amount: admPaid,
          admissionFeePaid: s.admissionFeePaid ?? s.admission_fee_paid ?? (admPaid >= admFee),
          feeAmount: monthlyFee,
          fee_amount: monthlyFee,
          initialPaidAmount: monthlyPaid,
          initial_paid_amount: monthlyPaid,
          pendingAmount: pendingDues,
          pending_amount: pendingDues,
          feeStatus: feeStat,
          fee_status: feeStat,
          branch: sBranchName,
          branch_id: sBranchId,
          branch_name: sBranchName,
          branchName: sBranchName,
          dojo_branch: sBranchName
        };
      });

      const serialized = JSON.stringify(normalizedServer);
      localStorage.setItem('bama_cadets_roster', serialized);
      localStorage.setItem('bama_students', serialized);
      localStorage.setItem('bama_cadets', serialized);
      localStorage.setItem('bama_students_list', serialized);
      return normalizedServer;
    }
  } catch (err) {}

  return getStoredStudents();
};

export const createStudent = async (data) => {
  localStorage.removeItem('bama_db_cleared');
  const amount = parseFloat(data.feeAmount ?? data.fee_amount ?? 500);
  const initialPaid = parseFloat(data.initialPaidAmount ?? data.initial_paid_amount ?? 0);
  const admFee = parseFloat(data.admissionFee ?? data.admission_fee ?? 1000);
  const admPaid = parseFloat(data.admissionFeePaidAmount ?? data.admission_fee_paid_amount ?? admFee);
  const isAdmPaid = data.admissionFeePaid ?? (admPaid >= admFee);
  const totalCollected = parseFloat(data.totalCollectedNow ?? (admPaid + initialPaid));
  const pendingAmt = parseFloat(data.pendingAmount ?? data.pending_amount ?? Math.max(0, (admFee + amount) - totalCollected));
  const status = data.feeStatus ?? data.fee_status ?? (pendingAmt === 0 ? 'Paid' : totalCollected > 0 ? 'Partial' : 'Pending');

  const branchVal = data.branch_id || data.branch || data.branch_name || 'Pulikkal Branch (Head Office)';
  const branchName = data.branch_name || (typeof data.branch === 'string' && data.branch.length < 50 ? data.branch : 'Pulikkal Branch (Head Office)');

  const payload = {
    admission_no: data.admissionNo || data.admission_no || `BAMA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    admissionNo: data.admissionNo || data.admission_no || `BAMA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: data.name || data.student_name || 'Cadet Student',
    student_name: data.student_name || data.name || 'Cadet Student',
    guardian_name: data.guardianName || data.guardian_name || 'Parent',
    guardianName: data.guardianName || data.guardian_name || 'Parent',
    occupation: data.occupation || data.guardian_occupation || '',
    phone: data.phone || '+91 9544085442',
    whatsapp: data.whatsapp || data.phone || '+91 9544085442',
    age: parseInt(data.age) || 12,
    gender: data.gender || 'Male',
    blood_group: data.bloodGroup || data.blood_group || 'O+',
    bloodGroup: data.bloodGroup || data.blood_group || 'O+',
    current_belt: data.currentBelt || data.current_belt || 'White Belt',
    currentBelt: data.currentBelt || data.current_belt || 'White Belt',
    branch: branchVal,
    branch_id: data.branch_id || (typeof data.branch === 'string' && data.branch.includes('-') ? data.branch : null),
    branch_name: branchName,
    branchName: branchName,
    dojo_branch: branchName,
    shift: data.shift || 'Evening Batch (5:00 PM - 7:00 PM)',
    admission_fee: admFee,
    admissionFee: admFee,
    admission_fee_paid_amount: admPaid,
    admissionFeePaidAmount: admPaid,
    admission_fee_paid: isAdmPaid,
    admissionFeePaid: isAdmPaid,
    fee_amount: amount,
    feeAmount: amount,
    initial_paid_amount: initialPaid,
    initialPaidAmount: initialPaid,
    pending_amount: pendingAmt,
    pendingAmount: pendingAmt,
    totalCollectedNow: totalCollected,
    fee_status: status,
    feeStatus: status,
    hasCustomFee: true,
    has_custom_fee: true,
    joining_date: data.joiningDate || data.joining_date || new Date().toISOString().split('T')[0],
    joiningDate: data.joiningDate || data.joining_date || new Date().toISOString().split('T')[0],
    address: data.address || 'Pulikkal, Malappuram, Kerala',
    photo: data.photo || '',
    status: data.status || 'Active',
    attendanceRate: data.attendanceRate || 100
  };

  const newStudent = { id: `std-${Date.now()}`, ...payload };

  // Save to local roster immediately so UI reflects in 0.0s
  const currentList = getStoredStudents();
  const updatedRoster = [newStudent, ...currentList.filter(s => s.id !== newStudent.id && s.admissionNo !== newStudent.admissionNo)];
  saveStoredStudents(updatedRoster);
  window.dispatchEvent(new Event('bama_data_updated'));

  try {
    const postPayload = { ...payload };
    delete postPayload.id;
    const res = await api.post('/students/', postPayload);
    const serverBranchName = res.data?.branch_name || res.data?.branch_detail?.name || branchName;
    const serverBranchId = res.data?.branch_id || res.data?.branch_detail?.id || res.data?.branch || payload.branch_id;
    const adm = res.data?.admission_no || res.data?.admissionNo || payload.admissionNo;

    const saved = { 
      ...newStudent, 
      ...res.data,
      id: res.data?.id || newStudent.id,
      admissionNo: adm,
      admission_no: adm,
      branch: serverBranchName,
      branch_id: serverBranchId,
      branch_name: serverBranchName,
      branchName: serverBranchName,
      dojo_branch: serverBranchName,
      photo: payload.photo || (res.data ? res.data.photo : '') 
    };
    const latestList = getStoredStudents();
    saveStoredStudents([saved, ...latestList.filter(s => String(s.id) !== String(saved.id) && String(s.admissionNo || s.admission_no) !== String(saved.admissionNo))]);
    window.dispatchEvent(new Event('bama_data_updated'));
    return saved;
  } catch (err) {
    return newStudent;
  }
};

export const updateStudent = async (id, data) => {
  const currentList = getStoredStudents();
  const targetIdStr = String(id).trim();

  const isMatch = (s) => {
    return String(s.id).trim() === targetIdStr ||
      (s.admissionNo && String(s.admissionNo).trim() === targetIdStr) ||
      (s.admission_no && String(s.admission_no).trim() === targetIdStr) ||
      (data.admissionNo && (String(s.admissionNo).trim() === String(data.admissionNo).trim() || String(s.admission_no).trim() === String(data.admissionNo).trim()));
  };

  const updatedFeeAmount = parseInt(data.fee_amount ?? data.feeAmount) || 500;
  const updatedAdmissionFee = parseInt(data.admission_fee ?? data.admissionFee) || 1000;

  const payload = {
    ...data,
    fee_amount: updatedFeeAmount,
    feeAmount: updatedFeeAmount,
    admission_fee: updatedAdmissionFee,
    admissionFee: updatedAdmissionFee
  };

  try {
    await api.patch(`/students/${targetIdStr}/`, payload);
  } catch (err) {
    console.warn('API update failed, local copy saved:', err);
  }

  const updatedRoster = currentList.map(s => (isMatch(s) ? { ...s, ...payload } : s));
  saveStoredStudents(updatedRoster);
  window.dispatchEvent(new Event('bama_data_updated'));
  return payload;
};

export const promoteStudent = async (studentId, { target_belt, exam_date, examiner, certificate_no, remarks }) => {
  const currentList = getStoredStudents();
  const targetIdStr = String(studentId).trim();
  const updatedRoster = currentList.map(s => {
    if (String(s.id).trim() === targetIdStr || (s.admissionNo && String(s.admissionNo).trim() === targetIdStr) || (s.admission_no && String(s.admission_no).trim() === targetIdStr)) {
      return {
        ...s,
        current_belt: target_belt,
        currentBelt: target_belt
      };
    }
    return s;
  });
  saveStoredStudents(updatedRoster);
  window.dispatchEvent(new Event('bama_data_updated'));

  try {
    const res = await api.post(`/students/${targetIdStr}/promote/`, {
      target_belt,
      exam_date,
      examiner,
      certificate_no,
      remarks
    });
    return res.data;
  } catch (err) {
    try {
      await api.patch(`/students/${targetIdStr}/`, { current_belt: target_belt });
    } catch (e) {}
    return { success: true, target_belt };
  }
};

export const deleteStudent = async (id, admissionNo) => {
  try {
    if (id) {
      await api.delete(`/students/${id}/`);
    } else if (admissionNo) {
      await api.delete(`/students/${admissionNo}/`);
    }
  } catch (err) {
    if (admissionNo && admissionNo !== id) {
      try {
        await api.delete(`/students/${admissionNo}/`);
      } catch (e) {}
    }
  }
  const currentList = getStoredStudents();
  const filtered = currentList.filter(s => 
    String(s.id).trim() !== String(id).trim() && 
    String(s.admissionNo || '').trim() !== String(id).trim() && 
    String(s.admission_no || '').trim() !== String(id).trim() &&
    (!admissionNo || (String(s.admissionNo || '').trim() !== String(admissionNo).trim() && String(s.admission_no || '').trim() !== String(admissionNo).trim()))
  );
  saveStoredStudents(filtered);
  window.dispatchEvent(new Event('bama_data_updated'));
  return { success: true, id };
};

export const sanitizeBranches = (list) => {
  if (!Array.isArray(list)) return INITIAL_BRANCHES;
  const filtered = list.filter(b => {
    const name = String(b?.name || '').toLowerCase().trim();
    return !name.includes('ghjgkhlj') && name !== 'ghjgkhlj';
  });
  return filtered.length > 0 ? filtered : INITIAL_BRANCHES;
};

export const fetchBranches = async () => {
  try {
    const saved = localStorage.getItem('bama_custom_branches');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = sanitizeBranches(parsed);
        localStorage.setItem('bama_custom_branches', JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch (e) {}

  let serverBranches = [];
  try {
    const res = await api.get('/branches/');
    serverBranches = res.data.results || res.data || [];
    if (!Array.isArray(serverBranches)) serverBranches = [];
  } catch (err) {
    serverBranches = [];
  }

  if (serverBranches.length > 0) {
    const branchMap = new Map();
    INITIAL_BRANCHES.forEach(b => {
      const key = String(b.name || b.code || '').toLowerCase().trim();
      if (key) branchMap.set(key, b);
    });
    serverBranches.forEach(b => {
      const key = String(b.name || b.code || '').toLowerCase().trim();
      if (key) branchMap.set(key, b);
    });
    const cleaned = sanitizeBranches(Array.from(branchMap.values()));
    return cleaned;
  }

  return INITIAL_BRANCHES;
};

export const createBranchBackend = async (branchData) => {
  try {
    const payload = {
      name: branchData.name || 'New Dojo Branch',
      code: branchData.code || `BAMA-DOJO-${Math.floor(10 + Math.random() * 90)}`,
      address: branchData.address || '',
      phone: branchData.phone || '+91 9544085442',
      whatsapp: branchData.whatsapp || branchData.phone || '+91 9544085442',
      email: branchData.email || '',
      branch_head: branchData.branch_head || branchData.head || 'Sensei Abdul Rahman (5th Dan)',
      is_head_office: !!branchData.isHeadOffice,
      timings: branchData.timings || 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
      status: branchData.status || 'Active'
    };
    const res = await api.post('/branches/', payload);
    return res.data;
  } catch (err) {
    return branchData;
  }
};

export const fetchFees = async () => {
  let serverFees = [];
  try {
    const res = await api.get('/fees/');
    serverFees = res.data.results || res.data || [];
    if (!Array.isArray(serverFees)) serverFees = [];
  } catch (err) {
    serverFees = [];
  }

  // Get ALL cadets from local persistent roster
  const cadets = getStoredStudents();

  // Create a lookup map by student admission number or ID
  const serverFeeMap = new Map();
  serverFees.forEach(f => {
    const std = f.student_detail || {};
    const admKey = String(std.admissionNo || std.admission_no || f.student || f.id || '').toLowerCase().trim();
    if (admKey) serverFeeMap.set(admKey, f);
  });

  // Build 100% accurate fee items ONLY for EVERY registered cadet in the actual roster!
  const cadetFees = cadets.map(s => {
    const admKey = String(s.admissionNo || s.admission_no || s.id || '').toLowerCase().trim();
    const matchedServerFee = serverFeeMap.get(admKey);
    
    // Calculate accurate amounts from cadet record
    const amount = parseInt(s.feeAmount ?? s.fee_amount) || 500;
    const paid = matchedServerFee && matchedServerFee.paid_amount !== undefined 
      ? parseFloat(matchedServerFee.paid_amount) 
      : parseInt(s.initialPaidAmount ?? s.initial_paid_amount) || 0;
    const pending = Math.max(0, amount - paid);
    const status = pending === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';

    return {
      id: matchedServerFee ? matchedServerFee.id : `fee-${s.id || s.admissionNo}`,
      student: s.id,
      student_detail: s,
      month: matchedServerFee ? (matchedServerFee.month || 'August') : 'August',
      year: matchedServerFee ? (matchedServerFee.year || 2026) : 2026,
      amount: amount,
      paid_amount: paid,
      pending_amount: pending,
      status: status,
      receipt_no: matchedServerFee ? matchedServerFee.receipt_no : `REC-${s.admissionNo || s.admission_no || s.id}`
    };
  });

  return cadetFees;
};

export const fetchBeltGradings = async () => {
  try {
    const res = await api.get('/belt-gradings/');
    return res.data.results || res.data;
  } catch (err) {
    const cadets = getStoredStudents();
    return cadets.map(s => ({
      id: `grading-${s.id || s.admissionNo}`,
      student_detail: s,
      previous_belt: 'White Belt',
      target_belt: s.currentBelt || s.current_belt || 'Yellow Belt',
      exam_date: '2026-06-15',
      result: 'Pass',
      examiner: 'Sensei Abdul Rahman (5th Dan)',
      certificate_no: `CERT-${s.admissionNo}`
    }));
  }
};

export const fetchExamSchedules = async () => {
  try {
    const res = await api.get('/exam-schedules/');
    return res.data.results || res.data;
  } catch (err) {
    return [
      {
        id: 'exam-sep-2026',
        exam_name: 'September Color Belt Examination',
        exam_code: 'EXAM-2026-SEP',
        exam_date: '2026-09-20',
        registration_start: '2026-08-01',
        registration_end: '2026-09-15',
        venue: 'Main Dojo, Pulikkal',
        exam_fee: 1000.00,
        currency: 'INR',
        eligible_belt: 'All Belts',
        max_candidates: 100,
        status: 'Active'
      }
    ];
  }
};

export const createExamScheduleBackend = async (data) => {
  try {
    const res = await api.post('/exam-schedules/', data);
    return res.data;
  } catch (err) {
    return data;
  }
};

export const updateExamScheduleBackend = async (id, data) => {
  try {
    const res = await api.patch(`/exam-schedules/${id}/`, data);
    return res.data;
  } catch (err) {
    return data;
  }
};

export const fetchFormCategoryListsBackend = async (examId = null) => {
  try {
    const url = examId ? `/grading-registrations/form-category-lists/?exam=${examId}` : '/grading-registrations/form-category-lists/';
    const res = await api.get(url);
    return res.data;
  } catch (err) {
    return null;
  }
};

export const fetchExamDashboardStatsBackend = async (examId = null) => {
  try {
    const url = examId ? `/grading-registrations/dashboard-stats/?exam=${examId}` : '/grading-registrations/dashboard-stats/';
    const res = await api.get(url);
    return res.data;
  } catch (err) {
    return null;
  }
};

export const publicSubmitExamRegistrationBackend = async (data) => {
  try {
    const res = await api.post('/grading-registrations/public-register/', data);
    return res.data;
  } catch (err) {
    // Fallback to standard creation
    const res = await api.post('/grading-registrations/', data);
    return res.data;
  }
};

export const saveAttendanceToBackend = async (dateStr, records, studentsList) => {
  try {
    const promises = Object.entries(records).map(async ([studentKey, status]) => {
      const formattedStatus = (status || 'PRESENT').toLowerCase() === 'absent' ? 'Absent' 
        : (status || 'PRESENT').toLowerCase() === 'late' ? 'Late' 
        : 'Present';

      const cadet = (studentsList || []).find(s => 
        String(s.id).trim() === String(studentKey).trim() || 
        String(s.admissionNo || s.admission_no).trim() === String(studentKey).trim()
      );

      const payload = {
        student: cadet ? (cadet.id || cadet.admissionNo || cadet.admission_no) : studentKey,
        branch: cadet ? (cadet.branch_id || cadet.branch) : null,
        date: dateStr,
        status: formattedStatus,
        marked_by: 'Sensei Master'
      };

      try {
        return await api.post('/attendance/', payload);
      } catch (err) {
        return null;
      }
    });

    await Promise.all(promises);
    return true;
  } catch (err) {
    return false;
  }
};

export const saveFeePaymentBackend = async (feeData) => {
  try {
    const payload = {
      student: feeData.student || feeData.student_id || feeData.admissionNo || feeData.id,
      month: feeData.month || 'August',
      year: parseInt(feeData.year) || 2026,
      amount: parseInt(feeData.amount) || 500,
      paid_amount: parseInt(feeData.paid_amount ?? feeData.paidAmount) || 0,
      pending_amount: parseInt(feeData.pending_amount ?? feeData.pendingAmount) || 0,
      status: feeData.status || 'Unpaid',
      receipt_no: feeData.receipt_no || `REC-${Date.now()}`
    };
    const res = await api.post('/fees/', payload);
    return res.data;
  } catch (err) {
    return feeData;
  }
};

export const saveBeltGradingBackend = async (gradingData) => {
  try {
    const payload = {
      student: gradingData.student || gradingData.student_id || gradingData.admissionNo || gradingData.id,
      previous_belt: gradingData.previous_belt || gradingData.previousBelt || 'White Belt',
      target_belt: gradingData.target_belt || gradingData.targetBelt || 'Yellow Belt',
      exam_date: gradingData.exam_date || gradingData.examDate || new Date().toISOString().split('T')[0],
      result: gradingData.result || 'Pass',
      examiner: gradingData.examiner || 'Sensei Abdul Rahman (5th Dan)',
      certificate_no: gradingData.certificate_no || `CERT-${Date.now()}`
    };
    const res = await api.post('/belt-gradings/', payload);
    return res.data;
  } catch (err) {
    return gradingData;
  }
};

// Staff & User Management API Endpoints & Local Persistent Helpers
export const getStoredStaff = () => {
  const staffMap = new Map();
  INITIAL_STAFF.forEach(s => {
    staffMap.set(String(s.username).toLowerCase().trim(), s);
  });

  try {
    const keys = ['bama_staff_list', 'bama_staff', 'bama_all_users'];
    for (const k of keys) {
      const stored = localStorage.getItem(k);
      if (stored && stored !== 'null' && stored !== 'undefined') {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(s => {
            const key = String(s.username || s.id || s.name || '').toLowerCase().trim();
            if (key) {
              const existing = staffMap.get(key) || {};
              staffMap.set(key, { ...existing, ...s });
            }
          });
        }
      }
    }
  } catch (e) {}
  return Array.from(staffMap.values());
};

export const saveStoredStaff = (staffList) => {
  try {
    if (!Array.isArray(staffList)) return;
    const serialized = JSON.stringify(staffList);
    localStorage.setItem('bama_staff_list', serialized);
    localStorage.setItem('bama_staff', serialized);
    localStorage.setItem('bama_all_users', serialized);
    window.dispatchEvent(new Event('bama_staff_updated'));
    window.dispatchEvent(new Event('bama_data_updated'));
  } catch (e) {}
};

export const fetchBackendUsers = async () => {
  try {
    const res = await api.get('/users/');
    const serverUsers = res.data.results || res.data || [];
    if (Array.isArray(serverUsers) && serverUsers.length > 0) {
      const localStaff = getStoredStaff();
      const map = new Map();
      localStaff.forEach(s => map.set(String(s.username).toLowerCase().trim(), s));
      serverUsers.forEach(u => {
        const k = String(u.username).toLowerCase().trim();
        const existing = map.get(k) || {};
        map.set(k, {
          ...existing,
          id: u.id || existing.id,
          username: u.username,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || existing.name || u.username,
          role: u.role || existing.role || 'INSTRUCTOR',
          branch: u.branch_name || existing.branch || 'Chungam Branch Dojo',
          email: u.email || existing.email,
          phone: u.phone || existing.phone,
          permissions: existing.permissions || { students: true, attendance: true, fees: true, whatsapp: true, beltGrading: true, reports: false }
        });
      });
      const merged = Array.from(map.values());
      saveStoredStaff(merged);
      return merged;
    }
  } catch (err) {}
  return getStoredStaff();
};

export const createBackendUser = async (userData) => {
  try {
    const res = await api.post('/users/', userData);
    return res.data;
  } catch (err) {
    return null;
  }
};

export const updateBackendUser = async (userId, userData) => {
  try {
    const res = await api.patch(`/users/${userId}/`, userData);
    return res.data;
  } catch (err) {
    return null;
  }
};

export const deleteBackendUser = async (userId) => {
  try {
    const res = await api.delete(`/users/${userId}/`);
    return res.data;
  } catch (err) {
    return null;
  }
};

export const loginBackendUser = async (username, password) => {
  try {
    const res = await api.post('/auth/token/', { username, password });
    return res.data;
  } catch (err) {
    return null;
  }
};

export default api;
