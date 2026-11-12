import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Lock, Calendar, Phone, ArrowRight, AlertCircle,
  Loader2, CheckCircle2, Users, CreditCard, RefreshCw, Printer,
  Check, Building2, MapPin, Award, Clock, MessageSquare, Heart, LogOut, X,
  LayoutGrid, User
} from 'lucide-react';
import {
  getStudentPortalAuth,
  verifyStudentDOBLogin,
  verifyStudentPasswordLogin,
  updateStudent,
  fetchStudentPortalDetails,
  getGlobalFeeSettings
} from '../../services/api';
import {
  calculateAgeFromDOB,
  getTodayISO,
  isPlaceholderText,
  isValidStudentDOB,
  needsProfileUpdate,
  normalizeDobToISO
} from '../../utils/studentValidation';
import { buildCadetFeeSummary } from '../../utils/feeLedger';

const getBeltBadgeClasses = (rank = '') => {
  const r = String(rank).toLowerCase();
  if (r.includes('black')) return 'bg-gradient-to-r from-zinc-900 via-black to-zinc-900 text-amber-300 border-amber-400/70 shadow-md shadow-amber-500/20';
  if (r.includes('brown')) return 'bg-amber-950/90 text-amber-200 border-amber-600/60 shadow-sm';
  if (r.includes('blue')) return 'bg-blue-950/80 text-blue-200 border-blue-400/50 shadow-sm';
  if (r.includes('green')) return 'bg-emerald-950/80 text-emerald-200 border-emerald-400/50 shadow-sm';
  if (r.includes('purple')) return 'bg-purple-950/80 text-purple-200 border-purple-400/50 shadow-sm';
  if (r.includes('orange')) return 'bg-orange-950/80 text-orange-200 border-orange-400/50 shadow-sm';
  if (r.includes('yellow')) return 'bg-yellow-500/20 text-yellow-200 border-yellow-400/50 shadow-sm';
  if (r.includes('white')) return 'bg-white/15 text-gray-100 border-white/30';
  return 'bg-amber-400/15 text-amber-200 border-amber-400/40';
};

