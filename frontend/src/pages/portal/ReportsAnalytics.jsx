import React, { useState, useEffect } from 'react';
import {
  BarChart3, Download, FileSpreadsheet, FileText, Calendar, Filter,
  Users, CreditCard, CalendarCheck, Award, Building2, TrendingUp, CheckCircle2, DollarSign, AlertCircle, Clock, Check, RefreshCw, Briefcase, BookOpen, Trash2
} from 'lucide-react';
import { fetchStudents, fetchFees } from '../../services/api';
import { BELT_LEVELS, INITIAL_BRANCHES, ACADEMY_INFO, SHIFT_OPTIONS, getDynamicShiftOptions } from '../../services/initialData';
import { useAuth } from '../../context/AuthContext';

export default function ReportsAnalytics() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';

  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [activeTab, setActiveTab] = useState('ATTENDANCE'); // 'ATTENDANCE' | 'FEE' | 'BELT' | 'STAFF'
  const [feeSubFilter, setFeeSubFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PAID'
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedShift, setSelectedShift] = useState('All');
  const [selectedInstructor, setSelectedInstructor] = useState('All');

  // Date-to-Date Filter State
  const [fromDate, setFromDate] = useState(firstDayOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);

  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);

  // Staff & Class Logs State
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_staff_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'STF-101', name: 'Sensei Abdul Rahman', designation: 'Chief Instructor (5th Dan)', branch: 'Pulikkal Branch (Head Office)', salary: '35000', classesTaken: 124, lastClassDate: todayStr },
      { id: 'STF-102', name: 'Sensei Muhammad Shafi', designation: 'Senior Instructor (3rd Dan)', branch: 'Chungam Branch', salary: '25000', classesTaken: 86, lastClassDate: todayStr },
      { id: 'STF-103', name: 'Sensei Muhammed Haneen', designation: 'Instructor (2nd Dan)', branch: 'Mongam Branch', salary: '20000', classesTaken: 64, lastClassDate: todayStr },
      { id: 'STF-104', name: 'Sensei Rajesh Kumar', designation: 'Fitness Coach', branch: 'Chungam Branch', salary: '18000', classesTaken: 45, lastClassDate: todayStr }
    ];
  });

  const [classLogs, setClassLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_class_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatic Deduplication of duplicate test logs on same date/shift/staff
        const uniqueMap = new Map();
        parsed.forEach(log => {
          const key = `${log.staffId || log.staffName}_${log.date}_${log.shift}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, log);
          }
        });
        return Array.from(uniqueMap.values());
      }
    } catch (e) {}
    return [
      { id: 'log-1', staffId: 'STF-101', staffName: 'Sensei Abdul Rahman', date: todayStr, branch: 'Pulikkal Branch (Head Office)', shift: 'Evening Batch (5:00 PM - 7:00 PM)', cadetsCount: 28, topic: 'Bassai Dai Kata & Sparring' },
      { id: 'log-2', staffId: 'STF-102', staffName: 'Sensei Muhammad Shafi', date: todayStr, branch: 'Chungam Branch', shift: 'Evening Batch (5:00 PM - 7:00 PM)', cadetsCount: 22, topic: 'Kumite Pads & Counter Attacks' },
      { id: 'log-3', staffId: 'STF-103', staffName: 'Sensei Muhammed Haneen', date: todayStr, branch: 'Mongam Branch', shift: 'Morning Batch (6:00 AM - 7:30 AM)', cadetsCount: 18, topic: 'Yellow & Orange Belt Stances' }
    ];
  });

  useEffect(() => {
    Promise.all([fetchStudents(), fetchFees()])
      .then(([stdData, feeData]) => {
        setStudents(stdData || []);
        setFees(feeData || []);

        // Aggregate attendance records from localStorage
        const aggregatedAttendance = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('bama_attendance_')) {
              const datePart = key.replace('bama_attendance_', '');
              const rec = JSON.parse(localStorage.getItem(key) || '{}');

              Object.entries(rec).forEach(([stdId, status]) => {
                if (!aggregatedAttendance[stdId]) {
                  aggregatedAttendance[stdId] = { present: 0, absent: 0, total: 0, recordsByDate: {} };
                }
                aggregatedAttendance[stdId].recordsByDate[datePart] = status;
                aggregatedAttendance[stdId].total += 1;
                if (status === 'PRESENT') aggregatedAttendance[stdId].present += 1;
                if (status === 'ABSENT') aggregatedAttendance[stdId].absent += 1;
              });
            }
          }
        } catch (e) {}

        setAttendanceData(aggregatedAttendance);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getPendingAmount = (f) => {
    const std = f.student_detail || {};
    const totalFee = parseFloat(f.amount || std.feeAmount || std.fee_amount || 500);
    const paid = parseFloat(f.paid_amount ?? f.paidAmount ?? std.initialPaidAmount ?? 0);
    return Math.max(0, totalFee - paid);
  };

  // Date Range Helper
  const isDateInRange = (dateString) => {
    if (!dateString) return true;
    try {
      const d = new Date(dateString).toISOString().split('T')[0];
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
    } catch (e) {}
    return true;
  };

  // Quick Preset Actions
  const setPresetThisMonth = () => {
    setFromDate(firstDayOfMonthStr);
    setToDate(todayStr);
  };

  const setPresetLast30Days = () => {
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    setFromDate(d30.toISOString().split('T')[0]);
    setToDate(todayStr);
  };

  const setPresetToday = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const setPresetAllTime = () => {
    setFromDate('');
    setToDate('');
  };

  // Filtered Students with Date-to-Date Filter
  const filteredStudents = students.filter(s => {
    const branchName = typeof s.branch === 'object' ? (s.branch?.name || '') : (s.branch || '');

    if (isInstructor) {
      const instructorBranch = user?.branch || 'Chungam Branch';
      if (!branchName.toLowerCase().includes(instructorBranch.toLowerCase())) {
        return false;
      }
    }

    if (selectedBranch !== 'All' && !branchName.toLowerCase().includes(selectedBranch.toLowerCase())) {
      return false;
    }

    if (selectedShift !== 'All') {
      const cadetShift = s.shift || 'Evening Batch (5:00 PM - 7:00 PM)';
      if (!cadetShift.toLowerCase().includes(selectedShift.toLowerCase())) {
        return false;
      }
    }

    const joiningDate = s.joiningDate || s.created_at || s.joining_date;
    if (joiningDate && !isDateInRange(joiningDate)) {
      return false;
    }

    return true;
  });

  // Filtered Class Logs with Date Range & Instructor Filter
  const filteredClassLogs = classLogs.filter(log => {
    if (!isDateInRange(log.date)) return false;
    if (selectedBranch !== 'All' && !log.branch?.toLowerCase().includes(selectedBranch.toLowerCase())) return false;
    if (selectedShift !== 'All' && !log.shift?.toLowerCase().includes(selectedShift.toLowerCase())) return false;
    if (selectedInstructor !== 'All' && log.staffName !== selectedInstructor && log.staffId !== selectedInstructor) return false;
    return true;
  });

  // Filtered Fee Invoices with Date-to-Date Filter
  const filteredFees = fees.filter(f => {
    const std = f.student_detail || {};
    const branchName = typeof std.branch === 'object' ? (std.branch?.name || '') : (std.branch || '');

    if (isInstructor) {
      const instructorBranch = user?.branch || 'Chungam Branch';
      if (!branchName.toLowerCase().includes(instructorBranch.toLowerCase())) {
        return false;
      }
    }

    if (selectedBranch !== 'All' && !branchName.toLowerCase().includes(selectedBranch.toLowerCase())) {
      return false;
    }

    if (selectedShift !== 'All') {
      const cadetShift = std.shift || 'Evening Batch (5:00 PM - 7:00 PM)';
      if (!cadetShift.toLowerCase().includes(selectedShift.toLowerCase())) {
        return false;
      }
    }

    const feeDate = f.payment_date || f.created_at || f.date || f.due_date;
    if (feeDate && !isDateInRange(feeDate)) {
      return false;
    }

    const pending = getPendingAmount(f);
    if (feeSubFilter === 'PENDING' && pending === 0) return false;
    if (feeSubFilter === 'PAID' && pending > 0) return false;

    return true;
  });

  const totalFeeCollected = filteredFees.reduce((acc, f) => {
    const std = f.student_detail || {};
    const paid = parseFloat(f.paid_amount ?? f.paidAmount ?? std.initialPaidAmount ?? 0);
    return acc + (isNaN(paid) ? 0 : paid);
  }, 0);

  const totalFeePending = filteredFees.reduce((acc, f) => {
    return acc + getPendingAmount(f);
  }, 0);

  // Dynamic Attendance Calculations with Date Range Syncing!
  let totalPresentDays = 0;
  let totalAbsentDays = 0;
  let totalSessionRecords = 0;

  filteredStudents.forEach(s => {
    const stdKey = s.id || s.admissionNo || s.admission_no;
    const attObj = attendanceData[stdKey] || { recordsByDate: {} };
    const recordsByDate = attObj.recordsByDate || {};

    let studentPresentInPeriod = 0;
    let studentAbsentInPeriod = 0;
    let studentTotalInPeriod = 0;

    Object.entries(recordsByDate).forEach(([dateStr, status]) => {
      if (isDateInRange(dateStr)) {
        studentTotalInPeriod += 1;
        if (status === 'PRESENT') studentPresentInPeriod += 1;
        if (status === 'ABSENT') studentAbsentInPeriod += 1;
      }
    });

    if (studentTotalInPeriod > 0) {
      totalPresentDays += studentPresentInPeriod;
      totalAbsentDays += studentAbsentInPeriod;
      totalSessionRecords += studentTotalInPeriod;
    } else {
      totalPresentDays += attObj.present || (attObj.recordsByDate && Object.keys(attObj.recordsByDate).length > 0 ? 0 : 1);
      totalAbsentDays += attObj.absent || 0;
      totalSessionRecords += attObj.total || (attObj.recordsByDate && Object.keys(attObj.recordsByDate).length > 0 ? 0 : 1);
    }
  });

  // Calculate Classes Conducted vs Dojo Holidays for selected period
  const getMonthlyClassAndHolidayStats = () => {
    let conducted = 0;
    let holidays = 0;

    const startStr = fromDate || firstDayOfMonthStr;
    const endStr = toDate || todayStr;

    const startObj = new Date(startStr);
    const endObj = new Date(endStr);

    for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const savedStatus = localStorage.getItem(`bama_day_status_${dateStr}`);
      if (savedStatus === 'HOLIDAY') {
        holidays++;
      } else if (savedStatus === 'CLASS') {
        conducted++;
      } else {
        const savedAtt = localStorage.getItem(`bama_attendance_${dateStr}`);
        if (d.getDay() === 0) {
          holidays++;
        } else if (savedAtt) {
          conducted++;
        }
      }
    }

    return { conducted, holidays };
  };

  const { conducted: periodConductedClasses, holidays: periodDojoHolidays } = getMonthlyClassAndHolidayStats();

  const avgAttendancePct = totalSessionRecords > 0 ? ((totalPresentDays / totalSessionRecords) * 100).toFixed(1) : '100';
  const paidInvoicesCount = filteredFees.filter(f => getPendingAmount(f) === 0).length;

  // Dynamic Belt Calculations
  const beginnerBeltCount = filteredStudents.filter(s => {
    const b = (s.beltRank || s.current_belt || 'White Belt').toLowerCase();
    return b.includes('white') || b.includes('yellow') || b.includes('orange');
  }).length;

  const intermediateBeltCount = filteredStudents.filter(s => {
    const b = (s.beltRank || s.current_belt || 'White Belt').toLowerCase();
    return b.includes('green') || b.includes('blue') || b.includes('purple');
  }).length;

  const seniorBeltCount = filteredStudents.filter(s => {
    const b = (s.beltRank || s.current_belt || 'White Belt').toLowerCase();
    return b.includes('brown') || b.includes('black');
  }).length;

  // Dynamic Staff Class Calculations
  const totalCadetsTrainedInLogs = filteredClassLogs.reduce((acc, log) => acc + (parseInt(log.cadetsCount) || 0), 0);
  const totalTrainingHours = (filteredClassLogs.length * 1.5).toFixed(1);

  // Export CSV Handler
  const handleExportCSV = () => {
    let filename = `BAMA_Report_${activeTab}_${fromDate || 'start'}_to_${toDate || 'end'}.csv`;
    let csvHeaders = [];
    let csvRows = [];

    if (activeTab === 'ATTENDANCE') {
      csvHeaders = ['Admission No', 'Cadet Name', 'Belt Rank', 'Branch Dojo', 'Shift Batch', 'Present Days', 'Total Sessions', 'Attendance %'];
      csvRows = filteredStudents.map(s => {
        const att = attendanceData[s.id || s.admissionNo] || { present: 0, total: 0 };
        const pct = att.total > 0 ? ((att.present / att.total) * 100).toFixed(1) + '%' : '100%';
        return [
          s.admissionNo || s.admission_no,
          s.name,
          s.beltRank || s.current_belt || 'White Belt',
          typeof s.branch === 'object' ? s.branch?.name : s.branch,
          s.shift || 'Evening Batch',
          att.present,
          att.total,
          pct
        ];
      });
    } else if (activeTab === 'STAFF') {
      csvHeaders = ['Staff ID', 'Instructor Name', 'Designation', 'Branch Dojo', 'Total Classes Conducted', 'Monthly Salary'];
      csvRows = staffList.map(st => [
        st.id || st.username,
        st.name,
        st.designation || 'Sensei Instructor',
        st.branch,
        st.classesTaken || 0,
        st.salary || '20000'
      ]);
    } else {
      csvHeaders = ['Receipt No', 'Cadet Name', 'Date', 'Shift Batch', 'Parent Contact', 'Month', 'Paid Amount', 'Pending Dues', 'Status'];
      csvRows = filteredFees.map(f => {
        const std = f.student_detail || {};
        const pending = getPendingAmount(f);
        const paid = f.paid_amount ?? f.paidAmount ?? std.initialPaidAmount ?? 0;
        return [
          f.receipt_no || `REC-${std.admissionNo}`,
          std.name || 'Cadet',
          f.payment_date || f.created_at || '',
          std.shift || 'Evening Batch',
          std.phone || '',
          f.month || 'August 2026',
          paid,
          pending,
          pending === 0 ? 'Fully Paid' : 'Pending Dues'
        ];
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...csvRows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Executive Light White Header Banner */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 hover:shadow-md transition-all duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200/80 uppercase">
              Official B.A.M.A. Analytics
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono">
              Date Range Filter Active
            </span>
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" /> B.A.M.A. Official Reports & Dynamic Analytics
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Filter reports by precise From Date & To Date, shift batch, dojo branch, attendance, and staff class reports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Print PDF
          </button>
        </div>
      </div>



      {/* KPI Summary Cards - DYNAMICALLY ADAPTS TO ACTIVE REPORT TAB */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {activeTab === 'ATTENDANCE' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-red-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">FILTERED CADETS</span>
                <strong className="text-xl font-black text-gray-900 leading-none block mt-0.5">{filteredStudents.length} Cadets</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">CLASSES CONDUCTED IN PERIOD</span>
                <strong className="text-xl font-black text-emerald-600 leading-none block mt-0.5">{periodConductedClasses} Classes</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">DOJO HOLIDAYS / NO CLASS</span>
                <strong className="text-xl font-black text-amber-600 leading-none block mt-0.5">{periodDojoHolidays} Days</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">AVG ATTENDANCE RATE</span>
                <strong className="text-xl font-black text-blue-600 leading-none block mt-0.5">{avgAttendancePct}% Rate</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL PRESENT DAYS</span>
                <strong className="text-xl font-black text-blue-600 leading-none block mt-0.5">{totalPresentDays} Days</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-rose-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL ABSENT DAYS</span>
                <strong className="text-xl font-black text-rose-600 leading-none block mt-0.5">{totalAbsentDays} Days</strong>
              </div>
            </div>
          </>
        )}

        {activeTab === 'FEE' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL INVOICES</span>
                <strong className="text-xl font-black text-gray-900 leading-none block mt-0.5">{filteredFees.length} Invoices</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">COLLECTED IN PERIOD</span>
                <strong className="text-xl font-black text-emerald-600 leading-none block mt-0.5">₹{totalFeeCollected.toLocaleString()}</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-rose-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">PENDING DUES</span>
                <strong className="text-xl font-black text-rose-600 leading-none block mt-0.5">₹{totalFeePending.toLocaleString()}</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">FULLY PAID CADETS</span>
                <strong className="text-xl font-black text-amber-600 leading-none block mt-0.5">{paidInvoicesCount} / {filteredFees.length} Paid</strong>
              </div>
            </div>
          </>
        )}

        {activeTab === 'STAFF' && (
          <>
            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-red-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ACTIVE SENSEIS</span>
                <strong className="text-xl font-black text-gray-900 leading-none block mt-0.5">{staffList.length} Instructors</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">CONDUCTED SESSIONS</span>
                <strong className="text-xl font-black text-amber-600 leading-none block mt-0.5">{filteredClassLogs.length} Sessions</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">CADETS TRAINED</span>
                <strong className="text-xl font-black text-emerald-600 leading-none block mt-0.5">{totalCadetsTrainedInLogs} Cadets</strong>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-purple-200 transition-all duration-200 group">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL TRAINING HOURS</span>
                <strong className="text-xl font-black text-purple-700 leading-none block mt-0.5">{totalTrainingHours} Hours</strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* TAB NAVIGATION PILLS BAR */}
      <div className="bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'ATTENDANCE'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" /> Attendance Register Report
          </button>

          <button
            onClick={() => setActiveTab('FEE')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'FEE'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Fee Collection & Dues
          </button>

          <button
            onClick={() => setActiveTab('STAFF')}
            className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'STAFF'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Briefcase className="w-4 h-4" /> 👔 Staff & Instructor Class Reports
          </button>
        </div>
      </div>

      {/* TAB 1: ATTENDANCE REGISTER REPORT */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-red-600" /> Cadet Attendance Summary Report
            </h3>
            <span className="text-xs text-gray-500 font-mono">Showing {filteredStudents.length} Cadets</span>
          </div>

          {/* DEDICATED SECTION DATE RANGE & FILTER TOOLBAR */}
          <div className="p-3 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Calendar className="w-4 h-4 text-red-600" /> Attendance Date Range:
              </span>

              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-gray-500 font-bold text-[10px] uppercase">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent text-gray-900 font-bold font-mono focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-gray-500 font-bold text-[10px] uppercase">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-gray-900 font-bold font-mono focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={setPresetThisMonth}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    fromDate === firstDayOfMonthStr && toDate === todayStr
                      ? 'bg-red-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={setPresetLast30Days}
                  className="px-2.5 py-1 bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg font-bold text-[10px] transition cursor-pointer"
                >
                  Last 30 Days
                </button>
                <button
                  onClick={setPresetToday}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    fromDate === todayStr && toDate === todayStr
                      ? 'bg-red-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={setPresetAllTime}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    !fromDate && !toDate
                      ? 'bg-red-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                <Clock className="w-4 h-4 text-red-600" />
                <span>Shift:</span>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-900 font-bold focus:outline-none focus:border-red-500 cursor-pointer shadow-sm"
                >
                  <option value="All">All Shifts</option>
                  {getDynamicShiftOptions().map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {!isInstructor && (
                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <span>Dojo:</span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-900 font-bold focus:outline-none focus:border-red-500 cursor-pointer shadow-sm"
                  >
                    <option value="All">All Branches</option>
                    {INITIAL_BRANCHES.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Cadet Name</th>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4">Belt Rank</th>
                  <th className="py-3 px-4">Branch Dojo</th>
                  <th className="py-3 px-4 text-center">Total Dojo Classes</th>
                  <th className="py-3 px-4 text-center">Attended / Total</th>
                  <th className="py-3 px-4 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((s) => {
                  const stdKey = s.id || s.admissionNo || s.admission_no;
                  const attObj = attendanceData[stdKey] || { recordsByDate: {} };
                  const recordsByDate = attObj.recordsByDate || {};

                  let presentInPeriod = 0;
                  let absentInPeriod = 0;
                  let totalMarkedInPeriod = 0;

                  Object.entries(recordsByDate).forEach(([dateStr, status]) => {
                    if (isDateInRange(dateStr)) {
                      totalMarkedInPeriod += 1;
                      if (status === 'PRESENT') presentInPeriod += 1;
                      if (status === 'ABSENT') absentInPeriod += 1;
                    }
                  });

                  let finalPresent = 0;
                  let finalTotal = 0;
                  let pct = '100.0';

                  if (totalMarkedInPeriod > 0) {
                    finalPresent = presentInPeriod;
                    finalTotal = totalMarkedInPeriod;
                    pct = ((finalPresent / finalTotal) * 100).toFixed(1);
                  } else if (attObj.total > 0) {
                    finalPresent = attObj.present;
                    finalTotal = attObj.total;
                    pct = ((finalPresent / finalTotal) * 100).toFixed(1);
                  } else {
                    const defaultRate = parseFloat(s.attendanceRate ?? s.attendance_rate ?? 100);
                    finalPresent = 1;
                    finalTotal = 1;
                    pct = defaultRate.toFixed(1);
                  }

                  return (
                    <tr key={s.id || s.admissionNo} className="hover:bg-gray-50 transition-colors font-sans">
                      <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-xs">
                          {s.name?.charAt(0)}
                        </div>
                        <span>{s.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-600">{s.admissionNo || s.admission_no}</td>
                      <td className="py-3 px-4 font-bold text-amber-700">{s.beltRank || s.current_belt || 'White Belt'}</td>
                      <td className="py-3 px-4 text-gray-700">{typeof s.branch === 'object' ? s.branch?.name : s.branch}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-gray-900">{finalTotal} Classes</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{finalPresent} / {finalTotal} Attended</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FEE COLLECTION & DUES REPORT */}
      {activeTab === 'FEE' && (
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" /> Fee Collection & Dues Report
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFeeSubFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  feeSubFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Fees
              </button>
              <button
                onClick={() => setFeeSubFilter('PAID')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  feeSubFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Fully Paid
              </button>
              <button
                onClick={() => setFeeSubFilter('PENDING')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  feeSubFilter === 'PENDING' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending Dues
              </button>
            </div>
          </div>

          {/* DEDICATED SECTION DATE RANGE & FILTER TOOLBAR */}
          <div className="p-3 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Calendar className="w-4 h-4 text-emerald-600" /> Fee Payment Date Range:
              </span>

              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-gray-500 font-bold text-[10px] uppercase">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent text-gray-900 font-bold font-mono focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-gray-500 font-bold text-[10px] uppercase">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-gray-900 font-bold font-mono focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={setPresetThisMonth}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    fromDate === firstDayOfMonthStr && toDate === todayStr
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={setPresetLast30Days}
                  className="px-2.5 py-1 bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg font-bold text-[10px] transition cursor-pointer"
                >
                  Last 30 Days
                </button>
                <button
                  onClick={setPresetToday}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    fromDate === todayStr && toDate === todayStr
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={setPresetAllTime}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    !fromDate && !toDate
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Shift:</span>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                >
                  <option value="All">All Shifts</option>
                  {getDynamicShiftOptions().map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {!isInstructor && (
                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Dojo:</span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                  >
                    <option value="All">All Branches</option>
                    {INITIAL_BRANCHES.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Cadet Name</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Fee Month</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Pending Dues</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFees.map((f, idx) => {
                  const std = f.student_detail || {};
                  const pending = getPendingAmount(f);
                  const paid = f.paid_amount ?? f.paidAmount ?? std.initialPaidAmount ?? 0;

                  return (
                    <tr key={f.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">{f.receipt_no || `REC-${std.admissionNo || idx}`}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{std.name || 'Cadet'}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">{f.payment_date || f.created_at || 'August 2026'}</td>
                      <td className="py-3 px-4 font-bold text-gray-700">{f.month || 'August 2026'}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700">₹{parseFloat(paid).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">₹{pending.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          pending === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {pending === 0 ? 'Fully Paid' : 'Pending Dues'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* TAB 3: STAFF & INSTRUCTOR CLASS REPORTS */}
      {activeTab === 'STAFF' && (
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" /> Staff & Instructor Class Reports Register
              </h3>
              <p className="text-xs text-gray-500 font-medium">Comprehensive historical log of conducted training sessions across all branch dojos.</p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
              {filteredClassLogs.length} Sessions Logged
            </span>
          </div>

          {/* DEDICATED SECTION DATE RANGE & FILTER TOOLBAR */}
          <div className="p-3 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Calendar className="w-4 h-4 text-amber-600" /> Session Date Range:
              </span>

              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-gray-500 font-bold text-[10px] uppercase">From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent text-gray-900 font-bold font-mono focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-gray-500 font-bold text-[10px] uppercase">To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-gray-900 font-bold font-mono focus:outline-none cursor-pointer text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={setPresetThisMonth}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    fromDate === firstDayOfMonthStr && toDate === todayStr
                      ? 'bg-amber-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={setPresetLast30Days}
                  className="px-2.5 py-1 bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 rounded-lg font-bold text-[10px] transition cursor-pointer"
                >
                  Last 30 Days
                </button>
                <button
                  onClick={setPresetToday}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    fromDate === todayStr && toDate === todayStr
                      ? 'bg-amber-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={setPresetAllTime}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                    !fromDate && !toDate
                      ? 'bg-amber-600 text-white font-black shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Sensei:</span>
                <select
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="All">All Senseis</option>
                  {staffList.map(st => (
                    <option key={st.id || st.username} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Shift:</span>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="All">All Shifts</option>
                  {getDynamicShiftOptions().map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {!isInstructor && (
                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-bold">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>Dojo:</span>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs text-gray-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="All">All Branches</option>
                    {INITIAL_BRANCHES.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* HISTORICAL MONTHLY DUTY ARCHIVE SUMMARY CARDS */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-red-50 p-4 rounded-2xl border border-amber-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">Staff Duty & Performance Summary (Date Range Filtered)</h4>
              </div>
              <span className="text-[11px] font-bold text-amber-800 font-mono">
                {fromDate || toDate ? `📅 Range: ${fromDate || 'Start'} to ${toDate || 'Today'}` : '📜 All Time Overview'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {staffList.map((st) => {
                const logsInRange = classLogs.filter(log => {
                  if (log.staffName !== st.name && log.staffId !== (st.id || st.username)) return false;
                  if (fromDate && log.date < fromDate) return false;
                  if (toDate && log.date > toDate) return false;
                  return true;
                });
                const displayCount = (fromDate || toDate) ? logsInRange.length : (st.classesTaken || logsInRange.length || 0);

                return (
                  <div key={st.id || st.username} className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-1.5 font-sans">
                    <div className="flex items-center justify-between">
                      <strong className="font-black text-gray-900 text-xs">{st.name}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                        {st.designation?.split('(')[0] || 'Sensei'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">
                        {fromDate || toDate ? 'Classes in Date Range:' : 'Total Conducted:'}
                      </span>
                      <strong className="text-sm font-black text-red-700 font-mono">{displayCount} Classes</strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-gray-100 pt-1">
                      <span>Assigned Dojo:</span>
                      <span className="font-bold text-gray-800 truncate max-w-[120px]">{st.branch}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Instructor / Sensei</th>
                  <th className="py-3 px-4">Dojo Branch</th>
                  <th className="py-3 px-4">Shift Batch</th>
                  <th className="py-3 px-4 text-center">Cadets Trained</th>
                  <th className="py-3 px-4">Lesson Topic / Focus Area</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClassLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 font-medium">
                      No conducted class session logs found matching selected date range or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredClassLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{log.date}</td>
                      <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-[10px]">
                          {log.staffName?.charAt(0)}
                        </div>
                        <span>{log.staffName}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{log.branch}</td>
                      <td className="py-3 px-4 font-bold text-amber-700">{log.shift}</td>
                      <td className="py-3 px-4 text-center font-black text-emerald-600">{log.cadetsCount} Cadets</td>
                      <td className="py-3 px-4 text-gray-600 italic">{log.topic}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete class log for ${log.staffName} on ${log.date}?`)) {
                              const updated = classLogs.filter(l => l.id !== log.id);
                              setClassLogs(updated);
                              localStorage.setItem('bama_class_logs', JSON.stringify(updated));
                            }
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition cursor-pointer"
                          title="Delete Session Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
