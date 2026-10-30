import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, User, Lock, Calendar, Phone, ArrowRight, AlertCircle,
  Loader2, CheckCircle2, Users, KeyRound, QrCode, FileText, Download
} from 'lucide-react';
import {
  getStudentPortalAuth,
  verifyDOBAndSetPassword,
  verifyStudentPasswordLogin
} from '../../services/api';

export default function StudentPortalLogin() {
  const navigate = useNavigate();

  // Steps: 'PHONE' | 'SIBLING_SELECT' | 'ENTER_PASSWORD' | 'SET_PASSWORD' | 'LOGGED_IN'
  const [step, setStep] = useState('PHONE');

  const [phone, setPhone] = useState('');
  const [studentOptions, setStudentOptions] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);

  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        setError(res.message || 'No cadet found with this mobile number. Please check or contact Sensei.');
        return;
      }

      if (res.multiple) {
        // Siblings detected! Ask parent which cadet
        setStudentOptions(res.students);
        setStep('SIBLING_SELECT');
      } else {
        proceedWithStudent(res.student, res.hasPassword);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper when student is resolved
  const proceedWithStudent = (student, hasPass) => {
    setActiveStudent(student);
    if (hasPass) {
      setStep('ENTER_PASSWORD');
    } else {
      // First time login / old student without password: Ask DOB and let them create password
      setStep('SET_PASSWORD');
    }
  };

  // Step 1.5: Sibling Select
  const handleSelectSibling = async (student) => {
    setLoading(true);
    setError('');
    try {
      const res = await getStudentPortalAuth(phone, student.id);
      proceedWithStudent(student, res.hasPassword);
    } catch (err) {
      setError('Error selecting cadet profile.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Verify DOB & Set New Password (For First Time / Old Cadets)
  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!dob) {
      setError('Please select Date of Birth.');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyDOBAndSetPassword(activeStudent.id, dob, newPassword);
      if (res.success) {
        setActiveStudent(res.student);
        setStep('LOGGED_IN');
      } else {
        setError(res.message || 'Date of Birth does not match our records. Please contact Dojo.');
      }
    } catch (err) {
      setError('Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Enter Existing Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      const res = await verifyStudentPasswordLogin(activeStudent.id, password);
      if (res.success) {
        setActiveStudent(res.student);
        setStep('LOGGED_IN');
      } else {
        if (res.needsSetup) {
          setStep('SET_PASSWORD');
        } else {
          setError(res.message || 'Incorrect password.');
        }
      }
    } catch (err) {
      setError('Login error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-9 border border-white/10 shadow-2xl relative z-10 backdrop-blur-md">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-7">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-600 via-amber-500 to-black p-0.5 shadow-xl mx-auto border border-amber-500/40 overflow-hidden">
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
          <div className="mb-5 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-center gap-2 font-bold shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
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
                  placeholder="Enter 10-digit Parent Phone (e.g. 9544085442)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 pt-0.5">
                Works for both new and existing enrolled cadets across all dojo branches.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-black text-xs shadow-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Next</span><ArrowRight className="w-4 h-4" /></>}
            </button>

            <div className="text-center pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <Link to="/register" className="text-amber-400 hover:underline font-bold">
                New Admission? Register Here →
              </Link>
              <Link to="/login" className="text-gray-400 hover:text-white">
                Staff Office Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 1.5: SIBLING DETECTED - SELECT CADET */}
        {step === 'SIBLING_SELECT' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-center gap-2">
              <Users className="w-5 h-5 flex-shrink-0" />
              <span>Found multiple cadets under this mobile number. Please choose cadet:</span>
            </div>

            <div className="space-y-2">
              {studentOptions.map(st => (
                <button
                  key={st.id}
                  onClick={() => handleSelectSibling(st)}
                  className="w-full p-3.5 bg-black/60 hover:bg-white/10 border border-white/15 hover:border-red-500 rounded-2xl flex items-center justify-between text-left transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={st.photo || '/assets/prog_adults.jpg'}
                      alt={st.name}
                      className="w-10 h-10 rounded-xl object-cover border border-white/20"
                    />
                    <div>
                      <h4 className="text-white font-black text-xs group-hover:text-red-400 transition">{st.name}</h4>
                      <p className="text-[10px] text-gray-400">{st.currentBelt || st.current_belt || 'White Belt'} • {st.branch_name || st.branch || 'Head Office'}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('PHONE')}
              className="w-full py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold"
            >
              ← Back to Phone Input
            </button>
          </div>
        )}

        {/* STEP 2A: FIRST TIME LOGIN - VERIFY DOB & SET PASSWORD */}
        {step === 'SET_PASSWORD' && activeStudent && (
          <form onSubmit={handleSetPasswordSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-xs text-white">
                <User className="w-4 h-4 text-blue-400" /> Cadet: {activeStudent.name}
              </span>
              <p className="text-[10px] text-gray-300">
                First-time login setup: Verify Cadet's Date of Birth to create your password.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-gray-300 font-bold flex items-center gap-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Cadet's Date of Birth *
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-300 font-bold flex items-center gap-1 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Create Your New Password *
              </label>
              <input
                type="password"
                required
                placeholder="Enter new password (min 4 chars)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-300 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Confirm Password *
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Set Password & Open Portal</span><ArrowRight className="w-4 h-4" /></>}
            </button>

            <button
              type="button"
              onClick={() => setStep('PHONE')}
              className="w-full py-1 text-gray-400 hover:text-white text-xs font-bold"
            >
              ← Cancel
            </button>
          </form>
        )}

        {/* STEP 2B: ENTER PASSWORD */}
        {step === 'ENTER_PASSWORD' && activeStudent && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
              <img
                src={activeStudent.photo || '/assets/prog_adults.jpg'}
                alt={activeStudent.name}
                className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
              />
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
                placeholder="Enter your password..."
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
                onClick={() => setStep('SET_PASSWORD')}
                className="text-amber-400 hover:underline font-bold"
              >
                Forgot Password? (Use DOB)
              </button>
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-gray-400 hover:text-white"
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
                  <img
                    src={activeStudent.photo || '/assets/prog_adults.jpg'}
                    alt={activeStudent.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                  />
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
                  Age: {activeStudent.age || 10} Yrs • Blood: {activeStudent.bloodGroup || activeStudent.blood_group || 'O+'}
                </p>
              </div>
            </div>

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
              onClick={() => {
                setActiveStudent(null);
                setStep('PHONE');
              }}
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
