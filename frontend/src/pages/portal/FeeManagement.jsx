import React, { useState, useEffect } from 'react';
import { CreditCard, Search, DollarSign, Printer, CheckCircle2, FileText, X, AlertCircle, MessageSquare, Calendar, Filter, CheckSquare, Square, Send, Check, Zap, ExternalLink, Clock, Settings } from 'lucide-react';
import { fetchStudents, getStoredStudents, saveStoredStudents, updateStudent, getGlobalFeeSettings, isMonthOnOrAfterEffective, saveFeePaymentBackend, openWhatsApp, getPreferredWhatsAppChannel, setPreferredWhatsAppChannel, fetchBranches } from '../../services/api';
import { ACADEMY_INFO, SHIFT_OPTIONS, getDynamicShiftOptions, INITIAL_BRANCHES } from '../../services/initialData';
import { useAuth } from '../../context/AuthContext';

const MONTHS_LIST = [
  'September',
  'August',
  'July',
  'June',
  'May',
  'April',
  'March',
  'February',
  'January',
  'October',
  'November',
  'December'
];

export default function FeeManagement() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';

  const [fees, setFees] = useState([]);
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

  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('September');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedShift, setSelectedShift] = useState('All');
  const [selectedBillingPlan, setSelectedBillingPlan] = useState('All'); // 'All' | 'MONTHLY' | 'QUARTERLY'
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);

  const [activeReceipt, setActiveReceipt] = useState(null);
  const [paymentModalFee, setPaymentModalFee] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('MONTHLY'); // 'MONTHLY' | 'ADMISSION' | 'BOTH'

  // Bulk WhatsApp Dispatcher Queue State
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sentFeeIds, setSentFeeIds] = useState([]);

  // Format phone number for WhatsApp
  const formatWhatsAppPhone = (phoneStr) => {
    let clean = (phoneStr || '').replace(/[^0-9]/g, '');
    if (!clean) return '919544085442';
    if (clean.length === 10) return '91' + clean;
    if (clean.startsWith('0')) return '91' + clean.slice(1);
    return clean;
  };

  const getPendingDuesAmount = (f) => {
    const totalFee = parseFloat(f.amount ?? f.student_detail?.feeAmount ?? f.student_detail?.fee_amount ?? 500);
    const paid = parseFloat(f.paid_amount ?? f.paidAmount ?? f.student_detail?.initialPaidAmount ?? 0);
    return Math.max(0, totalFee - paid);
  };

  const getAdmissionPendingAmount = (f) => {
    const std = f.student_detail || {};
    const admFee = parseFloat(std.admissionFee ?? std.admission_fee ?? 1000);
    if (admFee === 0 || std.admissionFeePaid === true || std.admission_fee_paid === true) return 0;
    const admPaid = parseFloat(std.admissionFeePaidAmount ?? std.admission_fee_paid_amount ?? (std.admissionFeePaid || std.admission_fee_paid ? admFee : 0));
    return Math.max(0, admFee - admPaid);
  };

  const getFeeRecordStatus = (f) => {
    const pendingVal = getPendingDuesAmount(f);
    const paid = parseFloat(f.paid_amount ?? f.paidAmount ?? f.student_detail?.initialPaidAmount ?? 0);
    if (pendingVal === 0) return 'Paid';
    if (paid > 0) return 'Partial';
    return 'Pending';
  };

  // Build 100% Dynamic Fee Invoices directly from Student Management Roster & Global Fee Settings
  useEffect(() => {
    const loadDynamicFees = () => {
      const activeMonth = selectedMonth === 'All' ? 'September' : selectedMonth;

      fetchStudents().then(stdList => {
        const cadets = stdList || getStoredStudents();
        const defaultSchoolRate = parseInt(globalSettings.defaultSchoolBatchFee) || 1200;
        const defaultMonthlyRate = parseInt(globalSettings.defaultMonthlyFee) || 500;
        const defaultAdmSetting = parseInt(globalSettings.defaultAdmissionFee);
        const isAcademyAdmFree = defaultAdmSetting === 0;

        const dynamicFees = cadets.map(s => {
          const cadetFreq = String(s.fee_frequency || s.feeFrequency || '').toUpperCase();
          const isQuarterly = (
            cadetFreq === 'QUARTERLY' || 
            cadetFreq === '3_MONTHS' || 
            cadetFreq === 'SCHOOL_BATCH' || 
            s.billingPlan === 'SCHOOL_BATCH' || 
            s.billing_plan === 'SCHOOL_BATCH' || 
            s.feeCycleMonths === 3 || 
            (s.shift && s.shift.toLowerCase().includes('school'))
          );

          const isNewRate = isMonthOnOrAfterEffective(activeMonth, 2026, effMonth, effYear);
          const applicableDefault = isQuarterly ? defaultSchoolRate : defaultMonthlyRate;
          const studentCustomRate = parseInt(s.fee_amount ?? s.feeAmount ?? 0);
          const feeAmt = studentCustomRate > 0 ? studentCustomRate : applicableDefault;

          const paidMonthsList = Array.isArray(s.paid_months) ? s.paid_months : (Array.isArray(s.paidMonths) ? s.paidMonths : []);
          const initialPaid = parseInt(s.initialPaidAmount ?? s.initial_paid_amount ?? 0);

          // Check if active month (e.g. 'September') is explicitly in paid_months
          const isMonthPaidInList = paidMonthsList.some(m => m.toLowerCase().includes(activeMonth.toLowerCase()));

          // For the baseline kickoff month (August 2026): initial paid covers August
          const isAugustCovered = (activeMonth.toLowerCase() === 'august' && initialPaid >= feeAmt);

          // For quarterly (School Batch): covers 3 months (August, September, October) if school fee paid
          const isQuarterlyCovered = isQuarterly && (isMonthPaidInList || (initialPaid >= feeAmt && ['august', 'september', 'october'].includes(activeMonth.toLowerCase())));

          const isFullyPaidForMonth = isMonthPaidInList || isAugustCovered || isQuarterlyCovered;

          const paidAmtForMonth = isFullyPaidForMonth ? feeAmt : (activeMonth.toLowerCase() === 'august' ? initialPaid : 0);
          const pendingAmtForMonth = isFullyPaidForMonth ? 0 : Math.max(0, feeAmt - paidAmtForMonth);

          const calculatedStatus = isFullyPaidForMonth ? 'Paid' : (paidAmtForMonth > 0 ? 'Partial' : 'Pending');

          const rawAdmFee = s.admissionFee !== undefined ? parseInt(s.admissionFee) : (s.admission_fee !== undefined ? parseInt(s.admission_fee) : defaultAdmSetting);
          const admFee = isAcademyAdmFree ? 0 : (isNaN(rawAdmFee) ? 1000 : rawAdmFee);
          const admPaid = parseInt(s.admissionFeePaidAmount ?? s.admission_fee_paid_amount ?? (admFee === 0 || s.admissionFeePaid || s.admission_fee_paid ? admFee : 0));
          const admPending = (admFee === 0 || s.admissionFeePaid === true || s.admission_fee_paid === true) ? 0 : Math.max(0, admFee - admPaid);

          return {
            id: `fee-${s.id || s.admissionNo || s.admission_no}`,
            student: s.id,
            student_detail: {
              ...s,
              admissionFee: admFee,
              admissionFeePaid: admPending === 0,
              admissionFeePaidAmount: admPaid,
              admissionFeePending: admPending,
              feeAmount: feeAmt
            },
            billing_plan: isQuarterly ? 'QUARTERLY' : 'MONTHLY',
            is_quarterly: isQuarterly,
            month: activeMonth,
            year: 2026,
            amount: feeAmt,
            paid_amount: paidAmtForMonth,
            pending_amount: pendingAmtForMonth,
            admission_pending: admPending,
            status: calculatedStatus,
            receipt_no: `REC-${s.admissionNo || s.admission_no || 'BAMA-2026'}`
          };
        });

        setFees(dynamicFees);
      });
    };

    loadDynamicFees();

    window.addEventListener('bama_fee_settings_updated', loadDynamicFees);
    window.addEventListener('bama_data_updated', loadDynamicFees);
    return () => {
      window.removeEventListener('bama_fee_settings_updated', loadDynamicFees);
      window.removeEventListener('bama_data_updated', loadDynamicFees);
    };
  }, [selectedMonth]);

  const handleRecordPaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentModalFee) return;

    const paidVal = parseFloat(paymentAmount);
    if (isNaN(paidVal) || paidVal <= 0) return;

    let updatedFeeObj = null;

    if (paymentType === 'ADMISSION') {
      // Record Admission Fee Payment
      const admTotal = paymentModalFee.student_detail?.admissionFee !== undefined 
        ? parseFloat(paymentModalFee.student_detail?.admissionFee) 
        : (paymentModalFee.student_detail?.admission_fee !== undefined ? parseFloat(paymentModalFee.student_detail?.admission_fee) : 1000);
      const currentAdmPaid = parseFloat(paymentModalFee.student_detail?.admissionFeePaidAmount || 0);
      const newAdmPaid = currentAdmPaid + paidVal;
      const newAdmPending = Math.max(0, admTotal - newAdmPaid);
      const isAdmPaid = newAdmPending === 0;

      const updatedFees = fees.map(f => {
        if (f.id === paymentModalFee.id) {
          updatedFeeObj = {
            ...f,
            admission_pending: newAdmPending,
            receipt_no: f.receipt_no || `REC-ADM-${f.student_detail?.admissionNo || '001'}`,
            student_detail: {
              ...f.student_detail,
              admissionFeePaid: isAdmPaid,
              admission_fee_paid: isAdmPaid,
              admissionFeePaidAmount: newAdmPaid,
              admission_fee_paid_amount: newAdmPaid,
              admissionFeePending: newAdmPending
            }
          };
          return updatedFeeObj;
        }
        return f;
      });

      setFees(updatedFees);

      try {
        const storedStudents = getStoredStudents();
        const targetId = paymentModalFee.student_detail?.id || paymentModalFee.student;
        const updatedStudents = storedStudents.map(s => {
          if (s.id === targetId || s.admissionNo === paymentModalFee.student_detail?.admissionNo) {
            return {
              ...s,
              admissionFeePaid: isAdmPaid,
              admission_fee_paid: isAdmPaid,
              admissionFeePaidAmount: newAdmPaid,
              admission_fee_paid_amount: newAdmPaid
            };
          }
          return s;
        });
        saveStoredStudents(updatedStudents);

        if (targetId) {
          updateStudent(targetId, {
            admission_fee_paid: isAdmPaid,
            admissionFeePaid: isAdmPaid,
            admission_fee_paid_amount: newAdmPaid
          }).catch(() => {});
        }
      } catch (err) {}
    } else {
      // Record Monthly Fee Payment
      const currentPaid = parseFloat(paymentModalFee.paid_amount || 0);
      const totalFee = parseFloat(paymentModalFee.amount || 500);
      const newTotalPaid = currentPaid + paidVal;
      const newPending = Math.max(0, totalFee - newTotalPaid);
      const newStatus = newPending === 0 ? 'Paid' : newTotalPaid > 0 ? 'Partial' : 'Pending';

      const updatedFees = fees.map(f => {
        if (f.id === paymentModalFee.id) {
          updatedFeeObj = {
            ...f,
            paid_amount: newTotalPaid,
            pending_amount: newPending,
            status: newStatus,
            student_detail: {
              ...f.student_detail,
              initialPaidAmount: newTotalPaid,
              initial_paid_amount: newTotalPaid,
              pendingAmount: newPending,
              pending_amount: newPending,
              feeStatus: newStatus,
              fee_status: newStatus
            }
          };
          return updatedFeeObj;
        }
        return f;
      });

      setFees(updatedFees);

      // Sync under LocalStorage & API
      try {
        const storedStudents = getStoredStudents();
        const targetId = paymentModalFee.student_detail?.id || paymentModalFee.student;
        const isQuarterly = paymentModalFee.is_quarterly || String(paymentModalFee.student_detail?.fee_frequency || paymentModalFee.student_detail?.feeFrequency).toUpperCase() === 'QUARTERLY';
        
        const currentPaidMonths = Array.isArray(paymentModalFee.student_detail?.paid_months) 
          ? paymentModalFee.student_detail.paid_months 
          : (Array.isArray(paymentModalFee.student_detail?.paidMonths) ? paymentModalFee.student_detail.paidMonths : []);

        const newPaidMonths = isQuarterly
          ? Array.from(new Set([...currentPaidMonths, 'August 2026', 'September 2026', 'October 2026']))
          : Array.from(new Set([...currentPaidMonths, `${paymentModalFee.month || 'August'} 2026`]));

        const updatedStudents = storedStudents.map(s => {
          if (s.id === targetId || s.admissionNo === paymentModalFee.student_detail?.admissionNo) {
            const newPaid = (parseFloat(s.initialPaidAmount || 0)) + paidVal;
            const totalFee = parseFloat(s.feeAmount || 500);
            const newPending = Math.max(0, totalFee - newPaid);
            const newStatus = newPending === 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';

            return {
              ...s,
              paid_months: newPaidMonths,
              paidMonths: newPaidMonths,
              initialPaidAmount: newPaid,
              initial_paid_amount: newPaid,
              pendingAmount: newPending,
              pending_amount: newPending,
              feeStatus: newStatus,
              fee_status: newStatus
            };
          }
          return s;
        });
        saveStoredStudents(updatedStudents);

        if (targetId) {
          updateStudent(targetId, {
            initial_paid_amount: updatedFeeObj?.paid_amount,
            pending_amount: updatedFeeObj?.pending_amount,
            fee_status: updatedFeeObj?.status,
            paid_months: newPaidMonths
          }).catch(() => {});
        }

        if (updatedFeeObj) {
          saveFeePaymentBackend(updatedFeeObj).catch(() => {});
        }
      } catch (err) {}
    }

    if (updatedFeeObj) {
      setActiveReceipt(updatedFeeObj);
    }

    setPaymentModalFee(null);
    setPaymentAmount('');
  };

  const sendFeeWhatsAppReminder = (fee) => {
    const std = fee.student_detail || {};
    const totalAmt = fee.amount || std.feeAmount || std.fee_amount || 500;
    const pendingAmt = getPendingDuesAmount(fee);
    const admPendingAmt = getAdmissionPendingAmount(fee);
    const parentName = std.guardianName || std.guardian_name || 'Parent';
    const cadetName = std.name || std.student_name || 'Cadet';
    const activeMonthName = fee.month || selectedMonth === 'All' ? 'September' : selectedMonth;
    const isAdmFree = (std.admissionFee === 0 || std.admission_fee === 0 || String(std.admissionFee) === '0' || String(std.admission_fee) === '0');

    let text = '';
    if (pendingAmt === 0 && admPendingAmt === 0) {
      // 🧾 OFFICIAL PAYMENT RECEIPT / ACKNOWLEDGMENT (When already Paid!)
      text = 
        `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
        `🧾 *OFFICIAL PAYMENT RECEIPT / ഫീസ് രസീത്*\n` +
        `Receipt No: *${fee.receipt_no || `REC-${std.admissionNo || std.admission_no || '001'}`}*\n` +
        `Cadet Name: *${cadetName}* (${std.admissionNo || std.admission_no || ''})\n` +
        `Branch Dojo: *${std.branch || 'Head Office Dojo'}*\n` +
        `Course: *${std.program || std.course || 'Karate (Shotokan)'}*\n` +
        `Shift: *${std.shift || 'Evening Batch'}*\n` +
        `Month: *${activeMonthName} ${fee.year || 2026}*\n` +
        `----------------------------------------\n` +
        `Total Paid: *₹${totalAmt}* (✅ FULLY PAID)\n` +
        `Payment Status: *CLEARED / PAID*\n` +
        `Remaining Dues: *₹0*\n` +
        `----------------------------------------\n\n` +
        `Dear Parent (${parentName}), we have successfully received and recorded the fee payment. Thank you for your continued support! OSS 🥋`;
    } else if (selectedStatus === 'AdmissionPending' || (admPendingAmt > 0 && pendingAmt === 0)) {
      text = 
        `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
        `📌 *OFFICIAL ADMISSION / REGISTRATION FEE NOTICE*\n` +
        `Cadet Name: *${cadetName}* (${std.admissionNo || std.admission_no || ''})\n` +
        `Branch Dojo: *${std.branch || 'Head Office Dojo'}*\n` +
        `Shift: *${std.shift || 'Evening Batch'}*\n` +
        `Admission Fee: *${isAdmFree ? '🎁 FREE / WAIVED (₹0)' : `₹${std.admissionFee || 1000}`}*\n` +
        (isAdmFree ? '' : `Admission Fee Dues: *₹${admPendingAmt}*\n\n`) +
        `Dear Parent (${parentName}), kindly settle the pending admission/registration fee at the academy office or via GooglePay to +91 95440 85442. Thank you! OSS 🥋`;
    } else {
      text = 
        `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
        `📌 *OFFICIAL MONTHLY FEE REMINDER*\n` +
        `Cadet Name: *${cadetName}* (${std.admissionNo || std.admission_no || ''})\n` +
        `Shift: *${std.shift || 'Evening Batch'}*\n` +
        `Month: *${activeMonthName} ${fee.year || 2026}*\n` +
        `Total Monthly Fee: *₹${totalAmt}*\n` +
        `Pending Monthly Dues: *₹${pendingAmt}*` +
        (!isAdmFree && admPendingAmt > 0 ? `\nAdmission Fee Dues: *₹${admPendingAmt}*` : isAdmFree ? `\nAdmission Fee: *🎁 FREE / WAIVED*` : '') +
        `\n\nDear Parent (${parentName}), kindly settle the fee dues at office or via GooglePay to +91 95440 85442. Thank you! OSS 🥋`;
    }

    setSentFeeIds(prev => Array.from(new Set([...prev, fee.id])));
    openWhatsApp({
      phone: std.whatsapp || std.phone,
      message: text
    });
  };

  // Toggle selection for individual fee row
  const toggleFeeSelect = (id) => {
    setSelectedFeeIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select / Deselect all visible pending fee rows
  const toggleSelectAllPending = () => {
    const pendingIds = filteredFees.filter(f => getPendingDuesAmount(f) > 0).map(f => f.id);
    const allSelected = pendingIds.length > 0 && pendingIds.every(id => selectedFeeIds.includes(id));

    if (allSelected) {
      setSelectedFeeIds(prev => prev.filter(id => !pendingIds.includes(id)));
    } else {
      setSelectedFeeIds(prev => Array.from(new Set([...prev, ...pendingIds])));
    }
  };

  // Get selected fee objects for bulk dispatching
  const selectedFeesQueue = fees.filter(f => selectedFeeIds.includes(f.id));

  // Handle single item dispatch in queue and AUTOMATICALLY STEP to next student!
  const handleQueueSendNext = () => {
    if (queueIndex >= selectedFeesQueue.length) return;
    const currentFee = selectedFeesQueue[queueIndex];
    sendFeeWhatsAppReminder(currentFee);
    
    // Automatic step to next student in queue!
    setQueueIndex(prev => prev + 1);
  };

  // Filter Fees with 100% Precision
  const filteredFees = fees.filter(f => {
    const std = f.student_detail || {};
    const getCadetBranchKey = (cadet) => {
      const rawBranch = cadet.branch_name || cadet.branch_detail?.name || cadet.branchName || (typeof cadet.branch === 'object' ? cadet.branch?.name : cadet.branch) || '';
      const bStr = (String(rawBranch) + ' ' + String(cadet.branch_id || '')).toLowerCase();
      if (bStr.includes('chungam') || bStr.includes('cgm') || bStr.includes('dojo-02') || bStr.includes('20c924cd')) return 'chungam';
      if (bStr.includes('mongam') || bStr.includes('dojo-03') || bStr.includes('d4639193')) return 'mongam';
      if (bStr.includes('feroke') || bStr.includes('dojo-04') || bStr.includes('5f429f1f')) return 'feroke';
      if (bStr.includes('pulikkal') || bStr.includes('plk') || bStr.includes('dojo-01') || bStr.includes('283e0cc2')) return 'pulikkal';
      return rawBranch ? String(rawBranch).toLowerCase().trim() : '';
    };

    const cadetBranchKey = getCadetBranchKey(std);
    let matchesBranch = selectedBranch === 'All';
    if (!matchesBranch) {
      const selStr = String(selectedBranch).toLowerCase().trim();
      if (selStr.includes('pulikkal') || selStr.includes('plk') || selStr.includes('dojo-01') || selStr.includes('283e0cc2')) matchesBranch = (cadetBranchKey === 'pulikkal');
      else if (selStr.includes('chungam') || selStr.includes('cgm') || selStr.includes('dojo-02') || selStr.includes('20c924cd')) matchesBranch = (cadetBranchKey === 'chungam');
      else if (selStr.includes('mongam') || selStr.includes('dojo-03') || selStr.includes('d4639193')) matchesBranch = (cadetBranchKey === 'mongam');
      else if (selStr.includes('feroke') || selStr.includes('dojo-04') || selStr.includes('5f429f1f')) matchesBranch = (cadetBranchKey === 'feroke');
      else {
        const cadetBranchName = String(std.branch_name || std.branch || std.branch_id || '').toLowerCase().trim();
        matchesBranch = (cadetBranchKey === selStr || cadetBranchName.includes(selStr) || selStr.includes(cadetBranchName) || String(std.branch_id) === String(selectedBranch));
      }
    }

    if (isInstructor && selectedBranch === 'All') {
      const instructorBranch = (user?.branch || user?.assigned_branch_id || 'Chungam Branch').toLowerCase();
      matchesBranch = (cadetBranchKey === (instructorBranch.includes('chungam') ? 'chungam' : instructorBranch.includes('mongam') ? 'mongam' : instructorBranch.includes('feroke') ? 'feroke' : 'pulikkal'));
    }

    const matchesSearch = !search || 
                          (std.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (std.admissionNo || std.admission_no || '').toLowerCase().includes(search.toLowerCase()) ||
                          (f.receipt_no || '').toLowerCase().includes(search.toLowerCase()) ||
                          (std.guardianName || std.guardian_name || '').toLowerCase().includes(search.toLowerCase());

    const matchesMonth = selectedMonth === 'All' || f.month === selectedMonth;

    const status = getFeeRecordStatus(f);
    const pendingVal = getPendingDuesAmount(f);
    const admPendingVal = getAdmissionPendingAmount(f);

    let matchesStatus = selectedStatus === 'All';
    if (selectedStatus === 'Pending') matchesStatus = status === 'Pending' || pendingVal > 0;
    if (selectedStatus === 'AdmissionPending') matchesStatus = admPendingVal > 0 || std.admissionFeePaid === false || std.admission_fee_paid === false;
    if (selectedStatus === 'Partial') matchesStatus = status === 'Partial';
    if (selectedStatus === 'Paid') matchesStatus = status === 'Paid' && pendingVal === 0;

    const cadetShift = std.shift || 'Evening Batch (5:00 PM - 7:00 PM)';
    const matchesShift = selectedShift === 'All' || cadetShift.toLowerCase().includes(selectedShift.toLowerCase());

    const isQuarterly = f.is_quarterly || String(std.fee_frequency || std.feeFrequency).toUpperCase() === 'QUARTERLY';
    const matchesPlan = selectedBillingPlan === 'All' || (selectedBillingPlan === 'QUARTERLY' ? isQuarterly : !isQuarterly);

    return matchesSearch && matchesMonth && matchesStatus && matchesShift && matchesBranch && matchesPlan;
  });

  const totalCollected = filteredFees.reduce((acc, f) => {
    const std = f.student_detail || {};
    const paid = parseFloat(f.paid_amount ?? f.paidAmount ?? std.initialPaidAmount ?? 0);
    return acc + (isNaN(paid) ? 0 : paid);
  }, 0);

  const totalPending = filteredFees.reduce((acc, f) => acc + getPendingDuesAmount(f), 0);
  const totalAdmissionPending = filteredFees.reduce((acc, f) => acc + getAdmissionPendingAmount(f), 0);
  const totalAdmissionPendingAll = fees.reduce((acc, f) => acc + getAdmissionPendingAmount(f), 0);
  const admissionPendingCount = fees.filter(f => getAdmissionPendingAmount(f) > 0).length;

  return (
    <div className="space-y-6">
      {/* Sleek Compact Header Banner */}
      <div className="bg-white p-4 sm:px-5 sm:py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 w-full">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 uppercase">
              Financial Management
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono">
              Live Invoices Linked to Roster
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-600 flex-shrink-0" /> Fee Collection & Invoices Control
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">Manage cadet monthly fees, admission dues, record payments, filter by shift batch, and issue printable receipts.</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl shadow-sm w-full md:w-auto">
            <div>
              <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Collected</span>
              <span className="text-sm sm:text-base font-black text-emerald-600 font-mono">₹{totalCollected.toLocaleString()}</span>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Monthly Dues</span>
              <span className="text-sm sm:text-base font-black text-rose-600 font-mono">₹{totalPending.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📅 PROMINENT MONTH-WISE BILLING SELECTOR CONTROL CENTER */}
      <div className="bg-gradient-to-r from-red-950 via-gray-900 to-black p-4 sm:p-5 rounded-3xl border border-red-900/40 shadow-xl space-y-3.5 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 flex-shrink-0 shadow-inner">
              <Calendar className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-800/60">
                  Active Billing Month
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Click any month to view live dues & paid list</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                <span>{selectedMonth === 'All' ? 'All Months Overview' : `${selectedMonth} 2026`}</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  🟢 {fees.filter(f => getPendingDuesAmount(f) === 0).length} Paid • 🔴 {fees.filter(f => getPendingDuesAmount(f) > 0).length} Due
                </span>
              </h2>
            </div>
          </div>

          {/* Direct Dropdown for Any Month */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <label className="text-xs font-bold text-gray-300 whitespace-nowrap">Switch Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-900 border-2 border-red-500/80 text-white font-black text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-red-400 shadow-md"
            >
              <option value="All">All Months (Overview)</option>
              {MONTHS_LIST.map(m => (
                <option key={m} value={m}>{m} 2026</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Clickable Month Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-white/10 scrollbar-none">
          {['August', 'September', 'October', 'November', 'December', 'All'].map(m => {
            const isSel = selectedMonth === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonth(m)}
                className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  isSel
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 ring-2 ring-red-400 scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{m === 'All' ? 'All Months' : `${m} 2026`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Invoices */}
        <div
          onClick={() => setSelectedStatus('All')}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
            selectedStatus === 'All'
              ? 'bg-red-50/50 border-red-300 ring-2 ring-red-300/30 shadow-md'
              : 'bg-white border-gray-200/90 shadow-sm hover:shadow-md hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL INVOICES</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-black">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <strong className="text-xl font-black text-gray-900 leading-none block mt-1.5">{filteredFees.length}</strong>
        </div>

        {/* Card 2: Total Collected */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">COLLECTED</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <strong className="text-xl font-black text-emerald-600 leading-none block mt-1.5 font-mono">₹{totalCollected.toLocaleString()}</strong>
        </div>

        {/* Card 3: Monthly Dues */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Pending' ? 'All' : 'Pending')}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
            selectedStatus === 'Pending'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-300/30 shadow-md'
              : 'bg-white border-gray-200/90 shadow-sm hover:shadow-md hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">MONTHLY DUES</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-black">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <strong className="text-xl font-black text-rose-600 leading-none block mt-1.5 font-mono">₹{totalPending.toLocaleString()}</strong>
        </div>

        {/* Card 4: Admission Fees Pending (Direct Filter Button) */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'AdmissionPending' ? 'All' : 'AdmissionPending')}
          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden ${
            selectedStatus === 'AdmissionPending'
              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40 shadow-lg'
              : 'bg-white border-amber-200 shadow-sm hover:shadow-md hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedStatus === 'AdmissionPending' ? 'text-amber-100' : 'text-amber-700'}`}>
              🎟️ ADMISSION DUES
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedStatus === 'AdmissionPending' ? 'bg-white text-amber-900' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
              {admissionPendingCount} Cadets
            </span>
          </div>
          <strong className={`text-xl font-black leading-none block mt-1.5 font-mono ${selectedStatus === 'AdmissionPending' ? 'text-white' : 'text-amber-800'}`}>
            ₹{totalAdmissionPendingAll.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* Sleek Search & Filter Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3 text-xs w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search cadet, receipt no, parent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition shadow-2xs font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 w-full sm:w-auto">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 font-bold text-gray-700 bg-amber-50/80 border border-amber-300/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-transparent text-xs text-amber-950 font-black focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Months</option>
                {MONTHS_LIST.map(m => (
                  <option key={m} value={m}>{m} 2026</option>
                ))}
              </select>
            </div>

            {/* Branch Dojo Filter */}
            <div className="flex items-center gap-1.5 font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-transparent text-xs text-gray-900 font-bold focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Branches</option>
                {branchesList.map(b => (
                  <option key={b.id || b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Shift Batch Filter */}
            <div className="flex items-center gap-1.5 font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Clock className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full bg-transparent text-xs text-gray-900 font-bold focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Shifts</option>
                {getDynamicShiftOptions().map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Billing Plan Filter */}
            <div className="flex items-center gap-1.5 font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <select
                value={selectedBillingPlan}
                onChange={(e) => setSelectedBillingPlan(e.target.value)}
                className="w-full bg-transparent text-xs text-gray-900 font-bold focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Billing Plans</option>
                <option value="MONTHLY">🥋 Regular Dojo (Monthly)</option>
                <option value="QUARTERLY">🏫 School Batch (3-Month)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-transparent text-xs text-gray-900 font-bold focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Invoices ({fees.length})</option>
                <option value="Pending">Monthly Dues Only</option>
                <option value="AdmissionPending">🎟️ Admission Dues Only ({admissionPendingCount})</option>
                <option value="Partial">Partial Paid Only</option>
                <option value="Paid">Fully Paid Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Filter Status Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'All', label: 'All Invoices', count: fees.length },
            { id: 'Pending', label: 'Monthly Dues', count: fees.filter(f => getPendingDuesAmount(f) > 0).length, color: 'text-rose-700' },
            { id: 'AdmissionPending', label: '🎟️ Admission Dues Pending', count: admissionPendingCount, color: 'text-amber-800 font-black' },
            { id: 'Paid', label: 'Fully Paid', count: fees.filter(f => getPendingDuesAmount(f) === 0).length, color: 'text-emerald-700' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                selectedStatus === tab.id
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedStatus === tab.id ? 'bg-white/20 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAllPending}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-gray-200 shadow-2xs whitespace-nowrap"
            >
              <CheckSquare className="w-3.5 h-3.5 text-red-600" /> Select Dues ({filteredFees.filter(f => getPendingDuesAmount(f) > 0 || getAdmissionPendingAmount(f) > 0).length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={selectedFeeIds.length === 0}
              onClick={() => {
                setQueueIndex(0);
                setShowBulkWhatsAppModal(true);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm ${
                selectedFeeIds.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> 🚀 Auto Loop WA Queue ({selectedFeeIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE VIEW: Ultra-Premium Touch-Friendly Fee Cards (Visible on Mobile Screens) */}
      <div className="block md:hidden space-y-3.5">
        {filteredFees.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-gray-200 shadow-sm">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <h4 className="font-black text-gray-800 text-sm">No Invoices Found</h4>
            <p className="text-xs text-gray-400">Try adjusting search or branch/shift/status filters.</p>
          </div>
        ) : (
          filteredFees.map((fee) => {
            const std = fee.student_detail || {};
            const pendingAmt = getPendingDuesAmount(fee);
            const admPendingAmt = getAdmissionPendingAmount(fee);
            const paidAmt = fee.paid_amount ?? fee.paidAmount ?? std.initialPaidAmount ?? 0;
            const status = getFeeRecordStatus(fee);
            const isSelected = selectedFeeIds.includes(fee.id);
            const stPhoto = std.photo || std.photoUrl || std.avatar || std.profile_photo || std.profileImage || std.image || std.img;
            const receiptNo = fee.receipt_no || `REC-${std.admissionNo || std.admission_no || '001'}`;

            return (
              <div
                key={`mob-fee-${fee.id}`}
                className={`bg-white rounded-3xl p-4.5 sm:p-5 border shadow-md space-y-3.5 relative overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20 shadow-amber-100'
                    : admPendingAmt > 0
                    ? 'border-amber-300 shadow-amber-50 hover:border-amber-400'
                    : status === 'Paid'
                    ? 'border-gray-200/90 shadow-gray-100/80 hover:border-emerald-300'
                    : 'border-rose-200/90 shadow-rose-100/50 hover:border-rose-400'
                }`}
              >
                {/* Status Glow Bar Accent on Top */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    admPendingAmt > 0
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600'
                      : status === 'Paid'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
                      : 'bg-gradient-to-r from-rose-500 via-amber-500 to-red-600'
                  }`}
                />

                {/* Card Header: Checkbox + Avatar + Name + Status Pill */}
                <div className="flex items-start justify-between gap-2.5 pt-0.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFeeSelect(fee.id)}
                      className="w-4.5 h-4.5 accent-red-600 rounded-md cursor-pointer flex-shrink-0"
                    />

                    {stPhoto ? (
                      <img
                        src={stPhoto}
                        alt={std.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-red-500/30 shadow-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white font-black flex items-center justify-center text-base shadow-md flex-shrink-0 border border-red-400/40">
                        {std.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <h4 className="font-black text-sm text-gray-900 leading-snug">
                        {std.name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-[10px] text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300 shadow-2xs">
                          {receiptNo}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500">
                          • {fee.month || 'August 2026'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges Stack */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1 shadow-xs ${
                        status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status === 'Paid' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {status === 'Paid' ? 'PAID' : `DUE ₹${pendingAmt}`}
                    </span>

                    {admPendingAmt > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-2xs">
                        🎟️ ADM DUE ₹{admPendingAmt}
                      </span>
                    )}
                  </div>
                </div>

                {/* Admission Fee Status Strip if Pending */}
                {admPendingAmt > 0 && (
                  <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-2.5 flex items-center justify-between text-xs text-amber-900">
                    <span className="font-bold flex items-center gap-1">
                      <span>🎟️ Admission / Registration Fee:</span>
                    </span>
                    <strong className="font-mono font-black text-rose-700">
                      ₹{admPendingAmt} Pending Dues
                    </strong>
                  </div>
                )}

                {/* Financial Summary Dual Box */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-2.5 text-center shadow-2xs">
                    <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block">
                      Paid Monthly
                    </span>
                    <strong className="text-base font-black text-emerald-700 font-mono block mt-0.5">
                      ₹{paidAmt.toLocaleString()}
                    </strong>
                  </div>

                  <div
                    className={`${
                      pendingAmt > 0
                        ? 'bg-rose-50/80 border-rose-200/90'
                        : 'bg-gray-50 border-gray-200'
                    } border rounded-2xl p-2.5 text-center shadow-2xs`}
                  >
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider block ${
                        pendingAmt > 0 ? 'text-rose-700' : 'text-gray-500'
                      }`}
                    >
                      Monthly Pending
                    </span>
                    <strong
                      className={`text-base font-black font-mono block mt-0.5 ${
                        pendingAmt > 0 ? 'text-rose-600' : 'text-gray-700'
                      }`}
                    >
                      ₹{pendingAmt.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Shift & Parent Metadata Strip */}
                <div className="bg-gray-50/90 p-2.5 rounded-2xl border border-gray-200/80 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-gray-700 font-bold">
                    <span className="flex items-center gap-1.5 truncate">
                      <Clock className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                      <span className="truncate">{std.shift || 'Evening Batch (5:00 PM - 7:00 PM)'}</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono flex-shrink-0 ml-1">
                      {std.branch ? (std.branch.includes('(') ? std.branch.split('(')[0] : std.branch) : 'Pulikkal'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/60 font-medium">
                    <span className="truncate">👤 Parent: {std.guardianName || std.guardian_name || 'Guardian'}</span>
                    <span className="font-mono font-bold text-gray-700 flex-shrink-0 ml-1">
                      {std.phone || '+91 95440 85442'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => {
                      setPaymentModalFee(fee);
                      if (admPendingAmt > 0 && pendingAmt === 0) {
                        setPaymentType('ADMISSION');
                        setPaymentAmount(String(admPendingAmt));
                      } else {
                        setPaymentType('MONTHLY');
                        setPaymentAmount(pendingAmt > 0 ? String(pendingAmt) : '500');
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-2xl font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${
                      admPendingAmt > 0
                        ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-amber-600/30'
                        : status === 'Paid'
                        ? 'bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 text-white shadow-gray-900/20'
                        : 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>
                      {admPendingAmt > 0
                        ? `Pay Dues (Adm: ₹${admPendingAmt})`
                        : status === 'Paid'
                        ? 'Record Extra / Advance'
                        : `Record Pay (₹${pendingAmt})`}
                    </span>
                  </button>

                  <button
                    onClick={() => sendFeeWhatsAppReminder(fee)}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-2xl transition cursor-pointer shadow-sm flex items-center justify-center flex-shrink-0"
                    title="Send WhatsApp Notice / Receipt"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveReceipt(fee)}
                    className="p-2.5 bg-gray-100 hover:bg-gray-900 text-gray-700 hover:text-white border border-gray-200 rounded-2xl transition cursor-pointer shadow-sm flex items-center justify-center flex-shrink-0"
                    title="Print Official Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 💻 DESKTOP VIEW: Fee Invoices Register Table (Visible on Desktop Screens) */}
      <div className="hidden md:block bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100/90 text-gray-800 font-black text-[11px] uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-4 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredFees.filter(f => getPendingDuesAmount(f) > 0 || getAdmissionPendingAmount(f) > 0).length > 0 &&
                      filteredFees.filter(f => getPendingDuesAmount(f) > 0 || getAdmissionPendingAmount(f) > 0).every(f => selectedFeeIds.includes(f.id))
                    }
                    onChange={toggleSelectAllPending}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                </th>
                <th className="py-4 px-5">Receipt No</th>
                <th className="py-4 px-5">Cadet Name</th>
                <th className="py-4 px-5">Shift Batch</th>
                <th className="py-4 px-5">Month</th>
                <th className="py-4 px-5">Monthly Paid / Due</th>
                <th className="py-4 px-5">Admission Dues</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredFees.map((fee) => {
                const std = fee.student_detail || {};
                const pendingAmt = getPendingDuesAmount(fee);
                const admPendingAmt = getAdmissionPendingAmount(fee);
                const paidAmt = fee.paid_amount ?? fee.paidAmount ?? std.initialPaidAmount ?? 0;
                const status = getFeeRecordStatus(fee);
                const isSelected = selectedFeeIds.includes(fee.id);
                const stPhoto = std.photo || std.photoUrl || std.avatar || std.profile_photo || std.profileImage || std.image || std.img;

                return (
                  <tr
                    key={fee.id}
                    className={`transition-all duration-150 group ${
                      isSelected ? 'bg-amber-50/70' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFeeSelect(fee.id)}
                        className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-mono font-black text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        {fee.receipt_no || `REC-${std.admissionNo || std.admission_no}`}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        {stPhoto ? (
                          <img
                            src={stPhoto}
                            alt={std.name}
                            className="w-8 h-8 rounded-full object-cover border border-red-500/30 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-rose-800 text-white font-black flex items-center justify-center text-xs flex-shrink-0">
                            {std.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-gray-900 font-black text-sm block leading-tight">{std.name}</strong>
                            {fee.is_quarterly ? (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-black">
                                🏫 School (3-Mo)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                                🥋 Regular (Mo)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium block">
                            {std.guardianName || std.guardian_name} • {std.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-bold text-[10px]">
                        {std.shift || 'Evening'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-gray-700 font-bold text-xs">
                      {fee.is_quarterly ? (
                        <div className="space-y-0.5">
                          <span className="font-black text-blue-900 block">{fee.month || 'August'} 2026</span>
                          <span className="text-[9px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-black block w-fit">
                            3-Mo Block
                          </span>
                        </div>
                      ) : (
                        <span>{fee.month || 'August'} 2026</span>
                      )}
                    </td>
                    <td className="py-4 px-5 font-mono">
                      <span className="text-emerald-600 font-black">₹{paidAmt}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className={pendingAmt > 0 ? 'text-rose-600 font-black' : 'text-gray-400 font-bold'}>Due: ₹{pendingAmt}</span>
                    </td>
                    <td className="py-4 px-5 font-mono">
                      {(() => {
                        const globalSettings = getGlobalFeeSettings();
                        const isAdmFree = (
                          std.admissionFee === 0 || 
                          std.admission_fee === 0 || 
                          String(std.admissionFee) === '0' || 
                          String(std.admission_fee) === '0' || 
                          globalSettings.defaultAdmissionFee === 0
                        );
                        if (isAdmFree) {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🎁 FREE / WAIVED
                            </span>
                          );
                        }
                        if (admPendingAmt > 0) {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              Due: ₹{admPendingAmt}
                            </span>
                          );
                        }
                        const feeAmt = std.admissionFee !== undefined ? std.admissionFee : (std.admission_fee !== undefined ? std.admission_fee : 1000);
                        return (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Paid ₹{feeAmt}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-fit ${
                        status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          status === 'Paid' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                        {status === 'Paid' ? 'Paid' : 'Pending Dues'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setPaymentModalFee(fee);
                          if (admPendingAmt > 0 && pendingAmt === 0) {
                            setPaymentType('ADMISSION');
                            setPaymentAmount(String(admPendingAmt));
                          } else {
                            setPaymentType('MONTHLY');
                            setPaymentAmount(pendingAmt > 0 ? String(pendingAmt) : '500');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-xl font-black text-xs transition cursor-pointer shadow-sm inline-flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Record Pay
                      </button>
                      <button
                        onClick={() => setActiveReceipt(fee)}
                        className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-800 hover:text-white border border-gray-200 rounded-xl transition cursor-pointer shadow-sm inline-flex items-center justify-center"
                        title="Print Fee Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => sendFeeWhatsAppReminder(fee)}
                        className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-xl transition cursor-pointer shadow-sm inline-flex items-center justify-center"
                        title="Send Direct WhatsApp Reminder"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: AUTOMATED SEQUENTIAL LOOP WHATSAPP DISPATCHER */}
      {showBulkWhatsAppModal && selectedFeesQueue.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-2xl space-y-6 relative overflow-hidden">
            <button
              onClick={() => setShowBulkWhatsAppModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {queueIndex < selectedFeesQueue.length ? (
              <>
                {/* Header & Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      WhatsApp Auto Queue Loop
                    </span>
                    <span className="text-xs font-mono font-black text-gray-600">
                      Cadet {queueIndex + 1} of {selectedFeesQueue.length}
                    </span>
                  </div>

                  {/* Card Details */}
                  {(() => {
                    const currentFee = selectedFeesQueue[queueIndex];
                    const std = currentFee.student_detail || {};
                    const pendingAmt = getPendingDuesAmount(currentFee);
                    const parentName = std.guardianName || std.guardian_name || 'Guardian';
                    const phone = std.whatsapp || std.phone || 'N/A';

                    return (
                      <div className="bg-gradient-to-br from-emerald-50/60 via-white to-gray-50 border-2 border-emerald-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          {std.photo ? (
                            <img src={std.photo} alt={std.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shadow-md" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-green-800 text-white font-black text-lg flex items-center justify-center shadow-md">
                              {std.name ? std.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <h3 className="text-lg font-black text-gray-900 leading-tight">{std.name}</h3>
                            <p className="text-xs text-gray-600 font-medium">
                              Admission No: <strong className="text-red-700 font-mono">{std.admissionNo || std.admission_no}</strong>
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                              Shift: <strong className="text-amber-800">{std.shift || 'Evening Batch'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-gray-200/80 text-xs">
                          <div>
                            <span className="text-gray-400 font-bold block uppercase text-[9px]">Parent / Guardian</span>
                            <strong className="text-gray-900 font-black">{parentName}</strong>
                            <span className="text-[10px] text-emerald-700 font-mono block">📞 +91 {phone}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400 font-bold block uppercase text-[9px]">Pending Dues</span>
                            <strong className="text-rose-600 font-black text-base font-mono">₹{pendingAmt}</strong>
                          </div>
                        </div>

                        {/* Primary Auto Step CTA Button */}
                        <button
                          onClick={handleQueueSendNext}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition cursor-pointer"
                        >
                          <MessageSquare className="w-4.5 h-4.5" /> 🚀 Send WhatsApp & Auto Step to Next Student ➔
                        </button>
                      </div>
                    );
                  })()}

                  {/* Queue Controls Footer */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      disabled={queueIndex === 0}
                      onClick={() => setQueueIndex(prev => Math.max(0, prev - 1))}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl disabled:opacity-40 transition cursor-pointer"
                    >
                      ⏮ Previous Student
                    </button>

                    <button
                      onClick={() => setQueueIndex(prev => prev + 1)}
                      className="px-4 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold rounded-xl transition cursor-pointer border border-amber-200"
                    >
                      Skip Student ⏭
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Completed Queue Screen */
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-gray-900">Queue Dispatched Successfully! 🎉</h3>
                  <p className="text-xs text-gray-600 font-medium">
                    All <strong className="text-emerald-700">{selectedFeesQueue.length} cadet fee reminders</strong> have been processed through the sequential WhatsApp queue loop.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowBulkWhatsAppModal(false);
                    setSelectedFeeIds([]);
                    setQueueIndex(0);
                  }}
                  className="px-6 py-3 bg-gray-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Close Queue Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Record Fee Payment */}
      {paymentModalFee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-gray-200 space-y-4 shadow-2xl relative">
            <button onClick={() => setPaymentModalFee(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-gray-900">Record Fee Payment</h3>
              <p className="text-xs text-gray-500 font-medium">
                Cadet: <strong className="text-gray-900 font-black">{paymentModalFee.student_detail?.name}</strong> • Shift: <strong className="text-amber-800 font-bold">{paymentModalFee.student_detail?.shift}</strong>
              </p>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              {/* Fee Category Selector */}
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Select Fee Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('MONTHLY');
                      const monthlyPending = getPendingDuesAmount(paymentModalFee);
                      setPaymentAmount(monthlyPending > 0 ? String(monthlyPending) : '500');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentType === 'MONTHLY'
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>🥋 Monthly Tuition Fee</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('ADMISSION');
                      const admPending = getAdmissionPendingAmount(paymentModalFee);
                      setPaymentAmount(admPending > 0 ? String(admPending) : '1000');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      paymentType === 'ADMISSION'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <span>🎟️ Admission / Reg Fee</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-700 font-bold">
                    {paymentType === 'ADMISSION' ? 'Admission Amount (₹)' : 'Monthly Fee Amount (₹)'}
                  </label>
                  <span className="text-gray-400 font-mono text-[11px]">
                    Pending: ₹{paymentType === 'ADMISSION' ? getAdmissionPendingAmount(paymentModalFee) : getPendingDuesAmount(paymentModalFee)}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-emerald-700 font-black text-lg font-mono focus:bg-white focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPaymentModalFee(null)} className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer">
                  <Check className="w-4 h-4" /> Save & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Printable Fee Receipt */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white text-gray-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative border border-gray-200">
            <button onClick={() => setActiveReceipt(null)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-black tracking-tight text-gray-900">{ACADEMY_INFO.name}</h2>
              <p className="text-xs text-gray-500 font-bold">{ACADEMY_INFO.headOffice.address}</p>
              <span className="inline-block px-3 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-black uppercase tracking-wider mt-1.5 shadow-2xs">
                Official Fee Payment Receipt
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Receipt No:</span>
                <strong className="font-mono text-gray-900 font-black">{activeReceipt.receipt_no || `REC-${activeReceipt.student_detail?.admissionNo || '001'}`}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Cadet Name:</span>
                <strong className="text-gray-900 font-black">{activeReceipt.student_detail?.name}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Branch Dojo:</span>
                <strong className="text-gray-800 font-bold">{activeReceipt.student_detail?.branch || 'Pulikkal Head Office'}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Shift Batch:</span>
                <strong className="text-amber-800 font-bold">{activeReceipt.student_detail?.shift || 'Evening Batch'}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-medium">Billing Month:</span>
                <strong className="text-gray-900 font-black">{activeReceipt.month || 'September'} {activeReceipt.year || 2026}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2 bg-emerald-50/60 p-2.5 rounded-xl">
                <span className="text-emerald-800 font-bold">Total Paid:</span>
                <strong className="text-emerald-700 font-mono text-sm font-black">₹{activeReceipt.paid_amount} (CLEARED)</strong>
              </div>
              {getPendingDuesAmount(activeReceipt) > 0 && (
                <div className="flex justify-between border-b border-gray-100 pb-2 bg-rose-50/60 p-2.5 rounded-xl">
                  <span className="text-rose-800 font-bold">Remaining Dues:</span>
                  <strong className="text-rose-600 font-mono font-black">₹{getPendingDuesAmount(activeReceipt)}</strong>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => sendFeeWhatsAppReminder(activeReceipt)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" /> Send Receipt on WhatsApp
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
