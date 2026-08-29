import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Shield, Trophy, Medal, Search, Plus, Calendar, MapPin, User,
  CheckCircle2, AlertCircle, Send, QrCode, Sparkles, ExternalLink, RefreshCw, FileText, Printer, X, Star, MessageSquare, ArrowRight, Filter
} from 'lucide-react';
import { fetchBeltGradings, fetchStudents, saveBeltGradingBackend, promoteStudent, openWhatsApp } from '../../services/api';
import OfficeGrading from '../office/OfficeGrading';
import { BELT_LEVELS, ACADEMY_INFO, UPCOMING_EVENTS } from '../../services/initialData';

const INITIAL_COMPETITIONS = [
  {
    id: 'comp-101',
    title: 'Annual B.A.M.A. State Karate Championship 2026',
    category: 'Tournament',
    date: '2026-07-20',
    venue: 'Calicut Indoor Stadium',
    firstPlace: 'Adithya Suresh (Kumite Category A)',
    secondPlace: 'Kanjali (Kata Category B)',
    thirdPlace: 'Muhammed Haneen (Kumite Category B)',
    notes: 'State Level Championship with 150+ participants.',
    whatsappAlertSent: true
  },
  {
    id: 'comp-102',
    title: 'Academy Speed Kick & Fun Obstacle Challenge',
    category: 'Fun Program',
    date: '2026-08-05',
    venue: 'Pulikkal Main Dojo',
    firstPlace: 'Kanjali',
    secondPlace: 'Adithya Suresh',
    thirdPlace: 'Rohan Sharma',
    notes: 'Inter-dojo fun agility and obstacle sprint competition.',
    whatsappAlertSent: true
  }
];

