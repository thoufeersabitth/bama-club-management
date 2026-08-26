import React from 'react';
import { Shield, Award, Target, CheckCircle2, HeartHandshake, Eye, BookOpen, Sparkles, Flame, Dumbbell, Zap, UserCheck, Trophy } from 'lucide-react';
import { ACADEMY_INFO } from '../../services/initialData';
import useScrollReveal from '../../hooks/useScrollReveal';

export default function About() {
  useScrollReveal();

  const benefitsList = [
    {
      icon: <Flame className="w-6 h-6 text-red-500" />,
      title: "Mental Discipline & Focus",
      desc: "Develops sharp mental concentration, emotional self-control, stress relief, and executive decision-making under pressure."
    },
    {
      icon: <Shield className="w-6 h-6 text-amber-400" />,
      title: "Practical Self-Defence",
      desc: "Empowers students with real-world situational awareness, instinctive protection reflexes, and tactical self-defense techniques."
    },
    {
      icon: <Dumbbell className="w-6 h-6 text-red-500" />,
      title: "Full-Body Fitness & Conditioning",
      desc: "Builds core strength, explosive endurance, agility, balance, cardiovascular stamina, and joint flexibility."
    },
    {
      icon: <Trophy className="w-6 h-6 text-amber-400" />,
      title: "Tournament & Championship Excellence",
      desc: "Prepares cadets for WKF, JKA India, and KKA State/National karate championships with specialized Kumite & Kata coaching."
    },
    {
      icon: <Zap className="w-6 h-6 text-red-500" />,
      title: "Unshakable Self-Confidence",
      desc: "Instills courage, self-esteem, leadership qualities, and anti-bullying resilience in children and adults alike."
    },
    {
      icon: <UserCheck className="w-6 h-6 text-amber-400" />,
      title: "Traditional Respect & Honor",
      desc: "Fosters traditional Shotokan Dojo etiquette, mutual respect for Sensei and peers, and lifelong moral character."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
      {/* 1. Header PRO MAX */}
      <div className="reveal-on-scroll slide-up text-center space-y-4">
        <span className="px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
          About Brave Academy of Martial Arts
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase pt-2">
          THE B.A.M.A. <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">LEGACY</span>
        </h1>
        <p className="text-amber-400 font-bold tracking-widest uppercase text-sm sm:text-base">
          {ACADEMY_INFO.tagline}
        </p>
      </div>

      {/* 2. Government Registration & Recognized Affiliations Card */}
      <div className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-8 sm:p-10 border border-gray-800/90 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl pointer-events-none"></div>

        <div className="space-y-4">
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400 flex-shrink-0" />
            Government Registration & Permits
          </h3>
          <ul className="space-y-3.5 text-sm text-gray-300 font-medium">
            <li className="flex items-center gap-3 bg-black/60 p-3.5 rounded-2xl border border-gray-800">
              <CheckCircle2 className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>Govt Reg No: <strong className="text-amber-300 font-mono font-black">{ACADEMY_INFO.regNo}</strong></span>
            </li>
            <li className="flex items-center gap-3 bg-black/60 p-3.5 rounded-2xl border border-gray-800">
              <CheckCircle2 className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>Police Permit No: <strong className="text-amber-300 font-mono font-black">{ACADEMY_INFO.policePermitNo}</strong></span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <Award className="w-6 h-6 text-red-500 flex-shrink-0" />
            Recognized Affiliations
          </h3>
          <div className="space-y-3 text-sm text-gray-300 font-medium">
            {ACADEMY_INFO.affiliations.map((aff, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/60 p-3.5 rounded-2xl border border-gray-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span>
                <span className="font-bold text-white">{aff.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MARTIAL ARTS BENEFITS SECTION */}
      <section className="space-y-10">
        <div className="reveal-on-scroll slide-up text-center space-y-3">
          <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
            Why Train With B.A.M.A.
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            BENEFITS OF <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">MARTIAL ARTS TRAINING</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xl mx-auto">
            Transform physical strength, mental clarity, emotional control, and personal safety through structured Shotokan Karate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefitsList.map((b, idx) => (
            <div
              key={idx}
              style={{ transitionDelay: `${idx * 0.08}s` }}
              className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] p-7 rounded-3xl border border-gray-800/90 shadow-xl space-y-4 hover:border-amber-400 transition-all duration-500 hover:-translate-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-black/80 border border-gray-800 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {b.icon}
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                {b.title}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Vision & Mission 3D Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="reveal-on-scroll slide-left bg-gradient-to-b from-[#0F111D] to-[#0A0C14] p-8 rounded-3xl border border-gray-800/90 space-y-4 shadow-2xl hover:border-amber-400 transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Eye className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Our Vision</h3>
          <p className="text-gray-300 text-sm leading-relaxed font-medium">
            To become one of the premier martial arts academies in India by nurturing disciplined, confident, and highly skilled martial artists while promoting health, respect, and lifelong excellence across all age groups.
          </p>
        </div>

        <div className="reveal-on-scroll slide-right bg-gradient-to-b from-[#0F111D] to-[#0A0C14] p-8 rounded-3xl border border-gray-800/90 space-y-4 shadow-2xl hover:border-red-500 transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wider">Our Mission</h3>
          <p className="text-gray-300 text-sm leading-relaxed font-medium">
            Deliver world-class Shotokan Karate and combat training, build physical stamina and mental fortitude, prepare cadets for state, national, and international tournaments, and foster a supportive learning environment.
          </p>
        </div>
      </div>

      {/* 5. Core Values */}
      <div className="reveal-on-scroll zoom-in space-y-8">
        <h2 className="text-3xl font-black text-center text-white uppercase tracking-wider">
          CORE <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">VALUES</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['Discipline', 'Respect', 'Integrity', 'Courage', 'Confidence', 'Excellence', 'Leadership', 'Teamwork'].map((val, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-gradient-to-b from-[#0F111D] to-[#0A0C14] border border-gray-800 text-center font-black text-sm uppercase tracking-wider text-amber-300 hover:border-amber-400 transition transform hover:-translate-y-1 shadow-lg cursor-pointer"
            >
              {val}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
