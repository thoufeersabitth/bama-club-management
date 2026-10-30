import React, { useState, useEffect } from 'react';
import { Calendar, CalendarCheck, Search, Filter, Check, X, Clock, MessageSquare, AlertCircle, Users, Save, CheckCircle2, Zap, ExternalLink, Settings, Share2, Copy, Loader2, Sparkles, Building2, CheckCheck } from 'lucide-react';
import { fetchStudents, getStoredStudents, saveAttendanceToBackend, fetchAttendanceFromBackend, fetchDayStatusFromBackend, saveDayStatusToBackend, fetchMonthlyDayStatusesFromBackend, openWhatsApp, getPreferredWhatsAppChannel, setPreferredWhatsAppChannel, fetchBranches, getStandardBranchName } from '../../services/api';
import { INITIAL_BRANCHES, SHIFT_OPTIONS, getDynamicShiftOptions, isShiftCompatibleWithBranch, getBranchKeyFromStr } from '../../services/initialData';
import { useAuth } from '../../context/AuthContext';

export default function AttendanceManagement() {
  const [students, setStudents] = useState(getStoredStudents);
  const [branchesList, setBranchesList] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_custom_branches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_BRANCHES;
  });

  useEffect(() => {
    const loadBranches = () => {
      fetchBranches().then(data => {
        if (data && data.length > 0) setBranchesList(data);
      });
    };
    loadBranches();
    window.addEventListener('bama_branches_updated', loadBranches);
    window.addEventListener('storage', loadBranches);
    return () => {
      window.removeEventListener('bama_branches_updated', loadBranches);
      window.removeEventListener('storage', loadBranches);
    };
  }, []);

  const { user, activeBranch, setActiveBranch } = useAuth();

  const getBranchStorageKey = (b) => {
    if (!b || b === 'All' || b === 'ALL') return 'global';
    return String(b).toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (activeBranch && activeBranch !== 'ALL' && activeBranch !== 'All') return activeBranch;
    return 'Pulikkal Branch (Head Office)';
  });

  // Sync selectedBranch if activeBranch in top header changes
  useEffect(() => {
    if (activeBranch && activeBranch !== 'ALL' && activeBranch !== 'All' && activeBranch !== selectedBranch) {
      setSelectedBranch(activeBranch);
      setSelectedShift('All');
    }
  }, [activeBranch]);
  const [selectedShift, setSelectedShift] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PRESENT' | 'ABSENT' | 'LATE'
  const [isSaving, setIsSaving] = useState(false);
  const [applyAllBranches, setApplyAllBranches] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [reportFormat, setReportFormat] = useState('full'); // 'full' | 'absentees_only' | 'rollcall'
  const [reportBranch, setReportBranch] = useState('All');
  const [reportShift, setReportShift] = useState('All');

  // Day Status State (CLASS vs HOLIDAY)
  const [dayStatus, setDayStatus] = useState('CLASS');
  const [holidayReason, setHolidayReason] = useState('Weekly Dojo Off Day');

  // Bulk Absentee WhatsApp Queue State
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentQueueIndex, setAbsentQueueIndex] = useState(0);
  const [sentAbsentStudentIds, setSentAbsentStudentIds] = useState([]);

  // Auto-sync branch day status & attendance on date or branch change
  useEffect(() => {
    const bKey = getBranchStorageKey(selectedBranch);
    
    // 1. Read cached Day Status
    const cachedBranchStatus = localStorage.getItem(`bama_day_status_${bKey}_${selectedDate}`);
    const cachedBranchReason = localStorage.getItem(`bama_holiday_reason_${bKey}_${selectedDate}`);
    const cachedGlobalStatus = localStorage.getItem(`bama_day_status_global_${selectedDate}`) || localStorage.getItem(`bama_day_status_${selectedDate}`);
    const cachedGlobalReason = localStorage.getItem(`bama_holiday_reason_global_${selectedDate}`) || localStorage.getItem(`bama_holiday_reason_${selectedDate}`);

    const activeStatus = cachedBranchStatus || cachedGlobalStatus || 'CLASS';
    const activeReason = cachedBranchReason || cachedGlobalReason || 'Weekly Dojo Off Day';
    setDayStatus(activeStatus);
    setHolidayReason(activeReason);

    // 2. Fetch authoritative Day Status from Fly.io Backend
    fetchDayStatusFromBackend(selectedDate, selectedBranch).then(serverStatus => {
      if (serverStatus && serverStatus.status) {
        setDayStatus(serverStatus.status);
        if (serverStatus.reason) setHolidayReason(serverStatus.reason);
        localStorage.setItem(`bama_day_status_${bKey}_${selectedDate}`, serverStatus.status);
        if (serverStatus.reason) localStorage.setItem(`bama_holiday_reason_${bKey}_${selectedDate}`, serverStatus.reason);
      }
    });

    // 3. Read cached attendance
    let hasLocal = false;
    try {
      const saved = localStorage.getItem(`bama_attendance_${bKey}_${selectedDate}`) || localStorage.getItem(`bama_attendance_${selectedDate}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setAttendanceRecords(parsed);
          hasLocal = true;
        }
      }
    } catch (e) {}

    // 4. Fetch Attendance from Fly.io Backend
    fetchAttendanceFromBackend(selectedDate, selectedBranch).then(serverAtt => {
      if (serverAtt && Object.keys(serverAtt).length > 0) {
        setAttendanceRecords(prev => ({ ...prev, ...serverAtt }));
        localStorage.setItem(`bama_attendance_${bKey}_${selectedDate}`, JSON.stringify(serverAtt));
      } else if (!hasLocal) {
        const initial = {};
        (students || []).forEach(s => {
          initial[s.id || s.admissionNo] = 'PRESENT';
        });
        setAttendanceRecords(initial);
      }
    });
  }, [selectedDate, selectedBranch]);

  const handleDayStatusChange = (newStatus, reason = holidayReason, forAll = applyAllBranches) => {
    setDayStatus(newStatus);
    setHolidayReason(reason);
    setApplyAllBranches(forAll);
    const bKey = getBranchStorageKey(selectedBranch);
    try {
      if (forAll) {
        localStorage.setItem(`bama_day_status_global_${selectedDate}`, newStatus);
        localStorage.setItem(`bama_holiday_reason_global_${selectedDate}`, reason);
        localStorage.setItem(`bama_day_status_${selectedDate}`, newStatus);
        localStorage.setItem(`bama_holiday_reason_${selectedDate}`, reason);
      } else {
        localStorage.setItem(`bama_day_status_${bKey}_${selectedDate}`, newStatus);
        localStorage.setItem(`bama_holiday_reason_${bKey}_${selectedDate}`, reason);
      }

      saveDayStatusToBackend(selectedDate, newStatus, reason, selectedBranch, forAll);
      window.dispatchEvent(new Event('bama_data_updated'));

      const scopeName = forAll ? 'All Branches' : (selectedBranch === 'All' ? 'This Dojo' : selectedBranch);
      if (newStatus === 'HOLIDAY') {
        setSaveSuccessMsg(`🏖️ ${scopeName} set as Holiday (${reason})!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setSaveSuccessMsg(`🥋 ${scopeName} set as Class Day!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (e) {}
  };
  // Helper to calculate Monthly Classes Conducted & Holidays count for current month
  const getMonthlyClassStats = () => {
    const monthPrefix = selectedDate.slice(0, 7); // "YYYY-MM"
    let conducted = 0;
    let holidays = 0;

    const [yearStr, monthStr] = monthPrefix.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = String(day).padStart(2, '0');
      const dateStr = `${monthPrefix}-${dayFormatted}`;
      if (dateStr > new Date().toISOString().split('T')[0]) break;

      const savedStatus = localStorage.getItem(`bama_day_status_${dateStr}`);
      if (savedStatus === 'HOLIDAY') {
        holidays++;
      } else if (savedStatus === 'CLASS') {
        conducted++;
      } else {
        const savedAtt = localStorage.getItem(`bama_attendance_${dateStr}`);
        const dateObj = new Date(dateStr);
        if (dateObj.getDay() === 0) {
          holidays++;
        } else if (savedAtt) {
          conducted++;
        }
      }
    }

    return { conducted, holidays, totalDays: conducted + holidays };
  };

  const monthlyStats = getMonthlyClassStats();

  // 1. Fast Load students on mount (and update cache in background)
  useEffect(() => {
    fetchStudents().then((data) => {
      if (data && data.length > 0) {
        setStudents(data);
      }
    });
  }, []);

// Attendance and Day Status auto-synced above

  const handleStatusChange = (studentId, status) => {
    const updated = {
      ...attendanceRecords,
      [studentId]: status
    };
    setAttendanceRecords(updated);

    // Auto sync live summary
    try {
      localStorage.setItem(`bama_attendance_${selectedDate}`, JSON.stringify(updated));
      const total = filteredStudents.length;
      const pCount = Object.values(updated).filter(v => v === 'PRESENT').length;
      const aCount = Object.values(updated).filter(v => v === 'ABSENT').length;
      const lCount = Object.values(updated).filter(v => v === 'LATE').length;
      const rate = total > 0 ? ((pCount / total) * 100).toFixed(1) : 100;

      const summary = {
        date: selectedDate,
        totalCadets: total,
        presentCount: pCount,
        absentCount: aCount,
        lateCount: lCount,
        attendanceRate: rate
      };
      localStorage.setItem('bama_latest_attendance_summary', JSON.stringify(summary));
    } catch (e) {}
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const bKey = getBranchStorageKey(selectedBranch);
      localStorage.setItem(`bama_day_status_${bKey}_${selectedDate}`, dayStatus);
      localStorage.setItem(`bama_holiday_reason_${bKey}_${selectedDate}`, holidayReason);
      localStorage.setItem(`bama_attendance_${bKey}_${selectedDate}`, JSON.stringify(attendanceRecords));
      localStorage.setItem(`bama_attendance_${selectedDate}`, JSON.stringify(attendanceRecords));

      const total = filteredStudents.length;
      const pCount = Object.values(attendanceRecords).filter(v => v === 'PRESENT').length;
      const aCount = Object.values(attendanceRecords).filter(v => v === 'ABSENT').length;
      const lCount = Object.values(attendanceRecords).filter(v => v === 'LATE').length;
      const rate = total > 0 ? ((pCount / total) * 100).toFixed(1) : 100;

      const summary = {
        date: selectedDate,
        branch: selectedBranch,
        totalCadets: total,
        presentCount: pCount,
        absentCount: aCount,
        lateCount: lCount,
        attendanceRate: rate
      };
      localStorage.setItem('bama_latest_attendance_summary', JSON.stringify(summary));

      // Atomic Bulk Backend Save to Fly.io PostgreSQL!
      await saveAttendanceToBackend(
        selectedDate,
        attendanceRecords,
        students,
        selectedBranch,
        dayStatus,
        holidayReason,
        applyAllBranches
      );

      const branchDisplay = selectedBranch === 'All' ? 'All Branches' : selectedBranch;
      setSaveSuccessMsg(`🥋 Attendance successfully saved for ${branchDisplay} on ${selectedDate}!`);
      setTimeout(() => setSaveSuccessMsg(''), 4500);
      window.dispatchEvent(new Event('bama_data_updated'));
    } catch (err) {
      console.error(err);
      setSaveSuccessMsg('Saved locally! Background cloud sync in progress.');
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Report Modal with default active branch
  const openReportModal = () => {
    const initBranch = selectedBranch !== 'All' ? selectedBranch : (branchesList[0]?.name || 'All');
    setReportBranch(initBranch);
    setReportShift(selectedShift);
    setReportFormat('full');
    setShowReportModal(true);
  };

  // WhatsApp Branch Attendance Report Generator (Full names of Absent & Present Cadets)
  const generateWhatsAppAttendanceReport = (targetBranch = reportBranch, targetShift = reportShift, targetFormat = reportFormat) => {
    const activeBranch = targetBranch || selectedBranch;
    const activeShift = targetShift || selectedShift;
    const format = targetFormat || reportFormat;

    const branchTitle = activeBranch === 'All' ? 'ALL DOJO BRANCHES' : activeBranch;
    const shiftTitle = activeShift === 'All' ? 'All Batches' : activeShift;

    // Strict Cadet Filter for this Branch & Batch
    const targetStudents = students.filter(s => {
      if (activeBranch !== 'All' && !isStudentInBranch(s, activeBranch)) return false;
      if (activeShift !== 'All') {
        if (!matchesShift(s, activeShift)) return false;
      }
      return true;
    });

    const isTargetHoliday = dayStatus === 'HOLIDAY';

    const absentees = isTargetHoliday ? [] : targetStudents.filter(s => attendanceRecords[s.id || s.admissionNo] === 'ABSENT');
    const latecomers = isTargetHoliday ? [] : targetStudents.filter(s => attendanceRecords[s.id || s.admissionNo] === 'LATE');
    const presentees = isTargetHoliday ? [] : targetStudents.filter(s => (attendanceRecords[s.id || s.admissionNo] || 'PRESENT') === 'PRESENT');

    const total = targetStudents.length;
    const pCount = presentees.length;
    const aCount = absentees.length;
    const lCount = latecomers.length;
    const rate = total > 0 ? ((pCount / total) * 100).toFixed(1) : '100.0';

    let msg = `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n`;
    msg += `📍 *Dojo Branch:* ${branchTitle}\n`;
    msg += `📅 *Date:* ${selectedDate}\n`;
    msg += `⏰ *Batch / Shift:* ${shiftTitle}\n\n`;

    if (isTargetHoliday) {
      msg += `🏖️ *STATUS: OFFICIAL DOJO HOLIDAY*\n`;
      msg += `📌 *Reason:* ${holidayReason || 'Weekly Off / Class Cancelled'}\n\n`;
      const senseiName = user?.name || 'Sensei Abdul Nafih.p';
      msg += `🥋 *Sensei In-Charge:* ${senseiName}\n`;
      msg += `_B.A.M.A. Official Digital Roster_`;
      return msg;
    }

    msg += `📊 *DAILY ATTENDANCE SUMMARY*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👥 *Total Enrolled:* ${total} Cadets\n`;
    msg += `✅ *Present:* ${pCount} Cadets\n`;
    msg += `❌ *Absent:* ${aCount} Cadets\n`;
    if (lCount > 0) msg += `⏳ *Late:* ${lCount} Cadets\n`;
    msg += `📈 *Attendance Rate:* ${rate}%\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (format === 'absentees_only') {
      if (absentees.length > 0) {
        msg += `❌ *ABSENT CADETS LIST (${absentees.length}):*\n`;
        absentees.forEach((a, i) => {
          const adm = a.admissionNo || a.admission_no ? ` (${a.admissionNo || a.admission_no})` : '';
          msg += `${i + 1}. ${a.name || a.student_name}${adm}\n`;
        });
        msg += `\n`;
      } else {
        msg += `🌟 *100% Full Attendance Today! No Absentees! OSS 🥋*\n\n`;
      }
    } else if (format === 'rollcall') {
      msg += `📋 *ROLL CALL REGISTER (${total}):*\n`;
      targetStudents.forEach((st, i) => {
        const stStatus = attendanceRecords[st.id || st.admissionNo] || 'PRESENT';
        const icon = stStatus === 'PRESENT' ? '✅' : stStatus === 'ABSENT' ? '❌' : '⏳';
        const adm = st.admissionNo || st.admission_no ? ` [${st.admissionNo || st.admission_no}]` : '';
        msg += `${i + 1}. ${icon} ${st.name || st.student_name}${adm} - *${stStatus}*\n`;
      });
      msg += `\n`;
    } else {
      // Default 'full': Shows Absentees prominently with names, then all Present students!
      if (absentees.length > 0) {
        msg += `❌ *ABSENT CADETS (${absentees.length}):*\n`;
        absentees.forEach((a, i) => {
          const adm = a.admissionNo || a.admission_no ? ` (${a.admissionNo || a.admission_no})` : '';
          msg += `${i + 1}. ${a.name || a.student_name}${adm}\n`;
        });
        msg += `\n`;
      } else {
        msg += `❌ *ABSENT CADETS:*\nNone (100% Full Attendance! 🎉)\n\n`;
      }

      if (latecomers.length > 0) {
        msg += `⏳ *LATE CADETS (${latecomers.length}):*\n`;
        latecomers.forEach((l, i) => {
          const adm = l.admissionNo || l.admission_no ? ` (${l.admissionNo || l.admission_no})` : '';
          msg += `${i + 1}. ${l.name || l.student_name}${adm}\n`;
        });
        msg += `\n`;
      }

      msg += `✅ *PRESENT CADETS (${presentees.length}):*\n`;
      if (presentees.length > 0) {
        presentees.forEach((p, i) => {
          const adm = p.admissionNo || p.admission_no ? ` (${p.admissionNo || p.admission_no})` : '';
          msg += `${i + 1}. ${p.name || p.student_name}${adm}\n`;
        });
      } else {
        msg += `None\n`;
      }
      msg += `\n`;
    }

    const senseiName = user?.name || 'Sensei Abdul Nafih.p';
    msg += `🥋 *Sensei In-Charge:* ${senseiName}\n`;
    msg += `_B.A.M.A. Official Digital Roster_`;
    return msg;
  };

  const handleShareReportWhatsApp = (targetBranch = reportBranch, targetShift = reportShift, targetFormat = reportFormat) => {
    const reportText = generateWhatsAppAttendanceReport(targetBranch, targetShift, targetFormat);
    openWhatsApp({
      message: reportText
    });
  };

  const handleCopyReport = (targetBranch = reportBranch, targetShift = reportShift, targetFormat = reportFormat) => {
    const reportText = generateWhatsAppAttendanceReport(targetBranch, targetShift, targetFormat);
    navigator.clipboard.writeText(reportText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 3000);
  };
  // Helper to resolve standard canonical branch key for 100% accurate branch separation
  const getBranchKey = (val) => {
    if (!val) return '';
    const norm = getStandardBranchName(val, branchesList);
    return getBranchKeyFromStr(norm);
  };

  // 100% Robust Branch Cadets Matching (Handles all 11 branches, UUID, Name, Code, Shift fallback)
  const isStudentInBranch = (student, branchFilter) => {
    if (!branchFilter || branchFilter === 'All' || branchFilter === 'ALL') return true;
    if (!student) return false;

    const bFilterLow = String(branchFilter).toLowerCase().trim();

    // Find target branch object from branchesList
    const targetBranchObj = (branchesList || []).find(b => 
      String(b.id || '').toLowerCase().trim() === bFilterLow ||
      String(b.code || '').toLowerCase().trim() === bFilterLow ||
      String(b.name || '').toLowerCase().trim() === bFilterLow
    );

    const targetId = targetBranchObj ? String(targetBranchObj.id || '').toLowerCase().trim() : '';
    const targetCode = targetBranchObj ? String(targetBranchObj.code || '').toLowerCase().trim() : '';
    const targetName = targetBranchObj ? String(targetBranchObj.name || '').toLowerCase().trim() : bFilterLow;

    const sId = String(student.branch_id || (typeof student.branch === 'object' ? student.branch?.id : '') || student.branch_detail?.id || '').toLowerCase().trim();
    const sCode = String(student.branch_code || student.branch_detail?.code || '').toLowerCase().trim();
    const sName = String(student.branch_name || student.branchName || (typeof student.branch === 'object' ? student.branch?.name : student.branch) || student.branch_detail?.name || '').toLowerCase().trim();

    // 1. Direct ID match
    if (targetId && sId && targetId === sId) return true;

    // 2. Direct Code match
    if (targetCode && sCode && targetCode === sCode) return true;

    // 3. Exact Name match
    if (targetName && sName && (targetName === sName || targetName.includes(sName) || sName.includes(targetName))) {
      // Disambiguate specific branch keywords
      if (targetName.includes('koonol') && !sName.includes('koonol')) return false;
      if (targetName.includes('neerad') && !sName.includes('neerad')) return false;
      if (targetName.includes('pulikkal') && !sName.includes('pulikkal')) return false;
      if (targetName.includes('chungam') && !sName.includes('chungam')) return false;
      if (targetName.includes('feroke') && !sName.includes('feroke')) return false;
      return true;
    }

    // 4. Canonical keyword match
    const getCanonical = (str) => {
      const s = String(str || '').toLowerCase();
      if (s.includes('kick')) return 'kickboxing';
      if (s.includes('chanda') || s.includes('gmup')) return 'chanda';
      if (s.includes('ansar')) return 'ansar';
      if (s.includes('kanjiraparaba') || s.includes('gmlp')) return 'kanjiraparaba';
      if (s.includes('pengad') || s.includes('btmamup') || s.includes('btamup')) return 'pengad';
      if (s.includes('ganapath')) return 'ganapath';
      if (s.includes('feroke') && !s.includes('ganapath')) return 'feroke';
      if (s.includes('airport')) return 'airport';
      if (s.includes('koonol')) return 'koonolmadu';
      if (s.includes('neerad')) return 'neerad';
      if (s.includes('chungam')) return 'chungam';
      if (s.includes('morayur')) return 'morayur';
      if (s.includes('mongam')) return 'mongam';
      if (s.includes('pulikkal') || s.includes('head office')) return 'pulikkal';
      return s.replace(/[^a-z0-9]/g, '');
    };

    const tCanon = getCanonical(targetName || bFilterLow);
    const sCanon = getCanonical(sName || sId);

    if (tCanon && sCanon && tCanon === sCanon) return true;

    // 5. Shift fallback only if student has NO branch assigned at all
    if (!sName && !sId && student.shift) {
      const shiftCanon = getCanonical(student.shift);
      if (tCanon && shiftCanon && tCanon === shiftCanon) return true;
    }

    return false;
  };

  // Smart Shift / Batch Matcher (Direct match, timing match, keyword match)
  const matchesShift = (student, targetShift) => {
    if (!targetShift || targetShift === 'All' || targetShift === 'ALL') return true;

    const sShift = String(student.shift || student.dojoShift || student.batch || '').trim().toLowerCase();
    const tShift = String(targetShift).trim().toLowerCase();

    if (!sShift) return false;
    if (sShift === tShift) return true;
    if (sShift.includes(tShift) || tShift.includes(sShift)) return true;

    // Extract time parts like "4:00 PM - 5:00 PM"
    const extractTime = (str) => {
      const match = str.match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi);
      return match ? match.join(' - ') : '';
    };

    const sTime = extractTime(sShift);
    const tTime = extractTime(tShift);
    if (sTime && tTime && (sTime.includes(tTime) || tTime.includes(sTime))) {
      return true;
    }

    return false;
  };

  // Dynamic Shift Options for selected branch ONLY
  const availableShifts = React.useMemo(() => {
    const shiftsSet = new Set();
    const activeBranchFilter = selectedBranch !== 'All' ? selectedBranch : null;

    // 1. Shifts from students in this branch (strictly filtered to this branch)
    const branchStudents = activeBranchFilter 
      ? students.filter(s => isStudentInBranch(s, activeBranchFilter))
      : students;

    branchStudents.forEach(s => {
      const sh = String(s.shift || s.dojoShift || s.batch || '').trim();
      if (sh && sh !== 'undefined' && sh !== 'null' && sh !== 'All') {
        if (isShiftCompatibleWithBranch(sh, activeBranchFilter)) {
          shiftsSet.add(sh);
        }
      }
    });

    // 2. Configured branch timings / custom shifts for this branch
    const dynamicOptions = getDynamicShiftOptions(activeBranchFilter, null, branchesList);
    dynamicOptions.forEach(sh => {
      if (sh && sh !== 'undefined' && sh !== 'null' && sh !== 'All') {
        if (isShiftCompatibleWithBranch(sh, activeBranchFilter)) {
          shiftsSet.add(sh);
        }
      }
    });

    return Array.from(shiftsSet);
  }, [students, selectedBranch, branchesList]);

  const baseBranchShiftStudents = students.filter(s => {
    const activeBranchFilter = selectedBranch;
    if (!isStudentInBranch(s, activeBranchFilter)) {
      return false;
    }

    if (selectedShift !== 'All') {
      if (!matchesShift(s, selectedShift)) {
        return false;
      }
    }

    return true;
  });

  // Calculate live stats for base students (strictly adapting to Holiday vs Class)
  const isHoliday = dayStatus === 'HOLIDAY';
  const presentCount = isHoliday ? 0 : baseBranchShiftStudents.filter(s => (attendanceRecords[s.id || s.admissionNo] || 'PRESENT') === 'PRESENT').length;
  const absentCount = isHoliday ? 0 : baseBranchShiftStudents.filter(s => attendanceRecords[s.id || s.admissionNo] === 'ABSENT').length;
  const lateCount = isHoliday ? 0 : baseBranchShiftStudents.filter(s => attendanceRecords[s.id || s.admissionNo] === 'LATE').length;
  const totalCount = baseBranchShiftStudents.length;
  const attendanceRate = isHoliday ? '100.0' : (totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 100);

  // Final filtered list considering search and active status filter
  const filteredStudents = baseBranchShiftStudents.filter(s => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchAdm = (s.admissionNo || s.admission_no || '').toLowerCase().includes(q);
      const matchBelt = (s.beltRank || s.currentBelt || '').toLowerCase().includes(q);
      if (!matchName && !matchAdm && !matchBelt) return false;
    }

    if (statusFilter !== 'ALL') {
      const stStatus = attendanceRecords[s.id || s.admissionNo] || 'PRESENT';
      if (stStatus !== statusFilter) return false;
    }

    return true;
  });

  // Format phone number for WhatsApp
  const formatWhatsAppPhone = (phoneStr) => {
    let clean = (phoneStr || '').replace(/[^0-9]/g, '');
    if (!clean) return '919544085442';
    if (clean.length === 10) return '91' + clean;
    if (clean.startsWith('0')) return '91' + clean.slice(1);
    return clean;
  };

  // Send WhatsApp Alert to cadet's parent for any status (Present, Absent, Late)
  const sendCadetWhatsApp = (student, channelOverride) => {
    const parentName = student.guardianName || student.guardian_name || 'Parent';
    const cadetName = student.name || 'Cadet';
    const studentId = student.id || student.admissionNo;
    const status = attendanceRecords[studentId] || 'PRESENT';

    let statusMsg = `cadet ${cadetName} was marked PRESENT for today's Karate training session. Great progress! OSS 🥋`;
    if (status === 'ABSENT') {
      statusMsg = `cadet ${cadetName} was marked ABSENT for today's Karate training session. Kindly contact office if unexpected. OSS 🥋`;
    } else if (status === 'LATE') {
      statusMsg = `cadet ${cadetName} arrived LATE for today's Karate training session. OSS 🥋`;
    }

    const rawMessage = 
      `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
      `📌 *DAILY ATTENDANCE NOTICE*\n` +
      `Date: *${selectedDate}*\n` +
      `Cadet Name: *${cadetName}* (${student.admissionNo || student.admission_no})\n` +
      `Shift/Batch: *${student.shift || 'Evening Batch'}*\n` +
      `Status: *${status}*\n\n` +
      `Dear Parent (${parentName}), ${statusMsg}`;

    setSentAbsentStudentIds(prev => Array.from(new Set([...prev, studentId])));
    openWhatsApp({
      phone: student.whatsapp || student.phone,
      message: rawMessage,
      channel: channelOverride
    });
  };

  const absentStudentsList = absentCount > 0 
    ? baseBranchShiftStudents.filter(s => attendanceRecords[s.id || s.admissionNo] === 'ABSENT')
    : baseBranchShiftStudents;

  const handleOpenAbsentModal = () => {
    setAbsentQueueIndex(0);
    setSentAbsentStudentIds([]);
    setShowAbsentModal(true);
  };

  const handleSendNextAbsent = () => {
    if (absentQueueIndex >= absentStudentsList.length) return;
    const currentStudent = absentStudentsList[absentQueueIndex];
    sendCadetWhatsApp(currentStudent);
    setAbsentQueueIndex(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Sleek Compact Header Banner */}
      <div className="bg-white p-4 sm:px-5 sm:py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 w-full">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
              Daily Attendance Register
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 font-mono">
              Rate: {attendanceRate}%
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" /> Daily Attendance Control
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Mark present, absent, or late status per shift batch for active cadets and save changes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {absentCount > 0 && (
            <button
              onClick={handleOpenAbsentModal}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0" /> <span className="whitespace-nowrap">Notify Absentees ({absentCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={openReportModal}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            title="Share Branch Attendance on WhatsApp"
          >
            <Share2 className="w-4 h-4 text-blue-600 flex-shrink-0" /> <span className="whitespace-nowrap">Share Report</span>
          </button>

          <button
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer flex-shrink-0 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="whitespace-nowrap">{isSaving ? 'Saving...' : 'Save Register'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-black flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* KPI Summary Cards & Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
          className={`bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all duration-200 cursor-pointer ${
            statusFilter === 'PRESENT' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40' : 'border-gray-200/90 hover:border-emerald-200'
          }`}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">PRESENT</span>
            <strong className="text-lg sm:text-xl font-black text-emerald-600 leading-none block mt-0.5">{presentCount}</strong>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
          className={`bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all duration-200 cursor-pointer ${
            statusFilter === 'ABSENT' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40' : 'border-gray-200/90 hover:border-rose-200'
          }`}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
            <X className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ABSENT</span>
            <strong className="text-lg sm:text-xl font-black text-rose-600 leading-none block mt-0.5">{absentCount}</strong>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'LATE' ? 'ALL' : 'LATE')}
          className={`bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all duration-200 cursor-pointer ${
            statusFilter === 'LATE' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40' : 'border-gray-200/90 hover:border-amber-200'
          }`}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">LATE</span>
            <strong className="text-lg sm:text-xl font-black text-amber-600 leading-none block mt-0.5">{lateCount}</strong>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('ALL')}
          className={`bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all duration-200 cursor-pointer ${
            statusFilter === 'ALL' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40' : 'border-gray-200/90 hover:border-blue-200'
          }`}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL CADETS</span>
            <strong className="text-lg sm:text-xl font-black text-blue-600 leading-none block mt-0.5">{totalCount}</strong>
          </div>
        </div>
      </div>

      {/* Date & Day Status Header Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-black rounded-3xl p-4 sm:p-5 text-white border border-gray-800 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-gray-800 text-gray-300 px-2.5 py-0.5 rounded-full border border-gray-700">
              📅 Attendance Register Date
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dayStatus === 'HOLIDAY' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
              {dayStatus === 'HOLIDAY' ? '🏖️ Official Holiday' : '🥋 Regular Training Day'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 pt-0.5">
            <span>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </h3>
        </div>

        {/* Day Status Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-gray-800/90 rounded-xl border border-gray-700/80 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleDayStatusChange('CLASS')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                dayStatus === 'CLASS'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🥋 Class Today</span>
            </button>

            <button
              type="button"
              onClick={() => handleDayStatusChange('HOLIDAY')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                dayStatus === 'HOLIDAY'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🏖️ Holiday</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar, Search & Quick Actions */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col gap-3 text-xs w-full">
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Quick Search Cadet */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search cadet name, admission no, belt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
            <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-gray-900 font-black focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Branch Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedBranch(val);
                setSelectedShift('All');
                if (setActiveBranch) setActiveBranch(val === 'All' ? 'ALL' : val);
              }}
              className="bg-transparent text-gray-900 font-black focus:outline-none cursor-pointer text-xs max-w-[200px] truncate"
            >
              <option value="All">🌐 All Branches (Overview)</option>
              {branchesList.map(b => (
                <option key={b.id || b.name} value={b.name}>🏬 {b.name}</option>
              ))}
            </select>
          </div>

          {/* Shift Batch Selector Dropdown */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-gray-800 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs text-xs truncate max-w-[200px]"
          >
            <option value="All">All Batches</option>
            {availableShifts.map((s, idx) => (
              <option key={idx} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 📱 Quick Touch Branch Filter Bar - Ultra-fast Tap Switcher for Mobile & Desktop */}
        <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <span className="text-[11px] font-black text-gray-500 uppercase flex-shrink-0 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-red-600" /> Dojo:
          </span>
          <button
            type="button"
            onClick={() => { setSelectedBranch('All'); setSelectedShift('All'); if (setActiveBranch) setActiveBranch('ALL'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
              selectedBranch === 'All'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            🌐 All Branches
          </button>
          {branchesList.map(b => {
            const isSel = selectedBranch === b.name;
            return (
              <button
                key={b.id || b.name}
                type="button"
                onClick={() => {
                  setSelectedBranch(b.name);
                  setSelectedShift('All');
                  if (setActiveBranch) setActiveBranch(b.name);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                  isSel
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>

        {/* Active Branch Confirmation Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Dojo: <strong>{selectedBranch === 'All' ? 'All Dojo Branches' : selectedBranch}</strong></span>
            {selectedShift !== 'All' && <span className="text-gray-500">• Batch: <strong>{selectedShift}</strong></span>}
          </div>
          <span className="text-[11px] text-amber-700 font-mono">
            👥 {filteredStudents.length} Cadets Enrolled
          </span>
        </div>

        {/* Quick Batch Actions & Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-500 font-bold mr-1">Filter:</span>
            {[
              { label: 'All', val: 'ALL', count: totalCount },
              { label: 'Present', val: 'PRESENT', count: presentCount, color: 'text-emerald-700' },
              { label: 'Absent', val: 'ABSENT', count: absentCount, color: 'text-rose-700' },
              { label: 'Late', val: 'LATE', count: lateCount, color: 'text-amber-700' }
            ].map(f => (
              <button
                key={f.val}
                type="button"
                onClick={() => setStatusFilter(f.val)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === f.val
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === f.val ? 'bg-white/20 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const allPresent = { ...attendanceRecords };
                filteredStudents.forEach(s => { allPresent[s.id || s.admissionNo] = 'PRESENT'; });
                setAttendanceRecords(allPresent);
              }}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" /> All Present
            </button>

            <button
              onClick={() => {
                const allAbsent = { ...attendanceRecords };
                filteredStudents.forEach(s => { allAbsent[s.id || s.admissionNo] = 'ABSENT'; });
                setAttendanceRecords(allAbsent);
              }}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <X className="w-3.5 h-3.5" /> All Absent
            </button>
          </div>
        </div>
      </div>

      {/* Cadet Attendance List: Mobile Cards + Desktop Table */}
      {dayStatus === 'HOLIDAY' ? (
        <div className="bg-gradient-to-b from-[#0F111D] to-[#0A0C14] border-2 border-amber-500/60 rounded-3xl p-10 text-center space-y-5 shadow-2xl my-4">
          <div className="w-20 h-20 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-400/40 text-3xl shadow-xl animate-pulse">
            🏖️
          </div>
          <div>
            <span className="px-3 py-1 bg-amber-950 text-amber-400 border border-amber-800 rounded-full text-xs font-mono font-bold">
              DOJO DAY STATUS: OFFICIAL HOLIDAY
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mt-3">
              OFFICIAL DOJO HOLIDAY - NO CLASS CONDUCTED TODAY
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm max-w-lg mx-auto font-medium mt-2">
              Date: <strong className="text-amber-400 font-mono">{selectedDate}</strong>. Attendance register is locked for this date. Absentee WhatsApp alerts are safely paused.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 bg-black/80 px-4 py-2.5 rounded-2xl border border-amber-500/40 text-xs text-amber-300 font-bold shadow-lg">
              <span>Select Holiday Reason:</span>
              <select
                value={holidayReason}
                onChange={(e) => handleDayStatusChange('HOLIDAY', e.target.value, applyAllBranches)}
                className="bg-transparent text-white font-black focus:outline-none cursor-pointer"
              >
                <option value="Weekly Dojo Off Day" className="bg-gray-900 text-white">Weekly Dojo Off Day</option>
                <option value="School Function / Hall Unavailable" className="bg-gray-900 text-white">School Function / Hall Unavailable</option>
                <option value="Heavy Rain / Emergency Weather" className="bg-gray-900 text-white">Heavy Rain / Emergency Weather</option>
                <option value="Public Festival / Govt Holiday" className="bg-gray-900 text-white">Public Festival / Govt Holiday</option>
                <option value="Dojo Belt Exam / Tournament Rest" className="bg-gray-900 text-white">Dojo Belt Exam / Tournament Rest</option>
              </select>
            </div>

            {/* Scope Toggle: This Branch Only vs All Branches */}
            <div className="inline-flex items-center gap-3 bg-gray-900/90 px-3.5 py-2.5 rounded-2xl border border-gray-700 text-xs text-gray-300 font-bold">
              <span className="text-gray-400">Apply:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="holidayScope"
                  checked={!applyAllBranches}
                  onChange={() => handleDayStatusChange('HOLIDAY', holidayReason, false)}
                  className="text-amber-500"
                />
                <span className={!applyAllBranches ? 'text-amber-400 font-black' : 'text-gray-400'}>
                  {selectedBranch === 'All' ? 'This Dojo' : selectedBranch} Only
                </span>
              </label>
              <span className="text-gray-600">|</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="holidayScope"
                  checked={applyAllBranches}
                  onChange={() => handleDayStatusChange('HOLIDAY', holidayReason, true)}
                  className="text-amber-500"
                />
                <span className={applyAllBranches ? 'text-amber-400 font-black' : 'text-gray-400'}>
                  All Branches
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => handleDayStatusChange('CLASS', holidayReason, applyAllBranches)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs transition cursor-pointer shadow-lg flex items-center gap-1.5"
            >
              <span>🥋 Switch to Class Conducted Today</span>
            </button>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center space-y-3 border border-gray-200 shadow-sm">
          <Users className="w-10 h-10 text-gray-300 mx-auto" />
          <h4 className="font-black text-gray-800 text-base">No Cadets Found</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">No cadets match the selected branch, batch shift, or search filter.</p>
        </div>
      ) : (
        <>
          {/* 📱 MOBILE VIEW: Compact Touch-Friendly Roll Call Cards (Visible on Mobile Screens) */}
          <div className="block md:hidden space-y-3">
            {filteredStudents.map((st) => {
              const stId = st.id || st.admissionNo;
              const status = attendanceRecords[stId] || 'PRESENT';
              const stPhoto = st.photo || st.photoUrl || st.avatar || st.profile_photo || st.profileImage || st.image || st.img;

              return (
                <div
                  key={`mob-att-${stId}`}
                  className={`bg-white rounded-2xl p-4 border shadow-sm space-y-3 transition-all ${
                    status === 'PRESENT'
                      ? 'border-emerald-200/90'
                      : status === 'ABSENT'
                      ? 'border-rose-200/90 bg-rose-50/20'
                      : 'border-amber-200/90 bg-amber-50/20'
                  }`}
                >
                  {/* Cadet Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {stPhoto ? (
                        <img
                          src={stPhoto}
                          alt={st.name}
                          className="w-10 h-10 rounded-xl object-cover border-2 border-red-500/40 shadow-xs flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-800 text-white font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0 border border-red-400/40">
                          {st.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-sm text-gray-900 leading-tight">{st.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-gray-500">{st.admissionNo || st.admission_no}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[10px] font-black text-amber-700">{st.beltRank || st.currentBelt || 'White Belt'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                        status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'ABSENT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* 1-Tap Attendance Segmented Controls (Full Width) */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(stId, 'PRESENT')}
                      className={`py-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                        status === 'PRESENT'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 bg-white/40'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Present
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(stId, 'ABSENT')}
                      className={`py-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                        status === 'ABSENT'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 bg-white/40'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Absent
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(stId, 'LATE')}
                      className={`py-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                        status === 'LATE'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 bg-white/40'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> Late
                    </button>
                  </div>

                  {/* WhatsApp Parent Notice Trigger on Card if Absent or Requested */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
                    <span className="truncate">{st.branch || st.branch_name || 'Pulikkal Branch'}</span>
                    <button
                      type="button"
                      onClick={() => sendCadetWhatsApp(st)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer flex-shrink-0"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp Parent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 DESKTOP VIEW: Full Comprehensive Table (Visible on Desktop Screens) */}
          <div className="hidden md:block bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 text-[11px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200/80">
                    <th className="py-3 px-4">Cadet Student</th>
                    <th className="py-3 px-4">Admission No</th>
                    <th className="py-3 px-4">Belt Rank</th>
                    <th className="py-3 px-4">Branch & Shift</th>
                    <th className="py-3 px-4 text-center">Attendance Status</th>
                    <th className="py-3 px-4 text-right">Quick Notice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium">
                  {filteredStudents.map((st) => {
                    const stId = st.id || st.admissionNo;
                    const status = attendanceRecords[stId] || 'PRESENT';
                    const stPhoto = st.photo || st.photoUrl || st.avatar || st.profile_photo || st.profileImage || st.image || st.img;

                    return (
                      <tr key={stId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2.5">
                          {stPhoto ? (
                            <img
                              src={stPhoto}
                              alt={st.name}
                              className="w-9 h-9 rounded-full object-cover border-2 border-red-500/30 shadow-xs flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-rose-800 text-white font-black flex items-center justify-center text-xs shadow-xs flex-shrink-0 border border-red-400/30">
                              {st.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                          )}
                          <span>{st.name}</span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-gray-600">
                          {st.admissionNo || st.admission_no}
                        </td>

                        <td className="py-3 px-4 font-bold text-amber-700">
                          {st.beltRank || st.currentBelt || st.current_belt || 'White Belt'}
                        </td>

                        <td className="py-3 px-4 text-gray-600 font-bold">
                          {st.branch || st.branch_name || 'Pulikkal Branch'}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(stId, 'PRESENT')}
                              className={`px-3 py-1 rounded-lg font-black text-[11px] transition cursor-pointer flex items-center gap-1 ${
                                status === 'PRESENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              <Check className="w-3 h-3" /> Present
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(stId, 'ABSENT')}
                              className={`px-3 py-1 rounded-lg font-black text-[11px] transition cursor-pointer flex items-center gap-1 ${
                                status === 'ABSENT' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              <X className="w-3 h-3" /> Absent
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(stId, 'LATE')}
                              className={`px-3 py-1 rounded-lg font-black text-[11px] transition cursor-pointer flex items-center gap-1 ${
                                status === 'LATE' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              <Clock className="w-3 h-3" /> Late
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => sendCadetWhatsApp(st)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ml-auto"
                            title="Send WhatsApp Notice to Parent"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Notice
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* BULK ABSENTEE WHATSAPP MODAL */}
      {showAbsentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowAbsentModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Bulk WhatsApp Absentee Alerts</h3>
                <p className="text-xs text-gray-500 font-medium">Send instant attendance WhatsApp notices to parents of absent cadets.</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-gray-600">Total Absent Cadets:</span>
                <span className="text-rose-600 font-black">{absentStudentsList.length} Cadets</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-gray-600">Notices Dispatched:</span>
                <span className="text-emerald-600 font-black">{sentAbsentStudentIds.length} / {absentStudentsList.length}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowAbsentModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={handleSendNextAbsent}
                disabled={absentQueueIndex >= absentStudentsList.length}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4" /> Send Next Notice ({absentQueueIndex + 1}/{absentStudentsList.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📲 BRANCH ATTENDANCE REPORT SHARE MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 space-y-3.5 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Branch Attendance Report</h3>
                <p className="text-xs text-gray-500 font-medium">WhatsApp-ready report with student names & absentee list.</p>
              </div>
            </div>

            {/* Branch & Batch Switcher inside Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-shrink-0 bg-gray-50 p-2.5 rounded-2xl border border-gray-200/70">
              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider block mb-1">📍 Dojo Branch</label>
                <select
                  value={reportBranch}
                  onChange={(e) => {
                    setReportBranch(e.target.value);
                    setReportShift('All');
                  }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer truncate"
                >
                  <option value="All">All Branches (Global)</option>
                  {branchesList.map(b => (
                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider block mb-1">⏰ Batch / Shift</label>
                <select
                  value={reportShift}
                  onChange={(e) => setReportShift(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer truncate"
                >
                  <option value="All">All Batches</option>
                  {getDynamicShiftOptions(reportBranch !== 'All' ? reportBranch : null, null, branchesList).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Report Format Tabs */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl flex-shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setReportFormat('full')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center ${
                  reportFormat === 'full' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                👥 Full (Present & Absent)
              </button>
              <button
                type="button"
                onClick={() => setReportFormat('absentees_only')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center ${
                  reportFormat === 'absentees_only' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ❌ Absentees Only
              </button>
              <button
                type="button"
                onClick={() => setReportFormat('rollcall')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition cursor-pointer text-center ${
                  reportFormat === 'rollcall' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Roll Call Register
              </button>
            </div>

            {/* Formatted Report Preview Box */}
            <div className="bg-gray-900 rounded-2xl p-4 text-emerald-300 font-mono text-xs whitespace-pre-wrap flex-1 overflow-y-auto border border-gray-800 shadow-inner min-h-[170px] select-all">
              {generateWhatsAppAttendanceReport(reportBranch, reportShift, reportFormat)}
            </div>

            {/* Actions Footer */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
              <span className="text-[11px] text-gray-500 font-medium">
                Total in report: <strong className="text-gray-800">{students.filter(s => (reportBranch === 'All' || isStudentInBranch(s, reportBranch)) && (reportShift === 'All' || matchesShift(s, reportShift))).length}</strong> Cadets
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyReport(reportBranch, reportShift, reportFormat)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copyFeedback ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                  <span>{copyFeedback ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareReportWhatsApp(reportBranch, reportShift, reportFormat)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
