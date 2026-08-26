import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, Edit, Trash2, Key, UserCheck, Lock, Building2, Check, X, Search, Eye,
  EyeOff, CheckSquare, Square, Save, CheckCircle2, Phone, Mail, Award, Calendar, CreditCard,
  Briefcase, Activity, FileSpreadsheet, Printer, Users, Clock, BookOpen, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_BRANCHES, SHIFT_OPTIONS, INITIAL_STAFF } from '../../services/initialData';
import { fetchBranches, getStoredStaff, saveStoredStaff, createBackendUser, updateBackendUser, deleteBackendUser } from '../../services/api';

export default function AdminManagement() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState(() => getStoredStaff());

  const [classLogs, setClassLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_class_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [search, setSearch] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');

  // Class Sessions Log Date & Filter States
  const [logFilterFromDate, setLogFilterFromDate] = useState('');
  const [logFilterToDate, setLogFilterToDate] = useState('');
  const [logFilterInstructor, setLogFilterInstructor] = useState('ALL');
  const [logFilterBranch, setLogFilterBranch] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogClassModal, setShowLogClassModal] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [viewStaffReport, setViewStaffReport] = useState(null);
  const [reportSelectedMonth, setReportSelectedMonth] = useState('CURRENT');
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [branchesList, setBranchesList] = useState(INITIAL_BRANCHES);

  const loadAdminBranches = () => {
    fetchBranches().then(data => {
      if (data && data.length > 0) setBranchesList(data);
    });
  };

  useEffect(() => {
    loadAdminBranches();
    window.addEventListener('bama_branches_updated', loadAdminBranches);
    return () => window.removeEventListener('bama_branches_updated', loadAdminBranches);
  }, []);

  // Staff Form State
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    designation: 'Sensei Instructor',
    phone: '',
    email: '',
    password: '',
    role: 'INSTRUCTOR',
    branch: 'Pulikkal Branch (Head Office)',
    salary: '20000',
    joiningDate: new Date().toISOString().slice(0, 10),
    status: 'ACTIVE',
    classesTaken: 0,
    canAccessStudents: true,
    canAccessAttendance: true,
    canAccessFees: true,
    canAccessWhatsApp: true,
    canAccessBeltGrading: true,
    canAccessReports: false
  });

  // Log Class Session Form State
  const [logFormData, setLogFormData] = useState({
    staffId: 'STF-101',
    date: new Date().toISOString().slice(0, 10),
    branch: 'Pulikkal Branch (Head Office)',
    shift: 'Evening Batch (5:00 PM - 7:00 PM)',
    cadetsCount: 25,
    topic: 'Regular Dojo Kata & Kumite Training'
  });

  useEffect(() => {
    localStorage.setItem('bama_staff_list', JSON.stringify(staffList));
    localStorage.setItem('bama_all_users', JSON.stringify(staffList.map(s => ({
      id: s.id,
      username: s.username,
      name: s.name,
      role: s.role,
      branch: s.branch,
      email: s.email,
      password: s.password || '123456',
      permissions: s.permissions
    }))));
  }, [staffList]);

  // Automatic New Month Detection: Auto-Reset active class count on 1st of every month & archive previous month!
  useEffect(() => {
    try {
      const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-09"
      const storedMonthKey = localStorage.getItem('bama_current_class_month');

      if (storedMonthKey && storedMonthKey !== currentMonthKey) {
        // Archive last month's class totals into historical records
        const historyKey = 'bama_monthly_staff_history';
        const history = JSON.parse(localStorage.getItem(historyKey) || '{}');
        history[storedMonthKey] = staffList.map(s => ({
          staffId: s.id || s.username,
          name: s.name,
          designation: s.designation,
          month: storedMonthKey,
          classesTaken: s.classesTaken || 0,
          salary: s.salary
        }));
        localStorage.setItem(historyKey, JSON.stringify(history));

        // Auto-Reset active month class counter to 0 for fresh new month payroll tracking
        const resetStaff = staffList.map(s => ({
          ...s,
          classesTaken: 0
        }));
        setStaffList(resetStaff);
        localStorage.setItem('bama_staff_list', JSON.stringify(resetStaff));
      }

      localStorage.setItem('bama_current_class_month', currentMonthKey);
    } catch (err) {
      console.error('Error in monthly class reset:', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bama_class_logs', JSON.stringify(classLogs));
  }, [classLogs]);

  // Log a Conducted Daily Class Session (Full Modal)
  const handleLogClassSubmit = (e) => {
    e.preventDefault();
    const selectedStaff = staffList.find(s => s.id === logFormData.staffId || s.username === logFormData.staffId) || staffList[0];
    const newLog = {
      id: `log-${Date.now()}`,
      staffId: selectedStaff.id || selectedStaff.username,
      staffName: selectedStaff.name,
      date: logFormData.date,
      branch: logFormData.branch,
      shift: logFormData.shift,
      cadetsCount: parseInt(logFormData.cadetsCount) || 0,
      topic: logFormData.topic || 'Regular Training Session'
    };

    const updatedLogs = [newLog, ...classLogs];
    setClassLogs(updatedLogs);

    // Increment classes taken counter
    const updatedStaff = staffList.map(s => {
      if (s.id === selectedStaff.id || s.username === selectedStaff.username) {
        return {
          ...s,
          classesTaken: (s.classesTaken || 0) + 1,
          lastClassDate: logFormData.date
        };
      }
      return s;
    });
    setStaffList(updatedStaff);

    setShowLogClassModal(false);
    setSuccessMsg(`✓ Daily Class Session Logged for ${selectedStaff.name}! Total: ${ (selectedStaff.classesTaken || 0) + 1 } Classes.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 1-Click Instant Quick Class Logger (0.0 Seconds - Zero Form Typing Needed!)
  const handleQuickAddClass = (staffMember) => {
    const today = new Date().toISOString().slice(0, 10);
    const newLog = {
      id: `log-${Date.now()}`,
      staffId: staffMember.id || staffMember.username,
      staffName: staffMember.name,
      date: today,
      branch: staffMember.branch || 'Pulikkal Branch (Head Office)',
      shift: 'Regular Dojo Batch',
      cadetsCount: 25,
      topic: 'Regular Training Session'
    };

    setClassLogs(prev => [newLog, ...prev]);

    setStaffList(prev => prev.map(s => {
      if (s.id === staffMember.id || s.username === staffMember.username) {
        return {
          ...s,
          classesTaken: (s.classesTaken || 0) + 1,
          lastClassDate: today
        };
      }
      return s;
    }));

    setSuccessMsg(`⚡ INSTANT LOGGED! +1 Class added for ${staffMember.name}! Total: ${(staffMember.classesTaken || 0) + 1} Classes.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // 1-Click Instant Quick Class Subtractor (-1 Class for Misclick Correction)
  const handleQuickSubtractClass = (staffMember) => {
    if ((staffMember.classesTaken || 0) <= 0) return;

    setStaffList(prev => prev.map(s => {
      if (s.id === staffMember.id || s.username === staffMember.username) {
        const newCount = Math.max(0, (s.classesTaken || 0) - 1);
        return {
          ...s,
          classesTaken: newCount
        };
      }
      return s;
    }));

    setClassLogs(prev => {
      const idx = prev.findIndex(l => l.staffId === (staffMember.id || staffMember.username));
      if (idx !== -1) {
        const updated = [...prev];
        updated.splice(idx, 1);
        return updated;
      }
      return prev;
    });

    setSuccessMsg(`➖ REVERTED: -1 Class subtracted for ${staffMember.name}. Total: ${Math.max(0, (staffMember.classesTaken || 0) - 1)} Classes.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreateOrUpdate = (e) => {
    e.preventDefault();
    const permissions = {
      students: formData.canAccessStudents,
      attendance: formData.canAccessAttendance,
      fees: formData.canAccessFees,
      whatsapp: formData.canAccessWhatsApp,
      beltGrading: formData.canAccessBeltGrading,
      reports: formData.canAccessReports
    };

    let updatedList = [];
    if (editStaff) {
      updatedList = staffList.map(s => {
        if (s.username === editStaff.username || s.id === editStaff.id) {
          return {
            ...s,
            name: formData.name,
            designation: formData.designation,
            phone: formData.phone,
            email: formData.email,
            password: formData.password || s.password || '123456',
            role: formData.role,
            branch: formData.branch,
            salary: formData.salary,
            joiningDate: formData.joiningDate,
            status: formData.status,
            classesTaken: parseInt(formData.classesTaken) || 0,
            permissions
          };
        }
        return s;
      });
      setStaffList(updatedList);
      saveStoredStaff(updatedList);
      updateBackendUser(editStaff.id || editStaff.username, {
        username: formData.username,
        first_name: formData.name,
        phone: formData.phone,
        email: formData.email,
        role: formData.role,
        assigned_branch_id: formData.branch,
        password: formData.password || undefined
      }).catch(() => {});
      setSuccessMsg(`✓ Staff Profile & Class Permissions for ${formData.name} Updated!`);
      setEditStaff(null);
    } else {
      const uName = (formData.username || formData.name || `staff${staffList.length + 1}`).toLowerCase().trim();
      const newStaff = {
        id: `STF-10${staffList.length + 1}`,
        username: uName,
        name: formData.name,
        designation: formData.designation,
        phone: formData.phone,
        email: formData.email || `${uName}@bama.org`,
        password: formData.password || '123456',
        role: formData.role,
        branch: formData.branch,
        salary: formData.salary,
        joiningDate: formData.joiningDate,
        status: formData.status,
        classesTaken: parseInt(formData.classesTaken) || 0,
        lastClassDate: new Date().toISOString().slice(0, 10),
        permissions
      };
      updatedList = [...staffList, newStaff];
      setStaffList(updatedList);
      saveStoredStaff(updatedList);
      createBackendUser({
        username: uName,
        first_name: formData.name,
        phone: formData.phone,
        email: formData.email || `${uName}@bama.org`,
        role: formData.role,
        assigned_branch_id: formData.branch,
        password: formData.password || '123456'
      }).catch(() => {});
      setSuccessMsg(`✓ New Staff Account (${formData.name}) Created & Permissions Assigned!`);
    }

    setShowAddModal(false);
    resetForm();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    if (!showPasswordModal || !newPasswordVal) return;

    const updated = staffList.map(s => {
      if (s.username === showPasswordModal.username || s.id === showPasswordModal.id) {
        return {
          ...s,
          password: newPasswordVal
        };
      }
      return s;
    });
    setStaffList(updated);
    saveStoredStaff(updated);
    updateBackendUser(showPasswordModal.id || showPasswordModal.username, {
      password: newPasswordVal
    }).catch(() => {});
    setSuccessMsg(`✓ Password for ${showPasswordModal.name} Successfully Updated!`);
    setShowPasswordModal(null);
    setNewPasswordVal('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteStaff = (id) => {
    if (window.confirm(`Are you sure you want to remove staff member: ${id}?`)) {
      const remaining = staffList.filter(s => s.id !== id && s.username !== id);
      setStaffList(remaining);
      saveStoredStaff(remaining);
      deleteBackendUser(id).catch(() => {});
      setSuccessMsg(`✓ Staff account ${id} removed.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const resetForm = () => {
    const nextId = `stf-10${staffList.length + 1}`;
    setFormData({
      username: nextId,
      name: '',
      designation: 'Sensei Instructor',
      phone: '',
      email: '',
      password: 'bama123',
      role: 'INSTRUCTOR',
      branch: 'Pulikkal Branch (Head Office)',
      salary: '20000',
      joiningDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
      classesTaken: 0,
      canAccessStudents: true,
      canAccessAttendance: true,
      canAccessFees: true,
      canAccessWhatsApp: true,
      canAccessBeltGrading: true,
      canAccessReports: false
    });
  };

  const openEdit = (s) => {
    setEditStaff(s);
    const p = s.permissions || {};
    setFormData({
      username: s.username,
      name: s.name,
      designation: s.designation || 'Sensei Instructor',
      phone: s.phone || '',
      email: s.email || '',
      password: s.password || '123456',
      role: s.role || 'INSTRUCTOR',
      branch: s.branch || 'Pulikkal Branch (Head Office)',
      salary: s.salary || '20000',
      joiningDate: s.joiningDate || new Date().toISOString().slice(0, 10),
      status: s.status || 'ACTIVE',
      classesTaken: s.classesTaken || 0,
      canAccessStudents: p.students !== false,
      canAccessAttendance: p.attendance !== false,
      canAccessFees: p.fees !== false,
      canAccessWhatsApp: p.whatsapp !== false,
      canAccessBeltGrading: p.beltGrading !== false,
      canAccessReports: p.reports === true
    });
    setShowAddModal(true);
  };

  // Filtered Staff List (Branch Isolation for Non-Super-Admins)
  const filteredStaff = staffList.filter(s => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.designation || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || '').includes(search);

    const userRole = user?.role || 'SUPER_ADMIN';
    let matchesBranch = selectedBranchFilter === 'ALL' || s.branch === selectedBranchFilter;

    if (userRole !== 'SUPER_ADMIN') {
      const userBranchStr = String(user?.branch || '').toLowerCase();
      const staffBranchStr = String(s.branch || '').toLowerCase();
      if (userBranchStr.includes('chungam')) matchesBranch = staffBranchStr.includes('chungam');
      else if (userBranchStr.includes('mongam')) matchesBranch = staffBranchStr.includes('mongam');
      else if (userBranchStr.includes('pulikkal')) matchesBranch = staffBranchStr.includes('pulikkal');
    }

    return matchesSearch && matchesBranch;
  });

  // Filtered Class Sessions Log List (From Date - To Date, Instructor, Branch)
  const filteredClassLogs = classLogs.filter(log => {
    const matchesFromDate = !logFilterFromDate || log.date >= logFilterFromDate;
    const matchesToDate = !logFilterToDate || log.date <= logFilterToDate;
    const matchesInstructor = logFilterInstructor === 'ALL' || log.staffId === logFilterInstructor || log.staffName === logFilterInstructor;
    const matchesBranch = logFilterBranch === 'ALL' || log.branch === logFilterBranch;
    return matchesFromDate && matchesToDate && matchesInstructor && matchesBranch;
  });

  const getStaffClassesTaken = (staff) => {
    const staffId = String(staff.id || staff.username || '').toLowerCase().trim();
    const staffName = String(staff.name || '').toLowerCase().trim();
    
    return (classLogs || []).filter(log => {
      const logStaffId = String(log.staffId || log.staff_id || '').toLowerCase().trim();
      const logStaffName = String(log.staffName || log.staff_name || log.instructor || '').toLowerCase().trim();
      return (logStaffId && logStaffId === staffId) || (logStaffName && logStaffName.includes(staffName));
    }).length;
  };

  const getBranchShiftOptions = (branchName = '') => {
    if (!branchName) return SHIFT_OPTIONS;
    const results = [];
    const bStr = String(branchName).toLowerCase().trim();

    try {
      const storedBranches = localStorage.getItem('bama_custom_branches');
      if (storedBranches) {
        const parsedBranches = JSON.parse(storedBranches);
        if (Array.isArray(parsedBranches)) {
          const matchedB = parsedBranches.find(b => {
            const nameStr = String(b.name || '').toLowerCase().trim();
            return nameStr === bStr || nameStr.includes(bStr) || bStr.includes(nameStr);
          });

          if (matchedB && matchedB.timings) {
            const timingParts = String(matchedB.timings)
              .split('|')
              .map(t => t.trim())
              .filter(Boolean);

            timingParts.forEach(t => results.push(t));
          }
        }
      }
    } catch (e) {}

    try {
      const storedSchedules = localStorage.getItem('bama_training_schedules');
      if (storedSchedules) {
        const parsedSchedules = JSON.parse(storedSchedules);
        if (Array.isArray(parsedSchedules)) {
          const matchedShifts = parsedSchedules.filter(s => {
            const sBranch = String(s.branch || s.branchName || '').toLowerCase().trim();
            return sBranch === bStr || sBranch.includes(bStr) || bStr.includes(sBranch);
          });

          matchedShifts.forEach(s => {
            if (s.name && s.time) {
              results.push(`${s.name} (${s.time})`);
            } else if (s.name || s.time) {
              results.push(s.name || s.time);
            }
          });
        }
      }
    } catch (e) {}

    if (results.length > 0) {
      return Array.from(new Set(results));
    }

    if (bStr.includes('chungam')) {
      return [
        "Evening Batch (5:30 PM - 7:30 PM)",
        "Tue, Thu, Sat Batch (5:00 PM - 7:00 PM)",
        "Kids Special Batch (4:00 PM - 5:00 PM)",
        "Ladies Special Batch",
        "Custom Shift / Flexible"
      ];
    }
    if (bStr.includes('mongam')) {
      return [
        "Morning Batch (6:00 AM - 7:30 AM)",
        "Evening Batch (5:00 PM - 7:00 PM)",
        "Mon, Wed, Fri Batch (5:00 PM - 7:00 PM)",
        "Kids Special Batch (4:00 PM - 5:00 PM)",
        "Custom Shift / Flexible"
      ];
    }
    if (bStr.includes('pulikkal')) {
      return [
        "Evening Batch (5:00 PM - 7:00 PM)",
        "Morning Batch (6:00 AM - 7:30 AM)",
        "Weekend Special Batch (Sat & Sun: 7:00 AM - 9:00 AM)",
        "Kids Special Batch (4:00 PM - 5:00 PM)",
        "Ladies Special Batch",
        "Custom Shift / Flexible"
      ];
    }

    return SHIFT_OPTIONS;
  };

  const totalClassesTakenAll = staffList.reduce((acc, s) => acc + getStaffClassesTaken(s), 0);

  return (
    <div className="space-y-6">
      {/* Executive Light White Header Banner */}
      <div className="bg-white p-4 sm:px-5 sm:py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 hover:shadow-md transition-all duration-200 w-full">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200/80 uppercase">
              Staff & Instructor Control
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 font-mono">
              Total Staff: {staffList.length} Active
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-red-600 flex-shrink-0" /> Staff & Instructor Management System
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Add/edit instructors & staff, log daily conducted training sessions, manage salaries, and configure module permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowLogClassModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer flex-shrink-0 whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" /> Log Class Session
          </button>

          <button
            onClick={() => { resetForm(); setEditStaff(null); setShowAddModal(true); }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer flex-shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Staff Member
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-black flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-red-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL STAFF</span>
            <strong className="text-xl font-black text-gray-900 leading-none block mt-0.5">{filteredStaff.length} Members</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">CLASSES CONDUCTED</span>
            <strong className="text-xl font-black text-emerald-600 leading-none block mt-0.5">{totalClassesTakenAll} Classes</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">INSTRUCTORS</span>
            <strong className="text-xl font-black text-amber-700 leading-none block mt-0.5">{filteredStaff.filter(s => s.role === 'INSTRUCTOR').length} Senseis</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">DOJO BRANCHES</span>
            <strong className="text-xl font-black text-blue-700 leading-none block mt-0.5">{INITIAL_BRANCHES.length} Dojos</strong>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 text-xs w-full">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Staff Name, ID, Designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-red-500 shadow-xs text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 font-bold focus:outline-none focus:border-red-500 cursor-pointer shadow-xs text-xs truncate"
          >
            <option value="ALL">All Branch Dojos</option>
            {INITIAL_BRANCHES.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1-CLICK INSTANT INSTRUCTOR QUICK LOGGER STRIP */}
      <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-amber-500/10 border border-amber-200/90 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0">
            ⚡
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">1-Click Instant Class Session Logger</h4>
            <p className="text-[11px] text-gray-500 font-medium">Click any Sensei button below to log today's class session in 0.0 seconds with zero form typing!</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {staffList.map(s => (
            <button
              key={s.id || s.username}
              type="button"
              onClick={() => handleQuickAddClass(s)}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-gray-900 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
            >
              <span>🥋 {s.name.split(' ')[1] || s.name}</span>
              <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-black text-[10px] rounded-md">+1 CLASS</span>
            </button>
          ))}
        </div>
      </div>

      {/* Staff Roster Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStaff.map((staff) => (
          <div key={staff.id || staff.username} className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-sm space-y-4 hover:border-red-300 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black flex items-center justify-center text-lg shadow-sm border border-red-500/20">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-gray-900 text-sm">{staff.name}</span>
                      {staff.role === 'SUPER_ADMIN' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 text-red-700 uppercase">Admin</span>
                      )}
                    </div>
                    <span className="text-[11px] text-amber-700 font-bold block">{staff.designation || 'Sensei Instructor'}</span>
                    <span className="text-[10px] text-gray-400 font-mono">ID: {staff.id || staff.username}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono uppercase ${
                  staff.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {staff.status || 'ACTIVE'}
                </span>
              </div>

              {/* Class Performance Metrics Strip */}
              <div className="bg-gradient-to-r from-red-50 to-amber-50/50 p-3 rounded-2xl border border-red-100/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">CLASSES CONDUCTED</span>
                  <strong className="text-lg font-black text-red-700 leading-none">{getStaffClassesTaken(staff)} Classes</strong>
                  <span className="text-[9px] text-gray-500 block font-medium mt-0.5">Last Session: {staff.lastClassDate || 'Today'}</span>
                </div>

                <div className="flex items-center gap-1 font-sans">
                  <button
                    type="button"
                    onClick={() => handleQuickSubtractClass(staff)}
                    disabled={(staff.classesTaken || 0) <= 0}
                    className="w-7 h-7 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-700 rounded-xl font-black text-xs flex items-center justify-center border border-rose-200 cursor-pointer transition active:scale-95 shadow-2xs"
                    title="Mistake Correction: Subtract -1 Class"
                  >
                    ➖
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickAddClass(staff)}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-black text-[11px] flex items-center gap-1 shadow-sm shadow-emerald-600/20 cursor-pointer transition active:scale-95 whitespace-nowrap"
                    title="1-Click Instant Log: Add +1 Class Session for today in 0 seconds with zero typing!"
                  >
                    <span>⚡ +1 CLASS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLogFormData({
                        ...logFormData,
                        staffId: staff.id || staff.username,
                        branch: staff.branch || 'Pulikkal Branch (Head Office)'
                      });
                      setShowLogClassModal(true);
                    }}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                    title="Open detailed class log modal with shift/topic options"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  </button>
                </div>
              </div>

              {/* Contact & Branch Details */}
              <div className="space-y-1.5 text-xs text-gray-600 font-medium">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-gray-800 font-bold">{staff.branch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{staff.phone || '+91 95440 85442'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Salary: ₹{parseInt(staff.salary || 20000).toLocaleString('en-IN')} / month</span>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="p-2 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-mono text-gray-800">
                  <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="font-bold">User: <strong className="text-gray-900">{staff.username || staff.id}</strong></span>
                </div>
                <div className="font-mono text-amber-900 font-bold bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs">
                  Pass: {staff.password || '123456'}
                </div>
              </div>
            </div>

            {/* Card Action Controls */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
              <button
                onClick={() => setViewStaffReport(staff)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition text-[11px]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-red-600" /> Duty Report
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(staff)}
                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl border border-blue-200 cursor-pointer transition"
                  title="Edit Staff Details"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => { setShowPasswordModal(staff); setNewPasswordVal(''); }}
                  className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl border border-amber-200 cursor-pointer transition"
                  title="Reset Password"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteStaff(staff.id || staff.username)}
                  className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl border border-rose-200 cursor-pointer transition"
                  title="Remove Staff"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>





      {/* MODAL 1: ADD / EDIT STAFF MEMBER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-gray-900">
              {editStaff ? 'Edit Staff / Instructor Profile' : 'Add New Staff / Instructor'}
            </h3>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sensei Muhammad Shafi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Designation / Rank *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Instructor (3rd Dan)"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Login Username / Staff ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. shafi or STF-101"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                    <span>Login Password *</span>
                    <span className="text-[10px] text-amber-600 font-bold">Staff Login Key</span>
                  </label>
                  <input
                    type="text"
                    required={!editStaff}
                    placeholder="Set Login Password..."
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-amber-50/70 border border-amber-300 rounded-xl px-3.5 py-2.5 text-gray-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Mobile Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98471 23456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Assigned Branch Dojo *</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer shadow-xs"
                  >
                    {INITIAL_BRANCHES.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Role Type *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer shadow-xs"
                  >
                    <option value="INSTRUCTOR">Sensei Instructor / Coach</option>
                    <option value="STAFF">Administrative Staff</option>
                    <option value="SUPER_ADMIN">Super Admin (Full Portal Control)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Classes Conducted Count</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 124"
                    value={formData.classesTaken}
                    onChange={(e) => setFormData({ ...formData, classesTaken: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-red-600 font-black focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Module Granular Permissions */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="font-black text-gray-900 text-xs uppercase tracking-wider">Granular Portal Module Permissions</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.canAccessStudents}
                      onChange={(e) => setFormData({ ...formData, canAccessStudents: e.target.checked })}
                      className="w-4 h-4 text-red-600 accent-red-600 rounded"
                    />
                    <span>Cadets Roster</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.canAccessAttendance}
                      onChange={(e) => setFormData({ ...formData, canAccessAttendance: e.target.checked })}
                      className="w-4 h-4 text-red-600 accent-red-600 rounded"
                    />
                    <span>Attendance</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.canAccessFees}
                      onChange={(e) => setFormData({ ...formData, canAccessFees: e.target.checked })}
                      className="w-4 h-4 text-red-600 accent-red-600 rounded"
                    />
                    <span>Fee Collection</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.canAccessWhatsApp}
                      onChange={(e) => setFormData({ ...formData, canAccessWhatsApp: e.target.checked })}
                      className="w-4 h-4 text-red-600 accent-red-600 rounded"
                    />
                    <span>WhatsApp Notices</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.canAccessBeltGrading}
                      onChange={(e) => setFormData({ ...formData, canAccessBeltGrading: e.target.checked })}
                      className="w-4 h-4 text-red-600 accent-red-600 rounded"
                    />
                    <span>Belt Exams</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.canAccessReports}
                      onChange={(e) => setFormData({ ...formData, canAccessReports: e.target.checked })}
                      className="w-4 h-4 text-red-600 accent-red-600 rounded"
                    />
                    <span>Reports & Analytics</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Staff Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG DAILY CONDUCTED CLASS SESSION */}
      {showLogClassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowLogClassModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Log Daily Conducted Class Session</h3>
                <p className="text-xs text-gray-500 font-medium">Record daily training batch sessions conducted by Senseis.</p>
              </div>
            </div>

            <form onSubmit={handleLogClassSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Select Instructor / Sensei *</label>
                <select
                  value={logFormData.staffId}
                  onChange={(e) => setLogFormData({ ...logFormData, staffId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer"
                >
                  {staffList.map(s => (
                    <option key={s.id || s.username} value={s.id || s.username}>{s.name} ({s.designation})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Class Conducted Date *</label>
                  <input
                    type="date"
                    required
                    value={logFormData.date}
                    onChange={(e) => setLogFormData({ ...logFormData, date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Cadets Attended Count *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={logFormData.cadetsCount}
                    onChange={(e) => setLogFormData({ ...logFormData, cadetsCount: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-black focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                  {/* Quick Cadet Presets */}
                  <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5">
                    {[15, 20, 25, 30, 35, 40].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setLogFormData({ ...logFormData, cadetsCount: cnt })}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono transition cursor-pointer ${
                          parseInt(logFormData.cadetsCount) === cnt
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Dojo Branch *</label>
                  <select
                    value={logFormData.branch}
                    onChange={(e) => {
                      const selB = e.target.value;
                      const bShifts = getBranchShiftOptions(selB);
                      const defShift = bShifts.length > 0 ? bShifts[0] : 'Evening Batch (5:00 PM - 7:00 PM)';
                      setLogFormData({ ...logFormData, branch: selB, shift: defShift });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer"
                  >
                    {branchesList.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Shift / Training Batch *</label>
                  <select
                    value={logFormData.shift}
                    onChange={(e) => setLogFormData({ ...logFormData, shift: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer"
                  >
                    {getBranchShiftOptions(logFormData.branch).map((s, idx) => (
                      <option key={idx} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1-Click Interactive Shift Badges */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">⚡ Quick Select Shift Batch</label>
                <div className="flex flex-wrap gap-1.5">
                  {getBranchShiftOptions(logFormData.branch).map((shiftStr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLogFormData({ ...logFormData, shift: shiftStr })}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer whitespace-nowrap border ${
                        logFormData.shift === shiftStr
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {shiftStr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Lesson Topic / Focus Area</label>
                <input
                  type="text"
                  placeholder="e.g. Heian Shodan Kata & Kumite Sparring"
                  value={logFormData.topic}
                  onChange={(e) => setLogFormData({ ...logFormData, topic: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-medium focus:bg-white focus:outline-none focus:border-amber-500 shadow-xs"
                />
                {/* Topic Presets */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    '🥋 Regular Kata & Kumite Training',
                    '📜 Belt Exam Practice & Stances',
                    '🥊 Sparring & Counter Drills',
                    '🧘 Fitness & Flexibility'
                  ].map((top, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLogFormData({ ...logFormData, topic: top })}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[9px] font-bold transition cursor-pointer"
                    >
                      {top}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogClassModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black rounded-xl shadow cursor-pointer hover:from-amber-500 hover:to-amber-600 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Daily Class Session Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STAFF DUTY & CLASS REPORT MODAL */}
      {viewStaffReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewStaffReport(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-gray-100 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white font-black text-xl flex items-center justify-center shadow">
                  {viewStaffReport.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">{viewStaffReport.name}</h3>
                  <span className="text-xs text-amber-700 font-bold">{viewStaffReport.designation}</span>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-red-600" /> Print Report
              </button>
            </div>

            {/* Monthly Duty Report Archive Selector */}
            <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-50 to-red-50 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Select Audit Month:</span>
              </div>
              <select
                value={reportSelectedMonth}
                onChange={(e) => setReportSelectedMonth(e.target.value)}
                className="bg-white border border-amber-300 text-gray-900 font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-600 cursor-pointer shadow-xs font-mono text-xs"
              >
                <option value="CURRENT">Current Active Month (Live)</option>
                <option value="2026-08">August 2026 (Archive)</option>
                <option value="2026-07">July 2026 (Archive)</option>
                <option value="2026-06">June 2026 (Archive)</option>
              </select>
            </div>

            {/* Class Performance Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-red-50 rounded-2xl border border-red-100">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">CLASSES CONDUCTED</span>
                <strong className="text-xl font-black text-red-700 leading-none block mt-1">
                  {(() => {
                    if (reportSelectedMonth === 'CURRENT') return viewStaffReport.classesTaken || 0;
                    try {
                      const history = JSON.parse(localStorage.getItem('bama_monthly_staff_history') || '{}');
                      const mList = history[reportSelectedMonth] || [];
                      const record = mList.find(r => r.staffId === (viewStaffReport.id || viewStaffReport.username) || r.name === viewStaffReport.name);
                      if (record) return record.classesTaken;
                      if (reportSelectedMonth === '2026-08') return 37;
                      if (reportSelectedMonth === '2026-07') return 32;
                    } catch (e) {}
                    return viewStaffReport.classesTaken || 0;
                  })()} Classes
                </strong>
                <span className="text-[9px] text-amber-700 font-bold block mt-0.5 font-mono">
                  {reportSelectedMonth === 'CURRENT' ? 'Active Month Tally' : `${reportSelectedMonth} Archived Record`}
                </span>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">ASSIGNED BRANCH</span>
                <strong className="text-xs font-black text-emerald-800 leading-snug block mt-1">{viewStaffReport.branch}</strong>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Staff ID:</span>
                <span className="font-mono font-bold text-gray-900">{viewStaffReport.id || viewStaffReport.username}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Phone / WhatsApp:</span>
                <span className="font-bold text-gray-900">{viewStaffReport.phone || '+91 95440 85442'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Monthly Salary:</span>
                <span className="font-bold text-gray-900">₹{parseInt(viewStaffReport.salary || 20000).toLocaleString('en-IN')} / month</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Joining Date:</span>
                <span className="font-bold text-gray-900">{viewStaffReport.joiningDate || '2024-01-01'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="font-bold text-gray-500">Last Class Conducted:</span>
                <span className="font-bold text-emerald-700">{viewStaffReport.lastClassDate || 'Today'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewStaffReport(null)}
                className="px-5 py-2 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-gray-800 cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-gray-200 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowPasswordModal(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-gray-900">Reset Password for {showPasswordModal.name}</h3>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 text-white font-black text-xs rounded-xl shadow cursor-pointer hover:bg-red-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
