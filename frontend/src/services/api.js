import React from 'react';
import axios from 'axios';
import { SAMPLE_STUDENTS, INITIAL_BRANCHES, BELT_LEVELS, WHATSAPP_TEMPLATES, INITIAL_STAFF } from './initialData';

const API_BASE = 'https://bama-club-backend.fly.dev/api';

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

// Safely set localStorage with automatic quota management & garbage collection
export const safeLocalStorageSet = (key, value) => {
  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  try {
    localStorage.setItem(key, strVal);
  } catch (err) {
    console.warn(`[Storage] Quota exceeded on setting "${key}". Freeing redundant cache...`, err);
    try {
      // 1. Remove redundant duplicate keys
      const redundantKeys = [
        'bama_cadets_roster',
        'bama_students',
        'bama_cadets',
        'bama_staff',
        'bama_all_users',
        'bama_backup_data',
        'bama_temp_cache'
      ];
      redundantKeys.forEach(k => {
        if (k !== key) {
          try { localStorage.removeItem(k); } catch (e) {}
        }
      });

      // 2. Retry setting key
      localStorage.setItem(key, strVal);
    } catch (retryErr) {
      console.warn(`[Storage] Second quota retry failed for "${key}". Stripping heavy base64 images...`);
      try {
        // 3. Strip heavy base64 images from payload so essential data is preserved
        let parsed = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(parsed)) {
          const stripped = parsed.map(item => {
            if (!item || typeof item !== 'object') return item;
            const copy = { ...item };
            ['image', 'img', 'photo', 'banner', 'avatar'].forEach(prop => {
              if (typeof copy[prop] === 'string' && copy[prop].startsWith('data:image')) {
                copy[prop] = ''; // drop heavy base64
              }
            });
            return copy;
          });
          localStorage.setItem(key, JSON.stringify(stripped));
        } else if (parsed && typeof parsed === 'object') {
          const copy = { ...parsed };
          ['image', 'img', 'photo', 'banner', 'avatar'].forEach(prop => {
            if (typeof copy[prop] === 'string' && copy[prop].startsWith('data:image')) {
              copy[prop] = '';
            }
          });
          localStorage.setItem(key, JSON.stringify(copy));
        }
      } catch (finalErr) {
        console.error(`[Storage] Failed to store "${key}" even after image stripping:`, finalErr);
      }
    }
  }
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

// Calculate multi-month coverage based on billing frequency (Monthly = 1 month, Quarterly = 3 months)
export const getCoveredMonthsFromDate = (joiningDateStr, frequency = 'MONTHLY') => {
  let startYear = 2026;
  let startMonthIdx = new Date().getMonth();
  try {
    const d = new Date(joiningDateStr);
    if (!isNaN(d.getTime())) {
      startYear = d.getFullYear();
      startMonthIdx = d.getMonth();
    }
  } catch (e) {}

  let count = 1;
  const freqUpper = String(frequency || 'MONTHLY').toUpperCase();
  if (freqUpper === 'QUARTERLY' || freqUpper === '3_MONTHS' || freqUpper === 'SCHOOL_BATCH') count = 3;
  else if (freqUpper === 'HALF_YEARLY' || freqUpper === '6_MONTHS') count = 6;
  else if (freqUpper === 'YEARLY' || freqUpper === '12_MONTHS') count = 12;

  const result = [];
  for (let i = 0; i < count; i++) {
    const curMonthIdx = (startMonthIdx + i) % 12;
    const curYear = startYear + Math.floor((startMonthIdx + i) / 12);
    result.push(`${MONTH_ORDER[curMonthIdx]} ${curYear}`);
  }
  return result;
};

