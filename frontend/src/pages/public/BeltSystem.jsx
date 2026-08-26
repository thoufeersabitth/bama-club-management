import React from 'react';
import { BELT_LEVELS } from '../../services/initialData';
import { Award, Clock, CheckCircle2, Shield, Sparkles, BookOpen, Flame } from 'lucide-react';
import KarateBeltIcon from '../../components/common/KarateBeltIcon';
import useScrollReveal from '../../hooks/useScrollReveal';

export default function BeltSystem() {
  useScrollReveal();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header PRO MAX */}
      <div className="reveal-on-scroll slide-up text-center space-y-4">
        <span className="px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
          Official Shotokan Belt Hierarchy & Grading Criteria
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase pt-2">
          THE B.A.M.A. <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">BELT SYSTEM</span>
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base font-medium">
          From 10th Kyu (White Belt) to 1st Dan (Black Belt), explore the official syllabus, Kata requirements, and minimum training duration required for graduation.
        </p>
      </div>

      {/* Belt Progression Timeline Cards */}
      <div className="space-y-6">
        {BELT_LEVELS.map((belt, idx) => {
          const isBlack = belt.level === 11;
          return (
            <div
              key={belt.level}
              style={{ transitionDelay: `${idx * 0.05}s` }}
              className={`reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-6 sm:p-8 border ${
                isBlack
                  ? 'border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.3)] animate-pulse-glow'
                  : 'border-gray-800/90'
              } hover:border-amber-400 transition-all duration-500 hover:-translate-y-2 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group relative overflow-hidden`}
            >
              {/* Left Belt Header */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-black/80 flex items-center justify-center p-2 shadow-2xl border border-gray-800 flex-shrink-0 group-hover:scale-110 transition-transform relative">
                  <div
                    className="absolute inset-0 rounded-2xl blur-xl opacity-30 group-hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: belt.color === '#FFFFFF' ? '#F59E0B' : belt.color }}
                  ></div>
                  <KarateBeltIcon color={belt.color} name={belt.name} level={belt.level} className="w-16 h-16 relative z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                      {belt.name}
                    </h3>
                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono ${
                      isBlack
                        ? 'bg-amber-500 text-black border border-amber-300 shadow-md'
                        : 'bg-red-950 text-amber-300 border border-red-800'
                    }`}>
                      Level {belt.level}
                    </span>
                  </div>
                  <p className="text-xs text-amber-400 font-bold mt-1.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" /> Minimum Duration: {belt.durationMonths} Months Active Dojo Training
                  </p>
                </div>
              </div>

              {/* Right Belt Description */}
              <div className="flex-1 md:max-w-xl text-xs sm:text-sm text-gray-300 font-medium leading-relaxed bg-black/40 p-4 sm:p-5 rounded-2xl border border-gray-800/80">
                <p>{belt.description}</p>
                <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Grading Requirement: Official Sensei Evaluation & Kihon Kata Test</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
