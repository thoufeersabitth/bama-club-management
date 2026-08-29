import React, { useState, useEffect } from 'react';
import {
  Award, Shield, Search, Filter, Printer, CheckCircle2, AlertCircle,
  Check, X, RefreshCw, UserCheck, CreditCard, FileText, ExternalLink,
  Share2, Copy, Send, QrCode, Trash2
} from 'lucide-react';
import GradingFormPrint from '../../components/grading/GradingFormPrint';
import { fetchStudents, saveStoredStudents, openWhatsApp } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const API_ROOT = 'https://bama-club-backend.fly.dev/api';

export const DEFAULT_BELT_FEE_MAP = {
  'Yellow Belt': 500,
  'Orange Belt': 600,
  'Green Belt': 700,
  'Blue Belt': 800,
  'Purple Belt': 900,
  'Brown Belt (4th Kyu)': 1000,
  'Brown Belt (3rd Kyu)': 1000,
  'Brown Belt (2nd Kyu)': 1000,
  'Brown Belt (1st Kyu)': 1200,
  'Black Belt (1st Dan)': 1500,
  '2nd Dan Candidate': 2000
};

export const getStoredBeltFees = () => {
  try {
    const saved = localStorage.getItem('bama_belt_fee_settings');
    if (saved) {
      return { ...DEFAULT_BELT_FEE_MAP, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return DEFAULT_BELT_FEE_MAP;
};

export const saveStoredBeltFees = (newMap) => {
  try {
    localStorage.setItem('bama_belt_fee_settings', JSON.stringify(newMap));
    window.dispatchEvent(new Event('bama_belt_fees_updated'));
  } catch (e) {}
};

// Payment Status Overrides Persistence (Waterproof Tier 2)
export const getStoredPaymentOverrides = () => {
  try {
    const saved = localStorage.getItem('bama_grading_payment_overrides');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {};
};

export const saveStoredPaymentOverride = (candidateId, status) => {
  try {
    const current = getStoredPaymentOverrides();
    current[candidateId] = status;
    // Also save by registration_no or student_name for redundancy
    localStorage.setItem('bama_grading_payment_overrides', JSON.stringify(current));
  } catch (e) {}
};

// Fee Overrides Persistence (Waterproof Tier 2)
export const getStoredFeeOverrides = () => {
  try {
    const saved = localStorage.getItem('bama_grading_fee_overrides');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {};
};

export const saveStoredFeeOverride = (candidateId, fee) => {
  try {
    const current = getStoredFeeOverrides();
    current[candidateId] = fee;
    localStorage.setItem('bama_grading_fee_overrides', JSON.stringify(current));
  } catch (e) {}
};

export const getExamFeeForCandidate = (r) => {
  if (r.custom_exam_fee !== undefined && r.custom_exam_fee !== null) return Number(r.custom_exam_fee);
  return getFeeForBelt(r.target_belt);
};

export const getFeeForBelt = (beltName) => {
  const currentMap = getStoredBeltFees();
  if (currentMap[beltName] !== undefined && currentMap[beltName] !== null) {
    return Number(currentMap[beltName]);
  }
  const targetLower = String(beltName || '').toLowerCase();
  if (targetLower.includes('yellow')) return Number(currentMap['Yellow Belt'] ?? 500);
  if (targetLower.includes('orange')) return Number(currentMap['Orange Belt'] ?? 600);
  if (targetLower.includes('green')) return Number(currentMap['Green Belt'] ?? 800);
  if (targetLower.includes('blue')) return Number(currentMap['Blue Belt'] ?? 700);
  if (targetLower.includes('purple')) return Number(currentMap['Purple Belt'] ?? 900);
  if (targetLower.includes('brown-1') || targetLower.includes('1st kyu')) return Number(currentMap['Brown Belt (1st Kyu)'] ?? 1200);
  if (targetLower.includes('brown-2') || targetLower.includes('2nd kyu')) return Number(currentMap['Brown Belt (2nd Kyu)'] ?? 1000);
  if (targetLower.includes('brown-3') || targetLower.includes('3rd kyu')) return Number(currentMap['Brown Belt (3rd Kyu)'] ?? 1000);
  if (targetLower.includes('brown')) return Number(currentMap['Brown Belt (4th Kyu)'] ?? 1000);
  return 500;
};

export const getNextTargetBelt = (currentBelt) => {
  if (!currentBelt) return 'Yellow Belt';
  const c = String(currentBelt).toLowerCase().trim();
  if (c.includes('white')) return 'Yellow Belt';
  if (c.includes('yellow')) return 'Orange Belt';
  if (c.includes('orange')) return 'Green Belt';
  if (c.includes('green')) return 'Blue Belt';
  if (c.includes('blue')) return 'Purple Belt';
  if (c.includes('purple')) return 'Brown Belt (4th Kyu)';
  if (c.includes('brown-4') || c.includes('4th kyu')) return 'Brown Belt (3rd Kyu)';
  if (c.includes('brown-3') || c.includes('3rd kyu')) return 'Brown Belt (2nd Kyu)';
  if (c.includes('brown-2') || c.includes('2nd kyu')) return 'Brown Belt (1st Kyu)';
  if (c.includes('brown-1') || c.includes('1st kyu') || c.includes('brown')) return 'Black Belt (1st Dan)';
  if (c.includes('black') || c.includes('dan')) return '2nd Dan Candidate';
  return 'Yellow Belt';
};

export default function OfficeGrading({ hideDuplicateHeader = false }) {
  const { activeBranch } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterFormType, setFilterFormType] = useState('ALL'); // 'ALL' | 'JKK_WHITE_TO_BROWN_4' | 'JKK_BROWN' | 'JAPAN_DIRECT_BLACK_BELT'
  const [filterBelt, setFilterBelt] = useState('ALL');
  const [filterPayment, setFilterPayment] = useState('ALL');
  const [filterSource, setFilterSource] = useState('SUBMITTED_ONLY'); // Default: Only Submitted Forms
  const [filterExamSchedule, setFilterExamSchedule] = useState('ALL');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewFormCandidate, setViewFormCandidate] = useState(null);

  // Exam Schedule & Fee Config Modal State
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false);
  const [showBeltFeeModal, setShowBeltFeeModal] = useState(false);
  const [beltFeeSettings, setBeltFeeSettings] = useState(getStoredBeltFees());

  // Pro Max Payment Warning & Instant-Pay Promotion Modal State
  const [pendingFeeCandidate, setPendingFeeCandidate] = useState(null);
  const [unpaidBulkList, setUnpaidBulkList] = useState([]);

  useEffect(() => {
    const handleBeltFeesUpdated = () => {
      setBeltFeeSettings(getStoredBeltFees());
    };
    window.addEventListener('bama_belt_fees_updated', handleBeltFeesUpdated);
    return () => window.removeEventListener('bama_belt_fees_updated', handleBeltFeesUpdated);
  }, []);

  const [examScheduleConfig, setExamScheduleConfig] = useState({
    exam_name: 'September Color Belt & Dan Examination 2026',
    exam_code: 'EXAM-2026-SEP',
    exam_date: '2026-09-20',
    registration_end: '2026-09-15',
    venue: 'Head Office Dojo, Pulikkal',
    exam_fee: 1000,
    eligible_belt: 'All Belts'
  });

  const publicRegUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/grading-registration` 
    : "http://localhost:3000/grading-registration";

  // Copy Link to Clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicRegUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Broadcast WhatsApp Official Message
  const handleWhatsAppBroadcast = () => {
    const text = 
      `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n` +
      `📢 *COLOR BELT & DAN EXAMINATION REGISTRATION*\n\n` +
      `പ്രിയ വിദ്യാർത്ഥികളെ / രക്ഷകർത്താക്കളെ,\n` +
      `നമ്മുടെ അക്കാദമിയുടെ വരാനിരിക്കുന്ന കളർ ബെൽറ്റ് എക്സാമിന്റെ ഓൺലൈൻ രജിസ്ട്രേഷൻ ആരംഭിച്ചിരിക്കുന്നു.\n\n` +
      `പേപ്പർ ഫോമുകൾ ഒഴിവാക്കുന്നതിനായി താഴെ നൽകിയിരിക്കുന്ന ലിങ്ക് വഴി വിദ്യാർത്ഥികൾക്ക് നേരിട്ട് രജിസ്റ്റർ ചെയ്യാവുന്നതാണ്:\n\n` +
      `🔗 *ഓൺലൈൻ രജിസ്ട്രേഷൻ ലിങ്ക്:*\n${publicRegUrl}\n\n` +
      `📌 *നിർദ്ദേശങ്ങൾ:*\n` +
      `1. ലിങ്ക് ഓപ്പൺ ചെയ്ത് വിദ്യാർത്ഥിയുടെ Admission No അല്ലെങ്കിൽ Phone നമ്പർ നൽകി വിവരങ്ങൾ ഫോമിൽ ഓട്ടോ-ഫിൽ ചെയ്യുക.\n` +
      `2. പരീക്ഷ എഴുതുന്ന ബെൽറ്റും യൂണിഫോം സൈസും തിരഞ്ഞെടുക്കുക.\n` +
      `3. സബ്‌മിറ്റ് ചെയ്ത ശേഷം ഡിജിറ്റൽ ഹോൾ ടിക്കറ്റ് സേവ് ചെയ്ത് പ്രിന്റ് ചെയ്യുക.\n\n` +
      `സംശയങ്ങൾക്ക് ബന്ധപ്പെടുക: +91 95440 85442\n` +
      `OSS 🥋`;

    openWhatsApp({ message: text });
  };

  // Broadcast Category Specific WhatsApp Message (JKK Kerala vs JKA Japan)
  const handleCategoryWhatsAppBroadcast = (formType) => {
    const isJapan = formType === 'JKA_JAPAN';
    const formTitle = isJapan 
      ? '🇯🇵 JKA JAPAN SENIOR KYU & DAN EXAMINATION (Brown-3 to Black Belt)'
      : '🥋 JKK KERALA KYU EXAMINATION (White to Brown-4)';
    const linkUrl = `${publicRegUrl}?form_type=${formType}`;

    const text = 
      `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n` +
      `📢 *EXAM REGISTRATION: ${formTitle}*\n\n` +
      `പ്രിയ വിദ്യാർത്ഥികളെ / രക്ഷകർത്താക്കളെ,\n` +
      `${formTitle} പരീക്ഷയുടെ രജിസ്ട്രേഷൻ ആരംഭിച്ചിരിക്കുന്നു.\n\n` +
      `ഇതിനായുള്ള പ്രത്യേക ഓൺലൈൻ ഫോം ലിങ്ക് താഴെ നൽകുന്നു:\n\n` +
      `🔗 *ഓൺലൈൻ എക്സാം ലിങ്ക്:*\n${linkUrl}\n\n` +
      `📌 ലിങ്ക് ഓപ്പൺ ചെയ്ത് വിദ്യാർത്ഥിയുടെ വിവരങ്ങൾ നൽകി ഓൺലൈനായി തന്നെ ഫോം ഫിൽ ചെയ്യുക.\n` +
      `സംശയങ്ങൾക്ക് ബന്ധപ്പെടുക: +91 95440 85442\n` +
      `OSS 🥋`;

    openWhatsApp({ message: text });
  };

  // Send Personal Link to Individual Student
  const handleSendPersonalStudentLink = (r) => {
    const targetStr = (r.target_belt || r.current_belt || '').toLowerCase();
    let formTypeParam = 'JKK_WHITE_TO_BROWN_4';
    let formTitle = 'JKK White ➔ Brown-4 Form';
    if (['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetStr.includes(t))) {
      formTypeParam = 'JAPAN_DIRECT_BLACK_BELT';
      formTitle = 'Japan Direct Black Belt Form';
    } else if (['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetStr.includes(t))) {
      formTypeParam = 'JKK_BROWN';
      formTitle = 'JKK Brown-3 ➔ Brown-1 Kyu Form';
    }

    const personalUrl = `${publicRegUrl}?query=${encodeURIComponent(r.admission_no || r.student_name)}&form_type=${formTypeParam}`;
    const text = 
      `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n` +
      `📢 *COLOR BELT & DAN EXAMINATION REGISTRATION*\n\n` +
      `Dear ${r.student_name} (${r.current_belt}),\n` +
      `നിങ്ങളുടെ *${r.target_belt}* പരീക്ഷയ്ക്കായുള്ള പേപ്പർരഹിത ഓൺലൈൻ അപേക്ഷാ ഫോം തയാറാണ്.\n\n` +
      `📌 *അപേക്ഷാ ഫീസ്:* ₹${r.exam_fee || 1000}\n` +
      `📌 *അപേക്ഷാ ഫോം:* ${formTitle}\n\n` +
      `നിങ്ങളുടെ വിവരങ്ങൾ അപേക്ഷാ ഫോമിൽ തനിയെ ഫിൽ ആകാൻ താഴെയുള്ള ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക:\n\n` +
      `🔗 *നിങ്ങളുടെ പേഴ്‌സണൽ എക്സാം ലിങ്ക്:*\n${personalUrl}\n\n` +
      `OSS 🥋`;

    openWhatsApp({ phone: r.phone, message: text });
  };

  // Loop WhatsApp Broadcast to Candidates
  const handleLoopWhatsAppBroadcast = () => {
    if (!filteredRegs.length) {
      alert('No candidates found matching current filter to broadcast.');
      return;
    }
    if (!window.confirm(`Broadcast WhatsApp Exam Links to all ${filteredRegs.length} candidates in current view?`)) return;

    let text = `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n📢 *EXAM REGISTRATION INVITES*\n\nCandidate Roster:\n`;
    filteredRegs.forEach((r, idx) => {
      const targetStr = (r.target_belt || r.current_belt || '').toLowerCase();
      let formTypeParam = 'JKK_WHITE_TO_BROWN_4';
      if (['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetStr.includes(t))) formTypeParam = 'JAPAN_DIRECT_BLACK_BELT';
      else if (['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetStr.includes(t))) formTypeParam = 'JKK_BROWN';
      
      const link = `${publicRegUrl}?query=${encodeURIComponent(r.admission_no || r.student_name)}&form_type=${formTypeParam}`;
      text += `${idx + 1}. *${r.student_name}* (${r.current_belt} ➔ ${r.target_belt})\n🔗 ${link}\n\n`;
    });

    openWhatsApp({ message: text });
  };

  // Bulk Multi-Select Handlers
  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.length === filteredRegs.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(filteredRegs.map(r => r.id));
    }
  };

  const handleToggleSelectCandidate = (id) => {
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk WhatsApp Invite Generator for Selected Candidates
  const handleSendBulkWhatsApp = () => {
    const selectedList = filteredRegs.filter(r => selectedCandidateIds.includes(r.id));
    if (!selectedList.length) return;

    let text = `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n📢 *COLOR BELT & DAN EXAM REGISTRATION INVITES*\n\n`;
    selectedList.forEach((r, idx) => {
      const targetStr = (r.target_belt || r.current_belt || '').toLowerCase();
      let formTypeParam = 'JKK_WHITE_TO_BROWN_4';
      if (['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetStr.includes(t))) formTypeParam = 'JAPAN_DIRECT_BLACK_BELT';
      else if (['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetStr.includes(t))) formTypeParam = 'JKK_BROWN';

      const link = `${publicRegUrl}?query=${encodeURIComponent(r.admission_no || r.student_name)}&form_type=${formTypeParam}`;
      text += `${idx + 1}. *${r.student_name}* (${r.current_belt} ➔ ${r.target_belt})\n📌 Exam Fee: ₹${r.exam_fee || 1000}\n🔗 Registration Link:\n${link}\n\n`;
    });

    openWhatsApp({ message: text });
  };

  // Bulk Print Forms Handler
  const handleBulkPrintForms = () => {
    const selectedList = filteredRegs.filter(r => selectedCandidateIds.includes(r.id));
    if (!selectedList.length) return;
    setSelectedPrintReg(selectedList[0]);
    setTimeout(() => window.print(), 300);
  };

  // Bulk Mark Paid Handler (Proper Async Backend Sync)
  const handleBulkMarkPaid = async () => {
    if (!selectedCandidateIds.length) return;
    const selectedList = combinedCandidates.filter(c => selectedCandidateIds.includes(c.id));
    if (!window.confirm(`✅ Are you sure you want to mark EXAM FEE AS PAID & VERIFIED for all ${selectedList.length} selected candidates?`)) return;

    setIsLoading(true);
    let count = 0;
    for (const c of selectedList) {
      try {
        await handlePaymentStatusChange(c.id, 'Paid / Verified');
        count++;
      } catch (err) {
        console.error('Error in bulk paid:', err);
      }
    }

    await fetchRegistrations();
    setSelectedCandidateIds([]);
    setIsLoading(false);
    alert(`✅ SUCCESS!\n\nMarked ${count} candidates as Exam Fee Paid & Verified!`);
  };

  // Bulk Pass & Belt Promote Handler (100% Reliable Async Django DB Sync)
  const handleBulkPassPromote = async () => {
    if (!selectedCandidateIds.length) return;
    const selectedList = combinedCandidates.filter(c => selectedCandidateIds.includes(c.id));
    
    // ⚠️ MANDATORY FINANCIAL CONTROL: Check for candidates with unpaid exam fees
    const unpaidCandidates = selectedList.filter(c => !c.payment_status?.includes('Paid'));
    if (unpaidCandidates.length > 0) {
      setUnpaidBulkList(unpaidCandidates);
      return;
    }

    if (!window.confirm(`🏆 Are you sure you want to PASS & PROMOTE BELT for all ${selectedList.length} selected candidates?\n\nThis will update candidate records in the database and promote student belts!`)) return;

    setIsLoading(true);
    let count = 0;
    for (const c of selectedList) {
      try {
        const realStudent = (students || []).find(s => 
          String(s.id) === String(c.student_db_id) || 
          String(s.admissionNo || s.admission_no) === String(c.admission_no) ||
          String(s.name).toLowerCase() === String(c.student_name).toLowerCase()
        );
        const stId = realStudent ? realStudent.id : (c.student_db_id || c.db_id);

        if (!String(c.id).startsWith('cadet-')) {
          await fetch(`${API_ROOT}/grading-registrations/${c.id}/promote-belt/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exam_status: 'Passed',
              payment_status: 'Paid / Verified'
            })
          });

          if (stId) {
            await fetch(`${API_ROOT}/students/${stId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ current_belt: c.target_belt })
            });
          }
        } else {
          if (stId) {
            await fetch(`${API_ROOT}/students/${stId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ current_belt: c.target_belt })
            });
          }

          await fetch(`${API_ROOT}/grading-registrations/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student: stId || null,
              admission_no: c.admission_no || c.registration_no,
              student_name: c.student_name,
              branch_name: c.branch_name,
              current_belt: c.current_belt,
              target_belt: c.target_belt,
              exam_status: 'Passed',
              payment_status: 'Paid / Verified',
              exam_fee: c.exam_fee || 1000,
              applied_fee: c.exam_fee || 1000
            })
          });
        }
        count++;
      } catch (err) {
        console.error('Error promoting candidate in bulk:', err);
      }
    }

    await fetchRegistrations();
    const updatedStudents = await fetchStudents();
    if (updatedStudents) setStudents(updatedStudents);

    setSelectedCandidateIds([]);
    setIsLoading(false);
    alert(`🏆 SUCCESS!\n\n${count} candidates have been PASSED and PROMOTED to their new belt ranks! Student records have been updated in the Academy Database.`);
  };

  // Bulk Fail Handler (Proper Async Backend Sync)
  const handleBulkFail = async () => {
    if (!selectedCandidateIds.length) return;
    const selectedList = combinedCandidates.filter(c => selectedCandidateIds.includes(c.id));
    if (!window.confirm(`❌ Are you sure you want to mark all ${selectedList.length} selected candidates as "FAILED / RETAKE REQUIRED"?`)) return;

    setIsLoading(true);
    let count = 0;
    for (const c of selectedList) {
      try {
        if (!String(c.id).startsWith('cadet-')) {
          await fetch(`${API_ROOT}/grading-registrations/${c.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exam_status: 'Failed' })
          });
        }
        count++;
      } catch (err) {
        console.error('Error marking bulk failure:', err);
      }
    }

    await fetchRegistrations();
    setSelectedCandidateIds([]);
    setIsLoading(false);
    alert(`❌ Mark Complete: ${count} candidates updated as Failed / Retake Required.`);
  };

  const [selectedPrintReg, setSelectedPrintReg] = useState(null);

  // Delete Candidate / Submitted Exam Form Record
  const handleDeleteSubmission = async (candidate) => {
    if (!candidate) return;
    const name = candidate.student_name || candidate.name || 'Candidate';
    const candId = String(candidate.id || '').trim();
    const regNo = String(candidate.registration_no || candidate.admission_no || '').trim();

    if (!window.confirm(`⚠️ Are you sure you want to permanently DELETE the submitted exam form for ${name}?`)) {
      return;
    }

    try {
      // 1. Delete from Fly.io server if it has a real DB ID
      if (candId && !candId.startsWith('cadet-') && !candId.startsWith('temp-')) {
        await fetch(`${API_ROOT}/grading-registrations/${candId}/`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {});
      }

      // 2. Track deleted ID in persistent tombstone blacklist
      try {
        const deleted = JSON.parse(localStorage.getItem('bama_deleted_grading_ids') || '[]');
        if (candId && !deleted.includes(candId)) deleted.push(candId);
        if (regNo && !deleted.includes(regNo)) deleted.push(regNo);
        localStorage.setItem('bama_deleted_grading_ids', JSON.stringify(deleted));
      } catch (e) {}

      // 3. Remove from state
      setRegistrations(prev => prev.filter(r => {
        const rId = String(r.id || '').trim();
        const rReg = String(r.registration_no || r.admission_no || '').trim();
        if (candId && (rId === candId || rReg === candId)) return false;
        if (regNo && (rId === regNo || rReg === regNo)) return false;
        return true;
      }));

      // 4. Update local storage cache
      try {
        const saved = JSON.parse(localStorage.getItem('bama_grading_registrations') || '[]');
        const updated = saved.filter(r => {
          const rId = String(r.id || '').trim();
          const rReg = String(r.registration_no || r.admission_no || '').trim();
          if (candId && (rId === candId || rReg === candId)) return false;
          if (regNo && (rId === regNo || rReg === regNo)) return false;
          return true;
        });
        localStorage.setItem('bama_grading_registrations', JSON.stringify(updated));
      } catch (e) {}

      if (viewFormCandidate && (viewFormCandidate.id === candidate.id || viewFormCandidate.registration_no === candidate.registration_no)) {
        setViewFormCandidate(null);
      }

      alert(`✓ Submitted form for ${name} deleted successfully.`);
    } catch (err) {
      console.error('Failed to delete grading submission:', err);
      setRegistrations(prev => prev.filter(r => r.id !== candidate.id));
    }
  };

  // Fetch all exam registrations
  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const deletedIds = JSON.parse(localStorage.getItem('bama_deleted_grading_ids') || '[]');
      const res = await fetch(`${API_ROOT}/grading-registrations/`);
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data.results || []);
        const filtered = rawList.filter(r => {
          const rId = String(r.id || '').trim();
          const rReg = String(r.registration_no || r.admission_no || '').trim();
          return !deletedIds.includes(rId) && !deletedIds.includes(rReg);
        });
        setRegistrations(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch grading registrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    const loadStudents = () => {
      fetchStudents().then(stds => setStudents(stds || getStoredStudents()));
    };
    loadStudents();
    window.addEventListener('bama_data_updated', loadStudents);
    window.addEventListener('bama_cadets_updated', loadStudents);
    window.addEventListener('storage', loadStudents);
    return () => {
      window.removeEventListener('bama_data_updated', loadStudents);
      window.removeEventListener('bama_cadets_updated', loadStudents);
      window.removeEventListener('storage', loadStudents);
    };
  }, []);

  // Combined Candidates Roster (Registered Candidates + Academy Eligible Cadets)
  const safeRegistrations = Array.isArray(registrations) ? registrations : [];
  const combinedCandidates = React.useMemo(() => {
    const paymentOverrides = getStoredPaymentOverrides();
    const feeOverrides = getStoredFeeOverrides();

    const list = safeRegistrations.map(r => {
      const candAdm = String(r.admission_no || r.registration_no || '').trim().toLowerCase();
      const candPhone = String(r.phone || '').replace(/\D/g, '');
      const candName = String(r.student_name || r.name || '').toLowerCase().trim();

      const candidateStudent = (students || []).find(st => {
        const stAdm = String(st.admissionNo || st.admission_no || '').trim().toLowerCase();
        const stPhone = String(st.phone || st.whatsapp || '').replace(/\D/g, '');
        const stName = String(st.name || '').toLowerCase().trim();

        if (r.student && String(st.id) === String(r.student)) return true;
        if (r.student_db_id && String(st.id) === String(r.student_db_id)) return true;
        if (candAdm && stAdm && candAdm === stAdm) return true;
        if (candName && stName && (candName === stName || candName.includes(stName) || stName.includes(candName))) return true;
        if (candPhone && stPhone && candPhone.length >= 10 && stPhone.length >= 10 && (candPhone.endsWith(stPhone) || stPhone.endsWith(candPhone))) return true;
        return false;
      });

      // LIVE REAL-TIME BELT SYNC: Always prioritize student's current belt from academy database!
      const liveCurrentBelt = candidateStudent?.currentBelt || candidateStudent?.current_belt || r.current_belt || 'White Belt';
      const liveTargetBelt = getNextTargetBelt(liveCurrentBelt);
      
      const targetLower = liveTargetBelt.toLowerCase();
      let dynamicFormType = r.form_type;
      if (['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetLower.includes(t))) {
        dynamicFormType = 'JAPAN_DIRECT_BLACK_BELT';
      } else if (['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetLower.includes(t))) {
        dynamicFormType = 'JKK_BROWN';
      } else {
        dynamicFormType = 'JKK_WHITE_TO_BROWN_4';
      }

      const calculatedFee = getExamFeeForCandidate({ ...r, target_belt: liveTargetBelt, form_type: dynamicFormType });
      const customFee = feeOverrides[r.id] !== undefined ? feeOverrides[r.id] : (r.custom_exam_fee !== undefined ? r.custom_exam_fee : calculatedFee);
      const customPayment = paymentOverrides[r.id] || r.payment_status;

      const candPhoto = r.photo || r.photoUrl || r.avatar || r.profile_photo || r.image || r.img || candidateStudent?.photo || candidateStudent?.avatar || candidateStudent?.photoUrl || candidateStudent?.profile_photo || candidateStudent?.image || candidateStudent?.img;

      return {
        ...r,
        current_belt: liveCurrentBelt,
        target_belt: liveTargetBelt,
        form_type: dynamicFormType,
        photo: candPhoto,
        payment_status: customPayment || 'Pending',
        exam_fee: customFee !== undefined ? customFee : (r.exam_fee && r.exam_fee !== 1000 ? r.exam_fee : calculatedFee),
        applied_fee: customFee !== undefined ? customFee : (r.exam_fee && r.exam_fee !== 1000 ? r.exam_fee : calculatedFee)
      };
    });

    const registeredKeys = new Set();
    safeRegistrations.forEach(r => {
      if (r.student) registeredKeys.add(String(r.student).toLowerCase().trim());
      if (r.student_name) registeredKeys.add(String(r.student_name).toLowerCase().trim());
      if (r.admission_no) registeredKeys.add(String(r.admission_no).toLowerCase().trim());
      if (r.registration_no) registeredKeys.add(String(r.registration_no).toLowerCase().trim());
    });

    (students || []).forEach(st => {
      const nameKey = String(st.name || '').toLowerCase().trim();
      const admKey = String(st.admissionNo || st.admission_no || '').toLowerCase().trim();
      const idKey = String(st.id || '').toLowerCase().trim();

      if (!registeredKeys.has(nameKey) && (!admKey || !registeredKeys.has(admKey)) && (!idKey || !registeredKeys.has(idKey))) {
        const cadetId = `cadet-${st.id || st.admission_no}`;
        const currBelt = st.currentBelt || st.current_belt || 'White Belt';
        const currLower = currBelt.toLowerCase();
        const stPhoto = st.photo || st.photoUrl || st.avatar || st.profile_photo || st.image || st.img;
        
        let targetBelt = 'Yellow Belt';
        if (currLower.includes('white')) targetBelt = 'Yellow Belt';
        else if (currLower.includes('yellow')) targetBelt = 'Orange Belt';
        else if (currLower.includes('orange')) targetBelt = 'Green Belt';
        else if (currLower.includes('green')) targetBelt = 'Blue Belt';
        else if (currLower.includes('blue')) targetBelt = 'Purple Belt';
        else if (currLower.includes('purple')) targetBelt = 'Brown Belt (4th Kyu)';
        else if (currLower.includes('brown-4') || currLower.includes('4th kyu')) targetBelt = 'Brown Belt (3rd Kyu)';
        else if (currLower.includes('brown-3') || currLower.includes('3rd kyu')) targetBelt = 'Brown Belt (2nd Kyu)';
        else if (currLower.includes('brown-2') || currLower.includes('2nd kyu')) targetBelt = 'Brown Belt (1st Kyu)';
        else if (currLower.includes('brown-1') || currLower.includes('1st kyu')) targetBelt = 'Black Belt (1st Dan)';
        else if (currLower.includes('black') || currLower.includes('dan')) targetBelt = '2nd Dan Candidate';

        const targetLower = targetBelt.toLowerCase();
        let formCat = 'JKK_WHITE_TO_BROWN_4';
        if (['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetLower.includes(t))) {
          formCat = 'JAPAN_DIRECT_BLACK_BELT';
        } else if (['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetLower.includes(t))) {
          formCat = 'JKK_BROWN';
        }

        const bName = st.branch_name || st.branch_detail?.name || (typeof st.branch === 'object' ? st.branch?.name : st.branch) || 'Pulikkal Main Dojo';
        const defaultFee = getExamFeeForCandidate({ target_belt: targetBelt, form_type: formCat });
        const customFee = feeOverrides[cadetId] !== undefined ? feeOverrides[cadetId] : (st.custom_exam_fee !== undefined ? st.custom_exam_fee : defaultFee);
        const customPayment = paymentOverrides[cadetId] || 'Pending';

        list.push({
          id: cadetId,
          student_db_id: st.id,
          db_id: st.id,
          student: st.id,
          registration_no: st.admissionNo || st.admission_no || `CADET-${st.id}`,
          admission_no: st.admissionNo || st.admission_no,
          student_name: st.name,
          photo: stPhoto,
          current_belt: currBelt,
          target_belt: targetBelt,
          form_type: formCat,
          branch_name: String(bName).length > 20 ? 'Pulikkal Main Dojo' : bName,
          phone: st.phone || st.whatsapp || '9544085442',
          whatsapp: st.whatsapp || st.phone,
          guardian_name: st.guardianName || st.guardian_name || 'Parent',
          payment_status: customPayment,
          registration_status: 'Eligible Cadet',
          exam_status: 'Eligible Cadet',
          exam_fee: customFee,
          applied_fee: customFee,
          isAcademyCadet: true
        });
      }
    });

    // Deduplicate candidate roster strictly by unique student identity
    const uniqueCandidatesMap = new Map();
    list.forEach(c => {
      const key = String(c.student_db_id || c.student || c.admission_no || c.student_name || c.id).toLowerCase().trim();
      if (!uniqueCandidatesMap.has(key)) {
        uniqueCandidatesMap.set(key, c);
      } else {
        const existing = uniqueCandidatesMap.get(key);
        // Prefer official backend registration (numeric ID) over cadet- placeholder ID!
        if (String(existing.id).startsWith('cadet-') && !String(c.id).startsWith('cadet-')) {
          uniqueCandidatesMap.set(key, c);
        }
      }
    });

    return Array.from(uniqueCandidatesMap.values());
  }, [safeRegistrations, students]);

  // Direct Inline Candidate Fee & Payment Handlers (Triple-Tier Waterproof Persistence)
  const handleFeeChange = async (candidateId, newFee) => {
    // 1. Save to LocalStorage immediately (Tier 2 Waterproof)
    saveStoredFeeOverride(candidateId, newFee);

    // 2. Instant local React state update
    setRegistrations(prev => prev.map(r => r.id === candidateId ? { ...r, exam_fee: newFee, custom_exam_fee: newFee, applied_fee: newFee } : r));

    const c = combinedCandidates.find(item => item.id === candidateId);
    if (!c) return;

    try {
      if (!String(candidateId).startsWith('cadet-')) {
        await fetch(`${API_ROOT}/grading-registrations/${candidateId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exam_fee: newFee, applied_fee: newFee })
        });
      } else {
        const realStudent = (students || []).find(s => 
          String(s.id) === String(c.student_db_id) || 
          String(s.admissionNo || s.admission_no) === String(c.admission_no)
        );
        const stId = realStudent ? realStudent.id : (c.student_db_id || c.db_id);

        const res = await fetch(`${API_ROOT}/grading-registrations/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student: stId || null,
            admission_no: c.admission_no || c.registration_no,
            student_name: c.student_name,
            branch_name: c.branch_name,
            current_belt: c.current_belt,
            target_belt: c.target_belt,
            payment_status: c.payment_status || 'Pending',
            exam_fee: newFee,
            applied_fee: newFee
          })
        });
        if (res.ok) fetchRegistrations();
      }
    } catch (err) {
      console.error('Failed to update fee in database:', err);
    }
  };

  const handlePaymentStatusChange = async (candidateId, newStatus) => {
    // 1. Save to LocalStorage immediately (Tier 2 Waterproof)
    saveStoredPaymentOverride(candidateId, newStatus);

    // 2. Instant local state update (Insert into registrations if new cadet)
    setRegistrations(prev => {
      const exists = prev.some(r => r.id === candidateId);
      if (exists) {
        return prev.map(r => r.id === candidateId ? { ...r, payment_status: newStatus } : r);
      } else {
        const c = combinedCandidates.find(item => item.id === candidateId);
        if (c) {
          return [...prev, { ...c, payment_status: newStatus }];
        }
        return prev;
      }
    });

    const c = combinedCandidates.find(item => item.id === candidateId);

    try {
      if (!String(candidateId).startsWith('cadet-')) {
        await fetch(`${API_ROOT}/grading-registrations/${candidateId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_status: newStatus })
        });
      } else if (c) {
        const realStudent = (students || []).find(s => 
          String(s.id) === String(c.student_db_id) || 
          String(s.admissionNo || s.admission_no) === String(c.admission_no)
        );
        const stId = realStudent ? realStudent.id : (c.student_db_id || c.db_id);

        const res = await fetch(`${API_ROOT}/grading-registrations/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student: stId || null,
            admission_no: c.admission_no || c.registration_no,
            student_name: c.student_name,
            branch_name: c.branch_name,
            current_belt: c.current_belt,
            target_belt: c.target_belt,
            payment_status: newStatus,
            exam_fee: c.exam_fee || 1000,
            applied_fee: c.exam_fee || 1000
          })
        });
        if (res.ok) fetchRegistrations();
      }
    } catch (err) {
      console.error('Failed to update payment status in database:', err);
    }
  };

  const handleTogglePaymentStatus = (r) => {
    const currentIsPaid = r.payment_status?.includes('Paid');
    const newStatus = currentIsPaid ? 'Pending' : 'Paid / Verified';
    handlePaymentStatusChange(r.id, newStatus);
  };

  const handleExamStatusChange = async (r, newExamStatus) => {
    if (newExamStatus === 'Passed') {
      if (!window.confirm(`Are you sure you want to mark ${r.student_name} as "PASSED & BELT PROMOTED"? This will automatically promote their belt rank in the system and mark their exam fee as paid!`)) return;
    }

    setRegistrations(prev => prev.map(item => {
      if (item.id === r.id) {
        return {
          ...item,
          exam_status: newExamStatus,
          payment_status: newExamStatus === 'Passed' ? 'Paid / Verified' : item.payment_status
        };
      }
      return item;
    }));

    if (!String(r.id).startsWith('cadet-')) {
      try {
        if (newExamStatus === 'Passed') {
          await fetch(`${API_ROOT}/grading-registrations/${r.id}/promote-belt/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exam_status: 'Passed',
              payment_status: 'Paid / Verified'
            })
          });
        } else {
          await fetch(`${API_ROOT}/grading-registrations/${r.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exam_status: newExamStatus })
          });
        }
      } catch (err) {
        console.error('Error updating exam status:', err);
      }
    }
  };

  // Belt Progression Rank Order Helper
  const getBeltRankOrder = (beltStr) => {
    const b = String(beltStr || '').toLowerCase();
    if (b.includes('white')) return 1;
    if (b.includes('yellow')) return 2;
    if (b.includes('orange')) return 3;
    if (b.includes('green')) return 4;
    if (b.includes('blue')) return 5;
    if (b.includes('purple')) return 6;
    if (b.includes('brown-4') || b.includes('4th kyu')) return 7;
    if (b.includes('brown-3') || b.includes('3rd kyu')) return 8;
    if (b.includes('brown-2') || b.includes('2nd kyu')) return 9;
    if (b.includes('brown-1') || b.includes('1st kyu')) return 10;
    if (b.includes('black') || b.includes('dan')) return 11;
    return 99;
  };

  // Filter combined candidates
  const filteredRegs = combinedCandidates.filter(r => {
    const targetStr = (r.target_belt || r.current_belt || '').toLowerCase();
    
    // Automatic category helper
    let formCat = r.form_type;
    if (!formCat || formCat === 'JKK_KERALA' || formCat === 'JKA_JAPAN') {
      if (['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetStr.includes(t))) formCat = 'JAPAN_DIRECT_BLACK_BELT';
      else if (['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetStr.includes(t))) formCat = 'JKK_BROWN';
      else formCat = 'JKK_WHITE_TO_BROWN_4';
    }

    const matchesSearch = !searchTerm || 
      r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.registration_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.phone && r.phone.includes(searchTerm));

    const activeBranchName = activeBranch || localStorage.getItem('bama_active_branch') || 'ALL';
    const effectiveScope = (filterBranch !== 'ALL' ? filterBranch : (activeBranchName && !activeBranchName.toLowerCase().includes('all') ? activeBranchName : 'ALL')).toLowerCase();

    let matchesBranch = true;
    if (effectiveScope && !effectiveScope.includes('all')) {
      const bStr = String(r.branch_name || '').toLowerCase();
      if (effectiveScope.includes('chungam')) matchesBranch = bStr.includes('chungam');
      else if (effectiveScope.includes('mongam')) matchesBranch = bStr.includes('mongam');
      else if (effectiveScope.includes('feroke')) matchesBranch = bStr.includes('feroke');
      else if (effectiveScope.includes('pulikkal')) matchesBranch = bStr.includes('pulikkal');
      else matchesBranch = bStr.includes(effectiveScope);
    }

    const matchesForm = filterFormType === 'ALL' || formCat === filterFormType;
    const matchesBelt = filterBelt === 'ALL' || (r.current_belt && r.current_belt.toLowerCase().includes(filterBelt.toLowerCase())) || (r.target_belt && r.target_belt.toLowerCase().includes(filterBelt.toLowerCase()));
    const matchesPayment = filterPayment === 'ALL' || (filterPayment === 'Paid / Verified' ? r.payment_status?.includes('Paid') : !r.payment_status?.includes('Paid'));
    const matchesSource = filterSource === 'ALL' || (filterSource === 'SUBMITTED_ONLY' ? !r.isAcademyCadet : true);

    return matchesSearch && matchesBranch && matchesForm && matchesBelt && matchesPayment && matchesSource;
  });

  // Sort candidates strictly by Belt Order (White ➔ Black Belt)
  filteredRegs.sort((a, b) => getBeltRankOrder(a.current_belt) - getBeltRankOrder(b.current_belt));

  // Promote Student Belt Action (100% Reliable Django DB Sync & Instant UI Update)
  const handlePromoteBelt = async (candidate, examStatus) => {
    const c = typeof candidate === 'object' ? candidate : combinedCandidates.find(item => item.id === candidate);
    if (!c) return;

    if (examStatus === 'Passed') {
      const isFeePaid = c.payment_status?.includes('Paid');
      const confirmMsg = isFeePaid
        ? `🏆 Are you sure you want to mark ${c.student_name} as "PASSED & BELT PROMOTED"?\n\nThis will permanently update their belt rank from ${c.current_belt} to ${c.target_belt} in the Academy Database!`
        : `🏆 Cadet ${c.student_name} has Exam Fee (₹${c.exam_fee}) as Pending.\n\nDo you want to VERIFY FEE AS PAID and PROMOTE BELT from ${c.current_belt} to ${c.target_belt} in the Academy Database?`;

      if (!window.confirm(confirmMsg)) return;
    }

    setIsLoading(true);

    try {
      const realStudent = (students || []).find(s => 
        String(s.id) === String(c.student_db_id) || 
        String(s.admissionNo || s.admission_no) === String(c.admission_no) ||
        String(s.name).toLowerCase() === String(c.student_name).toLowerCase()
      );
      const stId = realStudent ? realStudent.id : (c.student_db_id || c.db_id);

      const newCurrentBelt = c.target_belt;
      const nextTargetBelt = getFeeForBelt ? (
        newCurrentBelt.includes('White') ? 'Yellow Belt' :
        newCurrentBelt.includes('Yellow') ? 'Orange Belt' :
        newCurrentBelt.includes('Orange') ? 'Blue Belt' :
        newCurrentBelt.includes('Blue') ? 'Green Belt' :
        newCurrentBelt.includes('Green') ? 'Purple Belt' :
        newCurrentBelt.includes('Purple') ? 'Brown Belt (4th Kyu)' :
        newCurrentBelt.includes('Brown Belt (4th Kyu)') ? 'Brown Belt (3rd Kyu)' :
        newCurrentBelt.includes('Brown Belt (3rd Kyu)') ? 'Brown Belt (2nd Kyu)' :
        newCurrentBelt.includes('Brown Belt (2nd Kyu)') ? 'Brown Belt (1st Kyu)' :
        newCurrentBelt.includes('Brown Belt (1st Kyu)') ? 'Black Belt (1st Dan)' : '2nd Dan Candidate'
      ) : 'Orange Belt';

      const nextExamFee = getFeeForBelt(nextTargetBelt);

      // 1. Instant local React state & localStorage update (0 ms response)
      if (examStatus === 'Passed') {
        saveStoredPaymentOverride(c.id, 'Pending Payment');

        setStudents(prev => {
          const updated = prev.map(s => {
            if (String(s.id) === String(stId) || String(s.admissionNo || s.admission_no) === String(c.admission_no || c.registration_no)) {
              return { 
                ...s, 
                current_belt: newCurrentBelt, 
                currentBelt: newCurrentBelt,
                target_belt: nextTargetBelt,
                exam_fee: nextExamFee,
                payment_status: 'Pending Payment',
                exam_status: 'Pending'
              };
            }
            return s;
          });
          saveStoredStudents(updated);
          try {
            localStorage.setItem('bama_students', JSON.stringify(updated));
            localStorage.setItem('bama_cadets', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        setRegistrations(prev => prev.map(r => r.id === c.id ? {
          ...r,
          exam_status: 'Pending',
          payment_status: 'Pending Payment',
          current_belt: newCurrentBelt,
          target_belt: nextTargetBelt,
          exam_fee: nextExamFee
        } : r));
      }

      // 2. Django Backend Database REST API Sync
      if (!String(c.id).startsWith('cadet-')) {
        await fetch(`${API_ROOT}/grading-registrations/${c.id}/promote-belt/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_status: 'Pending',
            payment_status: 'Pending Payment',
            current_belt: newCurrentBelt,
            target_belt: nextTargetBelt
          })
        });

        if (examStatus === 'Passed' && stId) {
          await fetch(`${API_ROOT}/students/${stId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_belt: c.target_belt })
          });
        }
      } else {
        if (examStatus === 'Passed') {
          if (stId) {
            await fetch(`${API_ROOT}/students/${stId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ current_belt: c.target_belt })
            });
          }

          await fetch(`${API_ROOT}/grading-registrations/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student: stId || null,
              admission_no: c.admission_no || c.registration_no,
              student_name: c.student_name,
              branch_name: c.branch_name,
              current_belt: c.current_belt,
              target_belt: c.target_belt,
              exam_status: 'Passed',
              payment_status: 'Paid / Verified',
              exam_fee: c.exam_fee || 1000,
              applied_fee: c.exam_fee || 1000
            })
          });
        }
      }

      await fetchRegistrations();
      const updatedStudents = await fetchStudents();
      if (updatedStudents) setStudents(updatedStudents);

      if (examStatus === 'Passed') {
        alert(`🏆 SUCCESS!\n\n${c.student_name} has been PASSED & PROMOTED to ${c.target_belt}! Student record updated in Academy Database.`);
      }
    } catch (err) {
      console.error('Error promoting belt:', err);
      alert('Failed to update belt promotion in database.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Print
  const triggerPrintForm = (reg) => {
    setSelectedPrintReg(reg);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Sleek Compact Header Banner (Light Theme) */}
      {!hideDuplicateHeader && (
        <div className="bg-white px-6 py-5 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200 uppercase">
                EXAM CONTROL
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                COLOR BELT & DAN PROMOTIONS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
              <Award className="w-6 h-6 text-red-600" />
              <span>BELT GRADING EXAM PORTAL</span>
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Manage online exam registrations, approve candidate fees, print official JKK/JKA forms & execute belt promotions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setShowBeltFeeModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition transform hover:-translate-y-0.5 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Award className="w-4 h-4 text-amber-200" />
              <span>⚙️ CONFIGURE BELT EXAM FEES</span>
            </button>

            <button
              onClick={() => setShowFeeConfigModal(true)}
              className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <span>📅 EXAM SCHEDULE</span>
            </button>

            <button
              onClick={fetchRegistrations}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl border border-gray-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
              <span>REFRESH LIST</span>
            </button>
          </div>
        </div>
      )}
      {/* ULTRA-PREMIUM CLEAN ANNOUNCEMENT & ACTION BAR */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-600 font-mono flex items-center gap-1.5 mb-1">
            <Share2 className="w-3.5 h-3.5 text-red-600" />
            PUBLIC REGISTRATION LINK
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-700 flex items-center justify-between shadow-xs">
              <span className="truncate">{publicRegUrl}</span>
              <button
                onClick={handleCopyLink}
                className="text-gray-500 hover:text-red-600 font-sans font-bold text-[11px] flex items-center gap-1 ml-2 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            <a
              href={publicRegUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shadow-xs"
            >
              <span>OPEN FORM</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowBeltFeeModal(true)}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
          >
            <Award className="w-4 h-4 text-amber-200" />
            <span>⚙️ CONFIGURE BELT EXAM FEES</span>
          </button>

          <button
            onClick={handleWhatsAppBroadcast}
            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span>📲 WHATSAPP ANNOUNCEMENT</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards (Light Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL CANDIDATES</span>
            <span className="text-xl sm:text-2xl font-black text-gray-900 font-mono mt-0.5 block">{combinedCandidates.length}</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-black">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">JKA BROWN FORMS</span>
            <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono mt-0.5 block">{combinedCandidates.filter(r => r.form_type === 'JKK_BROWN').length}</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black text-sm">
            📜
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">JAPAN DIRECT DAN</span>
            <span className="text-xl sm:text-2xl font-black text-red-600 font-mono mt-0.5 block">{combinedCandidates.filter(r => r.form_type === 'JAPAN_DIRECT_BLACK_BELT').length}</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-black text-sm">
            🇯🇵
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">JKA KYU (WHITE-BROWN-4)</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-0.5 block">{combinedCandidates.filter(r => r.form_type === 'JKK_WHITE_TO_BROWN_4').length}</span>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black text-sm">
            🥋
          </div>
        </div>
      </div>

      {/* Filter Controls Bar (Responsive Compact Grid) */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col gap-2.5">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate name, reg no, phone..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-xs focus:border-red-500 focus:outline-none font-medium shadow-2xs"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <select
            value={filterExamSchedule}
            onChange={(e) => setFilterExamSchedule(e.target.value)}
            className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-amber-800 text-xs focus:border-red-500 focus:outline-none font-bold truncate"
          >
            <option value="ALL">📅 All Exam Schedules</option>
            <option value="EXAM-2026-SEP">September Exam 2026</option>
            <option value="EXAM-2026-OCT">October Exam 2026</option>
          </select>

          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:border-red-500 focus:outline-none font-medium truncate"
          >
            <option value="ALL">All Branches</option>
            <option value="Pulikkal Main Dojo">Pulikkal Dojo</option>
            <option value="Chungam Branch Dojo">Chungam Dojo</option>
            <option value="Mongam Branch Dojo">Mongam Dojo</option>
          </select>

          <select
            value={filterBelt}
            onChange={(e) => setFilterBelt(e.target.value)}
            className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-red-700 text-xs focus:border-red-500 focus:outline-none font-bold truncate"
          >
            <option value="ALL">🥋 All Belt Ranks</option>
            <option value="White">White Belt</option>
            <option value="Yellow">Yellow Belt</option>
            <option value="Orange">Orange Belt</option>
            <option value="Green">Green Belt</option>
            <option value="Blue">Blue Belt</option>
            <option value="Purple">Purple Belt</option>
            <option value="Brown-4">Brown-4 (4th Kyu)</option>
            <option value="Brown-3">Brown-3 (3rd Kyu)</option>
            <option value="Brown-2">Brown-2 (2nd Kyu)</option>
            <option value="Brown-1">Brown-1 (1st Kyu)</option>
            <option value="Black">Black Belt / Dan</option>
          </select>

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:border-red-500 focus:outline-none font-medium truncate"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid / Verified">Paid / Verified</option>
            <option value="Pending">Pending Payment</option>
          </select>
        </div>
      </div>

      {/* 3 OFFICIAL FORM CATEGORY SEGREGATION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {/* Button 1: All Candidates */}
          <button
            onClick={() => setFilterFormType('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              filterFormType === 'ALL'
                ? 'bg-[#0f172a] text-white shadow-md ring-2 ring-slate-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>📋 All ({combinedCandidates.length})</span>
          </button>

          {/* Button 2: JKA Brown Form */}
          <button
            onClick={() => setFilterFormType('JKK_BROWN')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              filterFormType === 'JKK_BROWN'
                ? 'bg-[#e28723] text-white shadow-md ring-2 ring-amber-500'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span>📜 JKA Brown</span>
          </button>

          {/* Button 3: JKA White to Brown-4 Form */}
          <button
            onClick={() => setFilterFormType('JKK_WHITE_TO_BROWN_4')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              filterFormType === 'JKK_WHITE_TO_BROWN_4'
                ? 'bg-[#23a778] text-white shadow-md ring-2 ring-emerald-500'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span>🥋 JKA Kyu (White-Brown-4)</span>
          </button>

          {/* Button 4: Japan Direct Black Belt Form */}
          <button
            onClick={() => setFilterFormType('JAPAN_DIRECT_BLACK_BELT')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition cursor-pointer flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${
              filterFormType === 'JAPAN_DIRECT_BLACK_BELT'
                ? 'bg-[#cc2e30] text-white shadow-md ring-2 ring-red-600'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>🇯🇵 Japan Dan</span>
          </button>
        </div>

        {/* SUBMISSION SOURCE TOGGLE PILL */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-2xs flex-shrink-0">
          <button
            onClick={() => setFilterSource('ALL')}
            className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              filterSource === 'ALL'
                ? 'bg-gray-900 text-white font-black shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>👥 All Cadets ({combinedCandidates.length})</span>
          </button>

          <button
            onClick={() => setFilterSource('SUBMITTED_ONLY')}
            className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
              filterSource === 'SUBMITTED_ONLY'
                ? 'bg-emerald-600 text-white font-black shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span>📝 Submitted ({safeRegistrations.length})</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar for Selected Candidates */}
      {selectedCandidateIds.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 font-black text-sm">
            <CheckCircle2 className="w-5 h-5 text-amber-300" />
            <span>{selectedCandidateIds.length} CANDIDATES SELECTED</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleBulkPassPromote}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>🏆 BULK PASS & BELT PROMOTE ({selectedCandidateIds.length})</span>
            </button>

            <button
              onClick={handleBulkMarkPaid}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/25 transition cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-200" />
              <span>✅ MARK EXAM FEE PAID ({selectedCandidateIds.length})</span>
            </button>

            <button
              onClick={handleBulkFail}
              className="px-3.5 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>❌ MARK FAILED ({selectedCandidateIds.length})</span>
            </button>

            <button
              onClick={handleSendBulkWhatsApp}
              className="px-3.5 py-1.5 bg-black/80 hover:bg-gray-900 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>📲 WHATSAPP INVITES</span>
            </button>

            <button
              onClick={handleBulkPrintForms}
              className="px-3.5 py-1.5 bg-black/80 hover:bg-gray-900 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>🖨️ PRINT FORMS</span>
            </button>
          </div>
        </div>
      )}

      {/* 📱 MOBILE VIEW: Compact Touch-Friendly Candidate Cards (Visible on Mobile Screens) */}
      <div className="block md:hidden space-y-3.5">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 font-mono bg-white rounded-2xl border">Loading candidate registrations...</div>
        ) : filteredRegs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 font-mono bg-white rounded-2xl border">No exam registrations match criteria.</div>
        ) : (
          filteredRegs.map((r) => {
            const isSelected = selectedCandidateIds.includes(r.id);
            const isPaid = r.payment_status?.includes('Paid');

            return (
              <div
                key={`mob-cand-${r.id}`}
                className={`bg-white rounded-3xl p-4.5 border shadow-md space-y-3 relative overflow-hidden transition-all ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                    : isPaid
                    ? 'border-emerald-200/80 shadow-gray-100/80'
                    : 'border-amber-200/80 shadow-amber-100/40'
                }`}
              >
                {/* Top Glow Accent Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isPaid
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500'
                  }`}
                />

                {/* Candidate Header */}
                <div className="flex items-start justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectCandidate(r.id)}
                      className="w-4.5 h-4.5 accent-red-600 rounded-md cursor-pointer flex-shrink-0"
                    />
                    {r.photo ? (
                      <img
                        src={r.photo}
                        alt={r.student_name}
                        className="w-11 h-11 rounded-2xl object-cover border-2 border-red-500/30 shadow-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-rose-800 text-white font-black flex items-center justify-center text-sm shadow-md flex-shrink-0 border border-red-400/30">
                        {r.student_name ? r.student_name.charAt(0).toUpperCase() : 'S'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-black text-sm text-gray-900 leading-snug">{r.student_name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono font-medium">{r.admission_no || r.registration_no || r.phone}</p>
                    </div>
                  </div>

                  {/* 1-Tap Toggle Payment Status Pill */}
                  <button
                    type="button"
                    onClick={() => handleTogglePaymentStatus(r)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs flex items-center gap-1 transition cursor-pointer flex-shrink-0 ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {isPaid ? 'PAID' : 'PENDING'}
                  </button>
                </div>

                {/* Belt Promotion Details Pill */}
                <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-700">{r.current_belt}</span>
                    <span className="text-red-500 font-black">➔</span>
                    <strong className="font-black text-red-600">🥋 {r.target_belt}</strong>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-black text-xs text-gray-900">
                    <span>₹</span>
                    <input
                      type="number"
                      value={r.exam_fee !== undefined ? r.exam_fee : getExamFeeForCandidate(r)}
                      onChange={(e) => handleFeeChange(r.id, parseInt(e.target.value) || 0)}
                      className="w-14 bg-white border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs font-black text-gray-900 text-right focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Dojo Branch & Contact Info */}
                <div className="text-[11px] text-gray-500 flex items-center justify-between px-1">
                  <span>🏢 {r.branch_name}</span>
                  <span>📞 {r.phone || '9544085442'}</span>
                </div>

                {/* Action Buttons Bar */}
                <div className="flex items-center gap-2 pt-0.5">
                  {r.exam_status !== 'Passed' && (
                    <button
                      onClick={() => handlePromoteBelt(r, 'Passed')}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-xs transition cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>PROMOTE & PASS</span>
                    </button>
                  )}

                  {(filterSource === 'SUBMITTED_ONLY' || r.is_submitted === true) && (
                    <button
                      onClick={() => setViewFormCandidate(r)}
                      className="py-2.5 px-3 bg-gradient-to-r from-red-600 via-amber-600 to-red-700 text-white rounded-2xl font-black text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1 flex-shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>FORM</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleSendPersonalStudentLink(r)}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-2xl transition cursor-pointer shadow-sm flex items-center justify-center flex-shrink-0"
                    title="Send WhatsApp Link"
                  >
                    <Send className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => triggerPrintForm(r)}
                    className="p-2.5 bg-gray-100 hover:bg-gray-900 text-gray-700 hover:text-white border border-gray-200 rounded-2xl transition cursor-pointer shadow-sm flex items-center justify-center flex-shrink-0"
                    title="Print Form"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 💻 DESKTOP VIEW: Registrations List Table (Visible on Desktop Screens) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 whitespace-nowrap">
            <thead className="bg-gray-50/90 text-[11px] uppercase font-black tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filteredRegs.length > 0 && selectedCandidateIds.length === filteredRegs.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                    title="Select / Deselect All Candidates"
                  />
                  <span>Reg No & Candidate</span>
                </th>
                <th className="p-4">Dojo Branch</th>
                <th className="p-4">Exam Promotion</th>
                <th className="p-4">Form Format</th>
                <th className="p-4">Fee & Payment</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 font-mono">Loading candidate registrations...</td>
                </tr>
              ) : filteredRegs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 font-mono">No exam registrations match criteria.</td>
                </tr>
              ) : (
                filteredRegs.map((r) => (
                  <tr key={r.id} className={`transition ${selectedCandidateIds.includes(r.id) ? 'bg-amber-50/60 font-semibold' : 'hover:bg-amber-50/20'}`}>
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.includes(r.id)}
                          onChange={() => handleToggleSelectCandidate(r.id)}
                          className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        {r.photo ? (
                          <img
                            src={r.photo}
                            alt={r.student_name}
                            className="w-9 h-9 rounded-full object-cover border border-red-500/30 shadow-xs flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-rose-800 text-white font-black flex items-center justify-center text-xs flex-shrink-0 border border-red-400/30">
                            {r.student_name ? r.student_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                        )}
                        <div>
                          <p className="font-black text-gray-900 uppercase text-sm leading-tight">{r.student_name}</p>
                          <p className="text-[10px] text-gray-500 font-mono font-medium">{r.phone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-gray-800 whitespace-nowrap">
                      {r.branch_name}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="font-bold text-gray-700">{r.current_belt}</span>
                        <span className="text-red-500 font-bold">➔</span>
                        <strong className="font-black text-red-600">{r.target_belt}</strong>
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {(() => {
                        const targetLower = (r.target_belt || r.current_belt || '').toLowerCase();
                        let badgeLabel = '🥋 JKK White to Brown-4 Form';
                        let badgeStyle = 'bg-emerald-600 text-white border border-emerald-500 shadow-sm shadow-emerald-600/20';
                        if (['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetLower.includes(t))) {
                          badgeLabel = '🇯🇵 Japan Direct Black Belt Form';
                          badgeStyle = 'bg-red-700 text-white border border-red-600 shadow-sm shadow-red-700/20';
                        } else if (['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetLower.includes(t))) {
                          badgeLabel = '📜 JKK Brown Form (Brown-3, 2, 1)';
                          badgeStyle = 'bg-amber-600 text-white border border-amber-500 shadow-sm shadow-amber-600/20';
                        }

                        return (
                          <span className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider border inline-flex items-center gap-1.5 whitespace-nowrap ${badgeStyle}`}>
                            {badgeLabel}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="p-4 font-mono space-y-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          value={r.exam_fee !== undefined ? r.exam_fee : getExamFeeForCandidate(r)}
                          onChange={(e) => handleFeeChange(r.id, parseInt(e.target.value) || 0)}
                          className="w-16 bg-gray-50 border border-gray-300 rounded-lg px-2 py-0.5 text-xs font-black text-gray-900 focus:border-red-500 focus:outline-none"
                          title="Click to edit candidate fee"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentStatus(r)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider border shadow-xs inline-flex items-center gap-1 transition cursor-pointer font-sans whitespace-nowrap ${
                          r.payment_status?.includes('Paid')
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-600/20'
                            : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400 shadow-amber-500/20'
                        }`}
                        title="1-Click Toggle: Click to change Payment Status between Paid & Pending"
                      >
                        {r.payment_status?.includes('Paid') ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>✅ PAID / VERIFIED</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-white" />
                            <span>⚠️ PENDING PAYMENT</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                        {/* Render VIEW FORM button ONLY when Submitted Forms tab is active or candidate explicitly submitted online! */}
                        {(filterSource === 'SUBMITTED_ONLY' || r.is_submitted === true) && (
                          <button
                            onClick={() => setViewFormCandidate(r)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-amber-600 to-red-700 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                            title="View Full Submitted Exam Form & Candidate Profile"
                          >
                            <FileText className="w-3.5 h-3.5 text-white" />
                            <span>VIEW FORM</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleSendPersonalStudentLink(r)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs border border-emerald-300 transition cursor-pointer shadow-2xs"
                          title="Send Personal Student Form Link to Parent WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {r.exam_status !== 'Passed' && (
                          <button
                            onClick={() => handlePromoteBelt(r, 'Passed')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-sm transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                            title="Pass Candidate & Promote Belt Rank"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>PROMOTE</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSubmission(r)}
                          className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl font-bold text-xs border border-red-200 transition cursor-pointer shadow-2xs"
                          title="Delete Submitted Exam Form Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXAM SCHEDULE & FEE CONFIGURATION MODAL */}
      {showFeeConfigModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#121526] border-2 border-amber-500/80 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-lg font-black uppercase text-amber-400 flex items-center gap-2">
                <span>⚙️ CONFIGURE EXAM SCHEDULE & FEES</span>
              </h3>
              <button
                onClick={() => setShowFeeConfigModal(false)}
                className="text-gray-400 hover:text-white font-black text-sm p-1 rounded-lg hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Examination Title / Name</label>
                <input
                  type="text"
                  value={examScheduleConfig.exam_name}
                  onChange={(e) => setExamScheduleConfig({ ...examScheduleConfig, exam_name: e.target.value })}
                  className="w-full bg-black/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Applied Exam Fee (₹)</label>
                  <input
                    type="number"
                    value={examScheduleConfig.exam_fee}
                    onChange={(e) => setExamScheduleConfig({ ...examScheduleConfig, exam_fee: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/80 border border-amber-500 rounded-xl px-3.5 py-2.5 text-amber-400 font-black text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={examScheduleConfig.exam_date}
                    onChange={(e) => setExamScheduleConfig({ ...examScheduleConfig, exam_date: e.target.value })}
                    className="w-full bg-black/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Registration Closing Date</label>
                  <input
                    type="date"
                    value={examScheduleConfig.registration_end}
                    onChange={(e) => setExamScheduleConfig({ ...examScheduleConfig, registration_end: e.target.value })}
                    className="w-full bg-black/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Eligible Belt Scope</label>
                  <select
                    value={examScheduleConfig.eligible_belt}
                    onChange={(e) => setExamScheduleConfig({ ...examScheduleConfig, eligible_belt: e.target.value })}
                    className="w-full bg-black/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-bold focus:outline-none"
                  >
                    <option value="All Belts">🥋 All Belts Allowed</option>
                    <option value="White">White Belt Only</option>
                    <option value="Yellow">Yellow Belt Only</option>
                    <option value="Orange">Orange Belt Only</option>
                    <option value="Green">Green Belt Only</option>
                    <option value="Blue">Blue Belt Only</option>
                    <option value="Purple">Purple Belt Only</option>
                    <option value="Brown-4">Brown-4 (4th Kyu) Only</option>
                    <option value="Brown-3">Brown-3 (3rd Kyu) Only</option>
                    <option value="Brown-2">Brown-2 (2nd Kyu) Only</option>
                    <option value="Brown-1">Brown-1 (1st Kyu) Only</option>
                    <option value="Black">Black Belt / Dan Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
              <button
                onClick={() => setShowFeeConfigModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`✓ Exam Schedule "${examScheduleConfig.exam_name}" updated! Applied Fee: ₹${examScheduleConfig.exam_fee}`);
                  setShowFeeConfigModal(false);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs shadow-lg"
              >
                Save Schedule & Fee Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRO MAX MASTER BELT EXAM FEE CONFIGURATOR MODAL */}
      {showBeltFeeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-3xl w-full text-gray-900 shadow-2xl border border-gray-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 uppercase tracking-wider">
                  Master Settings
                </span>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mt-1">
                  <Award className="w-5 h-5 text-amber-600" />
                  <span>Belt Rank Promotion Exam Fee Configurator</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-medium">
                  Set custom exam fees for each belt rank promotion. Changes update candidate roster fees, personal links & public forms.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset all belt promotion exam fees to default rates?')) {
                      setBeltFeeSettings(DEFAULT_BELT_FEE_MAP);
                      saveStoredBeltFees(DEFAULT_BELT_FEE_MAP);
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Reset to system defaults"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" /> Reset Defaults
                </button>

                <button
                  onClick={() => setShowBeltFeeModal(false)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Belt Fee Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Object.keys(beltFeeSettings).map((beltName) => {
                const currentFee = beltFeeSettings[beltName];
                let badgeStyle = 'bg-amber-50 text-amber-900 border-amber-200';
                let iconSymbol = '🥋';
                if (beltName.includes('Yellow')) { badgeStyle = 'bg-yellow-100 text-yellow-900 border-yellow-300'; iconSymbol = '🟡'; }
                else if (beltName.includes('Orange')) { badgeStyle = 'bg-orange-100 text-orange-900 border-orange-300'; iconSymbol = '🟠'; }
                else if (beltName.includes('Green')) { badgeStyle = 'bg-emerald-100 text-emerald-900 border-emerald-300'; iconSymbol = '🟢'; }
                else if (beltName.includes('Blue')) { badgeStyle = 'bg-blue-100 text-blue-900 border-blue-300'; iconSymbol = '🔵'; }
                else if (beltName.includes('Purple')) { badgeStyle = 'bg-purple-100 text-purple-900 border-purple-300'; iconSymbol = '🟣'; }
                else if (beltName.includes('Brown')) { badgeStyle = 'bg-amber-100 text-amber-900 border-amber-400'; iconSymbol = '🟤'; }
                else if (beltName.includes('Black') || beltName.includes('Dan')) { badgeStyle = 'bg-gray-900 text-white border-gray-800'; iconSymbol = '🖤'; }

                return (
                  <div key={beltName} className="p-3.5 bg-gray-50/90 border border-gray-200 rounded-2xl space-y-2 hover:border-amber-400 hover:bg-white transition-all shadow-sm group">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${badgeStyle}`}>
                        <span>{iconSymbol}</span>
                        <span>{beltName}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-black text-gray-500 font-mono">₹</span>
                      <input
                        type="number"
                        value={currentFee}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setBeltFeeSettings({ ...beltFeeSettings, [beltName]: val });
                        }}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-gray-900 font-black text-sm font-mono text-right focus:border-amber-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-gray-200/60">
                      {[500, 600, 700, 800, 1000, 1200, 1500, 2000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setBeltFeeSettings({ ...beltFeeSettings, [beltName]: amt })}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold transition cursor-pointer ${
                            currentFee === amt
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Footer Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Changes sync system-wide instantly
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBeltFeeModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveStoredBeltFees(beltFeeSettings);
                    setShowBeltFeeModal(false);
                    alert('✓ Master Belt Promotion Exam Fees updated & synced system-wide!');
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black rounded-xl text-xs shadow-lg shadow-amber-600/25 flex items-center gap-2 transform hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <Award className="w-4 h-4" /> Save All Belt Fees
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pro Max Single Candidate Unpaid Fee Warning Modal */}
      {pendingFeeCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto shadow-inner font-black">
              ⚠️
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">EXAM FEE PAYMENT REQUIRED!</h3>
              <p className="text-xs text-gray-600 font-medium">
                Cannot promote candidate <strong className="text-gray-900 uppercase font-black">"{pendingFeeCandidate.student_name}"</strong> to <strong className="text-red-600 font-black">{pendingFeeCandidate.target_belt}</strong>.
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/90 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-amber-900 font-bold">
                <span>Candidate Name:</span>
                <span className="font-black uppercase">{pendingFeeCandidate.student_name}</span>
              </div>
              <div className="flex justify-between items-center text-amber-900 font-bold">
                <span>Target Belt Rank:</span>
                <span className="font-black text-red-700">{pendingFeeCandidate.target_belt}</span>
              </div>
              <div className="flex justify-between items-center text-amber-900 font-bold pt-1 border-t border-amber-200/80">
                <span>Exam Fee Due:</span>
                <span className="text-sm font-black text-amber-900 font-mono">₹{pendingFeeCandidate.exam_fee || 500} (Status: PENDING)</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-center text-xs font-semibold text-gray-700">
              💡 Please collect the exam fee and click <strong className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-black">⚠️ Pending Payment</strong> to mark it as PAID first!
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingFeeCandidate(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  const targetCandidate = pendingFeeCandidate;
                  setPendingFeeCandidate(null);
                  await handlePaymentStatusChange(targetCandidate.id, 'Paid / Verified');
                  await handlePromoteBelt({ ...targetCandidate, payment_status: 'Paid / Verified' }, 'Passed');
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✅ Pay ₹{pendingFeeCandidate.exam_fee || 500} & Promote</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pro Max Bulk Candidates Unpaid Fees Warning Modal */}
      {unpaidBulkList.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl mx-auto shadow-inner font-black">
              ⚠️
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Exam Fees Pending for {unpaidBulkList.length} Candidates</h3>
              <p className="text-xs text-gray-500 font-medium">
                The following selected candidates have not paid their exam fees yet. Please collect or verify fees first.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl max-h-48 overflow-y-auto space-y-1.5 text-xs">
              {unpaidBulkList.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-white rounded-xl border border-gray-100 shadow-2xs">
                  <span className="font-bold text-gray-900">{c.student_name}</span>
                  <span className="font-mono font-black text-amber-700">₹{c.exam_fee || 500} PENDING</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUnpaidBulkList([])}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  const listToPay = [...unpaidBulkList];
                  setUnpaidBulkList([]);
                  setIsLoading(true);
                  for (const c of listToPay) {
                    await handlePaymentStatusChange(c.id, 'Paid / Verified');
                  }
                  setIsLoading(false);
                  alert(`✅ Marked ${listToPay.length} candidates as Exam Fee Paid & Verified! Now you can promote them.`);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✅ Mark All Fees Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Submitted Exam Form & Candidate Profile (Dynamic Per Form Type) */}
      {viewFormCandidate && (() => {
        const c = viewFormCandidate;
        const targetLower = (c.target_belt || c.current_belt || '').toLowerCase();
        const fType = c.form_type || (['black', 'dan', 'shodan', 'nidan'].some(t => targetLower.includes(t)) ? 'JAPAN_DIRECT_BLACK_BELT' : ['brown-3', 'brown-2', 'brown-1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetLower.includes(t)) ? 'JKK_BROWN' : 'JKK_WHITE_TO_BROWN_4');
        
        let formatTitle = '🥋 JKA KYU EXAMINATION FORM';
        let formatSubtitle = 'Kyu 10 to Kyu 4 Level (White, Yellow, Orange, Green, Blue, Purple)';
        let formatBadge = 'bg-emerald-600 text-white shadow-emerald-600/20';

        if (fType === 'JAPAN_DIRECT_BLACK_BELT' || fType === 'JKA_JAPAN') {
          formatTitle = '🇯🇵 JAPAN DIRECT BLACK BELT & DAN EXAMINATION FORM';
          formatSubtitle = 'Official JKA Japan Dan & Senior Black Belt Examiner Record';
          formatBadge = 'bg-red-700 text-white shadow-red-700/20';
        } else if (fType === 'JKK_BROWN') {
          formatTitle = '📜 JKA KYU REGISTRATION FORM (Brown Kyu)';
          formatSubtitle = 'Official Kyu Registration for Brown 3, Brown 2 & Brown 1 Ranks';
          formatBadge = 'bg-amber-600 text-white shadow-amber-600/20';
        }

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              <button 
                onClick={() => setViewFormCandidate(null)} 
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 p-2 rounded-full transition cursor-pointer shadow-xs"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Form Title & Format Header */}
              <div className="space-y-3 border-b border-gray-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${formatBadge}`}>
                    {formatTitle}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    c.payment_status?.includes('Paid') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {c.payment_status?.includes('Paid') ? '✅ Payment Verified' : '⚠️ Fee Pending'}
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                    {c.student_name}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Branch Dojo: <strong className="text-gray-800 font-bold">{c.branch_name || 'Pulikkal Main Dojo'}</strong> | Subordinated Category: <strong className="text-gray-800 font-bold">{formatSubtitle}</strong>
                  </p>
                </div>
              </div>

              {/* Dynamic Candidate Particulars Grid (Form Type Specific) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Personal Information Box */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2.5">
                  <h4 className="font-black text-gray-900 uppercase text-[11px] tracking-wider border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-red-600" />
                    <span>Candidate Personal Information</span>
                  </h4>
                  <p className="flex justify-between"><strong className="text-gray-600">Full Name:</strong> <span className="font-bold text-gray-900">{c.student_name}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-600">Reg / Member No:</strong> <span className="font-mono font-bold text-red-700">#{c.registration_no || c.admission_no || 'BAMA-00'}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-600">Age & Gender:</strong> <span className="font-bold text-gray-900">{c.age || 10} Yrs / {c.gender || 'Male'}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-600">Date of Birth:</strong> <span className="font-bold text-gray-900">{c.dob || 'N/A'}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-600">Height & Weight:</strong> <span className="font-bold text-gray-900">{c.height_cm || 150} cm / {c.weight_kg || 40} kg</span></p>
                  <p className="flex justify-between"><strong className="text-gray-600">Parent Tel / WA:</strong> <span className="font-mono font-bold text-emerald-700">{c.phone || '+91 9544085442'}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-600">Residence Address:</strong> <span className="font-bold text-gray-900 truncate max-w-[180px]">{c.address || 'Pulikkal'}</span></p>
                </div>

                {/* Form Specific Particulars & Exam Details Box */}
                <div className="bg-gradient-to-br from-amber-50/90 to-red-50/90 p-4 rounded-2xl border border-amber-200/90 space-y-2.5">
                  <h4 className="font-black text-gray-900 uppercase text-[11px] tracking-wider border-b border-amber-200 pb-1.5 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Grading Rank & Form Particulars</span>
                  </h4>
                  <p className="flex justify-between"><strong className="text-gray-700">Current Belt Rank:</strong> <span className="font-bold text-gray-900">🥋 {c.current_belt}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-700">Target Promotion Belt:</strong> <span className="font-black text-red-600 text-sm">🥋 {c.target_belt}</span></p>
                  <p className="flex justify-between"><strong className="text-gray-700">Term of Training:</strong> <span className="font-bold text-gray-900">{c.training_period_years || c.years_months_training || '1 Year 0 Months'}</span></p>
                  
                  {/* Instructor Reference if Brown or Black Belt */}
                  {(fType === 'JKK_BROWN' || fType === 'JAPAN_DIRECT_BLACK_BELT' || fType === 'JKA_JAPAN') && (
                    <>
                      <p className="flex justify-between"><strong className="text-gray-700">Instructor Reference:</strong> <span className="font-bold text-gray-900">{c.instructor_reference_name || 'Sensei Abdul Rahman'}</span></p>
                      <p className="flex justify-between"><strong className="text-gray-700">Reference Dojo / Phone:</strong> <span className="font-bold text-gray-900">{c.instructor_reference_address || c.instructor_reference_phone || '+91 95440 85442'}</span></p>
                    </>
                  )}

                  {/* Organization if Black Belt */}
                  {(fType === 'JAPAN_DIRECT_BLACK_BELT' || fType === 'JKA_JAPAN') && (
                    <p className="flex justify-between"><strong className="text-gray-700">Karate Organization:</strong> <span className="font-black text-red-700">{c.jka_organization || 'JKA INDIA'}</span></p>
                  )}

                  <p className="flex justify-between items-center pt-1 border-t border-amber-200">
                    <strong className="text-gray-700">Exam Fee Amount:</strong> 
                    <span className="font-mono font-black text-emerald-700 text-base">₹{c.exam_fee || getExamFeeForCandidate(c)} ({c.payment_mode || 'UPI'})</span>
                  </p>
                </div>
              </div>



              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewFormCandidate;
                      handleDeleteSubmission(target);
                    }}
                    className="px-3.5 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Permanently Delete This Submitted Exam Form"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = viewFormCandidate;
                      setViewFormCandidate(null);
                      triggerPrintForm(target);
                    }}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-gray-700" />
                    <span>🖨️ Print Form</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewFormCandidate;
                      setViewFormCandidate(null);
                      handleSendPersonalStudentLink(target);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send WhatsApp Confirmation</span>
                  </button>

                  {c.exam_status !== 'Passed' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewFormCandidate;
                        setViewFormCandidate(null);
                        handlePromoteBelt(target, 'Passed');
                      }}
                      className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Pass & Promote Belt</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hidden Printable Component */}
      {selectedPrintReg && (
        <div className="hidden">
          <GradingFormPrint reg={selectedPrintReg} />
        </div>
      )}
    </div>
  );
}