export const getGlobalFeeSettings = () => {
  try {
    const stored = localStorage.getItem('bama_global_fee_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const adm = parseInt(parsed.defaultAdmissionFee);
        const monthly = parseInt(parsed.defaultMonthlyFee);
        if (adm === 1984 || isNaN(adm) || adm < 0) parsed.defaultAdmissionFee = 1000;
        if (isNaN(monthly) || monthly <= 0) parsed.defaultMonthlyFee = 500;
        if (!parsed.defaultFeeFrequency) parsed.defaultFeeFrequency = 'MONTHLY';
        return parsed;
      }
    }
  } catch (e) {}
  return {
    defaultAdmissionFee: 1000,
    defaultMonthlyFee: 500,
    defaultFeeFrequency: 'MONTHLY',
    defaultFeeFrequencyMonths: 1,
    effectiveMonth: 'August',
    effectiveYear: 2026,
    updateExistingStudents: true,
    admissionFeePresets: [0, 500, 1000, 1500, 2000, 2500, 3000],
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
        defaultAdmissionFee: config.default_admission_fee !== undefined ? parseInt(config.default_admission_fee) : 1000,
        defaultMonthlyFee: parseInt(config.default_monthly_fee) || 500,
        effectiveMonth: config.effective_month || 'August 2026',
        effectiveYear: 2026,
        updateExistingStudents: config.apply_to_existing_cadets,
        admissionFeePresets: [0, 500, 1000, 1500, 2000, 2500, 3000],
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

// Universal intelligent resolver for student course / discipline
export const resolveDiscipline = (st) => {
  if (!st) return 'Karate (Shotokan)';
  
  const explicit = st.program || st.course || st.discipline;
  if (explicit && String(explicit).trim() !== '' && explicit !== 'undefined' && explicit !== 'null') {
    const expLow = String(explicit).toLowerCase().trim();
    if (expLow.includes('kick')) return 'Kick Boxing';
    if (expLow.includes('box')) return 'Boxing';
    if (expLow.includes('fit')) return 'Fitness Training';
    if (expLow.includes('defense')) return 'Self Defense';
    if (expLow.includes('ladies')) return 'Ladies Special Batch';
    if (expLow.includes('personal')) return 'Personal Training (1-on-1)';
    if (expLow.includes('karate')) return 'Karate (Shotokan)';
    return explicit;
  }

  const rawBelt = String(st.currentBelt || st.current_belt || '').trim();
  const beltLow = rawBelt.toLowerCase();
  if (beltLow.includes('kick')) return 'Kick Boxing';
  if (beltLow.includes('box')) return 'Boxing';
  if (beltLow.includes('fit')) return 'Fitness Training';
  if (beltLow.includes('defense')) return 'Self Defense';
  if (beltLow.includes('ladies')) return 'Ladies Special Batch';
  if (beltLow.includes('personal')) return 'Personal Training (1-on-1)';

  const shiftStr = String(st.shift || '').toLowerCase();
  if (shiftStr.includes('personal')) return 'Personal Training (1-on-1)';
  if (shiftStr.includes('ladies')) return 'Ladies Special Batch';
  if (shiftStr.includes('kick')) return 'Kick Boxing';
  if (shiftStr.includes('box')) return 'Boxing';
  if (shiftStr.includes('fit')) return 'Fitness Training';
  if (shiftStr.includes('defense')) return 'Self Defense';
  if (shiftStr.includes('karate')) return 'Karate (Shotokan)';

  const medNotes = String(st.medicalNotes || st.medical_notes || '');
  if (medNotes.includes('[PROGRAM:')) {
    const matched = medNotes.match(/\[PROGRAM:([^\]]+)\]/);
    if (matched && matched[1]) return matched[1].trim();
  }

  return 'Karate (Shotokan)';
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
            const normBranch = st.branch_name || st.branchName || st.dojo_branch || st.dojoBranch || st.branch_detail?.name || (typeof st.branch === 'object' ? st.branch?.name : st.branch) || 'Pulikkal Branch (Head Office)';
            const branchId = st.branch_id || st.branchId || (typeof st.branch === 'object' ? st.branch?.id : st.branch) || normBranch;

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

            const cadetFeeFreq = st.fee_frequency || st.feeFrequency || 'MONTHLY';
            const cadetPaidMonths = Array.isArray(st.paid_months) ? st.paid_months : (Array.isArray(st.paidMonths) ? st.paidMonths : []);
            const resolvedCourse = resolveDiscipline(st);

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
              feeFrequency: cadetFeeFreq,
              fee_frequency: cadetFeeFreq,
              feeCycleMonths: st.feeCycleMonths || (cadetFeeFreq === 'QUARTERLY' || cadetFeeFreq === '3_MONTHS' ? 3 : 1),
              paid_months: cadetPaidMonths,
              paidMonths: cadetPaidMonths,
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
              dojo_branch: normBranch,
              program: resolvedCourse,
              course: resolvedCourse,
              discipline: resolvedCourse
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
      const normBranch = st.branch_name || st.branchName || st.dojo_branch || st.branch_detail?.name || (typeof st.branch === 'object' ? st.branch?.name : st.branch) || 'Pulikkal Branch (Head Office)';
      const branchId = st.branch_id || st.branchId || (typeof st.branch === 'object' ? st.branch?.id : st.branch) || normBranch;

      const adm = st.admissionNo || st.admission_no || st.registration_no || '';
      const admFee = parseFloat(st.admissionFee ?? st.admission_fee ?? 1000);
      const admPaid = parseFloat(st.admissionFeePaidAmount ?? st.admission_fee_paid_amount ?? admFee);
      const monthlyFee = parseFloat(st.feeAmount ?? st.fee_amount ?? 500);
      const monthlyPaid = parseFloat(st.initialPaidAmount ?? st.initial_paid_amount ?? 0);
      const pendingDues = parseFloat(st.pendingAmount ?? st.pending_amount ?? Math.max(0, (admFee + monthlyFee) - (admPaid + monthlyPaid)));
      const feeStat = st.feeStatus || st.fee_status || (pendingDues === 0 ? 'Paid' : (admPaid + monthlyPaid) > 0 ? 'Partial' : 'Pending');

      const cadetFeeFreq = st.fee_frequency || st.feeFrequency || 'MONTHLY';
      const cadetPaidMonths = Array.isArray(st.paid_months) ? st.paid_months : (Array.isArray(st.paidMonths) ? st.paidMonths : []);

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
        feeFrequency: cadetFeeFreq,
        fee_frequency: cadetFeeFreq,
        feeCycleMonths: st.feeCycleMonths || (cadetFeeFreq === 'QUARTERLY' || cadetFeeFreq === '3_MONTHS' ? 3 : 1),
        paid_months: cadetPaidMonths,
        paidMonths: cadetPaidMonths,
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
        dojo_branch: normBranch,
        program: resolveDiscipline(st),
        course: resolveDiscipline(st),
        discipline: resolveDiscipline(st)
      };
    });
    const cleaned = filterOutDummyCadets(normalized);
    const serialized = JSON.stringify(cleaned);
    safeLocalStorageSet('bama_students_list', serialized);
    ['bama_cadets_roster', 'bama_students', 'bama_cadets'].forEach(k => {
      try { localStorage.removeItem(k); } catch(e) {}
    });
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
  // 1. Gather all globally deleted students from Fly.io PostgreSQL database + local storage
  const globalDeletedStudentIds = new Set();
  try {
    const localDeleted = JSON.parse(localStorage.getItem('bama_deleted_student_ids') || '[]');
    localDeleted.forEach(d => {
      if (d) globalDeletedStudentIds.add(String(d).toLowerCase().trim());
    });
  } catch (e) {}

  try {
    const delRes = await fetch('https://bama-club-backend.fly.dev/api/announcements/?category=DELETED_STUDENT', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (delRes.ok) {
      const delData = await delRes.json();
      const delAnnouncements = delData.results || (Array.isArray(delData) ? delData : []);
      delAnnouncements.forEach(a => {
        if (a.content) {
          try {
            const parsed = JSON.parse(a.content);
            if (parsed.deleted_id) globalDeletedStudentIds.add(String(parsed.deleted_id).toLowerCase().trim());
            if (parsed.deleted_adm) globalDeletedStudentIds.add(String(parsed.deleted_adm).toLowerCase().trim());
          } catch (e) {}
        }
        if (a.title && a.title.startsWith('DELETED_STUDENT:')) {
          globalDeletedStudentIds.add(a.title.replace('DELETED_STUDENT:', '').toLowerCase().trim());
        }
      });
    }
  } catch (err) {}

  // 2. Synchronize any local deletions to Fly.io PostgreSQL backend
  try {
    const localDeleted = JSON.parse(localStorage.getItem('bama_deleted_student_ids') || '[]');
    if (localDeleted.length > 0) {
      for (const delIdent of localDeleted) {
        if (delIdent) {
          fetch(`https://bama-club-backend.fly.dev/api/students/${encodeURIComponent(delIdent)}/`, { method: 'DELETE' }).catch(() => {});
          fetch('https://bama-club-backend.fly.dev/api/announcements/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              title: `DELETED_STUDENT:${delIdent}`,
              content: JSON.stringify({ deleted_id: delIdent, deleted_adm: delIdent, deleted_at: new Date().toISOString() }),
              category: 'DELETED_STUDENT',
              is_important: false
            })
          }).catch(() => {});
        }
      }
    }
  } catch (e) {}

  // Store merged global deleted list locally
  try {
    localStorage.setItem('bama_deleted_student_ids', JSON.stringify(Array.from(globalDeletedStudentIds)));
  } catch (e) {}

  try {
    let allServerData = [];
    const url = new URL('https://bama-club-backend.fly.dev/api/students/');
    url.searchParams.set('page_size', '1000');
    url.searchParams.set('_t', Date.now().toString());

    let nextUrl = url.toString();
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          allServerData = data;
          break;
        } else if (data && Array.isArray(data.results)) {
          allServerData = [...allServerData, ...data.results];
          nextUrl = data.next ? data.next : null;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (allServerData && allServerData.length > 0) {
      const filteredServer = filterOutDummyCadets(allServerData).filter(s => {
        const sId = String(s.id || '').toLowerCase().trim();
        const sAdm = String(s.admission_no || s.admissionNo || '').toLowerCase().trim();
        if (globalDeletedStudentIds.has(sId) || globalDeletedStudentIds.has(sAdm)) return false;
        return true;
      });

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

        const cadetFeeFreq = s.fee_frequency || s.feeFrequency || 'MONTHLY';
        const cadetPaidMonths = Array.isArray(s.paid_months) ? s.paid_months : (Array.isArray(s.paidMonths) ? s.paidMonths : []);

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
          admission_fee_paid: s.admissionFeePaid ?? s.admission_fee_paid ?? (admPaid >= admFee),
          feeFrequency: cadetFeeFreq,
          fee_frequency: cadetFeeFreq,
          feeCycleMonths: s.feeCycleMonths || (cadetFeeFreq === 'QUARTERLY' || cadetFeeFreq === '3_MONTHS' ? 3 : 1),
          paid_months: cadetPaidMonths,
          paidMonths: cadetPaidMonths,
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
          dojo_branch: sBranchName,
          program: resolveDiscipline(s),
          course: resolveDiscipline(s),
          discipline: resolveDiscipline(s)
        };
      });

      const serialized = JSON.stringify(normalizedServer);
      safeLocalStorageSet('bama_students_list', serialized);
      ['bama_cadets_roster', 'bama_students', 'bama_cadets'].forEach(k => {
        try { localStorage.removeItem(k); } catch(e) {}
      });
      return normalizedServer;
    }
  } catch (err) {
    console.error('Failed to fetch students from live server:', err);
  }

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

  const cadetFeeFreq = data.fee_frequency || data.feeFrequency || 'MONTHLY';
  const cadetPaidMonths = Array.isArray(data.paid_months) ? data.paid_months : (Array.isArray(data.paidMonths) ? data.paidMonths : []);

  const branchVal = data.branch_id || data.branch || data.branch_name || '4d04730d-8de9-4a3f-9dc4-705b31ef2630';
  const branchName = data.branch_name || data.branchName || (typeof data.branch === 'string' && data.branch.length < 50 ? data.branch : 'Pulikkal Branch (Head Office)');

  const explicitProg = resolveDiscipline(data);
  const isKarateProg = explicitProg.toLowerCase().includes('karate');
  const validBelt = isKarateProg ? (data.currentBelt || data.current_belt || 'White Belt') : explicitProg;
  const baseNotes = String(data.medicalNotes || data.medical_notes || '').replace(/\[PROGRAM:[^\]]+\]/g, '').trim();
  const taggedNotes = baseNotes ? `${baseNotes} [PROGRAM:${explicitProg}]` : `[PROGRAM:${explicitProg}]`;

  const payload = {
    admission_no: data.admissionNo || data.admission_no || `BAMA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: data.name || data.student_name || 'Cadet Student',
    guardian_name: data.guardianName || data.guardian_name || 'Parent',
    relationship: data.relationship || 'Father',
    phone: data.phone || '+91 9544085442',
    whatsapp: data.whatsapp || data.phone || '+91 9544085442',
    age: parseInt(data.age) || 12,
    dob: data.dob || null,
    gender: data.gender || 'Male',
    blood_group: (data.bloodGroup || data.blood_group || 'O+').slice(0, 20),
    current_belt: validBelt,
    program: explicitProg,
    course: explicitProg,
    discipline: explicitProg,
    medical_notes: taggedNotes,
    branch: branchVal,
    shift: data.shift || 'Evening Batch (5:00 PM - 7:00 PM)',
    admission_fee: admFee,
    admission_fee_paid_amount: admPaid,
    admission_fee_paid: isAdmPaid,
    fee_frequency: cadetFeeFreq,
    fee_amount: amount,
    initial_paid_amount: initialPaid,
    pending_amount: pendingAmt,
    fee_status: status,
    paid_months: cadetPaidMonths,
    joining_date: data.joiningDate || data.joining_date || new Date().toISOString().split('T')[0],
    address: data.address || 'Pulikkal, Malappuram, Kerala',
    photo: data.photo || '',
    status: data.status || 'Active'
  };

  try {
    const res = await fetch('https://bama-club-backend.fly.dev/api/students/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const serverCadet = await res.json();
      const serverBranchName = serverCadet?.branch_name || serverCadet?.branch_detail?.name || branchName;
      const serverBranchId = serverCadet?.branch_id || serverCadet?.branch_detail?.id || serverCadet?.branch || branchVal;
      const adm = serverCadet?.admission_no || payload.admission_no;

      const saved = {
        ...payload,
        ...serverCadet,
        program: explicitProg,
        course: explicitProg,
        discipline: explicitProg,
        id: serverCadet?.id || `std-${Date.now()}`,
        admissionNo: adm,
        admission_no: adm,
        feeFrequency: cadetFeeFreq,
        fee_frequency: cadetFeeFreq,
        feeCycleMonths: cadetFeeFreq === 'QUARTERLY' || cadetFeeFreq === '3_MONTHS' ? 3 : 1,
        paidMonths: cadetPaidMonths,
        paid_months: cadetPaidMonths,
        admissionFee: admFee,
        admission_fee: admFee,
        admissionFeePaidAmount: admPaid,
        admission_fee_paid_amount: admPaid,
        admissionFeePaid: isAdmPaid,
        admission_fee_paid: isAdmPaid,
        branch: serverBranchName,
        branch_id: serverBranchId,
        branch_name: serverBranchName,
        branchName: serverBranchName,
        dojo_branch: serverBranchName
      };

      const latestList = getStoredStudents();
      const updatedRoster = [saved, ...latestList.filter(s => String(s.id) !== String(saved.id) && String(s.admissionNo || s.admission_no) !== String(adm))];
      saveStoredStudents(updatedRoster);
      window.dispatchEvent(new Event('bama_data_updated'));
      return saved;
    } else {
      const errText = await res.text();
      console.error('Server error creating student:', res.status, errText);
    }
  } catch (err) {
    console.error('Network error creating student:', err);
  }

  const newStudent = { id: `std-${Date.now()}`, ...payload };
  const latestList = getStoredStudents();
  saveStoredStudents([newStudent, ...latestList]);
  window.dispatchEvent(new Event('bama_data_updated'));
  return newStudent;
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

  const updatedFeeAmount = data.fee_amount !== undefined ? Math.max(0, parseInt(data.fee_amount) || 0) : (data.feeAmount !== undefined ? Math.max(0, parseInt(data.feeAmount) || 0) : 500);
  const updatedAdmissionFee = data.admission_fee !== undefined ? Math.max(0, parseInt(data.admission_fee) || 0) : (data.admissionFee !== undefined ? Math.max(0, parseInt(data.admissionFee) || 0) : 1000);

  const explicitProg = resolveDiscipline(data);
  const isKarateProg = explicitProg.toLowerCase().includes('karate');
  const validBelt = isKarateProg ? (data.currentBelt || data.current_belt || 'White Belt') : explicitProg;
  const baseNotes = String(data.medicalNotes || data.medical_notes || '').replace(/\[PROGRAM:[^\]]+\]/g, '').trim();
  const taggedNotes = baseNotes ? `${baseNotes} [PROGRAM:${explicitProg}]` : `[PROGRAM:${explicitProg}]`;

  const payload = {
    ...data,
    current_belt: validBelt,
    currentBelt: validBelt,
    program: explicitProg,
    course: explicitProg,
    discipline: explicitProg,
    medical_notes: taggedNotes,
    medicalNotes: taggedNotes,
    fee_amount: updatedFeeAmount,
    feeAmount: updatedFeeAmount,
    admission_fee: updatedAdmissionFee,
    admissionFee: updatedAdmissionFee
  };

  const identifiers = [targetIdStr, data.admissionNo, data.admission_no].filter(Boolean);
  for (const ident of identifiers) {
    try {
      const res = await fetch(`https://bama-club-backend.fly.dev/api/students/${encodeURIComponent(ident)}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) break;
    } catch (err) {
      console.warn('API update failed for identifier:', ident, err);
    }
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
    const res = await fetch(`https://bama-club-backend.fly.dev/api/students/${encodeURIComponent(targetIdStr)}/promote/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        target_belt,
        exam_date,
        examiner,
        certificate_no,
        remarks
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    try {
      await fetch(`https://bama-club-backend.fly.dev/api/students/${encodeURIComponent(targetIdStr)}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_belt: target_belt })
      });
    } catch (e) {}
  }
  return { success: true, target_belt };
};

