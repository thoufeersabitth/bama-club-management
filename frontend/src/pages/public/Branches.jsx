import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Shield, Users, ExternalLink, Sparkles, Navigation } from 'lucide-react';
import { INITIAL_BRANCHES } from '../../services/initialData';
import { fetchBranches, fetchStudents, sanitizeBranches } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';

export default function Branches() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_custom_branches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = sanitizeBranches(parsed);
          localStorage.setItem('bama_custom_branches', JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch (e) {}
    return INITIAL_BRANCHES;
  });

  const [students, setStudents] = useState([]);

  useScrollReveal([branches]);

  const loadBranchesList = () => {
    try {
      const saved = localStorage.getItem('bama_custom_branches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = sanitizeBranches(parsed);
          setBranches(cleaned);
          fetchStudents().then(stData => {
            if (stData && stData.length > 0) setStudents(stData);
          });
        }
      }
    } catch (e) {}

    fetchBranches().then(data => {
      if (data && data.length > 0) {
        const cleaned = sanitizeBranches(data);
        setBranches(cleaned);
      }
    });

    fetchStudents().then(stData => {
      if (stData && stData.length > 0) {
        setStudents(stData);
      }
    });
  };

  useEffect(() => {
    loadBranchesList();
    window.addEventListener('bama_branches_updated', loadBranchesList);
    window.addEventListener('bama_data_updated', loadBranchesList);
    return () => {
      window.removeEventListener('bama_branches_updated', loadBranchesList);
      window.removeEventListener('bama_data_updated', loadBranchesList);
    };
  }, []);

  const getBranchStudentCount = (b) => {
    let roster = students;
    if (!roster || roster.length === 0) {
      try {
        const saved = localStorage.getItem('bama_students_list');
        if (saved) roster = JSON.parse(saved);
      } catch (e) {}
    }

    const bStr = String(b.name || '').toLowerCase().trim();

    if (!roster || roster.length === 0) {
      return b.studentCount || (bStr.includes('pulikkal') ? 25 : bStr.includes('chungam') ? 18 : bStr.includes('mongam') ? 15 : 0);
    }

    const count = roster.filter(s => {
      const cadetBranch = String(
        s.branch_name ||
        s.branch_detail?.name ||
        s.branchName ||
        (typeof s.branch === 'object' ? s.branch?.name : s.branch) ||
        ''
      ).toLowerCase().trim();

      if (!cadetBranch) {
        return bStr.includes('pulikkal') || bStr.includes('head office');
      }

      if (bStr.includes('pulikkal') || bStr.includes('head office')) {
        return cadetBranch.includes('pulikkal') || cadetBranch.includes('head office') || cadetBranch === 'pulikkal';
      }

      if (bStr.includes('chungam')) return cadetBranch.includes('chungam');
      if (bStr.includes('mongam')) return cadetBranch.includes('mongam');
      if (bStr.includes('feroke')) return cadetBranch.includes('feroke');

      return cadetBranch === bStr || cadetBranch.includes(bStr) || bStr.includes(cadetBranch);
    }).length;

    return count;
  };

  const branchList = branches;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header PRO MAX */}
      <div className="reveal-on-scroll slide-up text-center space-y-4">
        <span className="px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
          State-of-the-Art Training Hubs Across Malappuram & Kerala
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase pt-2">
          ACADEMY <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">DOJO BRANCHES</span>
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base font-medium">
          Find your nearest B.A.M.A. martial arts training dojo. Equipped with safety tatami mats, punching bags, and certified senseis.
        </p>
      </div>

      {/* Branch Cards */}
      <div className="space-y-10">
        {branchList.map((b, idx) => {
          const branchImg = b.image || b.img || b.photo || (b.isHeadOffice ? '/assets/prog_adults.jpg' : '/assets/prog_kids.jpg');
          return (
            <div
              key={b.id}
              style={{ transitionDelay: `${idx * 0.1}s` }}
              className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-6 sm:p-8 border border-gray-800/90 shadow-2xl hover:border-amber-400 transition-all duration-500 hover:-translate-y-2 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative overflow-hidden group"
            >
              {/* Dojo Image Column */}
              <div className="lg:col-span-4 flex flex-col space-y-3">
                <div className="h-56 sm:h-64 lg:h-full min-h-[200px] w-full rounded-2xl overflow-hidden relative border border-gray-800/80 shadow-inner group/img bg-black/40">
                  <img
                    src={branchImg}
                    alt={b.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black px-3 py-1 bg-black/80 text-amber-300 rounded-full border border-amber-400/50 backdrop-blur-xs font-mono shadow-md">
                      {b.code}
                    </span>
                    {b.isHeadOffice && (
                      <span className="text-[10px] font-black bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg font-mono flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Head Office
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-gray-300 font-bold bg-black/70 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Shield className="w-3.5 h-3.5" /> Certified Dojo
                    </span>
                    <span className="font-mono text-white text-[10px]">
                      {b.name.split(' ')[0]} Hub
                    </span>
                  </div>
                </div>
              </div>

              {/* Dojo Info Column */}
              <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                    {b.name}
                  </h2>

                  <div className="grid grid-cols-1 gap-3 text-xs text-gray-300 font-medium mt-4">
                    <div className="flex items-start gap-3 bg-black/40 p-3.5 rounded-2xl border border-gray-800/80">
                      <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block uppercase text-[10px] tracking-wider mb-0.5">Dojo Address:</strong>
                        <span>{b.address}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-black/40 p-3.5 rounded-2xl border border-gray-800/80">
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block uppercase text-[10px] tracking-wider mb-0.5">Class Batches:</strong>
                        <span>{b.timings}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-black/40 p-3.5 rounded-2xl border border-gray-800/80">
                      <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block uppercase text-[10px] tracking-wider mb-0.5">Phone / WhatsApp:</strong>
                        <a href={`tel:${b.phone}`} className="hover:text-amber-300 transition font-mono font-bold">{b.phone}</a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-black/40 p-3.5 rounded-2xl border border-gray-800/80">
                      <Shield className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block uppercase text-[10px] tracking-wider mb-0.5">Branch Head / Sensei:</strong>
                        <span className="text-white font-bold">{b.head || b.branch_head || 'Sensei Abdul Rahman (5th Dan)'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats & Map Action */}
              <div className="lg:col-span-3 bg-black/60 rounded-2xl p-5 border border-gray-800 flex flex-col justify-between space-y-5">
                <div>
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 border-b border-gray-800 pb-2 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Branch Highlights
                  </h4>
                  <div className="space-y-2 text-xs text-gray-300 font-medium">
                    <p className="flex justify-between items-center py-1 border-b border-gray-800/50">
                      <span>Active Cadets:</span> <strong className="text-amber-300 font-mono text-sm">{getBranchStudentCount(b)} Cadets</strong>
                    </p>
                    <p className="flex justify-between items-center py-1 border-b border-gray-800/50">
                      <span>Certified Instructors:</span> <strong className="text-white font-mono">{b.instructorCount || 1} Senseis</strong>
                    </p>
                    <p className="flex justify-between items-center py-1">
                      <span>Dojo Status:</span> <strong className="text-green-400 uppercase text-[10px] bg-green-950/80 px-2 py-0.5 rounded border border-green-800">ACTIVE DOJO</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <a
                    href={b.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((b.name || '') + ' ' + (b.address || ''))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-gradient-to-r from-red-600/20 via-red-600/10 to-amber-600/20 hover:bg-red-600 text-amber-300 hover:text-white rounded-xl font-black text-xs uppercase tracking-wider text-center border border-red-500/40 transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Navigation className="w-4 h-4 text-red-500" />
                    <span>Google Maps Directions</span>
                  </a>

                  <button
                    onClick={() => navigate('/contact')}
                    className="shimmer-btn-wrapper w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                  >
                    <span>Enroll At {b.name.split(' ')[0]} →</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
