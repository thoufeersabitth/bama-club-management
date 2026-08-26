import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Award, Users, MapPin, ArrowRight, CheckCircle2,
  Calendar, Star, Phone, Mail, ChevronRight, Zap, Target,
  Clock, Dumbbell, Flame, Trophy, ChevronLeft, Heart, Sparkles, Bell,
  Maximize2, Eye, X, ExternalLink
} from 'lucide-react';
import { ACADEMY_INFO, BELT_LEVELS, INITIAL_BRANCHES } from '../../services/initialData';
import KarateBeltIcon from '../../components/common/KarateBeltIcon';
import { getCmsConfig } from '../../services/cmsService';
import useScrollReveal from '../../hooks/useScrollReveal';
import { fetchBranches, sanitizeBranches } from '../../services/api';

export default function Home() {
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

  useScrollReveal([branches]);

  const loadHomeBranches = () => {
    try {
      const saved = localStorage.getItem('bama_custom_branches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = sanitizeBranches(parsed);
          localStorage.setItem('bama_custom_branches', JSON.stringify(cleaned));
          setBranches(cleaned);
          return;
        }
      }
    } catch (e) {}

    fetchBranches().then(data => {
      if (data && data.length > 0) {
        const cleaned = sanitizeBranches(data);
        setBranches(cleaned);
      }
    });
  };

  const [activePhotoModal, setActivePhotoModal] = useState(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');

  const isBranchAutoPlay = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isBranchAutoPlay.current && branches.length > 3 && branchSliderRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = branchSliderRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 20) {
          branchSliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          branchSliderRef.current.scrollBy({ left: 380, behavior: 'smooth' });
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [branches]);

  const branchSliderRef = useRef(null);
  const beltSliderRef = useRef(null);

  const scrollBranchSlider = (direction) => {
    if (branchSliderRef.current) {
      const amount = direction === 'left' ? -380 : 380;
      branchSliderRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const scrollBeltSlider = (direction) => {
    if (beltSliderRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      beltSliderRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const [cms, setCms] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_cms_config');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    loadHomeBranches();
    getCmsConfig().then(data => {
      if (data) setCms(data);
    });

    const handleSync = () => {
      loadHomeBranches();
      try {
        const saved = localStorage.getItem('bama_cms_config');
        if (saved) setCms(JSON.parse(saved));
      } catch (e) {}
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('cms_updated', handleSync);
    window.addEventListener('bama_branches_updated', loadHomeBranches);
    window.addEventListener('bama_data_updated', loadHomeBranches);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('cms_updated', handleSync);
      window.removeEventListener('bama_branches_updated', loadHomeBranches);
      window.removeEventListener('bama_data_updated', loadHomeBranches);
    };
  }, []);

  const heroConfig = cms?.hero || {
    badgeText: 'JKA INDIA • KICK BOXING ASSOC. OF KERALA • KKA',
    titleLine1: 'DISCIPLINE TODAY',
    titleLine2: 'STRENGTH FOREVER',
    subTitle: 'Building confidence, discipline, respect and a stronger tomorrow through Martial Arts.',
    heroImage: '/assets/hero1.png',
    ctaText: 'JOIN NOW →'
  };

  const announcementConfig = cms?.announcement || {
    enabled: false,
    text: '',
    link: '/contact'
  };

  const statsList = cms?.stats || [
    { label: 'Active Cadets Enrolled', value: '350+' },
    { label: 'Black Belt Graduates', value: '25+' },
    { label: 'State & National Medals', value: '120+' },
    { label: 'Dojo Training Branches', value: '3' }
  ];

  const galleryList = cms?.gallery || [
    { id: 'g1', title: 'Annual Belt Exam 2026', category: 'GRADING', desc: 'Sensei Abdul Rahman examining green & brown belt candidates in Pulikkal Dojo.', img: '/assets/prog_competition.jpg' },
    { id: 'g2', title: 'Kerala State Karate Championship', category: 'COMPETITION', desc: 'B.A.M.A. cadets winning 12 Gold Medals in Kata & Kumite events.', img: '/assets/prog_adults.jpg' },
    { id: 'g3', title: "Women's Self-Defence Workshop", category: 'EVENTS', desc: 'Special situational defense seminar conducted at Chungam branch.', img: '/assets/prog_self_defence.jpg' },
    { id: 'g4', title: 'Kick Boxing Sparring Session', category: 'TRAINING', desc: 'High-intensity conditioning session with heavy bags and pad drills.', img: '/assets/prog_kickboxing.jpg' }
  ];

  const DEFAULT_PROGRAMS = [
    {
      id: 'prog-kids',
      title: 'KIDS KARATE',
      desc: 'Special training for kids to improve discipline, focus and confidence.',
      img: '/assets/prog_kids.jpg',
      icon: Users,
      category: 'JUNIOR KYU',
      tag: 'Age 5-14'
    },
    {
      id: 'prog-adults',
      title: 'ADULTS KARATE',
      desc: 'Traditional karate training for fitness, self-defense and mental strength.',
      img: '/assets/prog_adults.jpg',
      icon: Flame,
      category: 'SHOTOKAN KARATE',
      tag: 'All Ages'
    },
    {
      id: 'prog-self-defence',
      title: 'SELF DEFENCE',
      desc: 'Practical self-defence techniques for daily life safety.',
      img: '/assets/prog_self_defence.jpg',
      icon: Shield,
      category: 'SAFETY WORKSHOP',
      tag: 'Practical Tech'
    },
    {
      id: 'prog-kickboxing',
      title: 'KICK BOXING',
      desc: 'Powerful training to improve stamina, strength and agility.',
      img: '/assets/prog_kickboxing.jpg',
      icon: Target,
      category: 'STRIKING & CARDIO',
      tag: 'High Intensity'
    },
    {
      id: 'prog-fitness',
      title: 'FITNESS TRAINING',
      desc: 'Stay fit, strong and healthy with our professional fitness programs.',
      img: '/assets/prog_fitness.jpg',
      icon: Dumbbell,
      category: 'PHYSICAL CONDITIONING',
      tag: 'Strength & Fit'
    },
    {
      id: 'prog-traditional',
      title: 'TRADITIONAL KATA',
      desc: 'Traditional Japanese Shotokan Kata stance perfection and classical bunkai application.',
      img: '/assets/prog_competition.jpg',
      icon: Award,
      category: 'SHOTOKAN KATA & BUNKAI',
      tag: 'Classic Art'
    }
  ];

  const rawCmsProgs = (cms?.programs && cms.programs.length > 0) ? cms.programs.map(p => ({
    id: p.id || 'prog-custom',
    title: (p.title || 'SPECIALIZED PROGRAM').toUpperCase(),
    desc: p.desc || p.description || 'Professional martial arts training module.',
    img: p.img || p.image || '/assets/prog_kids.jpg',
    icon: Award,
    category: p.badge || 'SHOTOKAN B.A.M.A.',
    tag: p.ageGroup || 'All Ages'
  })) : [];

  let programsList = rawCmsProgs;
  if (programsList.length < 6) {
    // Fill remaining slots with default items so we ALWAYS have 6 cards (2 rows of 3)
    const needed = 6 - programsList.length;
    const extraDefaults = DEFAULT_PROGRAMS.filter(d => !programsList.some(p => p.id === d.id)).slice(0, needed);
    programsList = [...programsList, ...extraDefaults];
  }

  return (
    <div className="space-y-0 bg-[#07080C] text-gray-100 selection:bg-red-600 selection:text-white font-sans scroll-smooth overflow-x-hidden">
      {/* Live Announcement Banner if Enabled in CMS */}
      {announcementConfig.enabled && announcementConfig.text && (
        <div className="reveal-on-scroll slide-up bg-gradient-to-r from-red-700 via-amber-600 to-red-700 text-white px-4 py-2 text-center text-xs font-black tracking-wider flex items-center justify-center gap-2 shadow-md">
          <Bell className="w-4 h-4 animate-bounce text-amber-300" />
          <span>{announcementConfig.text}</span>
          <Link to={announcementConfig.link || '/contact'} className="underline ml-2 text-amber-200 hover:text-white">
            Learn More →
          </Link>
        </div>
      )}

      {/* 1. ULTRA PRO MAX FULL-BLEED HERO SECTION */}
      <section className="relative min-h-[88vh] flex items-center bg-[#05060A] text-white overflow-hidden py-14 sm:py-20 border-b border-gray-900">
        {/* Background Dojo Sun Pulse & Reflective Energy Aura */}
        <div className="absolute top-1/2 right-[12%] -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-red-600/25 blur-[110px] animate-sun-pulse pointer-events-none"></div>
        <div className="absolute top-1/4 left-[5%] w-[320px] h-[320px] rounded-full bg-amber-500/10 blur-[90px] animate-pulse-glow pointer-events-none"></div>

        {/* Full-Bleed Artwork Image background, Proportioned & Scaled Nicely on Right */}
        <div className="absolute inset-0 z-0 flex justify-end items-center pointer-events-none">
          <img
            src={heroConfig.heroImage || "/assets/hero1.png"}
            alt="B.A.M.A. Master Hero"
            className="reveal-on-scroll slide-right h-[85%] sm:h-[95%] w-auto max-w-full sm:max-w-[55%] object-contain object-right filter brightness-110 contrast-115 saturate-110 drop-shadow-[0_30px_45px_rgba(0,0,0,0.95)] transform transition-all duration-1000 pr-0 sm:pr-8 animate-hero-artwork-float"
          />
          {/* Subtle Scoped Left Gradient Overlay for 100% Crisp Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#05060A] via-[#05060A]/95 via-42% to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060A] via-transparent to-transparent opacity-80"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 w-full">
          {/* Top Affiliations Pill Badge PRO MAX */}
          <div className="reveal-on-scroll slide-left inline-flex flex-wrap items-center gap-3 px-5 py-2.5 rounded-full bg-black/90 border border-red-500/60 text-amber-300 font-extrabold text-[11px] tracking-wider uppercase shadow-[0_0_25px_rgba(239,68,68,0.3)] backdrop-blur-xl animate-pulse-glow">
            <span className="flex items-center gap-1.5 text-red-500 font-black">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} /> AFFILIATED TO:
            </span>
            <span className="text-white font-bold tracking-widest">{heroConfig.badgeText}</span>
          </div>

          {/* Main Headline & Subtext */}
          <div className="max-w-2xl space-y-6">
            <div className="reveal-on-scroll slide-left space-y-3">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[0.90] text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]">
                {heroConfig.titleLine1} <br />
                <span className="bg-gradient-to-r from-red-500 via-amber-300 via-yellow-400 to-red-600 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent filter drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]">
                  {heroConfig.titleLine2}
                </span>
              </h1>

              {/* Gold Star Divider Line PRO MAX */}
              <div className="flex items-center gap-3.5 pt-2">
                <div className="h-[2.5px] bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 w-28 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                <div className="flex text-amber-400 text-xs tracking-widest font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                  ★ ★ ★ ★ ★ <span className="ml-2 text-[10px] text-gray-200 font-sans tracking-widest uppercase font-black">JKA INDIA CERTIFIED</span>
                </div>
                <div className="h-[2.5px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600 w-28 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
              </div>
            </div>

            <p className="reveal-on-scroll slide-left text-gray-200 text-sm sm:text-base leading-relaxed max-w-xl font-medium drop-shadow-md">
              {heroConfig.subTitle}
            </p>

            {/* Action Buttons PRO MAX */}
            <div className="reveal-on-scroll slide-up flex flex-wrap items-center gap-4 pt-3">
              <button
                onClick={() => navigate('/contact')}
                className="shimmer-btn-wrapper px-8 py-4 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-2xl shadow-red-950/80 hover:shadow-[0_0_35px_rgba(239,68,68,0.7)] flex items-center gap-2 transition-all transform hover:-translate-y-1 hover:scale-102 -skew-x-6 cursor-pointer border border-amber-400/40"
              >
                <span className="skew-x-6 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-300" />
                  {heroConfig.ctaText || 'JOIN B.A.M.A. ACADEMY TODAY →'}
                </span>
              </button>

              <button
                onClick={() => navigate('/programs')}
                className="px-8 py-4 bg-black/80 hover:bg-white/15 border border-white/20 hover:border-amber-400 text-white hover:text-amber-300 font-black text-xs uppercase tracking-wider rounded-xl backdrop-blur-xl flex items-center gap-2 transition-all transform hover:-translate-y-1 -skew-x-6 cursor-pointer shadow-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              >
                <span className="skew-x-6">EXPLORE PROGRAMS →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ATTACHED STATISTICS STRIP */}
      <section className="bg-[#050609] text-white py-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
          {statsList.map((st, idx) => (
            <div
              key={idx}
              style={{ transitionDelay: `${idx * 0.1}s` }}
              className="reveal-on-scroll slide-up flex items-center gap-3"
            >
              <Trophy className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div>
                <div className="text-xl font-black text-white">{st.value}</div>
                <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">{st.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. CORE VALUES & MOTTO STRIP */}
      <section className="bg-gradient-to-r from-red-950 via-black to-red-950 text-white py-5 border-b border-red-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs w-full lg:w-auto">
            <div className="reveal-on-scroll slide-left flex items-center gap-3">
              <Shield className="w-7 h-7 text-white flex-shrink-0" />
              <div>
                <strong className="block text-white font-black uppercase">DISCIPLINE</strong>
                <span className="text-[10px] text-gray-400">Builds character</span>
              </div>
            </div>

            <div className="reveal-on-scroll slide-left flex items-center gap-3" style={{ transitionDelay: '0.1s' }}>
              <Heart className="w-7 h-7 text-white flex-shrink-0" />
              <div>
                <strong className="block text-white font-black uppercase">RESPECT</strong>
                <span className="text-[10px] text-gray-400">Earns everyone</span>
              </div>
            </div>

            <div className="reveal-on-scroll slide-right flex items-center gap-3" style={{ transitionDelay: '0.2s' }}>
              <Zap className="w-7 h-7 text-white flex-shrink-0" />
              <div>
                <strong className="block text-white font-black uppercase">STRENGTH</strong>
                <span className="text-[10px] text-gray-400">Empowers you</span>
              </div>
            </div>

            <div className="reveal-on-scroll slide-right flex items-center gap-3" style={{ transitionDelay: '0.3s' }}>
              <Star className="w-7 h-7 text-white flex-shrink-0" />
              <div>
                <strong className="block text-white font-black uppercase">EXCELLENCE</strong>
                <span className="text-[10px] text-gray-400">Defines our journey</span>
              </div>
            </div>
          </div>

          {/* Right Motto Callout */}
          <div className="reveal-on-scroll zoom-in bg-red-600 px-6 py-2.5 rounded-lg font-black text-center text-white text-sm uppercase tracking-widest shadow-lg -skew-x-12">
            <div className="skew-x-12">
              BE BRAVE <span className="text-amber-300">BE BETTER</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3.5 KARATE BENEFITS SHOWCASE PRO MAX (RIGHT BELOW HERO & STATS) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="reveal-on-scroll slide-up flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
              Transform Mind, Body & Spirit
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase pt-1">
              WHY TRAIN WITH <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">B.A.M.A.?</span>
            </h2>
          </div>

          <Link
            to="/about"
            className="shimmer-btn-wrapper px-6 py-3 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center gap-2 transition transform hover:-translate-y-0.5 border border-amber-400/30 flex-shrink-0"
          >
            <span>DISCOVER ALL BENEFITS →</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[
            {
              icon: <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />,
              title: "Mental Discipline",
              desc: "Build sharp mental concentration, emotional self-control, and anti-bullying resilience."
            },
            {
              icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />,
              title: "Self-Defence",
              desc: "Empower yourself with instinctive protection reflexes and real-world self-defense skills."
            },
            {
              icon: <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />,
              title: "Full-Body Fitness",
              desc: "Build explosive core strength, joint flexibility, stamina, and cardiovascular fitness."
            },
            {
              icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />,
              title: "Championships",
              desc: "Specialized WKF & KKA Kumite and Kata tournament coaching for state & national medals."
            }
          ].map((b, idx) => (
            <div
              key={idx}
              style={{ transitionDelay: `${idx * 0.1}s` }}
              className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-800/90 shadow-2xl space-y-2.5 sm:space-y-4 hover:border-amber-400 transition-all duration-500 hover:-translate-y-2 group cursor-pointer"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-black/80 border border-gray-800 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {b.icon}
              </div>
              <h3 className="text-xs sm:text-base font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                {b.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-300 leading-relaxed font-medium line-clamp-3">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. OUR PROGRAMS SECTION PRO MAX */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="reveal-on-scroll slide-left text-center mb-10 space-y-2">
          <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
            Syllabus & Martial Arts Modules
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase pt-1">
            OUR <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">PROGRAMS</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xl mx-auto">
            Comprehensive Shotokan Karate, Kickboxing, Self-Defence & Fitness coaching across all age groups.
          </p>
        </div>

        {/* MOBILE ONLY: Continuous Auto-Moving Ribbon Slider (< md) */}
        <div className="block md:hidden relative w-full overflow-hidden mt-6">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#07080C] to-transparent z-20 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#07080C] to-transparent z-20 pointer-events-none"></div>

          <div className="animate-ribbon-loop gap-5 py-4 px-2">
            {[...programsList, ...programsList].map((prog, idx) => {
              const Icon = prog.icon || Shield;
              return (
                <div
                  key={`mob-prog-${prog.id}-${idx}`}
                  className="w-64 flex-shrink-0 bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl overflow-hidden shadow-2xl border border-gray-800/90 flex flex-col justify-between hover:border-red-500/80 transition-all duration-500 group relative cursor-pointer"
                >
                  <div>
                    <div className="relative h-44 overflow-hidden bg-gray-900">
                      <img
                        src={prog.img}
                        alt={prog.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95 contrast-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-black/40"></div>
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/40 text-[9px] font-black font-mono rounded-full uppercase tracking-wider shadow-lg">
                        {prog.category || 'SHOTOKAN B.A.M.A.'}
                      </span>
                      {prog.tag && (
                        <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-red-600/90 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-md">
                          {prog.tag}
                        </span>
                      )}
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 via-red-600 to-amber-600 text-white flex items-center justify-center shadow-2xl border-2 border-[#0F111D]">
                        <Icon className="w-5 h-5 text-amber-300" />
                      </div>
                    </div>

                    <div className="pt-7 px-4 pb-4 text-center space-y-2">
                      <h3 className="text-base font-black text-white tracking-wider uppercase group-hover:text-amber-400 transition-colors">
                        {prog.title}
                      </h3>
                      <p className="text-[11px] text-gray-300 leading-relaxed min-h-[36px] font-medium line-clamp-2">
                        {prog.desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => navigate('/programs')}
                      className="shimmer-btn-wrapper w-full py-2.5 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-amber-400/30"
                    >
                      <span>EXPLORE MODULE →</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* LAPTOP / DESKTOP ONLY: Clean 3-Column Static Grid (>= md) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
          {programsList.map((prog, idx) => {
            const Icon = prog.icon || Shield;
            const isEven = idx % 2 === 0;

            return (
              <div
                key={`desk-prog-${prog.id}`}
                style={{ transitionDelay: `${idx * 0.08}s` }}
                className={`reveal-on-scroll ${isEven ? 'slide-left' : 'slide-right'} bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl overflow-hidden shadow-2xl border border-gray-800/90 flex flex-col justify-between hover:border-red-500/80 transition-all duration-500 group hover:-translate-y-2.5 hover:shadow-[0_20px_40px_rgba(239,68,68,0.2)] relative`}
              >
                <div>
                  <div className="relative h-52 overflow-hidden bg-gray-900">
                    <img
                      src={prog.img}
                      alt={prog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95 contrast-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-black/40"></div>

                    <span className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/40 text-[9px] font-black font-mono rounded-full uppercase tracking-wider shadow-lg">
                      {prog.category || 'SHOTOKAN B.A.M.A.'}
                    </span>

                    {prog.tag && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-red-600/90 text-white text-[9px] font-black rounded-full uppercase tracking-wider shadow-md">
                        {prog.tag}
                      </span>
                    )}

                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-red-600 to-amber-600 text-white flex items-center justify-center shadow-2xl border-2 border-[#0F111D] group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                      <Icon className="w-6 h-6 text-amber-300" />
                    </div>
                  </div>

                  <div className="pt-9 px-6 pb-6 text-center space-y-3">
                    <h3 className="text-lg font-black text-white tracking-wider uppercase group-hover:text-amber-400 transition-colors">
                      {prog.title}
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed min-h-[42px] font-medium line-clamp-3">
                      {prog.desc}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => navigate('/programs')}
                    className="shimmer-btn-wrapper w-full py-3 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 transition transform hover:scale-102 cursor-pointer border border-amber-400/30"
                  >
                    <span>EXPLORE MODULE →</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. BELT JOURNEY SECTION ULTRA PREMIUM PRO MAX INFINITE SLIDER */}
      <section className="bg-gradient-to-b from-[#07080D] via-[#0A0C14] to-[#07080D] text-white py-24 border-t border-b border-gray-900 relative overflow-hidden">
        {/* Background Dojo Energy Glow & Ambient Sun Pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[400px] bg-red-950/30 blur-[150px] pointer-events-none"></div>
        <div className="absolute top-1/3 right-[10%] w-[350px] h-[350px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
          {/* Header PRO MAX */}
          <div className="reveal-on-scroll slide-up text-center space-y-3">
            <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-950/90 text-amber-400 border border-red-800/60 shadow-[0_0_20px_rgba(220,38,38,0.3)] backdrop-blur-md">
              Official Shotokan Belt Hierarchy
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase pt-1">
              THE BELT <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">JOURNEY</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xl mx-auto">
              From 10th Kyu White Belt to 1st Dan Black Belt — Continuous Sliding Martial Arts Obi Belt Hierarchy.
            </p>
          </div>
        </div>

        {/* Continuous Infinite Ribbon Track with Gradient Vignette Masks */}
        <div className="relative w-full overflow-hidden mt-10">
          {/* Gradient Vignette Masks Left & Right */}
          <div className="absolute left-0 top-0 bottom-0 w-28 sm:w-48 bg-gradient-to-r from-[#07080D] via-[#07080D]/90 to-transparent z-20 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-28 sm:w-48 bg-gradient-to-l from-[#07080D] via-[#07080D]/90 to-transparent z-20 pointer-events-none"></div>

          {/* Continuous Loop Track */}
          <div className="animate-ribbon-loop gap-7 py-6 px-6">
            {[...BELT_LEVELS, ...BELT_LEVELS].map((belt, idx) => {
              const isBlack = belt.level === 11;
              return (
                <div
                  key={`${belt.level}-${idx}`}
                  className={`w-52 sm:w-72 flex-shrink-0 flex flex-col items-center justify-between text-center p-4 sm:p-6 rounded-2xl sm:rounded-[2.2rem] bg-gradient-to-b from-[#131627] via-[#0E101D] to-[#080912] border ${
                    isBlack
                      ? 'border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.35)] animate-pulse-glow'
                      : 'border-gray-800/90'
                  } hover:border-amber-400 transition-all duration-500 hover:-translate-y-3 shadow-2xl hover:shadow-[0_20px_45px_rgba(245,158,11,0.35)] group relative overflow-hidden backdrop-blur-xl cursor-pointer`}
                >
                  {/* Background Rank Ambient Glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  {/* Top Level Pill */}
                  <span className={`px-3.5 py-1 rounded-full text-xs font-black font-mono ${
                    isBlack
                      ? 'bg-amber-500 text-black border border-amber-300 font-extrabold shadow-lg'
                      : 'bg-black/90 border border-amber-500/40 text-amber-300 shadow-inner'
                  }`}>
                    #{belt.level} RANK
                  </span>

                  {/* Ultra-Realistic 3D Karate Obi Belt Icon */}
                  <div className="my-4 relative">
                    {/* Ambient Glow Aura behind SVG */}
                    <div
                      className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                      style={{ backgroundColor: belt.color === '#FFFFFF' ? '#F59E0B' : belt.color }}
                    ></div>
                    <KarateBeltIcon
                      color={belt.color}
                      name={belt.name}
                      level={belt.level}
                      className="w-32 h-32 sm:w-36 sm:h-36 relative z-10 group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Rank Name & Kyu */}
                  <div className="w-full space-y-1.5 z-10">
                    <span className={`text-base font-black tracking-wider uppercase block leading-tight ${
                      isBlack ? 'text-amber-400 drop-shadow-md' : 'text-white group-hover:text-amber-300 transition-colors'
                    }`}>
                      {belt.name}
                    </span>
                    <span className="text-xs text-amber-400 font-mono font-bold inline-block bg-amber-950/80 px-3.5 py-0.5 rounded-full border border-amber-500/40 shadow-inner">
                      {belt.kyu || `${belt.level} Rank`}
                    </span>
                  </div>

                  {/* Duration Badge */}
                  <div className="pt-5 w-full z-10">
                    <span className="text-[10px] text-gray-200 font-extrabold uppercase tracking-widest bg-black/90 px-3 py-2 rounded-xl border border-gray-800 group-hover:border-amber-500/40 transition-colors block w-full shadow-md">
                      {belt.durationMonths} Mo. Minimum Training
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5.5 PHOTO GALLERY SHOWCASE SECTION PRO MAX */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-gray-900">
        <div className="reveal-on-scroll slide-left flex flex-col sm:flex-row items-center justify-between gap-4 mb-14">
          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
              Memories & Championship Medals
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase pt-1">
              ACADEMY <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">PHOTO GALLERY</span>
            </h2>
          </div>
          <Link
            to="/gallery"
            className="shimmer-btn-wrapper px-6 py-3 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center gap-2 transition transform hover:-translate-y-0.5 border border-amber-400/30"
          >
            <span>VIEW GALLERY ({galleryList.length} PHOTOS)</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {galleryList.slice(0, 4).map((g, idx) => (
            <div
              key={g.id}
              onClick={() => setActivePhotoModal(g)}
              style={{ transitionDelay: `${idx * 0.1}s` }}
              className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-800/90 space-y-2 sm:space-y-3 group hover:border-amber-400 transition-all duration-500 shadow-2xl hover:shadow-[0_20px_40px_rgba(245,158,11,0.3)] hover:-translate-y-3 cursor-pointer p-3 sm:p-4"
            >
              <div className="h-36 sm:h-52 rounded-xl overflow-hidden relative border border-gray-800/80">
                <img
                  src={g.img || '/assets/prog_competition.jpg'}
                  alt={g.title}
                  className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-700 brightness-95 contrast-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-black/30"></div>

                {/* Category Pill Tag */}
                <span className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/40 text-[9px] font-black font-mono rounded-full uppercase tracking-wider shadow-lg">
                  {g.category}
                </span>

                {/* Hover Expand Glassmorphic Eye Badge */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-xs">
                  <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-red-600 to-amber-600 text-white flex items-center justify-center shadow-2xl border border-amber-300/50 transform group-hover:scale-110 transition-transform">
                    <Maximize2 className="w-5 h-5 text-amber-300" />
                  </span>
                </div>
              </div>
              <div className="p-5 pt-1 space-y-1.5">
                <h4 className="font-black text-white text-base group-hover:text-amber-400 transition-colors uppercase">{g.title}</h4>
                <p className="text-xs text-gray-300 leading-snug line-clamp-2 font-medium">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. OUR BRANCHES SECTION PRO MAX */}
      {(() => {
        const activeBranches = sanitizeBranches((cms?.branches && cms.branches.length > 0) ? cms.branches : branches);

        return (
          <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-gray-900 relative overflow-hidden">
            <div className="reveal-on-scroll slide-up text-center mb-10 space-y-2">
              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
                Dojo Locations & Training Hubs
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase pt-1">
                OUR <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-600 bg-clip-text text-transparent">BRANCHES</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xl mx-auto">
                State-of-the-art martial arts training dojos across Malappuram & Kerala.
              </p>
            </div>

            {/* MOBILE ONLY: Continuous Auto-Moving Ribbon Track (< md) */}
            <div className="block md:hidden relative w-full overflow-hidden mt-6">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#07080C] to-transparent z-20 pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#07080C] to-transparent z-20 pointer-events-none"></div>

              <div className="animate-ribbon-loop gap-6 py-4 px-2">
                {[...activeBranches, ...activeBranches, ...activeBranches].map((b, idx) => {
                  const branchImg = b.image || b.img || b.photo || (b.isHeadOffice ? '/assets/prog_adults.jpg' : '/assets/prog_kids.jpg');
                  return (
                    <div
                      key={`mob-br-${b.id}-${idx}`}
                      className="w-72 flex-shrink-0 bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl overflow-hidden shadow-2xl border border-gray-800/90 flex flex-col justify-between hover:border-amber-400 transition-all duration-500 group cursor-pointer"
                    >
                      <div>
                        <div className="h-44 bg-gray-900 relative overflow-hidden">
                          <img
                            src={branchImg}
                            alt={b.name}
                            className="w-full h-full object-cover opacity-90 brightness-95 group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-black/40"></div>
                          <span className="absolute top-3 left-3 px-3 py-1 bg-red-950/90 backdrop-blur-md text-amber-300 border border-red-800 text-[9px] font-black font-mono rounded-full uppercase tracking-wider shadow-lg">
                            Dojo: {b.code}
                          </span>
                          {b.isHeadOffice && (
                            <span className="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black rounded-full uppercase tracking-wider shadow-md">
                              Headquarters
                            </span>
                          )}
                        </div>

                        <div className="p-5 space-y-3">
                          <h3 className="text-lg font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                            {b.name}
                          </h3>
                          <p className="text-xs text-gray-300 font-medium flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{b.address}</span>
                          </p>
                          <p className="text-xs text-gray-300 font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span>{b.timings}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-0 space-y-2">
                        <a
                          href={b.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((b.name || '') + ' ' + (b.address || ''))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 bg-red-600/20 hover:bg-red-600 text-amber-300 hover:text-white rounded-xl font-bold text-xs text-center border border-red-500/30 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                          <span>Google Maps Directions</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Auto-Sliding Track for > 3 Branches OR Grid for <= 3 */}
            {activeBranches.length > 3 ? (
              <div className="relative group/slider mt-6">
                {/* Left Arrow Button */}
                <button
                  type="button"
                  onClick={() => scrollBranchSlider('left')}
                  className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/90 text-amber-400 border border-amber-500/50 flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-red-600 hover:text-white transition cursor-pointer"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Right Arrow Button */}
                <button
                  type="button"
                  onClick={() => scrollBranchSlider('right')}
                  className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/90 text-amber-400 border border-amber-500/50 flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-red-600 hover:text-white transition cursor-pointer"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Smooth Scrollable Horizontal Track */}
                <div
                  ref={branchSliderRef}
                  onMouseEnter={() => { isBranchAutoPlay.current = false; }}
                  onMouseLeave={() => { isBranchAutoPlay.current = true; }}
                  className="flex gap-6 overflow-x-auto scrollbar-none scroll-smooth pb-6 px-2"
                >
                  {activeBranches.map((b, idx) => {
                    const branchImg = b.image || b.img || b.photo || (b.isHeadOffice ? '/assets/prog_adults.jpg' : '/assets/prog_kids.jpg');
                    return (
                      <div
                        key={`slide-br-${b.id}`}
                        className="w-[360px] flex-shrink-0 bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl overflow-hidden shadow-2xl border border-gray-800/90 flex flex-col justify-between hover:border-amber-400 transition-all duration-500 hover:-translate-y-2 group cursor-pointer"
                      >
                        <div>
                          <div className="h-52 bg-gray-900 relative overflow-hidden">
                            <img
                              src={branchImg}
                              alt={b.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 brightness-95"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-black/40"></div>
                            <span className="absolute top-3.5 left-3.5 bg-red-950/90 backdrop-blur-md text-amber-300 border border-red-800 text-[10px] font-black font-mono px-3.5 py-1 rounded-full uppercase tracking-wider shadow-lg">
                              Dojo: {b.code}
                            </span>
                            {b.isHeadOffice && (
                              <span className="absolute top-3.5 right-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                                ★ Headquarters
                              </span>
                            )}
                          </div>

                          <div className="p-6 space-y-4 text-xs text-gray-300">
                            <h3 className="text-xl font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                              {b.name}
                            </h3>
                            <p className="flex items-start gap-2.5 text-gray-200 font-medium text-xs leading-relaxed">
                              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{b.address}</span>
                            </p>
                            <p className="flex items-center gap-2.5 font-medium">
                              <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              <span className="text-gray-200 font-mono font-bold">{b.phone}</span>
                            </p>
                            <p className="flex items-center gap-2.5 font-medium">
                              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              <span className="text-amber-300 font-semibold">{b.timings}</span>
                            </p>
                          </div>
                        </div>

                        <div className="p-6 pt-0">
                          <a
                            href={b.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((b.name || '') + ' ' + (b.address || ''))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-3 bg-red-600/20 hover:bg-red-600 text-amber-300 hover:text-white rounded-xl font-bold text-xs text-center border border-red-500/30 transition flex items-center justify-center gap-2 shadow-lg"
                          >
                            <span>Google Maps Directions</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* LAPTOP / DESKTOP ONLY: Dynamic Responsive Grid (>= md) */
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                {activeBranches.map((b, idx) => {
                  const branchImg = b.image || b.img || b.photo || (b.isHeadOffice ? '/assets/prog_adults.jpg' : '/assets/prog_kids.jpg');
                  return (
                    <div
                      key={`desk-br-${b.id}`}
                      style={{ transitionDelay: `${idx * 0.1}s` }}
                      className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl overflow-hidden shadow-2xl border border-gray-800/90 flex flex-col justify-between hover:border-amber-400 transition-all duration-500 hover:-translate-y-2.5 group cursor-pointer"
                    >
                      <div>
                        <div className="h-52 bg-gray-900 relative overflow-hidden">
                          <img
                            src={branchImg}
                            alt={b.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 brightness-95"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-black/40"></div>
                          <span className="absolute top-3.5 left-3.5 bg-red-950/90 backdrop-blur-md text-amber-300 border border-red-800 text-[10px] font-black font-mono px-3.5 py-1 rounded-full uppercase tracking-wider shadow-lg">
                            Dojo: {b.code}
                          </span>
                          {b.isHeadOffice && (
                            <span className="absolute top-3.5 right-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                              ★ Headquarters
                            </span>
                          )}
                        </div>

                        <div className="p-6 space-y-4 text-xs text-gray-300">
                          <h3 className="text-xl font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                            {b.name}
                          </h3>
                          <p className="flex items-start gap-2.5 text-gray-200 font-medium text-xs leading-relaxed">
                            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span>{b.address}</span>
                          </p>
                          <p className="flex items-center gap-2.5 font-medium">
                            <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span className="text-gray-200 font-mono font-bold">{b.phone}</span>
                          </p>
                          <p className="flex items-center gap-2.5 font-medium">
                            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span className="text-amber-300 font-semibold">{b.timings}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-6 pt-0">
                        <a
                          href={b.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((b.name || '') + ' ' + (b.address || ''))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-3 bg-red-600/20 hover:bg-red-600 text-amber-300 hover:text-white rounded-xl font-bold text-xs text-center border border-red-500/30 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                          <span>Google Maps Directions</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })()}

      {/* 7. BOTTOM CTA CALLOUT BANNER SLEEK & COMPACT HORIZONTAL BAR */}
      <section className="reveal-on-scroll zoom-in py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#121526] via-[#1A0D15] to-[#121526] border border-amber-400/40 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 group">
          {/* Subtle Ambient Red Glow */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-32 bg-red-600/15 blur-3xl pointer-events-none"></div>

          {/* Left Text Info */}
          <div className="space-y-1.5 text-center md:text-left relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              START YOUR MARTIAL ARTS JOURNEY TODAY
            </span>
            <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white">
              BECOME A B.A.M.A. <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent">MARTIAL ARTS CADET</span>
            </h2>
            <p className="text-xs text-gray-300 font-medium">
              Admissions open across Pulikkal, Chungam, and Mongam Dojo branches.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 relative z-10 flex-shrink-0">
            <button
              onClick={() => navigate('/contact')}
              className="shimmer-btn-wrapper px-6 py-3.5 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center gap-2 border border-amber-400/40 hover:scale-105 transition cursor-pointer"
            >
              <Shield className="w-4 h-4 text-amber-300" />
              <span>JOIN ACADEMY TODAY →</span>
            </button>
            <a
              href="tel:+919544085442"
              className="px-5 py-3.5 bg-black/80 hover:bg-white/15 border border-amber-400/30 text-white hover:text-amber-300 font-black text-xs uppercase tracking-wider rounded-xl backdrop-blur-md flex items-center gap-2 transition cursor-pointer hover:border-amber-400 shadow-md"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>+91 95440 85442</span>
            </a>
          </div>
        </div>
      </section>

      {/* 8. INTERACTIVE LIGHTBOX MODAL FOR GALLERY PREVIEW */}
      {activePhotoModal && (
        <div
          onClick={() => setActivePhotoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-[#121526] via-[#0E101D] to-[#07080E] border border-amber-400/50 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl shadow-red-950/90 relative space-y-0"
          >
            {/* Close Button */}
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/80 text-gray-300 hover:text-white border border-gray-700 hover:border-red-500 transition-all cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5 text-amber-400" />
            </button>

            {/* Photo Container */}
            <div className="relative h-72 sm:h-96 w-full bg-black overflow-hidden border-b border-gray-800">
              <img
                src={activePhotoModal.img || '/assets/prog_competition.jpg'}
                alt={activePhotoModal.title}
                className="w-full h-full object-cover filter brightness-105 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121526] via-transparent to-transparent opacity-90"></div>

              {/* Category Pill Tag */}
              <span className="absolute top-4 left-4 px-3.5 py-1 bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/50 text-xs font-black font-mono rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {activePhotoModal.category}
              </span>
            </div>

            {/* Photo Details */}
            <div className="p-6 sm:p-8 space-y-3">
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                {activePhotoModal.title}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed font-medium">
                {activePhotoModal.desc}
              </p>
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-800 text-xs text-gray-400">
                <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
                  <Award className="w-4 h-4 text-amber-400" /> B.A.M.A. Official Academy Event Photo
                </span>
                <Link
                  to="/gallery"
                  onClick={() => setActivePhotoModal(null)}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:scale-102 transition"
                >
                  <span>Explore Full Gallery →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
