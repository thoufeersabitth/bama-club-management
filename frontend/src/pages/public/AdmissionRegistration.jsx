import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, CheckCircle2, User, Phone, MapPin, Calendar, Award,
  Camera, Upload, Sparkles, Clock, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { fetchBranches, getBranchFeeSettings, createStudent } from '../../services/api';
import { INITIAL_BRANCHES, PROGRAM_OPTIONS, getDynamicShiftOptions } from '../../services/initialData';

export default function AdmissionRegistration() {
  const [branchesList, setBranchesList] = useState(INITIAL_BRANCHES);
  const [loading, setLoading] = useState(false);
  const [submittedCadet, setSubmittedCadet] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    photo: '',
    gender: 'Male',
    dob: '',
    age: 10,
    blood_group: 'O+',
    guardian_name: '',
    relationship: 'Father',
    phone: '',
    whatsapp: '',
    address: 'Pulikkal, Malappuram',
    branch: 'Pulikkal Branch (Head Office)',
    program: 'Karate (Shotokan)',
    shift: 'Evening Batch (5:00 PM - 7:00 PM)',
    password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchBranches(false).then(bList => {
      if (Array.isArray(bList) && bList.length > 0) {
        setBranchesList(bList);
        const firstB = bList[0];
        const shifts = getDynamicShiftOptions(firstB.name, 'Karate (Shotokan)', bList);
        setFormData(prev => ({
          ...prev,
          branch: firstB.name,
          shift: shifts[0] || 'Evening Batch (5:00 PM - 7:00 PM)'
        }));
      }
    }).catch(() => {});
  }, []);

  const calculateAge = (dobStr) => {
    if (!dobStr) return 10;
    const birth = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(4, Math.min(age, 75));
  };

  const handleBranchChange = (branchName) => {
    const shifts = getDynamicShiftOptions(branchName, formData.program, branchesList);
    setFormData(prev => ({
      ...prev,
      branch: branchName,
      shift: shifts[0] || 'Evening Batch (5:00 PM - 7:00 PM)'
    }));
  };

  const handleProgramChange = (progName) => {
    const shifts = getDynamicShiftOptions(formData.branch, progName, branchesList);
    setFormData(prev => ({
      ...prev,
      program: progName,
      shift: shifts[0] || 'Evening Batch (5:00 PM - 7:00 PM)'
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, photo: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password && formData.password !== formData.confirm_password) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const feeInfo = getBranchFeeSettings(formData.branch, branchesList);
      const isSchool = formData.branch.toLowerCase().includes('school') || formData.branch.toLowerCase().includes('amlp') || formData.branch.toLowerCase().includes('gmlp') || formData.branch.toLowerCase().includes('ansar');
      const bPlan = isSchool ? 'SCHOOL_BATCH' : 'REGULAR';
      const monthlyOrSchool = bPlan === 'SCHOOL_BATCH' ? (feeInfo.schoolBatchFee || 500) : (feeInfo.monthlyFee || 500);

      const payload = {
        name: formData.name,
        photo: formData.photo || '/assets/prog_adults.jpg',
        gender: formData.gender,
        dob: formData.dob || '2016-01-01',
        age: parseInt(formData.age) || calculateAge(formData.dob),
        blood_group: formData.blood_group,
        guardian_name: formData.guardian_name,
        relationship: formData.relationship,
        phone: formData.phone,
        whatsapp: formData.whatsapp || formData.phone,
        address: formData.address,
        branch_name: formData.branch,
        branch: formData.branch,
        program: formData.program,
        shift: formData.shift,
        billing_plan: bPlan,
        admission_fee: feeInfo.admissionFee || 1000,
        fee_amount: monthlyOrSchool,
        initial_paid_amount: 0,
        pending_amount: monthlyOrSchool,
        fee_status: 'Pending',
        current_belt: 'White Belt',
        status: 'Active',
        source: 'ONLINE_ADMISSION',
        portal_password: formData.password || null
      };

      const result = await createStudent(payload);

      // Save credentials map locally & sync
      if (result && result.id && formData.password) {
        try {
          const stored = localStorage.getItem('bama_student_credentials');
          const map = stored ? JSON.parse(stored) : {};
          map[result.id] = { password: formData.password, updated_at: new Date().toISOString() };
          localStorage.setItem('bama_student_credentials', JSON.stringify(map));
        } catch (e) {}
      }

      setSubmittedCadet({ ...payload, admission_no: result?.admission_no || result?.admissionNo || 'BAMA-NEW' });
    } catch (err) {
      setErrorMsg('Error submitting admission form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const branchFee = getBranchFeeSettings(formData.branch, branchesList);

  return (
    <div className="min-h-screen py-10 px-4 max-w-4xl mx-auto space-y-6">
      {/* Academy Brand Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Official Online Admission Portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          New Cadet Admission Form
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
          Brave Academy of Martial Arts (B.A.M.A.). Affiliated with JKA India & Kerala Karate Association.
        </p>
      </div>

      {submittedCadet ? (
        <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-10 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">Admission Application Submitted!</h3>
            <p className="text-xs text-emerald-300 font-medium">
              Welcome to B.A.M.A. Martial Arts Academy family.
            </p>
          </div>

          <div className="bg-black/50 border border-white/10 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-400">Cadet Name:</span>
              <strong className="text-white">{submittedCadet.name}</strong>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-400">Admission No:</span>
              <strong className="text-amber-400 font-bold">{submittedCadet.admission_no}</strong>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-400">Branch Dojo:</span>
              <strong className="text-emerald-400">{submittedCadet.branch}</strong>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-gray-400">Shift Batch:</span>
              <strong className="text-white">{submittedCadet.shift}</strong>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-400">Registered Phone:</span>
              <strong className="text-blue-400">{submittedCadet.phone}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              to="/student-portal"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <span>Go to Student Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={`https://wa.me/919544085442?text=Hello%20Sensei,%20I%20just%20submitted%20an%20admission%20for%20${encodeURIComponent(submittedCadet.name)}%20at%20${encodeURIComponent(submittedCadet.branch)}.`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition"
            >
              WhatsApp Sensei Confirmation
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-black/60 border border-white/10 rounded-3xl p-5 sm:p-8 space-y-6 text-xs shadow-2xl backdrop-blur-md">
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Cadet Personal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
              <User className="w-4 h-4 text-red-500" /> 1. Cadet Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-gray-300 font-bold">Full Cadet Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammed Adnan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.dob}
                  onChange={(e) => {
                    const dobVal = e.target.value;
                    setFormData({ ...formData, dob: dobVal, age: calculateAge(dobVal) });
                  }}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Age (Years)</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Blood Group *</label>
                <select
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-red-500" /> Cadet Photo (Optional)
              </label>
              <div className="flex items-center gap-3">
                {formData.photo && (
                  <img src={formData.photo} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
                )}
                <label className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-xs cursor-pointer flex items-center gap-2 transition">
                  <Upload className="w-3.5 h-3.5 text-red-400" />
                  <span>Choose Photo File</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Branch & Training Course */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
              <MapPin className="w-4 h-4 text-amber-500" /> 2. Training Dojo Branch & Batch
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Select Dojo Branch *</label>
                <select
                  required
                  value={formData.branch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full bg-black/50 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-amber-300 font-bold focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  {branchesList.map(b => (
                    <option key={b.id || b.name} value={b.name} className="bg-gray-900 text-white">
                      🏬 {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Course / Discipline *</label>
                <select
                  required
                  value={formData.program}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {PROGRAM_OPTIONS.map(p => (
                    <option key={p} value={p} className="bg-gray-900 text-white">{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-gray-300 font-bold">Training Shift / Batch *</label>
              <select
                required
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none cursor-pointer"
              >
                {getDynamicShiftOptions(formData.branch, formData.program, branchesList).map(s => (
                  <option key={s} value={s} className="bg-gray-900 text-white">{s}</option>
                ))}
              </select>
            </div>

            {/* Fee summary badge */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-amber-300">
              <span>💰 One-Time Admission Fee: ₹{branchFee.admissionFee}</span>
              <span>•</span>
              <span>🥋 Monthly Training Fee: ₹{branchFee.monthlyFee} / Month</span>
            </div>
          </div>

          {/* Section 3: Parent & Contact Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
              <Phone className="w-4 h-4 text-emerald-500" /> 3. Parent / Guardian Contact
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Father / Guardian Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abdul Rahman"
                  value={formData.guardian_name}
                  onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Mobile Phone Number (User ID) *</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value, whatsapp: formData.whatsapp || e.target.value })}
                  className="w-full bg-black/50 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-emerald-300 font-bold font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-gray-300 font-bold">Residential Location Address *</label>
              <textarea
                rows="2"
                required
                placeholder="House Name / Street / Junction, Village / City, Pincode"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-white font-medium focus:border-red-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Section 4: Create Portal Password */}
          <div className="space-y-3 pt-2 bg-red-950/20 border border-red-500/30 p-4 rounded-2xl">
            <h3 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-red-500" /> 4. Create Student Portal Password
            </h3>
            <p className="text-[11px] text-gray-400">
              This password will be used along with your Mobile Number to access your Cadet ID Card & Fee Ledger.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter secret password..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-bold">Confirm Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password..."
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting Admission Application...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Submit Cadet Admission Form</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