export default function StudentPortalLogin() {
  // Restore saved session if user reloads page
  const [activeStudent, setActiveStudent] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bama_active_portal_cadet');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Steps: 'PHONE' | 'SIBLING_SELECT' | 'VERIFY' | 'ENTER_PASSWORD' | 'LOGGED_IN'
  const [step, setStep] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bama_active_portal_cadet');
      return saved ? 'LOGGED_IN' : 'PHONE';
    } catch (e) {
      return 'PHONE';
    }
  });

  const [phone, setPhone] = useState('');
  const [studentOptions, setStudentOptions] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bama_portal_cadet_options');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({ dob: '', address: '', guardianName: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  const [portalDetails, setPortalDetails] = useState({
    feeSettings: getGlobalFeeSettings(),
    gradingRegistrations: [],
    beltGradings: [],
    attendanceRecords: []
  });
  const [portalRefreshing, setPortalRefreshing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeSection, setActiveSection] = useState('OVERVIEW');

  const refreshActiveStudentData = async (studentObj) => {
    if (!studentObj) return;
    setPortalRefreshing(true);
    try {
      const details = await fetchStudentPortalDetails(studentObj);
      if (details) {
        if (details.student) {
          setActiveStudent(details.student);
          try {
            sessionStorage.setItem('bama_active_portal_cadet', JSON.stringify(details.student));
          } catch (err) {}
        }
        setPortalDetails({
          feeSettings: details.feeSettings || getGlobalFeeSettings(),
          gradingRegistrations: details.gradingRegistrations || [],
          beltGradings: details.beltGradings || [],
          attendanceRecords: details.attendanceRecords || []
        });
      }
    } catch (err) {
      // Non-fatal: keep cached student session visible
    } finally {
      setPortalRefreshing(false);
    }
  };

  useEffect(() => {
    if (step === 'LOGGED_IN' && activeStudent?.id) {
      refreshActiveStudentData(activeStudent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeStudent?.id]);

  const feeSummary = useMemo(
    () => buildCadetFeeSummary(activeStudent || {}, portalDetails.feeSettings),
    [activeStudent, portalDetails.feeSettings]
  );

  const attendanceStats = useMemo(() => {
    const recs = portalDetails.attendanceRecords || [];
    if (!Array.isArray(recs) || recs.length === 0) return null;
    const present = recs.filter((a) => ['present', 'late'].includes(String(a.status || '').toLowerCase())).length;
    const absent = recs.filter((a) => String(a.status || '').toLowerCase() === 'absent').length;
    const total = recs.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, pct };
  }, [portalDetails.attendanceRecords]);

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!activeStudent) return;
    setProfileMessage({ type: '', text: '' });

    const status = needsProfileUpdate(activeStudent);
    const updatePayload = {
      admission_no: activeStudent.admission_no || activeStudent.admissionNo,
      branch: activeStudent.branch || activeStudent.branch_id || activeStudent.branch_name,
      branch_id: activeStudent.branch_id || (typeof activeStudent.branch === 'object' ? activeStudent.branch?.id : activeStudent.branch),
      branch_name: activeStudent.branch_name || activeStudent.branchName,
      shift: activeStudent.shift
    };

    if (status.missingDob) {
      const normalized = normalizeDobToISO(profileForm.dob);
      if (!normalized) {
        setProfileMessage({ type: 'error', text: 'Please select a valid Date of Birth (year 1940 or later, not future).' });
        return;
      }
      updatePayload.dob = normalized;
      const calcAge = calculateAgeFromDOB(normalized);
      if (calcAge !== null) updatePayload.age = calcAge;
    }

    if (status.missingAddress) {
      const addr = profileForm.address.trim();
      if (addr.length < 5 || isPlaceholderText(addr)) {
        setProfileMessage({ type: 'error', text: 'Please enter a real residential address (house name, place, post office).' });
        return;
      }
      updatePayload.address = addr;
    }

    if (status.missingGuardian && profileForm.guardianName.trim()) {
      const guard = profileForm.guardianName.trim();
      if (isPlaceholderText(guard)) {
        setProfileMessage({ type: 'error', text: 'Please enter real Parent/Guardian name.' });
        return;
      }
      updatePayload.guardian_name = guard;
      updatePayload.guardianName = guard;
    }

    setProfileSaving(true);
    try {
      const updated = await updateStudent(activeStudent.id, updatePayload);
      const merged = { ...activeStudent, ...updatePayload, ...(updated && typeof updated === 'object' ? updated : {}) };
      setActiveStudent(merged);
      try {
        sessionStorage.setItem('bama_active_portal_cadet', JSON.stringify(merged));
      } catch (err) {}
      setProfileForm({ dob: '', address: '', guardianName: '' });
      setProfileMessage({ type: 'success', text: 'Official cadet profile updated and synced cleanly!' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: 'Could not save details right now. Please try again.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Step 1: Submit Phone Number
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanP = phone.replace(/[^0-9]/g, '');
    if (cleanP.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await getStudentPortalAuth(cleanP);
      if (!res.success) {
        setError(res.message || 'No registered cadet found with this mobile number. If you just applied online, please wait for Sensei approval.');
        return;
      }

      if (res.multiple && Array.isArray(res.students) && res.students.length > 1) {
        // Siblings or multiple course enrollments detected! Ask parent to pick cadet
        setStudentOptions(res.students);
        try {
          sessionStorage.setItem('bama_portal_cadet_options', JSON.stringify(res.students));
        } catch (err) {}
        setStep('SIBLING_SELECT');
      } else {
        setStudentOptions([]);
        try {
          sessionStorage.removeItem('bama_portal_cadet_options');
        } catch (err) {}
        const cadet = res.student || (res.students && res.students[0]);
        selectAndProceed(cadet);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectAndProceed = (student) => {
    setActiveStudent(student);
    setActiveSection('OVERVIEW');
    setError('');
    // Direct verification via Date of Birth (No password creation loop!)
    setStep('VERIFY');
  };

  // Step 1.5: Sibling Select
  const handleSelectSibling = (student) => {
    selectAndProceed(student);
  };

  // Step 2A: Verify via Date of Birth (Primary, 100% Reliable across all devices)
  const handleDOBSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!dob) {
      setError('Please select or enter Cadet\'s Date of Birth.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyStudentDOBLogin(activeStudent.id, dob);
      if (res.success) {
        const cadet = res.student || activeStudent;
        setActiveStudent(cadet);
        try {
          sessionStorage.setItem('bama_active_portal_cadet', JSON.stringify(cadet));
        } catch (e) {}
        setStep('LOGGED_IN');
      } else {
        setError(res.message || 'Date of Birth does not match official cadet records. Please check or contact Sensei.');
      }
    } catch (err) {
      setError('Failed to verify Date of Birth. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Enter Existing Password (Optional Fallback)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyStudentPasswordLogin(activeStudent.id, password);
      if (res.success) {
        const cadet = res.student || activeStudent;
        setActiveStudent(cadet);
        try {
          sessionStorage.setItem('bama_active_portal_cadet', JSON.stringify(cadet));
        } catch (e) {}
        setStep('LOGGED_IN');
      } else {
        setError(res.message || 'Incorrect password. You can also log in directly using Date of Birth.');
      }
    } catch (err) {
      setError('Login error. Please try again or use Date of Birth.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    try {
      sessionStorage.removeItem('bama_active_portal_cadet');
      sessionStorage.removeItem('bama_portal_cadet_options');
    } catch (e) {}
    setActiveStudent(null);
    setStudentOptions([]);
    setShowReceiptModal(false);
    setActiveSection('OVERVIEW');
    setDob('');
    setPassword('');
    setError('');
    setStep('PHONE');
  };

  return (
    <div className={`min-h-[85vh] bg-[#06070B] flex ${step === 'LOGGED_IN' ? 'items-start pt-6 sm:pt-9 pb-14' : 'items-center py-8 sm:py-12'} justify-center px-3 sm:px-6 relative overflow-hidden`}>
      {/* Ambient Dojo Radial Spotlights */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/4 w-[480px] h-[480px] rounded-full bg-red-600/15 blur-[140px]" />
        <div className="absolute -bottom-32 right-1/4 w-[460px] h-[460px] rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <div className={`w-full relative z-10 transition-all duration-200 ${
        step === 'LOGGED_IN'
          ? 'max-w-5xl'
          : 'max-w-md bg-[#0B0D13]/90 rounded-3xl p-5 sm:p-8 border border-white/10 shadow-[0_24px_80px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden'
      }`}>
        {step !== 'LOGGED_IN' && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

            {/* Login Header */}
            <div className="text-center space-y-2 mb-6 relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 via-amber-400 to-black p-[2px] shadow-xl shadow-red-600/25 mx-auto overflow-hidden animate-sun-pulse">
                <img
                  src="/logo bama_240616_200739.jpg.jpeg"
                  alt="B.A.M.A. Official Logo"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300/90">
                <Shield className="w-2.5 h-2.5 text-red-500" /> Official Cadet Access
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider">
                CADET & PARENT PORTAL
              </h1>
              <p className="text-[11px] text-amber-400/90 font-semibold uppercase tracking-widest">
                Brave Academy of Martial Arts
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="mb-5 p-3.5 bg-red-950/80 border border-red-500/60 rounded-2xl text-red-200 text-xs flex items-center gap-2.5 font-bold shadow-lg animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* STEP 1: ENTER REGISTERED PHONE NUMBER */}
        {step === 'PHONE' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-gray-300 font-bold uppercase tracking-wider text-[11px]">
                Registered Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  autoFocus
                  placeholder="Enter 10-digit Parent Phone (e.g. 9562954164)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 pt-0.5">
                Instant access for all active enrolled cadets across all 11 B.A.M.A dojo branches.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-black text-xs shadow-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verify Mobile Number</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <Link to="/register" className="text-amber-400 hover:underline font-bold">
                New Admission Form →
              </Link>
              <Link to="/login" className="text-gray-400 hover:text-white">
                Sensei Office Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 1.5: SIBLINGS DETECTED - SELECT CADET */}
        {step === 'SIBLING_SELECT' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-center gap-2">
              <Users className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <span>Found multiple cadets under this mobile number. Choose cadet profile:</span>
            </div>

            <div className="space-y-2">
              {studentOptions.map(st => (
                <button
                  key={st.id}
                  onClick={() => handleSelectSibling(st)}
                  className="w-full p-3.5 bg-black/60 hover:bg-white/10 border border-white/15 hover:border-red-500 rounded-2xl flex items-center justify-between text-left transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    {st.photo ? (
                      <img
                        src={st.photo}
                        alt={st.name}
                        className="w-11 h-11 rounded-xl object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                        {st.name ? st.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-black text-xs group-hover:text-amber-400 transition">{st.name}</h4>
                      <p className="text-[10px] text-amber-300/90 font-bold">
                        {st.program || st.course || 'Karate'} • {st.admissionNo || st.admission_no}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {st.currentBelt || st.current_belt || 'White Belt'} • {st.branch_name || st.branch || 'Head Office'}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('PHONE')}
              className="w-full py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ← Back to Mobile Number
            </button>
          </div>
        )}

        {/* STEP 2A: DIRECT LOGIN VIA DATE OF BIRTH (No Password Setup Required) */}
        {step === 'VERIFY' && activeStudent && (
          <form onSubmit={handleDOBSubmit} className="space-y-4 text-xs animate-in fade-in duration-150">
            {/* Cadet Identity Card */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
              {activeStudent.photo ? (
                <img
                  src={activeStudent.photo}
                  alt={activeStudent.name}
                  className="w-12 h-12 rounded-xl object-cover border border-amber-500/40 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black flex items-center justify-center text-base flex-shrink-0">
                  {activeStudent.name ? activeStudent.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold block">Cadet Profile</span>
                <h4 className="text-white font-black text-sm truncate">{activeStudent.name}</h4>
                <p className="text-[10px] text-gray-400">
                  {activeStudent.currentBelt || activeStudent.current_belt || 'White Belt'} • {activeStudent.branch_name || activeStudent.branch || 'Head Office'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-4 h-4 text-amber-400" /> Enter Cadet's Date of Birth (DOB) *
              </label>
              <input
                type="date"
                required
                autoFocus
                min="1940-01-01"
                max={getTodayISO()}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-3 text-white font-bold text-sm focus:border-red-500 focus:outline-none"
              />
              <p className="text-[10px] text-gray-400">
                Enter official DOB submitted during academy admission to unlock portal instantly.{' '}
                {error && (
                  <a
                    href={`https://wa.me/919544085442?text=${encodeURIComponent(`Hello Sensei, my child ${activeStudent?.name || ''} (${activeStudent?.admission_no || activeStudent?.admissionNo || ''}) needs official Date of Birth corrected in Student Portal.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 font-bold underline ml-1"
                  >
                    Ask Sensei on WhatsApp to fix DOB
                  </a>
                )}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Open Cadet Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setStep('ENTER_PASSWORD')}
                className="text-amber-400 hover:underline font-bold cursor-pointer"
              >
                Or Login with Password →
              </button>
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                Change Number
              </button>
            </div>
          </form>
        )}

        {/* STEP 2B: OPTIONAL PASSWORD LOGIN */}
        {step === 'ENTER_PASSWORD' && activeStudent && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs animate-in fade-in duration-150">
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
              {activeStudent.photo ? (
                <img
                  src={activeStudent.photo}
                  alt={activeStudent.name}
                  className="w-11 h-11 rounded-xl object-cover border border-white/20 flex-shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black flex items-center justify-center text-sm flex-shrink-0">
                  {activeStudent.name ? activeStudent.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-white font-black text-xs truncate">{activeStudent.name}</h4>
                <p className="text-[10px] text-gray-400">
                  {activeStudent.currentBelt || activeStudent.current_belt || 'White Belt'} • {activeStudent.admissionNo || activeStudent.admission_no || ''}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-gray-300 font-bold flex items-center gap-1 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-red-500" /> Enter Portal Password *
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter your secret password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-3 text-white font-bold focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Login to Cadet Portal</span><ArrowRight className="w-4 h-4" /></>}
            </button>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setStep('VERIFY')}
                className="text-amber-400 hover:underline font-bold cursor-pointer"
              >
                ← Use Date of Birth (No Password Needed)
              </button>
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                Change Number
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: LOGGED IN - FULL CADET & PARENT FEE + PROFILE DASHBOARD */}
        {step === 'LOGGED_IN' && activeStudent && (() => {
          const admNo = activeStudent.admissionNo || activeStudent.admission_no || '';
          const branchName = activeStudent.branch_name || activeStudent.branch_detail?.name || activeStudent.branch || 'Head Office';
          const beltRank = activeStudent.currentBelt || activeStudent.current_belt || 'White Belt';
          const programName = activeStudent.program || activeStudent.course || 'Karate (Shotokan)';
          const liveAge = calculateAgeFromDOB(activeStudent.dob);
          const ageLabel = liveAge !== null
            ? `${liveAge} Yrs`
            : (isValidStudentDOB(activeStudent.dob) && activeStudent.age ? `${activeStudent.age} Yrs` : 'DOB Pending');
          const dueLabels = feeSummary.duePeriods.map((p) => `${p.label} (₹${p.pendingAmount})`).join(', ');
          const feeQueryText = feeSummary.totalPending > 0
            ? `Hello Sensei, this is parent of *${activeStudent.name}* (${admNo}, ${branchName}). Regarding pending fee balance of *₹${feeSummary.totalPending.toLocaleString()}*${dueLabels ? ` (${dueLabels})` : ''}${feeSummary.admissionPending > 0 ? ` + Admission ₹${feeSummary.admissionPending}` : ''}.`
            : `Hello Sensei, this is parent of cadet *${activeStudent.name}* (${admNo}, ${branchName}).`;

          const profileCheck = needsProfileUpdate(activeStudent);
          const examCount = portalDetails.gradingRegistrations.length + portalDetails.beltGradings.length;
          const totalAccountVolume = feeSummary.totalPaid + feeSummary.totalPending;
          const feeClearedPct = totalAccountVolume > 0
            ? Math.round((feeSummary.totalPaid / totalAccountVolume) * 100)
            : (feeSummary.totalPending === 0 ? 100 : 0);
          const sectionTabs = [
            { id: 'OVERVIEW', label: 'Overview', icon: LayoutGrid },
            {
              id: 'FEES',
              label: 'Fees & Ledger',
              icon: CreditCard,
              badge: feeSummary.totalPending > 0 ? `₹${feeSummary.totalPending}` : 'Paid',
              badgeTone: feeSummary.totalPending > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500/25 text-emerald-300'
            },
            {
              id: 'EXAMS',
              label: 'Exams & Belt',
              icon: Award,
              badge: examCount > 0 ? String(examCount) : null,
              badgeTone: 'bg-amber-400/25 text-amber-300'
            },
            {
              id: 'PROFILE',
              label: 'Profile & Dojo',
              icon: User,
              badge: profileCheck.needsAttention ? '!' : null,
              badgeTone: 'bg-amber-500 text-black'
            }
          ];

          const ringCircumference = 2 * Math.PI * 26;
          const ringOffset = ringCircumference - (feeClearedPct / 100) * ringCircumference;

          return (
            <div className="space-y-4 sm:space-y-5 text-xs animate-in fade-in duration-200">
              {/* Slim Executive Portal Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0D1017]/90 border border-white/10 backdrop-blur-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 via-amber-400 to-black p-[1.5px] shadow-md shadow-red-600/20 flex-shrink-0">
                    <img
                      src="/logo bama_240616_200739.jpg.jpeg"
                      alt="B.A.M.A."
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black tracking-wider text-white uppercase">Cadet Dashboard</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[9px] font-bold text-emerald-300 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">Brave Academy of Martial Arts • Parent Access</p>
                  </div>
                </div>

                {/* Quick Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refreshActiveStudentData(activeStudent)}
                    disabled={portalRefreshing}
                    className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    title="Refresh latest fees & profile from dojo server"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${portalRefreshing ? 'animate-spin' : ''}`} />
                    <span>{portalRefreshing ? 'Syncing...' : 'Refresh'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(true)}
                    className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/35 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Statement</span>
                  </button>

                  {studentOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setStep('SIBLING_SELECT');
                      }}
                      className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-400/35 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Switch ({studentOptions.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-1.5 bg-white/[0.04] hover:bg-red-500/20 text-gray-300 hover:text-red-200 border border-white/10 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* 2-ZONE LUXURY HERO: BLACK-CARD IDENTITY PASS + FINANCIAL CLEARANCE RING */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left 8 cols: Official Digital Membership Pass */}
                <div className="lg:col-span-8 relative overflow-hidden bg-gradient-to-br from-[#23090F] via-[#0E1017] to-[#08090D] p-5 sm:p-6 rounded-3xl border border-amber-500/25 text-white flex flex-col justify-between gap-4 shadow-[0_20px_60px_-15px_rgba(220,38,38,0.28)]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/75 to-transparent" />
                  <div className="pointer-events-none absolute -right-14 -top-14 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute right-6 top-5 text-white/[0.04] font-black text-5xl select-none tracking-widest">
                    BAMA
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                    {activeStudent.photo ? (
                      <div className="p-[2px] rounded-2xl bg-gradient-to-br from-amber-300 via-red-500 to-amber-600 shadow-xl shadow-red-600/25 flex-shrink-0">
                        <img
                          src={activeStudent.photo}
                          alt={activeStudent.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-[14px] object-cover bg-black"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-500 text-white font-black flex items-center justify-center text-2xl sm:text-3xl shadow-xl border-2 border-amber-400/70 flex-shrink-0">
                        {activeStudent.name ? activeStudent.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-[9px] uppercase font-mono tracking-widest text-emerald-300 font-black inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {activeStudent.status || 'Active'} Member
                        </span>
                        <span className={`px-2.5 py-0.5 border rounded-full font-black text-[10px] tracking-wide ${getBeltBadgeClasses(beltRank)}`}>
                          🥋 {beltRank}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight truncate">{activeStudent.name}</h2>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
                        <span className="font-mono px-2.5 py-0.5 rounded-lg bg-white/[0.07] border border-white/10 text-amber-200 font-bold">
                          {admNo}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="font-bold text-gray-200">{programName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] border-t border-white/10 pt-3.5 relative z-10">
                    <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08]">
                      <span className="text-gray-400 text-[9px] uppercase tracking-wider font-bold block">Branch Dojo</span>
                      <strong className="text-white block truncate">{branchName}</strong>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08]">
                      <span className="text-gray-400 text-[9px] uppercase tracking-wider font-bold block">Training Shift</span>
                      <strong className="text-white block truncate">{activeStudent.shift || 'Regular Shift'}</strong>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08]">
                      <span className="text-gray-400 text-[9px] uppercase tracking-wider font-bold block">Instructor</span>
                      <strong className="text-amber-300 block truncate">{activeStudent.instructor || 'Sensei Abdul Rahman'}</strong>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-black/35 border border-white/[0.08]">
                      <span className="text-gray-400 text-[9px] uppercase tracking-wider font-bold block">Member Since</span>
                      <strong className="text-white font-mono block">{feeSummary.joiningDate || activeStudent.joining_date || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Executive Fee Clearance Vault Card */}
                <div className={`lg:col-span-4 relative overflow-hidden p-5 rounded-3xl border flex flex-col justify-between gap-3 shadow-xl ${
                  feeSummary.totalPending === 0
                    ? 'bg-gradient-to-br from-emerald-950/70 via-[#0B1412] to-[#08090D] border-emerald-500/35'
                    : 'bg-gradient-to-br from-rose-950/60 via-[#150A0E] to-[#08090D] border-rose-500/35'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-[0.15em] block ${
                        feeSummary.totalPending === 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        {feeSummary.totalPending === 0 ? '✓ Account Cleared' : 'Balance Due'}
                      </span>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-0.5 tracking-tight">
                        ₹{feeSummary.totalPending.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        Rate: <strong className="text-white">₹{feeSummary.feeRate}</strong>{feeSummary.isQuarterly ? ' / Term' : ' / Mo'}
                      </p>
                    </div>

                    {/* SVG Clearance Ring */}
                    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          stroke={feeSummary.totalPending === 0 ? '#10B981' : '#F59E0B'}
                          strokeWidth="6"
                          strokeLinecap="round"
                          fill="none"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                          className="transition-all duration-700"
                        />
                      </svg>
                      <span className="absolute text-[11px] font-black font-mono text-white">
                        {feeClearedPct}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="px-2.5 py-2 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-gray-400 block">Total Paid</span>
                      <strong className="text-emerald-300 font-mono text-xs">₹{feeSummary.totalPaid.toLocaleString()}</strong>
                    </div>
                    <div className="px-2.5 py-2 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-gray-400 block">Periods Due</span>
                      <strong className={`font-mono text-xs ${feeSummary.duePeriods.length > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {feeSummary.duePeriods.length === 0 ? 'None' : `${feeSummary.duePeriods.length} Due`}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection('FEES')}
                    className="shimmer-btn-wrapper w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                    <span>Open Fee Ledger →</span>
                  </button>
                </div>
              </div>

              {/* SECTION TABS NAVIGATION DOCK */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-inner">
                {sectionTabs.map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSection(tab.id)}
                      className={`px-3 py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-lg shadow-red-600/25'
                          : 'text-gray-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{tab.label}</span>
                      {tab.badge && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black leading-tight ${
                          isActive ? 'bg-black/30 text-white' : tab.badgeTone
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* SECTION 1: OVERVIEW */}
              {activeSection === 'OVERVIEW' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1017]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/90 block">01 / Cadet Overview</span>
                      <h3 className="text-sm sm:text-base font-black text-white mt-0.5">Quick Academy Snapshot</h3>
                    </div>
                    <span className="text-[11px] font-bold text-gray-300">
                      {feeSummary.planLabel}
                    </span>
                  </div>

                  {/* Active Due / Cleared Periods Strip */}
                  {feeSummary.duePeriods.length > 0 || feeSummary.admissionPending > 0 ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-[#190B10] to-black border border-rose-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> Action Needed — Pending Fee Periods
                        </span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {feeSummary.admissionPending > 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/30 text-[11px] font-bold text-rose-200 font-mono">
                              Admission Fee: ₹{feeSummary.admissionPending.toLocaleString()}
                            </span>
                          )}
                          {feeSummary.duePeriods.map((dp) => (
                            <span key={dp.id} className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/30 text-[11px] font-bold text-rose-200 font-mono">
                              {dp.label}: ₹{dp.pendingAmount.toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('FEES')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition flex-shrink-0 cursor-pointer shadow-lg shadow-rose-600/20"
                      >
                        View Fee Ledger →
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-[#0C1915] to-black border border-emerald-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <strong className="text-white text-xs block">All Active Fees Cleared (₹0 Due)</strong>
                          <span className="text-[11px] text-emerald-300/90">
                            {feeSummary.paidMonthsList.length > 0
                              ? `Cleared: ${feeSummary.paidMonthsList.join(', ')}`
                              : 'Account is in good standing'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReceiptModal(true)}
                        className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/30 text-emerald-200 font-black text-xs rounded-xl transition cursor-pointer flex-shrink-0"
                      >
                        View Statement →
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/35 hover:-translate-y-0.5 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Billing Plan</span>
                        <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                          <CreditCard className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <strong className="text-base font-black text-white font-mono block">
                        ₹{feeSummary.feeRate.toLocaleString()} <span className="text-[11px] font-sans text-gray-400">{feeSummary.isQuarterly ? '/ 3 Mos' : '/ Mo'}</span>
                      </strong>
                      <p className="text-[10px] text-gray-400">
                        Paid: <strong className="text-emerald-300 font-mono">₹{feeSummary.totalPaid.toLocaleString()}</strong> • Due: <strong className={feeSummary.totalPending > 0 ? 'text-rose-300 font-mono' : 'text-emerald-300 font-mono'}>₹{feeSummary.totalPending.toLocaleString()}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-400/35 hover:-translate-y-0.5 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Course & Cadet</span>
                        <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-300">
                          <Award className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <strong className="text-sm font-black text-blue-300 block">{programName}</strong>
                      <p className="text-[10px] text-gray-300">{beltRank} • {ageLabel} • {activeStudent.bloodGroup || activeStudent.blood_group || 'O+'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/35 hover:-translate-y-0.5 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Guardian & Dojo</span>
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                          <Users className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <strong className="text-sm font-black text-white block truncate">
                        {activeStudent.guardianName || activeStudent.guardian_name || 'Not Entered'}
                      </strong>
                      <p className="text-[10px] text-emerald-300 font-mono">{activeStudent.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {profileCheck.needsAttention && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-amber-200 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>Some profile details (DOB / Address / Guardian) are missing.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('PROFILE')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-[11px] rounded-xl cursor-pointer flex-shrink-0"
                      >
                        Complete Profile →
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <Link
                      to={`/grading-registration?admission_no=${encodeURIComponent(admNo)}`}
                      className="shimmer-btn-wrapper py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      <span>Apply Belt Exam</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(true)}
                      className="py-3 px-4 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-amber-300" />
                      <span>Fee Statement</span>
                    </button>
                    <a
                      href={`https://wa.me/919544085442?text=${encodeURIComponent(feeQueryText)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Chat with Sensei</span>
                    </a>
                  </div>
                </div>
              )}

              {/* SECTION 2: FEES & LEDGER */}
              {activeSection === 'FEES' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1017]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/90 block">02 / Financial Ledger</span>
                      <h3 className="text-sm sm:text-base font-black text-white mt-0.5">Tuition, Admission & Monthly Breakdown</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReceiptModal(true)}
                      className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 hover:text-white text-[11px] font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Print Fee Statement</span>
                    </button>
                  </div>

                  {/* FINANCIAL SUMMARY BANNER + 3 KPI CARDS */}
                  <div className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border space-y-4 ${
                    feeSummary.totalPending === 0
                      ? 'bg-gradient-to-br from-emerald-950/60 via-[#071510] to-black border-emerald-500/35'
                      : 'bg-gradient-to-br from-rose-950/55 via-[#18080D] to-black border-rose-500/35'
                  }`}>
                    <div className={`h-0.5 w-full absolute top-0 inset-x-0 bg-gradient-to-r from-transparent ${
                      feeSummary.totalPending === 0 ? 'via-emerald-400/70' : 'via-rose-400/70'
                    } to-transparent`} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          feeSummary.totalPending === 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}>
                          {feeSummary.totalPending === 0
                            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Account Status — All Dues Cleared</>
                            : <><AlertCircle className="w-3.5 h-3.5" /> Fee Balance Due</>}
                        </span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1 tracking-tight">
                          {feeSummary.totalPending === 0
                            ? '✓ ₹0 Pending'
                            : `₹${feeSummary.totalPending.toLocaleString()} Total Pending`}
                        </div>
                        <p className="text-[11px] text-gray-300 mt-0.5">
                          {feeSummary.planLabel} • Rate: <strong className="text-white">₹{feeSummary.feeRate}</strong>
                          {feeSummary.isQuarterly ? ' / 3-Month Term' : ' / Month'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`https://wa.me/919544085442?text=${encodeURIComponent(feeQueryText)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition inline-flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{feeSummary.totalPending > 0 ? 'Send Payment / Query on WhatsApp' : 'WhatsApp Dojo Office'}</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-black/55 border border-white/10 space-y-1.5 hover:border-amber-400/25 transition">
                        <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-400/25 inline-flex items-center justify-center">
                            <CreditCard className="w-3 h-3 text-amber-400" />
                          </span>
                          {feeSummary.isQuarterly ? 'Term Tuition Fee' : 'Monthly Tuition Fee'}
                        </span>
                        <div className="flex items-baseline justify-between">
                          <strong className="text-base font-black text-white font-mono">₹{feeSummary.feeRate.toLocaleString()}</strong>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            feeSummary.tuitionPendingTotal === 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {feeSummary.tuitionPendingTotal === 0 ? '✓ Up to date' : `₹${feeSummary.tuitionPendingTotal.toLocaleString()} Due`}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Tuition Paid: <strong className="text-emerald-300 font-mono">₹{feeSummary.tuitionPaidTotal.toLocaleString()}</strong>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-black/55 border border-white/10 space-y-1.5 hover:border-amber-400/25 transition">
                        <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-400/25 inline-flex items-center justify-center">
                            <Award className="w-3 h-3 text-amber-400" />
                          </span>
                          One-Time Admission Fee
                        </span>
                        <div className="flex items-baseline justify-between">
                          <strong className="text-base font-black text-white font-mono">
                            {feeSummary.isAdmissionWaived ? '₹0 (Waived)' : `₹${feeSummary.admissionFee.toLocaleString()}`}
                          </strong>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            feeSummary.admissionPending === 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {feeSummary.isAdmissionWaived ? 'Free' : feeSummary.admissionPending === 0 ? '✓ Paid' : `₹${feeSummary.admissionPending.toLocaleString()} Due`}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Paid: <strong className="text-emerald-300 font-mono">₹{feeSummary.admissionPaid.toLocaleString()}</strong>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-black/55 border border-white/10 space-y-1.5 hover:border-emerald-400/25 transition">
                        <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-400/25 inline-flex items-center justify-center">
                            <Clock className="w-3 h-3 text-emerald-400" />
                          </span>
                          Cleared Months / Terms
                        </span>
                        <div className="flex items-baseline justify-between">
                          <strong className="text-base font-black text-emerald-300 font-mono">
                            ₹{feeSummary.totalPaid.toLocaleString()} Paid
                          </strong>
                          <span className="text-[10px] text-gray-300 font-bold">
                            {feeSummary.paidPeriods.length} Cleared
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">
                          {feeSummary.paidMonthsList.length > 0
                            ? `Months: ${feeSummary.paidMonthsList.join(', ')}`
                            : 'No paid month recorded yet'}
                        </p>
                      </div>
                    </div>

                    {feeSummary.totalPending > 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-[11px] text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span>
                          💳 <strong>How to Pay:</strong> Pay at the Dojo Office or via Google Pay / PhonePe to <strong className="font-mono text-amber-300">+91 95440 85442</strong> and share screenshot with Sensei.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DETAILED MONTH-BY-MONTH OR TERM-BY-TERM LEDGER */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/10 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          {feeSummary.isQuarterly
                            ? 'School Batch 3-Month Term Fee Ledger'
                            : `Monthly Fee Ledger (${feeSummary.displayYear})`}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {feeSummary.duePeriods.length === 0
                            ? 'All active fee periods from your joining date are cleared.'
                            : `${feeSummary.duePeriods.length} ${feeSummary.isQuarterly ? 'term(s)' : 'month(s)'} pending payment from your joining month.`}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">✓ Paid</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">◑ Partial</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">✕ Due</span>
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10">Upcoming</span>
                      </div>
                    </div>

                    {feeSummary.isQuarterly ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {feeSummary.periods.map((term) => (
                          <div
                            key={term.id}
                            className={`p-3.5 rounded-2xl border transition ${
                              term.status === 'PAID'
                                ? 'bg-emerald-950/35 border-emerald-500/35'
                                : term.status === 'PARTIAL'
                                  ? 'bg-amber-950/35 border-amber-500/35'
                                  : term.status === 'DUE'
                                    ? 'bg-rose-950/35 border-rose-500/35'
                                    : 'bg-white/[0.03] border-white/10 opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <div>
                                <strong className="text-white text-xs">{term.label}</strong>
                                <span className="block text-[10px] text-gray-300">{term.period}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                term.status === 'PAID'
                                  ? 'bg-emerald-600 text-white'
                                  : term.status === 'PARTIAL'
                                    ? 'bg-amber-500 text-black'
                                    : term.status === 'DUE'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-white/10 text-gray-300'
                              }`}>
                                {term.status === 'PAID'
                                  ? `✓ Paid (₹${term.rate})`
                                  : term.status === 'PARTIAL'
                                    ? `◑ Due ₹${term.pendingAmount}`
                                    : term.status === 'DUE'
                                      ? `✕ Due ₹${term.pendingAmount}`
                                      : `Upcoming (₹${term.rate})`}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 pt-2">
                              Months: <span className="text-gray-200 font-mono">{term.months.map((m) => m.split(' ')[0]).join(' + ')}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {feeSummary.periods.map((item) => {
                          if (item.status === 'BEFORE_JOINING') {
                            return (
                              <div key={item.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center opacity-50">
                                <span className="text-gray-400 font-bold text-xs block">{item.label}</span>
                                <span className="text-[10px] text-gray-500">Before Joining</span>
                              </div>
                            );
                          }
                          if (item.status === 'PAID') {
                            return (
                              <div key={item.id} className="p-3 rounded-xl bg-emerald-950/45 border border-emerald-500/35 text-center">
                                <span className="text-white font-bold text-xs block">{item.label}</span>
                                <span className="text-[10px] font-black text-emerald-300 font-mono">✓ Paid (₹{item.rate})</span>
                              </div>
                            );
                          }
                          if (item.status === 'PARTIAL') {
                            return (
                              <div key={item.id} className="p-3 rounded-xl bg-amber-950/45 border border-amber-500/45 text-center">
                                <span className="text-white font-bold text-xs block">{item.label}</span>
                                <span className="text-[10px] font-black text-amber-300 font-mono">
                                  ◑ Paid ₹{item.paidAmount} • Bal ₹{item.pendingAmount}
                                </span>
                              </div>
                            );
                          }
                          if (item.status === 'DUE') {
                            return (
                              <div key={item.id} className="p-3 rounded-xl bg-rose-950/45 border border-rose-500/45 text-center">
                                <span className="text-white font-bold text-xs block">{item.label}</span>
                                <span className="text-[10px] font-black text-rose-300 font-mono">✕ Due (₹{item.pendingAmount})</span>
                              </div>
                            );
                          }
                          return (
                            <div key={item.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center">
                              <span className="text-gray-300 font-bold text-xs block">{item.label}</span>
                              <span className="text-[10px] text-gray-400 font-mono">Upcoming (₹{item.rate})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 3: EXAMS, BELTS & ATTENDANCE */}
              {activeSection === 'EXAMS' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1017]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/90 block">03 / Exams & Training</span>
                      <h3 className="text-sm sm:text-base font-black text-white mt-0.5">Belt Grading Progress & Batch Schedule</h3>
                    </div>
                    <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${beltBadgeClasses}`}>
                      {beltRank}
                    </span>
                  </div>

                  {/* Belt Grading & Exam Status */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/10 space-y-3.5">
                    <h4 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-400/25 inline-flex items-center justify-center">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                      <span>Belt Grading & Exam Status</span>
                    </h4>

                    {portalDetails.gradingRegistrations.length > 0 && (
                      <div className="space-y-2">
                        {portalDetails.gradingRegistrations.map((reg) => (
                          <div key={reg.id || reg.registration_no} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-amber-300 font-mono text-[11px]">{reg.registration_no}</strong>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                String(reg.payment_status).toLowerCase() === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-200'
                              }`}>
                                Fee: {reg.payment_status || 'Pending'} • {reg.registration_status || 'Submitted'}
                              </span>
                            </div>
                            <p className="text-[11px] text-white font-bold">
                              Target Belt: {reg.target_belt} {reg.applied_fee ? `(Exam Fee: ₹${reg.applied_fee})` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {portalDetails.beltGradings.length > 0 && (
                      <div className="space-y-2">
                        {portalDetails.beltGradings.map((g) => (
                          <div key={g.id || g.certificate_no} className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-emerald-300 text-[11px]">{g.previous_belt} → {g.target_belt}</strong>
                              <span className="text-[10px] font-mono text-gray-300">{g.exam_date}</span>
                            </div>
                            <p className="text-[10px] text-gray-300">
                              Result: <strong className="text-white">{g.result}</strong> {g.certificate_no ? `• Cert: ${g.certificate_no}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {portalDetails.gradingRegistrations.length === 0 && portalDetails.beltGradings.length === 0 && (
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Current Rank: <strong className="text-white">{beltRank}</strong>. Ready to apply for the upcoming belt grading examination?
                      </p>
                    )}

                    <div className="shimmer-btn-wrapper block w-full rounded-xl">
                      <Link
                        to={`/grading-registration?admission_no=${encodeURIComponent(admNo)}`}
                        className="shimmer-btn-inner w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2"
                      >
                        <Award className="w-4 h-4" />
                        <span>Apply for Belt Grading Exam →</span>
                      </Link>
                    </div>
                  </div>

                  {/* Attendance Summary (only displayed when real backend attendance records exist) */}
                  {attendanceStats ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/10 space-y-3">
                      <h4 className="text-white font-black text-xs uppercase tracking-wider flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-400/25 inline-flex items-center justify-center">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                          <span>Class Attendance</span>
                        </span>
                        <strong className="text-emerald-300 font-mono text-sm">{attendanceStats.pct}%</strong>
                      </h4>
                      <div className="grid grid-cols-3 gap-2.5 text-center text-[11px]">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                          <strong className="block text-emerald-300 font-mono text-base">{attendanceStats.present}</strong>
                          <span className="text-[10px] text-gray-400 font-bold">Present</span>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                          <strong className="block text-rose-300 font-mono text-base">{attendanceStats.absent}</strong>
                          <span className="text-[10px] text-gray-400 font-bold">Absent</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                          <strong className="block text-white font-mono text-base">{attendanceStats.total}</strong>
                          <span className="text-[10px] text-gray-400 font-bold">Total Classes</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/10 space-y-2 text-[11px]">
                      <h4 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2.5">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-400/25 inline-flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        </span>
                        <span>Training Batch Schedule</span>
                      </h4>
                      <p className="text-white font-bold text-xs">{activeStudent.shift || 'Regular Dojo Timings'}</p>
                      <p className="text-gray-400">
                        Instructor: <strong className="text-amber-300">{activeStudent.instructor || 'Sensei Abdul Rahman'}</strong> • Branch: <strong className="text-white">{branchName}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: PROFILE & DOJO INFO */}
              {activeSection === 'PROFILE' && (
                <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1017]/90 border border-white/10 backdrop-blur-xl shadow-xl space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/90 block">04 / Profile & Dojo</span>
                      <h3 className="text-sm sm:text-base font-black text-white mt-0.5">Official Cadet Record & Branch Details</h3>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">ID: {admNo}</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/10 space-y-3">
                      <h4 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-400/25 inline-flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                        </span>
                        <span>Cadet & Guardian Details</span>
                      </h4>
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between gap-2 border-b border-white/5 pb-1.5">
                          <span className="text-gray-400">Parent / Guardian:</span>
                          <strong className="text-white text-right">{activeStudent.guardianName || activeStudent.guardian_name || 'Not Entered'}</strong>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-white/5 pb-1.5">
                          <span className="text-gray-400">Phone / WhatsApp:</span>
                          <strong className="text-emerald-300 font-mono text-right">{activeStudent.phone || 'N/A'}</strong>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-white/5 pb-1.5">
                          <span className="text-gray-400">Date of Birth / Age:</span>
                          <strong className="text-white font-mono text-right">
                            {isValidStudentDOB(activeStudent.dob) ? `${normalizeDobToISO(activeStudent.dob)} (${ageLabel})` : ageLabel}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-2 border-b border-white/5 pb-1.5">
                          <span className="text-gray-400">Gender & Blood:</span>
                          <strong className="text-white inline-flex items-center gap-1 text-right">
                            {activeStudent.gender || 'N/A'} • <Heart className="w-3 h-3 text-rose-400 inline" /> {activeStudent.bloodGroup || activeStudent.blood_group || 'O+'}
                          </strong>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">
                            <MapPin className="w-3 h-3 text-red-400 inline mr-1" /> Residential Address
                          </span>
                          <p className="text-gray-200 font-medium leading-relaxed">
                            {activeStudent.address || 'Not Entered'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {profileCheck.needsAttention && (
                        <form
                          onSubmit={handleCompleteProfile}
                          className="p-4 sm:p-5 bg-gradient-to-br from-amber-950/40 via-[#151008] to-black border border-amber-500/35 rounded-2xl space-y-3 text-left"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-amber-200 font-black text-xs">
                                Complete Official Cadet Profile
                              </p>
                              <p className="text-[10px] text-amber-100/80">
                                Please enter missing Date of Birth / residential address / guardian name so exam forms & certificates stay accurate.
                              </p>
                            </div>
                          </div>

                          {profileMessage.text && (
                            <div className={`px-3 py-2 rounded-xl text-[11px] font-bold ${
                              profileMessage.type === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {profileMessage.text}
                            </div>
                          )}

                          {profileCheck.missingDob && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-300 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-400" /> Official Date of Birth *
                              </label>
                              <input
                                type="date"
                                required
                                min="1940-01-01"
                                max={getTodayISO()}
                                value={profileForm.dob}
                                onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-bold focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                          )}

                          {profileCheck.missingAddress && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-300 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-amber-400" /> Full Residential Address *
                              </label>
                              <textarea
                                rows={2}
                                required
                                placeholder="House Name, Place, Post Office, Pin Code..."
                                value={profileForm.address}
                                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                          )}

                          {profileCheck.missingGuardian && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-300">Parent / Guardian Name</label>
                              <input
                                type="text"
                                placeholder="Father / Mother / Guardian full name"
                                value={profileForm.guardianName}
                                onChange={(e) => setProfileForm({ ...profileForm, guardianName: e.target.value })}
                                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                              />
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={profileSaving}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Save & Update Official Record</span>
                          </button>
                        </form>
                      )}

                      {/* Dojo Branch Info */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/10 space-y-2 text-[11px]">
                        <h4 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2.5">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-400/25 inline-flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                          <span>Dojo Branch Info</span>
                        </h4>
                        <p className="text-white font-bold text-xs">{branchName}</p>
                        <p className="text-gray-300">{activeStudent.shift || 'Regular Dojo Timings'}</p>
                        {activeStudent.branch_detail?.address && (
                          <p className="text-gray-400">{activeStudent.branch_detail.address}</p>
                        )}
                        <p className="text-gray-300 font-mono pt-1">Dojo Helpline: +91 95440 85442</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRINTABLE OFFICIAL FEE STATEMENT / RECEIPT MODAL */}
              {showReceiptModal && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-lg bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none">
                    <div className="h-2 bg-gradient-to-r from-red-700 via-amber-500 to-black" />
                    <div className="p-6 space-y-4 relative">
                      <button
                        type="button"
                        onClick={() => setShowReceiptModal(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer print:hidden"
                        aria-label="Close fee statement"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="text-center border-b border-gray-200 pb-3 space-y-1.5">
                        <img
                          src="/logo bama_240616_200739.jpg.jpeg"
                          alt="B.A.M.A."
                          className="w-11 h-11 rounded-full object-cover mx-auto border border-amber-500 shadow-sm"
                        />
                        <h3 className="text-base font-black text-red-700 tracking-wide">
                          BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)
                        </h3>
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                          Official Cadet Fee Statement
                        </p>
                      </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Cadet Name</span>
                        <strong className="font-black text-gray-900">{activeStudent.name}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Admission No</span>
                        <strong className="font-mono font-black text-gray-900">{admNo}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Branch Dojo</span>
                        <strong className="text-gray-800">{branchName}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Billing Plan</span>
                        <strong className="text-gray-800">{feeSummary.planLabel}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs border-b border-gray-200 pb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Admission Fee ({feeSummary.isAdmissionWaived ? 'Waived' : `₹${feeSummary.admissionFee}`}):</span>
                        <strong className="font-mono">
                          Paid ₹{feeSummary.admissionPaid} • Pending ₹{feeSummary.admissionPending}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tuition Fee (₹{feeSummary.feeRate}):</span>
                        <strong className="font-mono">
                          Paid ₹{feeSummary.tuitionPaidTotal} • Pending ₹{feeSummary.tuitionPendingTotal}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
                        <strong className="text-gray-900">Total Outstanding Balance:</strong>
                        <strong className={`font-mono font-black ${feeSummary.totalPending === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {feeSummary.totalPending === 0 ? '₹0 (Cleared)' : `₹${feeSummary.totalPending}`}
                        </strong>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-500 block">Cleared Periods:</span>
                      <p className="text-emerald-800 font-bold">
                        {feeSummary.paidMonthsList.length > 0 ? feeSummary.paidMonthsList.join(', ') : 'None yet'}
                      </p>
                      {feeSummary.duePeriods.length > 0 && (
                        <>
                          <span className="text-[10px] font-bold uppercase text-gray-500 block pt-1">Pending / Overdue Periods:</span>
                          <p className="text-rose-700 font-bold">
                            {feeSummary.duePeriods.map((p) => `${p.label} (₹${p.pendingAmount})`).join(', ')}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / Save PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReceiptModal(false)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