export const deleteStudent = async (id, admissionNo) => {
  const stdIdStr = String(id || '').trim();
  const admNoStr = String(admissionNo || '').trim();

  // 1. Permanently delete from live PostgreSQL database on Fly.io
  const idsToDelete = [stdIdStr, admNoStr].filter(Boolean);
  for (const identifier of idsToDelete) {
    try {
      await fetch(`https://bama-club-backend.fly.dev/api/students/${encodeURIComponent(identifier)}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    } catch (err) {
      console.warn(`Failed to delete student ${identifier} on server:`, err);
    }
  }

  // 2. Track deleted ID in persistent local blacklist
  try {
    const deletedIds = JSON.parse(localStorage.getItem('bama_deleted_student_ids') || '[]');
    if (stdIdStr && !deletedIds.includes(stdIdStr)) deletedIds.push(stdIdStr);
    if (admNoStr && !deletedIds.includes(admNoStr)) deletedIds.push(admNoStr);
    localStorage.setItem('bama_deleted_student_ids', JSON.stringify(deletedIds));
  } catch (e) {}

  // 3. Post global tombstone to Fly.io PostgreSQL database so ALL other devices (Phone / Laptop) immediately delete it!
  try {
    const tombstonePayload = {
      title: `DELETED_STUDENT:${admNoStr || stdIdStr}`,
      content: JSON.stringify({ deleted_id: stdIdStr, deleted_adm: admNoStr, deleted_at: new Date().toISOString() }),
      category: 'DELETED_STUDENT',
      is_important: false
    };
    await fetch('https://bama-club-backend.fly.dev/api/announcements/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(tombstonePayload)
    });
  } catch (err) {}

  // 4. Remove student from all localStorage caches
  const currentList = getStoredStudents();
  const filtered = currentList.filter(s => {
    const sId = String(s.id || '').trim();
    const sAdm = String(s.admissionNo || s.admission_no || '').trim();
    if (stdIdStr && (sId === stdIdStr || sAdm === stdIdStr)) return false;
    if (admNoStr && (sId === admNoStr || sAdm === admNoStr)) return false;
    return true;
  });

  saveStoredStudents(filtered);
  window.dispatchEvent(new Event('bama_data_updated'));
  return { success: true, id: stdIdStr };
};

export const sanitizeBranches = (list) => {
  if (!Array.isArray(list)) return [];
  return list.filter(b => {
    const name = String(b?.name || '').toLowerCase().trim();
    return !name.includes('ghjgkhlj') && name !== 'ghjgkhlj';
  });
};

export const fetchBranches = async () => {
  const branchMap = new Map();

  const deletedBranchIds = (() => {
    try {
      return JSON.parse(localStorage.getItem('bama_deleted_branch_ids') || '[]');
    } catch (e) {
      return [];
    }
  })();

  // 1. Fetch directly from Fly.io live PostgreSQL server FIRST
  let fetchedFromServer = false;
  try {
    const res = await fetch(`https://bama-club-backend.fly.dev/api/branches/?_t=${Date.now()}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const serverBranches = data.results || (Array.isArray(data) ? data : []);
      if (Array.isArray(serverBranches) && serverBranches.length > 0) {
        fetchedFromServer = true;
        serverBranches.forEach(b => {
          const key = String(b.name || b.code || b.id || '').toLowerCase().trim();
          if (key && !deletedBranchIds.includes(String(b.id)) && !deletedBranchIds.includes(String(b.name).toLowerCase().trim())) {
            branchMap.set(key, {
              ...b,
              isHeadOffice: b.is_head_office ?? b.isHeadOffice,
              head: b.branch_head || b.head,
              image: b.image || b.photo || '/assets/prog_adults.jpg'
            });
          }
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch branches from Fly.io live server:', err);
  }

  // 2. Always merge any local custom branches that might still be syncing or cached
  try {
    const saved = localStorage.getItem('bama_custom_branches');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(b => {
          const key = String(b.name || b.code || b.id || '').toLowerCase().trim();
          if (key && !branchMap.has(key) && !deletedBranchIds.includes(String(b.id)) && !deletedBranchIds.includes(String(b.name).toLowerCase().trim())) {
            branchMap.set(key, b);
          }
        });
      }
    }
  } catch (e) {}

  // 3. Fallback to INITIAL_BRANCHES only if absolutely nothing was found anywhere
  if (branchMap.size === 0) {
    INITIAL_BRANCHES.forEach(b => {
      const key = String(b.name || b.code || b.id || '').toLowerCase().trim();
      if (key && !deletedBranchIds.includes(String(b.id)) && !deletedBranchIds.includes(String(b.name).toLowerCase().trim())) {
        branchMap.set(key, b);
      }
    });
  }

  const cleaned = sanitizeBranches(Array.from(branchMap.values()).filter(b => 
    !deletedBranchIds.includes(String(b.id)) && !deletedBranchIds.includes(String(b.name).toLowerCase().trim())
  ));
  safeLocalStorageSet('bama_custom_branches', cleaned);
  safeLocalStorageSet('bama_branches', cleaned);

  return cleaned.length > 0 ? cleaned : INITIAL_BRANCHES;
};

// Generate a guaranteed unique branch code (e.g. BAMA-DOJO-11) that never collides with existing dojos
export const generateUniqueBranchCode = (existingBranches = []) => {
  const existingCodes = new Set(
    (existingBranches || []).map(b => String(b.code || '').toUpperCase().trim()).filter(Boolean)
  );
  
  let maxNum = 0;
  for (const code of existingCodes) {
    const match = code.match(/BAMA-DOJO-?(\d+)/i) || code.match(/DOJO-?(\d+)/i) || code.match(/-(\d+)$/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, (existingBranches?.length || 0) + 1);
  let candidate = nextNum < 10 ? `BAMA-DOJO-0${nextNum}` : `BAMA-DOJO-${nextNum}`;
  while (existingCodes.has(candidate)) {
    nextNum++;
    candidate = nextNum < 10 ? `BAMA-DOJO-0${nextNum}` : `BAMA-DOJO-${nextNum}`;
  }
  return candidate;
};

export const createBranchBackend = async (branchData) => {
  try {
    const payload = {
      name: branchData.name || 'New Dojo Branch',
      code: branchData.code || generateUniqueBranchCode([]),
      address: branchData.address || 'Kerala, India',
      phone: (branchData.phone || '+91 9544085442').slice(0, 20),
      whatsapp: (branchData.whatsapp || branchData.phone || '+91 9544085442').slice(0, 20),
      email: branchData.email?.trim() || '',
      branch_head: branchData.branch_head || branchData.head || 'Sensei Abdul Rahman (5th Dan)',
      is_head_office: !!branchData.isHeadOffice,
      timings: branchData.timings || 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
      status: branchData.status || 'Active'
    };
    const res = await fetch('https://bama-club-backend.fly.dev/api/branches/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const serverData = await res.json();
      return { success: true, ...branchData, ...serverData };
    } else {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        errMsg = Object.entries(errJson)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      } catch (e) {}
      console.error('Failed to create branch on backend:', res.status, errMsg);
      return { error: true, message: errMsg, ...branchData };
    }
  } catch (err) {
    console.error('Failed to create branch on backend:', err);
    return { error: true, message: err.message, ...branchData };
  }
};

export const updateBranchBackend = async (id, branchData) => {
  try {
    const payload = {
      name: branchData.name || 'Dojo Branch',
      code: branchData.code || `BAMA-DOJO-${Math.floor(10 + Math.random() * 90)}`,
      address: branchData.address || 'Kerala, India',
      phone: branchData.phone || '+91 9544085442',
      whatsapp: branchData.whatsapp || branchData.phone || '+91 9544085442',
      email: branchData.email || '',
      branch_head: branchData.branch_head || branchData.head || 'Sensei Abdul Rahman (5th Dan)',
      is_head_office: !!branchData.isHeadOffice,
      timings: branchData.timings || 'Mon, Wed, Fri: 5:00 PM - 7:00 PM',
      status: branchData.status || 'Active'
    };
    
    if (typeof id === 'string' && id.length > 20) {
      await fetch(`https://bama-club-backend.fly.dev/api/branches/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  } catch (err) {
    console.error('Failed to update branch on backend:', err);
  }
};

export const deleteBranchBackend = async (id, branchName = '') => {
  try {
    const deletedIds = JSON.parse(localStorage.getItem('bama_deleted_branch_ids') || '[]');
    if (id) deletedIds.push(String(id));
    if (branchName) deletedIds.push(String(branchName).toLowerCase().trim());
    localStorage.setItem('bama_deleted_branch_ids', JSON.stringify(Array.from(new Set(deletedIds))));
  } catch (e) {}

  try {
    const saved = localStorage.getItem('bama_custom_branches');
    if (saved) {
      const parsed = JSON.parse(saved);
      const filtered = parsed.filter(b => b.id !== id && b.name !== branchName);
      safeLocalStorageSet('bama_custom_branches', filtered);
      safeLocalStorageSet('bama_branches', filtered);
    }
  } catch (e) {}

  try {
    if (typeof id === 'string' && id.length > 20) {
      const res = await fetch(`https://bama-club-backend.fly.dev/api/branches/${id}/`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        return { success: true };
      }
    }

    const res = await fetch('https://bama-club-backend.fly.dev/api/branches/', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const serverBranches = data.results || (Array.isArray(data) ? data : []);
      const match = serverBranches.find(b => 
        String(b.id) === String(id) || 
        (branchName && String(b.name || '').toLowerCase().trim() === String(branchName).toLowerCase().trim())
      );
      if (match && match.id) {
        await fetch(`https://bama-club-backend.fly.dev/api/branches/${match.id}/`, {
          method: 'DELETE'
        });
      }
    }
  } catch (err) {
    console.error('Failed to delete branch on backend:', err);
  }
  return { success: true };
};

export const deleteTrainingScheduleBackend = async (id, shiftName = '') => {
  const normShiftName = String(shiftName || '').toLowerCase().trim();
  const normId = String(id || '').trim();

  // 1. Update local deleted list
  try {
    const deletedShifts = JSON.parse(localStorage.getItem('bama_deleted_shift_ids') || '[]');
    if (normId) deletedShifts.push(normId);
    if (normShiftName) deletedShifts.push(normShiftName);
    localStorage.setItem('bama_deleted_shift_ids', JSON.stringify(Array.from(new Set(deletedShifts))));
  } catch (e) {}

  // 2. Remove from local storage immediately
  try {
    const stored = localStorage.getItem('bama_training_schedules');
    if (stored) {
      const parsed = JSON.parse(stored);
      const filtered = parsed.filter(s => {
        const sId = String(s.id || '').trim();
        const sName = String(s.name || '').toLowerCase().trim();
        if (normId && sId === normId) return false;
        if (normShiftName && sName === normShiftName) return false;
        return true;
      });
      localStorage.setItem('bama_training_schedules', JSON.stringify(filtered));
      saveTrainingSchedulesBackend(filtered).catch(() => {});
    }
  } catch (e) {}

  // 3. Delete matching shift announcements on Fly.io PostgreSQL database
  try {
    const res = await fetch('https://bama-club-backend.fly.dev/api/announcements/?category=TRAINING_SHIFT', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const announcements = data.results || (Array.isArray(data) ? data : []);
      for (const a of announcements) {
        let isMatch = (normId && String(a.id).trim() === normId);
        if (!isMatch && normShiftName && String(a.title || '').toLowerCase().trim() === normShiftName) {
          isMatch = true;
        }
        if (!isMatch && a.content) {
          try {
            const parsed = JSON.parse(a.content);
            if (normId && String(parsed.id || '').trim() === normId) isMatch = true;
            if (normShiftName && String(parsed.name || '').toLowerCase().trim() === normShiftName) isMatch = true;
          } catch (e) {}
        }

        if (isMatch) {
          await fetch(`https://bama-club-backend.fly.dev/api/announcements/${a.id}/`, {
            method: 'DELETE'
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to delete shift on Fly.io backend:', err);
  }

  // 4. Persist global tombstone on PostgreSQL backend so EVERY OTHER DEVICE (Phone / Laptop) immediately stays in sync!
  try {
    const tombstonePayload = {
      title: `DELETED_SHIFT:${normShiftName || normId}`,
      content: JSON.stringify({ deleted_id: normId, deleted_name: normShiftName, deleted_at: new Date().toISOString() }),
      category: 'DELETED_SHIFT',
      is_important: false
    };
    await fetch('https://bama-club-backend.fly.dev/api/announcements/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(tombstonePayload)
    });
  } catch (err) {}
};

export const saveTrainingSchedulesBackend = async (schedules) => {
  if (!Array.isArray(schedules)) return;
  try {
    const existingRes = await fetch('https://bama-club-backend.fly.dev/api/cms-config/', {
      headers: { 'Accept': 'application/json' }
    });
    const existingData = existingRes.ok ? await existingRes.json() : {};
    const updatedData = { ...existingData, training_schedules: schedules };
    await fetch('https://bama-club-backend.fly.dev/api/cms-config/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updatedData)
    });
  } catch (e) {
    console.error('Failed to sync training schedules to backend cms-config:', e);
  }
};

export const createTrainingScheduleBackend = async (shiftData) => {
  try {
    const stored = localStorage.getItem('bama_training_schedules');
    const existing = stored ? JSON.parse(stored) : [];
    const updated = [...existing.filter(s => s.id !== shiftData.id), shiftData];
    localStorage.setItem('bama_training_schedules', JSON.stringify(updated));
    await saveTrainingSchedulesBackend(updated);
  } catch (err) {
    console.error('Failed to create shift on backend:', err);
  }
  return shiftData;
};

export const updateTrainingScheduleBackend = async (id, shiftData) => {
  try {
    const stored = localStorage.getItem('bama_training_schedules');
    const existing = stored ? JSON.parse(stored) : [];
    const updated = existing.map(s => s.id === id ? { ...s, ...shiftData } : s);
    localStorage.setItem('bama_training_schedules', JSON.stringify(updated));
    await saveTrainingSchedulesBackend(updated);
  } catch (err) {
    console.error('Failed to update shift on backend:', err);
  }
};


export const filterOutDummyShifts = (list) => {
  if (!Array.isArray(list)) return [];
  return list.filter(s => {
    if (!s) return false;
    const sName = String(s.name || '').toLowerCase().trim();
    if (sName.startsWith('general training batch')) return false;
    return true;
  });
};

export const fetchTrainingSchedules = async () => {
  const scheduleMap = new Map();

  // 1. Fetch persistent schedules directly from Fly.io PostgreSQL cms-config
  try {
    const res = await fetch(`https://bama-club-backend.fly.dev/api/cms-config/?_t=${Date.now()}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.training_schedules) && data.training_schedules.length > 0) {
        data.training_schedules.forEach(s => {
          if (s && s.id) {
            const key = String(s.name + (s.branch || '')).toLowerCase().trim();
            scheduleMap.set(key || s.id, s);
          }
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch training schedules from Fly.io cms-config:', err);
  }

  // 2. Also merge with any local schedules from localStorage so user creations are NEVER lost!
  try {
    const stored = localStorage.getItem('bama_training_schedules');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach(s => {
          if (s && s.id) {
            const key = String(s.name + (s.branch || '')).toLowerCase().trim();
            if (!scheduleMap.has(key || s.id)) {
              scheduleMap.set(key || s.id, s);
            }
          }
        });
      }
    }
  } catch (e) {}

  const finalSchedules = Array.from(scheduleMap.values());
  
  if (finalSchedules.length > 0) {
    try {
      localStorage.setItem('bama_training_schedules', JSON.stringify(finalSchedules));
    } catch (e) {}
  }

  return finalSchedules;
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

export const fetchCompetitionsBackend = async () => {
  try {
    const res = await fetch(`https://bama-club-backend.fly.dev/api/cms-config/?_t=${Date.now()}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.competitions) && data.competitions.length > 0) return data.competitions;
    }
  } catch (err) {}
  return null;
};

export const saveCompetitionsBackend = async (competitions) => {
  try {
    const existingRes = await fetch('https://bama-club-backend.fly.dev/api/cms-config/', {
      headers: { 'Accept': 'application/json' }
    });
    const existingData = existingRes.ok ? await existingRes.json() : {};
    const updated = { ...existingData, competitions };
    await fetch('https://bama-club-backend.fly.dev/api/cms-config/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updated)
    });
  } catch (err) {}
};

export const fetchStaffBackend = async () => {
  try {
    const res = await fetch(`https://bama-club-backend.fly.dev/api/cms-config/?_t=${Date.now()}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.staff_list) && data.staff_list.length > 0) return data.staff_list;
    }
  } catch (err) {}
  return null;
};

export const saveStaffBackend = async (staffList) => {
  try {
    const existingRes = await fetch('https://bama-club-backend.fly.dev/api/cms-config/', {
      headers: { 'Accept': 'application/json' }
    });
    const existingData = existingRes.ok ? await existingRes.json() : {};
    const updated = { ...existingData, staff_list: staffList };
    await fetch('https://bama-club-backend.fly.dev/api/cms-config/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(updated)
    });
  } catch (err) {}
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

export const fetchAttendanceFromBackend = async (dateStr) => {
  try {
    const res = await api.get('/attendance/');
    const all = res.data.results || (Array.isArray(res.data) ? res.data : []);
    const forDate = all.filter(a => a.date === dateStr);
    if (forDate.length === 0) return null;
    const map = {};
    forDate.forEach(a => {
      const sId = a.student_detail?.id || a.student;
      const sAdm = a.student_detail?.admissionNo || a.student_detail?.admission_no;
      const stat = String(a.status || 'Present').toUpperCase();
      if (sId) map[sId] = stat;
      if (sAdm) map[sAdm] = stat;
    });
    return map;
  } catch (err) {
    return null;
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

// ==========================================
// B.A.M.A. Official WhatsApp Routing Engine
// Supports WhatsApp Business (com.whatsapp.w4b), Regular WhatsApp, and WhatsApp Web
// ==========================================

export const getPreferredWhatsAppChannel = () => {
  return localStorage.getItem('bama_preferred_whatsapp_channel') || 'BUSINESS';
};

export const setPreferredWhatsAppChannel = (channel) => {
  localStorage.setItem('bama_preferred_whatsapp_channel', channel);
  window.dispatchEvent(new Event('bama_whatsapp_pref_changed'));
};

export const formatWhatsAppNumber = (rawPhone) => {
  if (!rawPhone) return '919544085442';
  let clean = String(rawPhone).replace(/[^0-9]/g, '');
  if (clean.length === 10) clean = '91' + clean;
  if (clean.startsWith('0')) clean = '91' + clean.slice(1);
  return clean;
};

export const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
};

export const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const openWhatsApp = ({ phone, message, channel }) => {
  const cleanPhone = phone ? formatWhatsAppNumber(phone) : '';
  const rawMsg = message || '';
  const encodedText = encodeURIComponent(rawMsg);
  const activeChannel = channel || getPreferredWhatsAppChannel();
  const onMobile = isMobileDevice();
  const onAndroid = isAndroidDevice();

  // 1. WhatsApp Business App (com.whatsapp.w4b)
  if (activeChannel === 'BUSINESS') {
    if (onAndroid) {
      const androidIntentUri = cleanPhone 
        ? `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`
        : `intent://send?text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      window.location.href = androidIntentUri;
      setTimeout(() => {
        const fallbackUrl = cleanPhone 
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
          : `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(fallbackUrl, '_blank');
      }, 800);
      return;
    } else if (onMobile) {
      const iosUri = cleanPhone 
        ? `whatsapp-business://send?phone=${cleanPhone}&text=${encodedText}`
        : `whatsapp-business://send?text=${encodedText}`;
      window.location.href = iosUri;
      setTimeout(() => {
        const fallbackUrl = cleanPhone 
          ? `https://wa.me/${cleanPhone}?text=${encodedText}`
          : `https://wa.me/?text=${encodedText}`;
        window.open(fallbackUrl, '_blank');
      }, 800);
      return;
    } else {
      const webUrl = cleanPhone 
        ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
        : `https://web.whatsapp.com/send?text=${encodedText}`;
      window.open(webUrl, '_blank');
      return;
    }
  }

  // 2. Regular Personal WhatsApp
  if (activeChannel === 'REGULAR') {
    if (onAndroid) {
      const androidIntentUri = cleanPhone 
        ? `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp;scheme=whatsapp;end`
        : `intent://send?text=${encodedText}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
      window.location.href = androidIntentUri;
      setTimeout(() => {
        const fallbackUrl = cleanPhone 
          ? `https://wa.me/${cleanPhone}?text=${encodedText}`
          : `https://wa.me/?text=${encodedText}`;
        window.open(fallbackUrl, '_blank');
      }, 800);
      return;
    } else {
      const regularUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;
      window.open(regularUrl, '_blank');
      return;
    }
  }

  // 3. WhatsApp Web (Direct Browser Tab)
  if (activeChannel === 'WEB') {
    const webUrl = cleanPhone 
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;
    window.open(webUrl, '_blank');
    return;
  }

  // 4. Universal Fallback
  const fallbackUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(fallbackUrl, '_blank');
};

export default api;

