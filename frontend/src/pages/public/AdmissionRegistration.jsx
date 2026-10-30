import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, CheckCircle2, User, Phone, MapPin, Calendar, Award,
  Camera, Upload, Sparkles, Clock, AlertCircle, Loader2, ArrowRight,
  Info, Check, Lock
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
      const applicationId = `APP-${Date.now()}`;
      const tempAdmNo = `BAMA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create Lead in bama_admission_inquiries
      const newInquiry = {
        id: applicationId,
        type: 'ONLINE_ADMISSION',
        name: formData.name,
        photo: formData.photo || '',
        gender: formData.gender,
        dob: formData.dob || '2016-01-01',
        age: parseInt(formData.age) || calculateAge(formData.dob),
        blood_group: formData.blood_group,
        bloodGroup: formData.blood_group,
        guardian_name: formData.guardian_name,
        guardianName: formData.guardian_name,
        relationship: formData.relationship,
        phone: formData.phone,
        whatsapp: formData.whatsapp || formData.phone,
        address: formData.address,
        branch: formData.branch,
        branch_name: formData.branch,
        program: formData.program,
        shift: formData.shift,
        billing_plan: bPlan,
        admission_fee: feeInfo.admissionFee || 1000,
        fee_amount: monthlyOrSchool,
        password: formData.password || '',
        message: `Online Cadet Admission submitted for ${formData.branch} (${formData.shift}). Fees: Admission ₹${feeInfo.admissionFee}, Monthly ₹${monthlyOrSchool}.`,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'PENDING',
        suggested_admission_no: tempAdmNo
      };

      try {
        const existingInquiries = JSON.parse(localStorage.getItem('bama_admission_inquiries') || '[]');
        const updatedInquiries = [newInquiry, ...existingInquiries.filter(i => i.id !== applicationId)];
        localStorage.setItem('bama_admission_inquiries', JSON.stringify(updatedInquiries));

        // Generate Admin Notification
        const existingNotifs = JSON.parse(localStorage.getItem('bama_admin_notifications') || '[]');
        const newNotif = {
          id: `notif-${Date.now()}`,
          type: 'ONLINE_ADMISSION',
          title: `🥋 New Online Cadet Admission: ${formData.name}!`,
          desc: `Branch: ${formData.branch} | Batch: ${formData.shift} | Phone: ${formData.phone}`,
          time: 'Just now',
          read: false,
          inquiryId: applicationId
        };
        localStorage.setItem('bama_admin_notifications', JSON.stringify([newNotif, ...existingNotifs]));

        // Dispatch global events for real-time sync
        window.dispatchEvent(new Event('bama_notification_updated'));
      } catch (e) {
        console.warn('Local storage inquiry sync error:', e);
      }

      // 2. Also register payload in backend API
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
        status: 'Pending Approval',
        source: 'ONLINE_ADMISSION',
        portal_password: formData.password || null
      };

      let result = null;
      try {
        result = await createStudent(payload);
      } catch (apiErr) {
        console.warn('Backend student creation deferred:', apiErr);
      }

      // Save credentials map locally so student portal can recognize password
      if (formData.password) {
        try {
          const stored = localStorage.getItem('bama_student_credentials');
          const map = stored ? JSON.parse(stored) : {};
          const credKey = result?.id || formData.phone;
          map[credKey] = { password: formData.password, updated_at: new Date().toISOString() };
          map[formData.phone] = { password: formData.password, updated_at: new Date().toISOString() };
          localStorage.setItem('bama_student_credentials', JSON.stringify(map));
        } catch (e) {}
      }

      setSubmittedCadet({
        ...payload,
        application_id: applicationId,
        admission_no: result?.admission_no || result?.admissionNo || tempAdmNo
      });
    } catch (err) {
      setErrorMsg('Error submitting admission form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const branchFee = getBranchFeeSettings(formData.branch, branchesList);
  const isSchoolBranch = formData.branch.toLowerCase().includes('school') || formData.branch.toLowerCase().includes('amlp') || formData.branch.toLowerCase().includes('gmlp') || formData.branch.toLowerCase().includes('ansar');
  const displayMonthlyFee = isSchoolBranch ? (branchFee.schoolBatchFee || 500) : (branchFee.monthlyFee || 500);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden bg-black">
      {/* Martial Arts Pattern & Ambient Red Glow */}
      <div className="absolute inset-0 bg-martial-pattern opacity-10 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-red-600/15 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-3xl glass-card rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative z-10 space-y-6">
        {/* Academy Brand Header (Styled identically to Office Portal Login) */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 via-amber-500 to-black p-0.5 shadow-2xl mx-auto border border-amber-500/40 overflow-hidden">
            <img
              src="/logo bama_240616_200739.jpg.jpeg"
              alt="B.A.M.A. Official Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Official Online Admission
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            CADET REGISTRATION
          </h1>
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest">
            Brave Academy of Martial Arts (B.A.M.A)
          </p>
          <p className="text-[11px] text-gray-400 max-w-lg mx-auto">
            Affiliated with JKA India & Kerala Karate Association. Fill out cadet details below.
          </p>
        </div>

        {submittedCadet ? (
          <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-10 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Application Successfully Submitted!</h3>
              <p className="text-xs text-emerald-300 font-medium">
                Your admission request has been sent to Sensei for verification & approval.
              </p>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2.5 font-mono">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Cadet Name:</span>
                <strong className="text-white">{submittedCadet.name}</strong>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Application Ref:</span>
                <strong className="text-amber-400 font-bold">{submittedCadet.application_id || submittedCadet.admission_no}</strong>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Selected Dojo:</span>
                <strong className="text-emerald-400">{submittedCadet.branch}</strong>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Batch Timing:</span>
                <strong className="text-white">{submittedCadet.shift}</strong>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-gray-400">Guardian Contact:</span>
                <strong className="text-blue-400">{submittedCadet.phone}</strong>
              </div>
              <div className="flex justify-between pt-1 text-[11px]">
                <span className="text-gray-400">Sensei Approval:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  Pending Verification
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              Sensei will review your application and confirm your batch. You can connect directly with Sensei via WhatsApp.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <a
                href={`https://wa.me/919544085442?text=Hello%20Sensei,%20I%20have%20submitted%20an%20online%20cadet%20admission%20application%20for%20${encodeURIComponent(submittedCadet.name)}%20at%20${encodeURIComponent(submittedCadet.branch)}%20(${encodeURIComponent(submittedCadet.shift)}).%20Kindly%20confirm%20admission.`}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <span>WhatsApp Sensei Confirmation</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/student-portal"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <span>Go to Student Portal</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            {errorMsg && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Cadet Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                <User className="w-4 h-4 text-red-500" /> 1. Cadet Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-gray-300 font-bold block">Cadet Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter cadet's full name..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => {
                      const dobVal = e.target.value;
                      setFormData({ ...formData, dob: dobVal, age: calculateAge(dobVal) });
                    }}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Age (Calculated)</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Blood Group *</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none cursor-pointer"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5 pt-1">
                <label className="text-gray-300 font-bold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-red-500" /> Cadet Passport Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-white/20 shadow-md" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-gray-500">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <label className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-white font-bold text-xs cursor-pointer flex items-center gap-2 transition">
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>Upload Cadet Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Branch & Training Course */}
            <div className="space-y-4 pt-3">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                <MapPin className="w-4 h-4 text-amber-500" /> 2. Dojo Branch & Shift Timing
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Select Dojo Branch *</label>
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="w-full bg-black/60 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-amber-300 font-bold focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    {branchesList.map(b => (
                      <option key={b.id || b.name} value={b.name} className="bg-gray-900 text-white">
                        🏬 {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Discipline / Program *</label>
                  <select
                    required
                    value={formData.program}
                    onChange={(e) => handleProgramChange(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none cursor-pointer"
                  >
                    {PROGRAM_OPTIONS.map(p => (
                      <option key={p} value={p} className="bg-gray-900 text-white">{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold block">Preferred Training Batch / Shift *</label>
                <select
                  required
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {getDynamicShiftOptions(formData.branch, formData.program, branchesList).map(s => (
                    <option key={s} value={s} className="bg-gray-900 text-white">{s}</option>
                  ))}
                </select>
              </div>

              {/* Section 3: Fee Structure Details (Informational Only - No Payment Field) */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-red-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" /> Official Fee Structure ({formData.branch})
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-bold">
                    Payable at Dojo
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">One-Time Admission Fee</span>
                    <span className="text-xl font-black text-white">₹{branchFee.admissionFee}</span>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Monthly Training Fee</span>
                    <span className="text-xl font-black text-emerald-400">
                      ₹{displayMonthlyFee}
                      <span className="text-xs font-normal text-gray-400">/mo</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-400 justify-center">
                  <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Fees will be verified and collected by Sensei at the Dojo upon confirmation. No online payment required now.</span>
                </div>
              </div>
            </div>

            {/* Section 4: Parent / Guardian Contact */}
            <div className="space-y-4 pt-3">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                <Phone className="w-4 h-4 text-emerald-500" /> 3. Parent / Guardian Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Father / Guardian Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter parent / guardian name..."
                    value={formData.guardian_name}
                    onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Relationship *</label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Self">Self (Adult Cadet)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Mobile Phone Number (Cadet User ID) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      phone: e.target.value,
                      whatsapp: formData.whatsapp ? formData.whatsapp : e.target.value
                    })}
                    className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-emerald-300 font-bold font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">WhatsApp Contact Number</label>
                  <input
                    type="tel"
                    placeholder="WhatsApp number (if different)"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold block">Full Residential Address *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="House Name / Street / Town, Village / City, Pincode"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-white font-medium focus:border-red-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Section 5: Student Portal Password */}
            <div className="space-y-3 pt-3 bg-red-950/20 border border-red-500/30 p-4 rounded-2xl">
              <h3 className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-red-500" /> 4. Create Student Portal Password
              </h3>
              <p className="text-[11px] text-gray-400">
                You can use this password along with your Mobile Number to access your Cadet ID Card & Dojo Ledger once admitted.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Create secret password..."
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">Confirm Password *</label>
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
                  <span>Submitting Cadet Admission...</span>
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
    </div>
  );
}