export default function BeltGradingManagement() {
  const [gradings, setGradings] = useState([]);
  const [competitions, setCompetitions] = useState(INITIAL_COMPETITIONS);
  const [events, setEvents] = useState(UPCOMING_EVENTS);
  const [studentsList, setStudentsList] = useState([]);

  const [activeTab, setActiveTab] = useState('EXAM_APPLICATIONS'); // 'EXAM_APPLICATIONS' | 'CERTIFICATES' | 'COMPETITIONS' | 'EXAM_CAMPS'
  const [search, setSearch] = useState('');
  
  // Certificate Modal State (Belt Promotion or Competition Winner)
  const [activeCert, setActiveCert] = useState(null);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // New Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('BELT_EXAM');
  const [eventDate, setEventDate] = useState('');
  const [regEndDate, setRegEndDate] = useState('');
  const [eventTime, setEventTime] = useState('8:00 AM - 12:00 PM');
  const [eventVenue, setEventVenue] = useState('Pulikkal Head Dojo');
  const [dojoBranch, setDojoBranch] = useState('All Dojo Branches');
  const [eligibleBelts, setEligibleBelts] = useState('All Belts (White to Black)');
  const [eventExaminer, setEventExaminer] = useState('Sensei Abdul Rahman (5th Dan)');
  const [eventFee, setEventFee] = useState(1000);

  // New Competition Form
  const [compTitle, setCompTitle] = useState('');
  const [compCategory, setCompCategory] = useState('Tournament');
  const [compDate, setCompDate] = useState(new Date().toISOString().split('T')[0]);
  const [compVenue, setCompVenue] = useState('Pulikkal Head Dojo');
  const [firstWinner, setFirstWinner] = useState('');
  const [secondWinner, setSecondWinner] = useState('');
  const [thirdWinner, setThirdWinner] = useState('');
  const [compNotes, setCompNotes] = useState('');

  // New Belt Promotion Form
  const [promoCadetName, setPromoCadetName] = useState('');
  const [promoPrevBelt, setPromoPrevBelt] = useState('White Belt');
  const [promoTargetBelt, setPromoTargetBelt] = useState('Yellow Belt');
  const [promoDate, setPromoDate] = useState(new Date().toISOString().split('T')[0]);
  const [promoExaminer, setPromoExaminer] = useState('Sensei Abdul Rahman (5th Dan)');

  useEffect(() => {
    fetchBeltGradings().then(data => setGradings(data || []));
    fetchStudents().then(stds => setStudentsList(stds || []));
  }, []);

  // Create New Schedule Event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const newEvt = {
      id: `evt-${Date.now()}`,
      type: eventType,
      title: eventTitle || 'Color Belt & Dan Examination 2026',
      date: eventDate || new Date().toISOString().split('T')[0],
      registration_end: regEndDate || eventDate,
      time: eventTime,
      venue: eventVenue,
      examiner: eventExaminer,
      targetBelts: [eligibleBelts],
      registrationFee: parseFloat(eventFee) || 1000,
      branch: dojoBranch,
      status: "Scheduled",
      whatsappAlertSent: false
    };

    try {
      await fetch('/api/exam-schedules/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvt.title,
          exam_date: newEvt.date,
          registration_end_date: newEvt.registration_end,
          exam_fee: newEvt.registrationFee,
          venue: newEvt.venue,
          chief_examiner: newEvt.examiner,
          is_active: true
        })
      });
    } catch (err) {
      console.error('Error saving exam schedule to backend:', err);
    }

    setEvents([newEvt, ...events]);
    setShowEventModal(false);
    alert('✓ Exam Schedule & Fee Configured and Saved Successfully!');
  };

  // Record New Competition & Winners
  const handleCreateCompetition = (e) => {
    e.preventDefault();
    const newComp = {
      id: `comp-${Date.now()}`,
      title: compTitle,
      category: compCategory,
      date: compDate,
      venue: compVenue,
      firstPlace: firstWinner || 'Pending',
      secondPlace: secondWinner || 'Pending',
      thirdPlace: thirdWinner || 'Pending',
      notes: compNotes,
      whatsappAlertSent: false
    };

    setCompetitions([newComp, ...competitions]);
    setShowCompModal(false);
    setCompTitle('');
    setFirstWinner('');
    setSecondWinner('');
    setThirdWinner('');
  };

  // Add New Belt Promotion Record
  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    const certNo = `CERT-BAMA-${Math.floor(1000 + Math.random() * 9000)}`;
    const matchedStudent = (studentsList || []).find(s => 
      String(s.name).toLowerCase() === String(promoCadetName).toLowerCase() ||
      String(s.admissionNo) === String(promoCadetName) ||
      String(s.admission_no) === String(promoCadetName)
    );

    const newPromo = {
      id: `cert-${Date.now()}`,
      certificate_no: certNo,
      student_detail: {
        id: matchedStudent?.id,
        name: matchedStudent?.name || promoCadetName,
        admissionNo: matchedStudent?.admissionNo || matchedStudent?.admission_no || `BAMA-2026-${Math.floor(1000 + Math.random() * 9000)}`
      },
      previous_belt: promoPrevBelt,
      target_belt: promoTargetBelt,
      exam_date: promoDate,
      examiner: promoExaminer
    };

    setGradings([newPromo, ...gradings]);

    if (matchedStudent?.id) {
      promoteStudent(matchedStudent.id, {
        target_belt: promoTargetBelt,
        exam_date: promoDate,
        examiner: promoExaminer,
        certificate_no: certNo
      }).catch(() => {});
    }

    saveBeltGradingBackend({
      student: matchedStudent?.id || promoCadetName,
      previous_belt: promoPrevBelt,
      target_belt: promoTargetBelt,
      exam_date: promoDate,
      examiner: promoExaminer,
      certificate_no: certNo
    }).catch(() => {});

    setShowPromotionModal(false);
    setPromoCadetName('');
    alert(`🎉 Success! Belt Promotion Record for ${matchedStudent?.name || promoCadetName} to ${promoTargetBelt} saved and certificate generated!`);
  };

  const sendWhatsAppAnnouncement = (evt) => {
    const text = (
      `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
      `📢 *${evt.type === 'BELT_EXAM' ? 'EXAM ANNOUNCEMENT' : 'SPECIAL EVENT NOTICE'}*\n` +
      `📌 *Event:* ${evt.title}\n` +
      `📅 *Date:* ${evt.date}\n` +
      `⏰ *Time:* ${evt.time || '9:00 AM'}\n` +
      `📍 *Venue:* ${evt.venue}\n` +
      `👤 *Examiner/Instructor:* ${evt.examiner || 'Chief Sensei'}\n` +
      `💰 *Reg Fee:* ₹${evt.registrationFee || 0}\n\n` +
      `Dear Parent, please report on time in clean Karate Gi. Confirm participation with your Sensei. OSS 🥋`
    );
    openWhatsApp({ message: text });
    setEvents(events.map(e => e.id === evt.id ? { ...e, whatsappAlertSent: true } : e));
  };

  const sendWinnerWhatsAppAlert = (comp) => {
    const text = (
      `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
      `🏆 *OFFICIAL CHAMPIONSHIP & PROGRAM RESULTS*\n` +
      `📌 *Event:* ${comp.title}\n` +
      `📅 *Date:* ${comp.date} | 📍 ${comp.venue}\n\n` +
      `🥇 *1st Place (CHAMPION):* ${comp.firstPlace}\n` +
      `🥈 *2nd Place (RUNNER-UP):* ${comp.secondPlace}\n` +
      `🥉 *3rd Place (BRONZE):* ${comp.thirdPlace}\n\n` +
      `Congratulations to all the winners and participants! Official Merit Certificates have been issued. OSS 🥋`
    );
    openWhatsApp({ message: text });
  };

  // Filtered Roster Data
  const safeGradings = Array.isArray(gradings) ? gradings : (gradings?.results || []);
  const filteredGradings = safeGradings.filter(g => {
    const std = g.student_detail || {};
    const name = std.name || '';
    const certNo = g.certificate_no || '';
    return name.toLowerCase().includes(search.toLowerCase()) || certNo.toLowerCase().includes(search.toLowerCase());
  });

  const filteredCompetitions = competitions.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.firstPlace.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sleek Compact Header Banner */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 hover:shadow-md transition-all duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 uppercase">
              Martial Arts Excellence
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono">
              Promotions & Certificates
            </span>
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight mt-1 flex items-center gap-2">
            <Award className="w-5 h-5 text-red-600" /> Belt Exams, Competitions & Certificates
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            Manage belt examinations, record tournament/event winners, issue printable certificates, and broadcast announcements.
          </p>
        </div>

        {/* Primary Action Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold flex-shrink-0">
          <button
            onClick={() => setActiveTab('EXAM_APPLICATIONS')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EXAM_APPLICATIONS' ? 'bg-red-600 text-white font-black shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>🏅 Online Applications</span>
          </button>

          <button
            onClick={() => setActiveTab('CERTIFICATES')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'CERTIFICATES' ? 'bg-red-600 text-white font-black shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>🥋 Belt Promotions & Certs ({safeGradings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('COMPETITIONS')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COMPETITIONS' ? 'bg-red-600 text-white font-black shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>🏆 Tournaments ({competitions.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards & Controls (Only for Certificates, Competitions & Schedules) */}
      {activeTab !== 'EXAM_APPLICATIONS' && (
        <>


          {/* Single-Line Toolbar */}
          <div className="bg-white p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 text-xs w-full">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search cadet, certificate no, competition..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-red-500 transition shadow-sm font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {activeTab === 'CERTIFICATES' && (
                <button
                  onClick={() => setShowPromotionModal(true)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Belt Promotion Certificate
                </button>
              )}

              {activeTab === 'COMPETITIONS' && (
                <button
                  onClick={() => setShowCompModal(true)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 transition cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-3.5 h-3.5" /> Add Competition & Record Winners
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 0: ONLINE EXAM APPLICATIONS */}
      {activeTab === 'EXAM_APPLICATIONS' && (
        <OfficeGrading hideDuplicateHeader={true} />
      )}

      {/* TAB 1: BELT PROMOTIONS & CERTIFICATES */}
      {activeTab === 'CERTIFICATES' && (
        <div className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100/90 text-gray-800 font-black text-[11px] uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-4 px-5">Certificate No</th>
                  <th className="py-4 px-5">Cadet Name</th>
                  <th className="py-4 px-5">Previous Belt</th>
                  <th className="py-4 px-5">Promoted Rank</th>
                  <th className="py-4 px-5">Exam Date</th>
                  <th className="py-4 px-5">Chief Examiner</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredGradings.map((g) => {
                  const std = g.student_detail || {};
                  return (
                    <tr key={g.id} className="hover:bg-gradient-to-r hover:from-red-50/40 hover:to-white transition-all duration-150 group">
                      <td className="py-4 px-5 font-mono font-black text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-xl inline-block shadow-sm">
                        {g.certificate_no || `CERT-${std.admissionNo || 'BAMA-001'}`}
                      </td>
                      <td className="py-4 px-5">
                        <strong className="text-gray-900 font-black text-sm block leading-tight group-hover:text-red-600 transition-colors">
                          {std.name || 'Adithya Suresh'}
                        </strong>
                        <span className="text-[11px] text-gray-500 font-medium block">
                          Cadet Admission: {std.admissionNo || 'BAMA-2026'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 text-[11px]">
                          {g.previous_belt || 'White Belt'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-3.5 py-1.5 bg-amber-50 text-amber-900 font-black rounded-full border border-amber-300 text-xs shadow-sm flex items-center gap-1 w-fit">
                          🥋 {g.target_belt || std.currentBelt || 'Yellow Belt'}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono font-bold text-gray-700">
                        {g.exam_date || '2026-08-01'}
                      </td>
                      <td className="py-4 px-5 text-gray-700 font-bold">
                        {g.examiner || 'Sensei Abdul Rahman (5th Dan)'}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => setActiveCert({ ...g, certType: 'PROMOTION' })}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-md shadow-red-600/20 inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Certificate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITIONS, TOURNAMENTS & FUN PROGRAMS */}
      {activeTab === 'COMPETITIONS' && (
        <div className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100/90 text-gray-800 font-black text-[11px] uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-4 px-5">Event Title & Category</th>
                  <th className="py-4 px-5">Date & Venue</th>
                  <th className="py-4 px-5">🥇 1st Place (Champion)</th>
                  <th className="py-4 px-5">🥈 2nd Place (Runner-up)</th>
                  <th className="py-4 px-5">🥉 3rd Place (Bronze)</th>
                  <th className="py-4 px-5 text-right">Actions & Broadcast</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredCompetitions.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gradient-to-r hover:from-amber-50/40 hover:to-white transition-all duration-150 group">
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-1 inline-block ${
                        comp.category === 'Tournament' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {comp.category}
                      </span>
                      <strong className="text-gray-900 font-black text-sm block leading-tight group-hover:text-amber-700 transition-colors">
                        {comp.title}
                      </strong>
                    </td>
                    <td className="py-4 px-5">
                      <span className="font-bold text-gray-900 block">{comp.date}</span>
                      <span className="text-[11px] text-gray-500 font-medium">📍 {comp.venue}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 bg-amber-50 text-amber-900 font-black rounded-xl border border-amber-300 text-xs inline-flex items-center gap-1 shadow-sm">
                        🥇 {comp.firstPlace}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 font-bold rounded-xl border border-gray-300 text-xs inline-flex items-center gap-1 shadow-sm">
                        🥈 {comp.secondPlace}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 bg-orange-50 text-orange-900 font-bold rounded-xl border border-orange-200 text-xs inline-flex items-center gap-1 shadow-sm">
                        🥉 {comp.thirdPlace}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => setActiveCert({
                            student_detail: { name: comp.firstPlace.split('(')[0].trim() },
                            certificate_no: `WIN-1ST-${comp.id}`,
                            target_belt: '🥇 1st Place Champion',
                            exam_date: comp.date,
                            examiner: 'Sensei Abdul Rahman (5th Dan)',
                            eventTitle: comp.title,
                            certType: 'COMPETITION'
                          })}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-600 text-amber-900 hover:text-white border border-amber-300 rounded-lg font-black text-[11px] transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                          title="Print 1st Place Champion Certificate"
                        >
                          🥇 1st Cert
                        </button>

                        {comp.secondPlace && comp.secondPlace !== 'Pending' && (
                          <button
                            onClick={() => setActiveCert({
                              student_detail: { name: comp.secondPlace.split('(')[0].trim() },
                              certificate_no: `WIN-2ND-${comp.id}`,
                              target_belt: '🥈 2nd Place Runner-up',
                              exam_date: comp.date,
                              examiner: 'Sensei Abdul Rahman (5th Dan)',
                              eventTitle: comp.title,
                              certType: 'COMPETITION'
                            })}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-700 text-gray-800 hover:text-white border border-gray-300 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                            title="Print 2nd Place Runner-up Certificate"
                          >
                            🥈 2nd Cert
                          </button>
                        )}

                        {comp.thirdPlace && comp.thirdPlace !== 'Pending' && (
                          <button
                            onClick={() => setActiveCert({
                              student_detail: { name: comp.thirdPlace.split('(')[0].trim() },
                              certificate_no: `WIN-3RD-${comp.id}`,
                              target_belt: '🥉 3rd Place Bronze Medalist',
                              exam_date: comp.date,
                              examiner: 'Sensei Abdul Rahman (5th Dan)',
                              eventTitle: comp.title,
                              certType: 'COMPETITION'
                            })}
                            className="px-2.5 py-1 bg-orange-50 hover:bg-orange-600 text-orange-900 hover:text-white border border-orange-300 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                            title="Print 3rd Place Bronze Certificate"
                          >
                            🥉 3rd Cert
                          </button>
                        )}

                        <button
                          onClick={() => sendWinnerWhatsAppAlert(comp)}
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg transition cursor-pointer shadow-xs inline-flex items-center justify-center"
                          title="Broadcast Competition Results on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Record New Competition & Winners */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowCompModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Record Competition & Winners</h3>
                <p className="text-xs text-gray-500 font-medium">Add tournament, kata match, or fun game results.</p>
              </div>
            </div>

            <form onSubmit={handleCreateCompetition} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Event Category</label>
                  <select
                    value={compCategory}
                    onChange={(e) => setCompCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 font-bold focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer shadow-sm"
                  >
                    <option value="Tournament">Martial Arts Championship</option>
                    <option value="Fun Program">Fun Challenge / Game</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Karate Championship 2026"
                    value={compTitle}
                    onChange={(e) => setCompTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 shadow-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 shadow-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Venue</label>
                  <input
                    type="text"
                    required
                    value={compVenue}
                    onChange={(e) => setCompVenue(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 shadow-sm font-medium"
                  />
                </div>
              </div>

              {/* Winners Section */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
                <span className="text-amber-900 font-black uppercase text-[10px] tracking-wider block flex items-center gap-1">
                  <Medal className="w-3.5 h-3.5 text-amber-600" /> Record Position Holders & Champions:
                </span>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-0.5">🥇 1st Place / Champion *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adithya Suresh"
                    value={firstWinner}
                    onChange={(e) => setFirstWinner(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-gray-900 font-bold text-xs focus:outline-none focus:border-amber-500 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 font-bold mb-0.5">🥈 2nd Place (Runner-up)</label>
                    <input
                      type="text"
                      placeholder="e.g. Kanjali"
                      value={secondWinner}
                      onChange={(e) => setSecondWinner(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium text-xs focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-0.5">🥉 3rd Place (Bronze)</label>
                    <input
                      type="text"
                      placeholder="e.g. Haneen"
                      value={thirdWinner}
                      onChange={(e) => setThirdWinner(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium text-xs focus:outline-none focus:border-amber-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4" /> Save Event & Winners
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record New Belt Promotion */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-2xl relative">
            <button onClick={() => setShowPromotionModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-50 text-red-600 border border-red-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Add Belt Promotion Record</h3>
                <p className="text-xs text-gray-500 font-medium">Issue official belt promotion certificate to cadet.</p>
              </div>
            </div>

            <form onSubmit={handleCreatePromotion} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Cadet Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adithya Suresh"
                  value={promoCadetName}
                  onChange={(e) => setPromoCadetName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 shadow-sm font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Previous Belt</label>
                  <select
                    value={promoPrevBelt}
                    onChange={(e) => setPromoPrevBelt(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer shadow-sm font-bold"
                  >
                    {BELT_LEVELS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Promoted Rank *</label>
                  <select
                    value={promoTargetBelt}
                    onChange={(e) => setPromoTargetBelt(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 cursor-pointer shadow-sm font-black text-red-700"
                  >
                    {BELT_LEVELS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Exam Date</label>
                <input
                  type="date"
                  required
                  value={promoDate}
                  onChange={(e) => setPromoDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 shadow-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Chief Examiner</label>
                <input
                  type="text"
                  required
                  value={promoExaminer}
                  onChange={(e) => setPromoExaminer(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:bg-white focus:outline-none focus:border-red-500 shadow-sm font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPromotionModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" /> Save & Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* OFFICIAL HIGH-RES CERTIFICATE VIEWER MODAL */}
      {activeCert && (
        <div className="print-modal-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-start p-4 overflow-y-auto print:p-0 print:bg-white print:static">
          {/* Print Style Rule */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 0 !important; /* Removes browser header date, page title, and footer URL */
              }

              /* Hide all background layout, sidebar, headers, and buttons */
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
              }

              .no-print, header, nav, aside, main > div > div:not(.print-modal-overlay), table, form {
                display: none !important;
              }

              /* Display overlay and certificate card cleanly */
              .print-modal-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                padding: 20px !important;
                margin: 0 !important;
                overflow: visible !important;
                z-index: 999999 !important;
                display: block !important;
              }

              .bama-print-cert-card {
                position: relative !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 36px !important;
                border: 8px solid #d97706 !important;
                box-shadow: none !important;
                background-color: #FFFDF5 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: block !important;
                visibility: visible !important;
              }

              .bama-print-cert-card * {
                visibility: visible !important;
              }
            }
          `}</style>

          {/* Floating Action Toolbar OUTSIDE Certificate Document */}
          <div className="no-print w-full max-w-3xl bg-gray-900 text-white rounded-2xl px-5 py-3 border border-gray-700 shadow-2xl flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <strong className="text-xs font-black block text-amber-300">Official B.A.M.A. Certificate Preview</strong>
                <span className="text-[10px] text-gray-400 font-mono">{activeCert.certificate_no}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> 🖨️ Print / Save PDF
              </button>

              <button
                onClick={() => {
                  const text = (
                    `🥋 *BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)*\n\n` +
                    `🏆 *OFFICIAL CERTIFICATE ISSUED*\n` +
                    `👤 *Cadet Name:* ${activeCert.student_detail?.name || 'Cadet'}\n` +
                    `📜 *Achievement / Rank:* ${activeCert.target_belt || 'Certified'}\n` +
                    `📌 *Cert No:* ${activeCert.certificate_no}\n` +
                    `📅 *Date:* ${activeCert.exam_date}\n\n` +
                    `Congratulations! OSS 🥋`
                  );
                  openWhatsApp({ message: text });
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" /> Share WA
              </button>

              <button
                onClick={() => setActiveCert(null)}
                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition cursor-pointer"
                title="Close Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clean Printable Certificate Document */}
          <div className="bama-print-cert-card w-full max-w-3xl bg-[#FFFDF5] text-gray-900 rounded-3xl p-8 sm:p-12 shadow-2xl relative border-[12px] border-amber-600 space-y-6">
            {/* Crest Header */}
            <div className="text-center space-y-2 border-b-2 border-amber-200 pb-5">
              <div className="flex items-center justify-center gap-3">
                <img
                  src="/logo bama_240616_200739.jpg.jpeg"
                  alt="B.A.M.A. Official Crest Logo"
                  className="w-20 h-20 rounded-full object-cover border-4 border-amber-600 shadow-lg ring-4 ring-amber-500/20"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-widest text-red-800 uppercase font-serif mt-2">
                {ACADEMY_INFO.name}
              </h2>
              <p className="text-xs font-black tracking-widest text-amber-800 uppercase">
                {activeCert.certType === 'COMPETITION'
                  ? 'OFFICIAL TOURNAMENT & CHAMPIONSHIP MERIT CERTIFICATE'
                  : 'OFFICIAL CERTIFICATE OF BELT GRADED EXCELLENCE'}
              </p>
              <p className="text-[10px] text-gray-500 font-bold">
                Affiliated to JKA India • Karate Association of Kerala • Approved Martial Arts Federation
              </p>
            </div>

            {/* Certificate Body */}
            <div className="text-center space-y-4 py-4">
              <p className="text-sm italic text-gray-600 font-serif">This is to officially certify that Cadet</p>
              <h3 className="text-3xl sm:text-4xl font-black text-black tracking-wide font-serif underline decoration-amber-600 uppercase">
                {activeCert.student_detail?.name || 'ADITHYA SURESH'}
              </h3>
              
              <p className="text-xs sm:text-sm text-gray-700 max-w-lg mx-auto leading-relaxed font-serif">
                {activeCert.certType === 'COMPETITION' ? (
                  <>has demonstrated outstanding martial skill, discipline, and sportsmanship in <strong>{activeCert.eventTitle || 'Academy Championship'}</strong>, officially winning the distinction of</>
                ) : (
                  <>has successfully passed the technical examination and demonstrated high proficiency in Kata, Kumite, and Dojo Discipline, hereby being officially promoted to rank of</>
                )}
              </p>

              <div className="inline-block px-8 py-3 bg-gradient-to-r from-red-800 via-red-700 to-amber-700 text-amber-300 font-black text-xl sm:text-2xl rounded-2xl shadow-lg uppercase tracking-wider border-2 border-amber-400">
                {activeCert.target_belt || 'GREEN BELT'}
              </div>
            </div>

            {/* Certificate Signatures & Seal */}
            <div className="flex items-center justify-between pt-8 border-t-2 border-amber-200 text-xs">
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-gray-500 font-bold">CERT NO: {activeCert.certificate_no || 'CERT-BAMA-2026'}</p>
                <p className="font-bold text-gray-900">Date: {activeCert.exam_date || '2026-08-11'}</p>
              </div>

              {/* Gold Medal Watermark */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-white font-black text-[10px] flex items-center justify-center text-center p-1 border-4 border-amber-200 shadow-md transform rotate-12">
                OFFICIAL B.A.M.A. SEAL
              </div>

              <div className="text-center space-y-0.5">
                <p className="font-black text-gray-900 border-b border-black pb-1 px-4">{activeCert.examiner || 'Sensei Abdul Rahman (5th Dan)'}</p>
                <p className="text-[10px] text-gray-500 font-bold">Chief Examiner & Master</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
