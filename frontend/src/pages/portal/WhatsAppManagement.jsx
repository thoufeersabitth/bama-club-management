import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, Copy, FileText, Search, UserCheck, Calendar, Bell, Zap, CheckSquare, Square, Check, X, ExternalLink, Users, Shield, Award, Settings, Smartphone, Trash2 } from 'lucide-react';
import { WHATSAPP_TEMPLATES, SAMPLE_STUDENTS } from '../../services/initialData';
import { fetchStudents, openWhatsApp, getPreferredWhatsAppChannel, setPreferredWhatsAppChannel } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function WhatsAppManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState(SAMPLE_STUDENTS);
  const [selectedTemplate, setSelectedTemplate] = useState(WHATSAPP_TEMPLATES[0]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [cadetSearch, setCadetSearch] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState(getPreferredWhatsAppChannel);

  // Bulk WhatsApp Queue State
  const [showBulkQueueModal, setShowBulkQueueModal] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sentStudentIds, setSentStudentIds] = useState([]);

  const [sentLogs, setSentLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_whatsapp_sent_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'log-1', student: 'Fathima Riya', phone: '+91 94471 33445', template: 'Monthly Fee Due Reminder', time: '10:15 AM Today', status: 'Delivered' },
      { id: 'log-2', student: 'Adithya Suresh', phone: '+91 98460 11223', template: 'Fee Payment Receipt', time: 'Yesterday', status: 'Delivered' }
    ];
  });

  const saveLogs = (logs) => {
    setSentLogs(logs);
    try {
      localStorage.setItem('bama_whatsapp_sent_logs', JSON.stringify(logs));
    } catch (e) {}
  };

  const handleDeleteLog = (id) => {
    const updated = sentLogs.filter(l => l.id !== id);
    saveLogs(updated);
  };

  const handleClearAllLogs = () => {
    if (window.confirm('Are you sure you want to clear all recent WhatsApp dispatch activity logs?')) {
      saveLogs([]);
    }
  };

  const handleChannelChange = (newChan) => {
    setActiveChannel(newChan);
    setPreferredWhatsAppChannel(newChan);
  };

  const formatWhatsAppPhone = (phoneStr) => {
    let clean = (phoneStr || '').replace(/[^0-9]/g, '');
    if (!clean) return '919544085442';
    if (clean.length === 10) return '91' + clean;
    if (clean.startsWith('0')) return '91' + clean.slice(1);
    return clean;
  };

  useEffect(() => {
    fetchStudents().then(data => {
      if (data && data.length > 0) {
        setStudents(data);
        setSelectedStudentIds(data.map(s => s.id));
      } else {
        setSelectedStudentIds(SAMPLE_STUDENTS.map(s => s.id));
      }
    });
  }, []);

  const firstSelectedStudent = students.find(s => selectedStudentIds.includes(s.id)) || students[0] || {};

  // Update preview when template or selected student changes
  useEffect(() => {
    if (!selectedTemplate || !firstSelectedStudent) return;
    let body = selectedTemplate.body;
    body = body.replace('{STUDENT_NAME}', firstSelectedStudent.name || 'Cadet');
    body = body.replace('{GUARDIAN_NAME}', firstSelectedStudent.guardianName || firstSelectedStudent.guardian_name || 'Parent');
    body = body.replace('{AMOUNT}', firstSelectedStudent.feeAmount || '1500');
    body = body.replace('{BRANCH_NAME}', firstSelectedStudent.branch?.name || firstSelectedStudent.branch || 'BAMA Dojo');
    body = body.replace('{DATE}', new Date().toLocaleDateString());
    body = body.replace('{RECEIPT_NO}', 'REC-2026-042');
    body = body.replace('{EXAM_DATE}', '25th August 2026');
    body = body.replace('{VENUE}', firstSelectedStudent.branch?.name || firstSelectedStudent.branch || 'Head Dojo');
    body = body.replace('{FEE}', '800');
    body = body.replace('{EVENT_TITLE}', 'Quarterly Belt Exam & Camp');
    body = body.replace('{TIME}', '8:00 AM');
    body = body.replace('{NEXT_BELT}', 'Yellow Belt');
    body = body.replace('{DUE_DATE}', '10th of this month');
    
    setCustomMessage(body);
  }, [selectedTemplate, firstSelectedStudent]);

  // Filtered Cadets for Multi-Select Box
  const isInstructor = user?.role === 'INSTRUCTOR';

  const filteredCadets = students.filter(s => {
    const query = cadetSearch.toLowerCase();
    const branchName = typeof s.branch === 'object' ? (s.branch?.name || '') : (s.branch || '');

    if (isInstructor) {
      const instructorBranch = user?.branch || 'Chungam Branch';
      if (!branchName.toLowerCase().includes(instructorBranch.toLowerCase())) {
        return false;
      }
    }

    return (s.name || '').toLowerCase().includes(query) ||
           (s.guardianName || s.guardian_name || '').toLowerCase().includes(query) ||
           (s.phone || '').includes(query) ||
           (s.admissionNo || s.admission_no || '').toLowerCase().includes(query);
  });

  const handleSelectAllToggle = () => {
    const visibleIds = filteredCadets.map(s => s.id);
    const allSelected = visibleIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(selectedStudentIds.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...visibleIds])));
    }
  };

  const handleToggleStudent = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(i => i !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const selectedStudentsList = students.filter(s => selectedStudentIds.includes(s.id));

  // Open Bulk Modal
  const handleOpenBulkModal = () => {
    setQueueIndex(0);
    setSentStudentIds([]);
    setShowBulkQueueModal(true);
  };

  const sendIndividualWhatsApp = (std, channelOverride) => {
    let body = selectedTemplate.body;
    body = body.replace('{STUDENT_NAME}', std.name || 'Cadet');
    body = body.replace('{GUARDIAN_NAME}', std.guardianName || std.guardian_name || 'Parent');
    body = body.replace('{AMOUNT}', std.feeAmount || '1500');
    body = body.replace('{BRANCH_NAME}', std.branch?.name || std.branch || 'BAMA Dojo');
    body = body.replace('{DATE}', new Date().toLocaleDateString());

    setSentStudentIds(prev => Array.from(new Set([...prev, std.id])));
    openWhatsApp({
      phone: std.whatsapp || std.phone,
      message: body,
      channel: channelOverride || activeChannel
    });

    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      student: std.name || 'Cadet',
      phone: std.whatsapp || std.phone || 'N/A',
      template: selectedTemplate?.name || 'Custom Message',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Today',
      status: 'Delivered'
    };
    saveLogs([newLog, ...sentLogs.slice(0, 49)]);
  };

  // Step-by-Step Pro Max Queue Button Action
  const handleSendNextInQueue = () => {
    if (queueIndex >= selectedStudentsList.length) return;
    const currentStudent = selectedStudentsList[queueIndex];
    sendIndividualWhatsApp(currentStudent);
    setQueueIndex(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Executive Light White Header Banner */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 hover:shadow-md transition-all duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 uppercase">
              Automated Communications
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 font-mono">
              Selected: {selectedStudentIds.length} Parents
            </span>
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" /> Automated Parent WhatsApp Broadcast Center
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Select multiple cadets/parents with checkboxes and dispatch automated WhatsApp templates for fee reminders, exams, camps, and notices.
          </p>
        </div>

        {/* WhatsApp Sender Channel Switcher */}
        <div className="bg-gray-50 p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleChannelChange('BUSINESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'BUSINESS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> 🟢 WhatsApp Business
          </button>
          <button
            type="button"
            onClick={() => handleChannelChange('REGULAR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeChannel === 'REGULAR'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> 💬 Personal WhatsApp
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-emerald-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">SELECTED PARENTS</span>
            <strong className="text-xl font-black text-emerald-600 leading-none block mt-0.5">{selectedStudentIds.length} Selected</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">MESSAGE TEMPLATES</span>
            <strong className="text-xl font-black text-amber-600 leading-none block mt-0.5">{WHATSAPP_TEMPLATES.length} Templates</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">TOTAL CONTACTS</span>
            <strong className="text-xl font-black text-blue-600 leading-none block mt-0.5">{students.length} Cadets</strong>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-purple-200 transition-all duration-200 group">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">DISPATCHED LOGS</span>
            <strong className="text-xl font-black text-purple-600 leading-none block mt-0.5">{sentLogs.length} Records</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template & Multi-Select Cadet Selector */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Select Template */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-4 shadow-xl">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" /> 1. Select WhatsApp Template
            </h3>
            <div className="space-y-2">
              {WHATSAPP_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`w-full text-left p-3.5 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                    selectedTemplate?.id === tpl.id
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-sm font-black'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{tpl.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono px-2 py-0.5 bg-white rounded border border-gray-200">{tpl.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Multi-Select Cadet / Parent List */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" /> 2. Select Cadets / Parents ({selectedStudentIds.length} Selected)
              </h3>
            </div>

            {/* Cadet Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search cadet or parent name..."
                value={cadetSearch}
                onChange={(e) => setCadetSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 shadow-sm font-medium"
              />
            </div>

            {/* Select All Toggle Button */}
            <button
              onClick={handleSelectAllToggle}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition border border-gray-200 cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2">
                {filteredCadets.length > 0 && filteredCadets.every(s => selectedStudentIds.includes(s.id)) ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span>Select All Visible ({filteredCadets.length} Cadets)</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-mono font-black">{selectedStudentIds.length} Selected</span>
            </button>

            {/* Scrollable Checkbox Roster */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 max-h-64 overflow-y-auto space-y-2 text-xs divide-y divide-gray-200/80">
              {filteredCadets.map((s) => {
                const isChecked = selectedStudentIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleToggleStudent(s.id)}
                    className={`pt-2 first:pt-0 flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                      isChecked ? 'bg-emerald-50 border border-emerald-200 text-gray-900 font-bold' : 'hover:bg-white text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by div click
                        className="w-4 h-4 text-emerald-600 rounded accent-emerald-600 cursor-pointer flex-shrink-0"
                      />
                      <div>
                        <div className="text-gray-900 font-black">{s.name}</div>
                        <div className="text-[10px] text-gray-500 font-medium">Parent: {s.guardianName || s.guardian_name} ({s.phone})</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-800 px-2 py-0.5 bg-white rounded border border-gray-200 shadow-xs">
                      {s.currentBelt || s.current_belt || 'White Belt'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Message Preview & Dispatch Action */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" /> WhatsApp Message Preview & Dispatch
              </h3>
              <span className="text-[10px] font-mono text-emerald-800 font-black bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
                Template: {selectedTemplate?.name}
              </span>
            </div>

            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-900 leading-relaxed font-sans focus:bg-white focus:outline-none focus:border-emerald-500 shadow-sm font-medium"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-[11px] text-gray-500 font-medium">
                Ready to dispatch pre-formatted WhatsApp template to <strong className="text-emerald-700 font-black">{selectedStudentIds.length} selected parents</strong>.
              </p>
              
              <button
                onClick={handleOpenBulkModal}
                disabled={selectedStudentIds.length === 0}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                <MessageSquare className="w-4.5 h-4.5" />
                <span>Send WhatsApp to All ({selectedStudentIds.length})</span>
              </button>
            </div>
          </div>

          {/* 3. Recent Dispatch Activity Logs */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/90 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">3</span>
                <span>Recent Dispatch Activity Logs ({sentLogs.length})</span>
              </h3>
              {sentLogs.length > 0 && (
                <button
                  onClick={handleClearAllLogs}
                  className="text-[10px] font-black text-red-600 hover:text-white hover:bg-red-600 px-2.5 py-1 rounded-lg border border-red-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Clear all activity logs"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              )}
            </div>

            {sentLogs.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs font-medium space-y-1 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                <Bell className="w-6 h-6 text-gray-300 mx-auto" />
                <p>No recent dispatch activity logs.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs max-h-72 overflow-y-auto pr-1">
                {sentLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                      <strong className="text-gray-900 font-bold block truncate">{log.student} ({log.phone})</strong>
                      <span className="text-[10px] text-gray-500 font-medium truncate block">{log.template}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-200 block shadow-xs">
                          {log.status}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">{log.time}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition cursor-pointer"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: PRO MAX Step-by-Step WhatsApp Queue Modal */}
      {showBulkQueueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-5 shadow-2xl relative">
            <button onClick={() => setShowBulkQueueModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <MessageSquare className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900">Bulk WhatsApp Notifications Dispatcher</h3>
              <p className="text-xs text-gray-500 font-medium">
                Template: <strong className="text-emerald-800 font-black">{selectedTemplate?.name}</strong> to <strong className="text-gray-900 font-black">{selectedStudentsList.length} selected parents</strong>.
              </p>
            </div>

            {/* Selected Cadets Queue Tracker List */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 max-h-60 overflow-y-auto space-y-2.5 text-xs divide-y divide-gray-200">
              {selectedStudentsList.map((s, idx) => {
                const isSent = sentStudentIds.includes(s.id);
                const isCurrent = idx === queueIndex && !isSent;
                const formattedPhone = formatWhatsAppPhone(s.whatsapp || s.phone);

                return (
                  <div
                    key={s.id}
                    className={`pt-2.5 first:pt-0 flex items-center justify-between p-2.5 rounded-xl transition ${
                      isCurrent
                        ? 'bg-amber-50 border border-amber-300 shadow-sm'
                        : isSent
                        ? 'bg-emerald-50/60 opacity-90'
                        : 'opacity-70 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-sm">{idx + 1}. {s.name || 'Cadet'}</span>
                        {isSent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Sent
                          </span>
                        )}
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            Next Up
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-600 font-medium block mt-0.5">Parent: {s.guardianName || s.guardian_name} (+{formattedPhone})</span>
                    </div>

                    <div className="text-right">
                      <button
                        onClick={() => sendIndividualWhatsApp(s)}
                        className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 font-bold ml-auto cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> Send Solo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-bold flex items-center justify-between">
              <span>Total Messages ({sentStudentIds.length}/{selectedStudentsList.length} Processed):</span>
              <span className="text-sm font-black font-mono">{sentStudentIds.length} / {selectedStudentsList.length} Sent</span>
            </div>

            {/* PRO MAX STEP-BY-STEP GREEN ACTION BUTTON */}
            <div className="pt-1">
              {queueIndex < selectedStudentsList.length ? (
                <button
                  onClick={handleSendNextInQueue}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5 text-amber-300" />
                  <span>
                    Send Message ({queueIndex + 1} of {selectedStudentsList.length}): {selectedStudentsList[queueIndex]?.name}
                  </span>
                </button>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-xs text-emerald-800 font-black flex items-center justify-center gap-2 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>🎉 All {selectedStudentsList.length} WhatsApp Notifications Sent Successfully!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
