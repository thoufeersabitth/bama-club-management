import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, User, Lock, Calendar, Phone, ArrowRight, AlertCircle,
  Loader2, CheckCircle2, Users, KeyRound, QrCode, FileText, Download,
  Check, Sparkles, Building2, MapPin, Award
} from 'lucide-react';
import {
  getStudentPortalAuth,
  verifyStudentDOBLogin,
  verifyStudentPasswordLogin,
  updateStudent
} from '../../services/api';
import {
  calculateAgeFromDOB,
  getTodayISO,
  isPlaceholderText,
  isValidStudentDOB,
  needsProfileUpdate,
  normalizeDobToISO
} from '../../utils/studentValidation';

export default function StudentPortalLogin() {
  const navigate = useNavigate();

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
  const [studentOptions, setStudentOptions] = useState([]);

  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({ dob: '', address: '', guardianName: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

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
        // Siblings detected! Ask parent to pick cadet
        setStudentOptions(res.students);
        setStep('SIBLING_SELECT');
      } else {
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
    } catch (e) {}
    setActiveStudent(null);
    setDob('');
    setPassword('');
    setError('');
    setStep('PHONE');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-9 border border-white/10 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 via-amber-500 to-black p-0.5 shadow-xl mx-auto border border-amber-500/40 overflow-hidden">
            <img
              src="/logo bama_240616_200739.jpg.jpeg"
              alt="B.A.M.A. Official Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider">
            CADET & PARENT PORTAL
          </h1>
          <p className="text-[11px] text-amber-400 font-semibold uppercase tracking-widest">
            Brave Academy of Martial Arts
          </p>
        </div>

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

        {/* STEP 3: LOGGED IN - STUDENT DASHBOARD VIEW */}
        {step === 'LOGGED_IN' && activeStudent && (
          <div className="space-y-5 text-xs animate-in fade-in duration-200">
            {/* Student ID Badge Card */}
            <div className="bg-gradient-to-br from-red-950 via-gray-900 to-black p-5 rounded-2xl border border-red-500/40 text-white space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {activeStudent.photo ? (
                    <img
                      src={activeStudent.photo}
                      alt={activeStudent.name}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black flex items-center justify-center text-xl shadow-md border-2 border-amber-400">
                      {activeStudent.name ? activeStudent.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] uppercase font-mono tracking-widest text-amber-400">B.A.M.A. Cadet</span>
                    <h3 className="text-base font-black text-white leading-tight">{activeStudent.name}</h3>
                    <p className="text-[10px] text-gray-300 font-mono">Adm: {activeStudent.admissionNo || activeStudent.admission_no}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full font-black text-[10px]">
                  {activeStudent.currentBelt || activeStudent.current_belt || 'White Belt'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-white/10 pt-3">
                <div>
                  <span className="text-gray-400 text-[10px] block">Branch Dojo:</span>
                  <strong className="text-white">{activeStudent.branch_name || activeStudent.branch || 'Head Office'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Shift Batch:</span>
                  <strong className="text-white">{activeStudent.shift || 'Regular Shift'}</strong>
                </div>
              </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Fee Status</span>
                <strong className={`text-sm font-black ${
                  (activeStudent.feeStatus || activeStudent.fee_status) === 'Paid' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {(activeStudent.feeStatus || activeStudent.fee_status) === 'Paid' ? '✓ Paid' : 'Pending Dues'}
                </strong>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  Monthly: ₹{activeStudent.feeAmount || activeStudent.fee_amount || 500}
                </p>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Discipline</span>
                <strong className="text-sm font-black text-blue-300">
                  {activeStudent.program || activeStudent.course || 'Karate'}
                </strong>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  {(() => {
                    const liveAge = calculateAgeFromDOB(activeStudent.dob);
                    if (liveAge !== null) return `Age: ${liveAge} Yrs`;
                    if (isValidStudentDOB(activeStudent.dob) && activeStudent.age) return `Age: ${activeStudent.age} Yrs`;
                    return 'DOB Pending';
                  })()} • Blood: {activeStudent.bloodGroup || activeStudent.blood_group || 'O+'}
                </p>
              </div>
            </div>

            {needsProfileUpdate(activeStudent).needsAttention && (
              <form
                onSubmit={handleCompleteProfile}
                className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5 text-left"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-200 font-black text-xs">
                      Complete Official Cadet Profile
                    </p>
                    <p className="text-[10px] text-amber-100/80">
                      Please enter missing Date of Birth / residential address so exam forms & certificates stay accurate.
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

                {needsProfileUpdate(activeStudent).missingDob && (
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

                {needsProfileUpdate(activeStudent).missingAddress && (
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

                {needsProfileUpdate(activeStudent).missingGuardian && (
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
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Update Official Record</span>
                </button>
              </form>
            )}

            <Link
              to={`/grading-registration?admission_no=${encodeURIComponent(activeStudent.admission_no || activeStudent.admissionNo || '')}`}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" />
              <span>Apply for Belt Grading Exam →</span>
            </Link>

            {/* WhatsApp Sensei direct communication */}
            <a
              href={`https://wa.me/919544085442?text=Hello%20Sensei,%20this%20is%20parent%20of%20cadet%20${encodeURIComponent(activeStudent.name)}%20(${encodeURIComponent(activeStudent.admissionNo || activeStudent.admission_no)}).`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Chat with Sensei on WhatsApp</span>
            </a>

            <button
              onClick={handleSignOut}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
