import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRight, Shield, Award, Sparkles, X, Clock, Dumbbell } from 'lucide-react';
import { PROGRAMS } from '../../services/initialData';
import { useNavigate } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';

export default function Programs() {
  const navigate = useNavigate();
  useScrollReveal();

  const [activeModalProg, setActiveModalProg] = useState(null);

  const [cmsConfig, setCmsConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_cms_config');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('bama_cms_config');
        if (saved) setCmsConfig(JSON.parse(saved));
      } catch (e) {}
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('cms_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('cms_updated', handleSync);
    };
  }, []);

  const rawCmsPrograms = (cmsConfig?.programs && cmsConfig.programs.length > 0)
    ? cmsConfig.programs.map(p => ({
        id: p.id || 'prog-custom',
        title: p.title || 'Shotokan Karate Course',
        description: p.description || p.desc || 'Comprehensive martial arts training module supervised by certified senseis.',
        badge: p.badge || 'CERTIFIED PROGRAM',
        ageGroup: p.ageGroup || 'All Ages',
        img: p.img || p.image || '/assets/prog_kids.jpg',
        features: p.features && p.features.length > 0 ? p.features : ['Certified Sensei Supervision', 'Safety Tatami Dojo Floor', 'Belt Exam Eligibility', 'National Tournament Pathway']
      }))
    : PROGRAMS;

  let programsList = rawCmsPrograms;
  if (programsList.length < 6) {
    const needed = 6 - programsList.length;
    const extraDefaults = PROGRAMS.filter(d => !programsList.some(p => p.id === d.id)).slice(0, needed);
    programsList = [...programsList, ...extraDefaults];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header PRO MAX */}
      <div className="reveal-on-scroll slide-up text-center space-y-4">
        <span className="px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
          Official Shotokan & Combat Curriculum
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase pt-2">
          TRAINING <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">PROGRAMS & COURSES</span>
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base font-medium">
          From beginners to elite competition cadets, B.A.M.A. provides structured martial arts training supervised by certified national senseis.
        </p>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {programsList.map((prog, idx) => (
          <div
            key={prog.id}
            style={{ transitionDelay: `${idx * 0.1}s` }}
            className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-6 border border-gray-800/90 flex flex-col justify-between group hover:border-amber-400 transition-all duration-500 shadow-2xl hover:shadow-[0_20px_40px_rgba(245,158,11,0.3)] hover:-translate-y-3"
          >
            <div>
              {/* Program Cover Image */}
              <div
                onClick={() => setActiveModalProg(prog)}
                className="h-52 w-full rounded-2xl overflow-hidden mb-5 relative border border-gray-800 shadow-lg cursor-pointer group-hover:brightness-105"
              >
                <img
                  src={prog.img || '/assets/prog_kids.jpg'}
                  alt={prog.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95 contrast-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-transparent"></div>
                <span className="absolute top-3 left-3 text-[9px] font-black font-mono px-3 py-1 rounded-full bg-red-600 text-white uppercase tracking-wider shadow-lg">
                  {prog.badge || 'CERTIFIED COURSE'}
                </span>
                <span className="absolute bottom-3 right-3 text-[10px] font-bold px-3 py-1 rounded-full bg-black/80 text-amber-300 border border-amber-400/40 backdrop-blur-md">
                  {prog.ageGroup || 'All Ages'}
                </span>
              </div>

              <h3 className="text-2xl font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-wider mb-2">
                {prog.title}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-6 font-medium line-clamp-3">
                {prog.description}
              </p>

              {prog.features && prog.features.length > 0 && (
                <div className="space-y-2 mb-6 pt-3 border-t border-gray-800/80">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Key Syllabus Highlights:</p>
                  {prog.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5 text-xs text-gray-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/contact')}
              className="shimmer-btn-wrapper w-full py-3.5 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl border border-amber-400/30 transition cursor-pointer"
            >
              <span>Enroll In {prog.title} →</span>
            </button>
          </div>
        ))}
      </div>

      {/* Interactive Modal for Program Details */}
      {activeModalProg && (
        <div
          onClick={() => setActiveModalProg(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-[#121526] via-[#0E101D] to-[#07080E] border border-amber-400/50 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative p-6 sm:p-8 space-y-6"
          >
            <button
              onClick={() => setActiveModalProg(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/80 text-gray-300 hover:text-white border border-gray-700 hover:border-red-500 transition cursor-pointer"
            >
              <X className="w-5 h-5 text-amber-400" />
            </button>

            <div className="h-56 w-full rounded-2xl overflow-hidden relative border border-gray-800">
              <img
                src={activeModalProg.img}
                alt={activeModalProg.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <span className="absolute bottom-4 left-4 px-3 py-1 bg-red-600 text-white font-black text-xs uppercase rounded-full">
                {activeModalProg.badge}
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black text-white uppercase">{activeModalProg.title}</h3>
              <p className="text-sm text-gray-300 leading-relaxed font-medium">{activeModalProg.description}</p>
            </div>

            <button
              onClick={() => {
                setActiveModalProg(null);
                navigate('/contact');
              }}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl hover:scale-102 transition"
            >
              Reserve Seat for {activeModalProg.title} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
