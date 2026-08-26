import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin, Phone, Mail, MessageSquare, Globe,
  Lock, Menu, X, Shield, Award, ChevronDown, UserCheck, Sparkles
} from 'lucide-react';
import { ACADEMY_INFO } from '../services/initialData';
import { useAuth } from '../context/AuthContext';

const InstagramIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function PublicLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, switchRole } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'HOME', path: '/' },
    { label: 'ABOUT', path: '/about' },
    { label: 'PROGRAMS', path: '/programs' },
    { label: 'BELT SYSTEM', path: '/belts' },
    { label: 'BRANCHES', path: '/branches' },
    { label: 'GALLERY', path: '/gallery' },
    { label: 'CONTACT', path: '/contact' },
  ];

  return (
    <div className="min-h-screen bg-[#07080C] text-gray-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* 1. Top Info Bar */}
      <div className="bg-[#090A0F] text-gray-300 text-xs py-2 px-4 border-b border-gray-800/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Left Contact Details */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-[11px]">
            <span className="flex items-center gap-1.5 text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span>Andiyoorkunnu Road, Pulikkal - 673637</span>
            </span>
            <a href="tel:+919544085442" className="flex items-center gap-1.5 text-gray-300 hover:text-amber-400 transition">
              <Phone className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>95440 85442</span>
            </a>
            <a href="mailto:braveacademypkl@gmail.com" className="flex items-center gap-1.5 text-gray-300 hover:text-amber-400 transition hidden md:flex">
              <Mail className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span>braveacademypkl@gmail.com</span>
            </a>
          </div>

          {/* Right Social Media & Role Switcher */}
          <div className="flex items-center gap-3 text-[11px]">
            {/* Social Media Links */}
            <div className="flex items-center gap-2 pr-2 border-r border-gray-800">
              <a
                href="https://www.instagram.com/invites/contact/?i=pued5vosli46&utm_content=1u8fwts"
                target="_blank"
                rel="noreferrer"
                className="text-pink-500 hover:text-pink-400 transition p-1"
                title="Instagram"
              >
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.facebook.com/abdul.nafih.1656"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:text-blue-400 transition p-1"
                title="Facebook"
              >
                <FacebookIcon className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://wa.me/919544085442"
                target="_blank"
                rel="noreferrer"
                className="text-green-500 hover:text-green-400 transition p-1"
                title="WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Subtle Sleek Office Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/80 text-amber-400 hover:text-white px-3 py-1 rounded-full border border-red-800/60 transition cursor-pointer text-[11px] font-bold shadow-sm"
              title="Staff & Instructor Office Login"
            >
              <Lock className="w-3 h-3 text-red-500" />
              <span>Office Login</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Site Header (Dynamic Glassmorphic Floating Header with Reflecting PRO MAX Animations) */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-[#05060A]/95 backdrop-blur-xl border-b border-red-600/50 shadow-2xl shadow-red-950/40 h-16'
            : 'bg-[#07080C]/90 backdrop-blur-md border-b border-gray-800/80 h-20'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between relative">
          {/* Subtle Ambient Red Glow Bar in Header */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-red-600/60 to-transparent"></div>

          {/* Official Logo Branding with Pulsing Ring & Reflective Text */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-red-600 via-amber-500 to-black p-0.5 shadow-2xl group-hover:scale-105 transition-transform overflow-hidden border border-amber-500/60 flex-shrink-0 animate-pulse-glow">
              <img
                src="/logo bama_240616_200739.jpg.jpeg"
                alt="B.A.M.A. Official Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black tracking-wider flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-white via-amber-200 via-yellow-300 to-white bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent drop-shadow-md">
                  B.A.M.A.
                </span>
                <span className="text-[10px] bg-gradient-to-r from-red-600 to-amber-600 text-white px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shadow-md animate-crown-bounce">
                  KERALA
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold text-amber-400/90 tracking-widest uppercase flex items-center gap-1">
                <span>BRAVE ACADEMY OF MARTIAL ARTS</span>
                <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
            </div>
          </Link>

          {/* Desktop Nav with Neon Underlines & Smooth Animations */}
          <nav className="hidden lg:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`relative text-xs font-black tracking-wider transition-all py-1.5 group/nav ${
                    isActive
                      ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      : 'text-gray-300 hover:text-white hover:-translate-y-0.5'
                  }`}
                >
                  <span>{item.label}</span>
                  {/* Glowing Animated Underline Pill */}
                  <span
                    className={`absolute left-0 bottom-0 h-0.5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-full bg-gradient-to-r from-amber-400 via-red-500 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                        : 'w-0 group-hover/nav:w-full bg-gradient-to-r from-red-500/70 to-amber-500/70'
                    }`}
                  ></span>
                </Link>
              );
            })}
          </nav>

          {/* Refined Subtle Login Action Button */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-black/60 hover:bg-red-950/60 text-gray-300 hover:text-amber-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-white/10 hover:border-amber-400/40 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Portal Sign In</span>
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-300 hover:text-white focus:outline-none"
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X className="w-7 h-7 text-red-500" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0A0C14] border-b border-red-900/40 px-4 pt-2 pb-6 space-y-2 shadow-2xl">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-black transition ${
                  location.pathname === item.path
                    ? 'bg-red-950/80 text-amber-400 border border-red-800/60'
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-grow">{children}</main>

      {/* 3. Footer ULTRA PRO MAX BLOCKBUSTER */}
      <footer className="bg-gradient-to-b from-[#090B12] via-[#06070B] to-[#030406] text-gray-400 pt-20 pb-10 border-t border-gray-800/80 relative overflow-hidden">
        {/* Top Glowing Laser Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.8)]"></div>

        {/* Ambient Dojo Glow Spotlights */}
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Col 1: Logo & Accreditation */}
            <div className="space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.4)] flex-shrink-0 bg-black p-0.5">
                  <img src="/logo bama_240616_200739.jpg.jpeg" alt="B.A.M.A. Logo" className="w-full h-full object-cover rounded-xl" />
                </div>
                <div>
                  <span className="text-2xl font-black text-white tracking-tight block uppercase bg-gradient-to-r from-white via-gray-100 to-amber-200 bg-clip-text text-transparent filter drop-shadow">
                    B.A.M.A.
                  </span>
                  <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest block pt-0.5">
                    BRAVE ACADEMY OF MARTIAL ARTS
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                Official Academy affiliated to JKA India, Kick Boxing Association of Kerala, and Kerala Karate Association (KKA).
              </p>

              {/* Govt Registration Card */}
              <div className="text-[11px] text-amber-300 font-medium space-y-1.5 bg-gradient-to-r from-red-950/80 via-black to-red-950/80 p-4 rounded-2xl border border-red-800/60 shadow-xl">
                <p className="flex items-center justify-between border-b border-red-900/50 pb-1">
                  <span className="text-gray-300">Govt Reg No:</span>
                  <strong className="text-amber-400 font-mono">{ACADEMY_INFO.regNo}</strong>
                </p>
                <p className="flex items-center justify-between pt-0.5">
                  <span className="text-gray-300">Police Permit:</span>
                  <strong className="text-amber-400 font-mono">{ACADEMY_INFO.policePermitNo}</strong>
                </p>
              </div>
              
              {/* Social Media Link Buttons PRO MAX */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={ACADEMY_INFO.headOffice.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-red-500 to-purple-600 text-white flex items-center justify-center shadow-xl hover:scale-115 transition-all duration-300 border border-amber-300/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                  title="Follow us on Instagram"
                >
                  <InstagramIcon className="w-4 h-4 text-white" />
                </a>
                <a
                  href={ACADEMY_INFO.headOffice.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500 text-white flex items-center justify-center shadow-xl hover:scale-115 transition-all duration-300 border border-blue-400/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                  title="Connect on Facebook"
                >
                  <FacebookIcon className="w-4 h-4 text-white" />
                </a>
                <a
                  href={`mailto:${ACADEMY_INFO.headOffice.email}`}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-amber-600 text-white flex items-center justify-center shadow-xl hover:scale-115 transition-all duration-300 border border-red-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                  title="Email Us"
                >
                  <Mail className="w-4 h-4 text-white" />
                </a>
                <a
                  href={`https://wa.me/${ACADEMY_INFO.headOffice.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-green-700 via-green-600 to-emerald-500 text-white flex items-center justify-center shadow-xl hover:scale-115 transition-all duration-300 border border-green-400/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                  title="WhatsApp Us"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-widest border-b border-gray-800 pb-2.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> QUICK NAVIGATION
              </h4>
              <ul className="space-y-2.5 text-xs text-gray-300 font-medium">
                <li><Link to="/" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span><span>Home Page</span></Link></li>
                <li><Link to="/about" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span><span>About Academy</span></Link></li>
                <li><Link to="/programs" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span><span>Training Programs</span></Link></li>
                <li><Link to="/belts" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span><span>Belt Progression</span></Link></li>
                <li><Link to="/branches" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span><span>Dojo Branches</span></Link></li>
                <li><Link to="/gallery" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span><span>Photo Gallery</span></Link></li>
                <li><Link to="/contact" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span><span>Contact & Admissions</span></Link></li>
              </ul>
            </div>

            {/* Col 3: Programs */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-widest border-b border-gray-800 pb-2.5 flex items-center gap-2">
                <Award className="w-4 h-4 text-red-500" /> TRAINING MODULES
              </h4>
              <ul className="space-y-2.5 text-xs text-gray-300 font-medium">
                <li><Link to="/programs" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span>Kids Karate (Ages 5-12)</span></Link></li>
                <li><Link to="/programs" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Adults Shotokan Karate</span></Link></li>
                <li><Link to="/programs" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span>Traditional Shotokan Kata</span></Link></li>
                <li><Link to="/programs" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Women's Self Defence</span></Link></li>
                <li><Link to="/programs" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span><span>Kickboxing & Striking</span></Link></li>
                <li><Link to="/programs" className="hover:text-amber-400 transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Tournament Competition</span></Link></li>
              </ul>
            </div>

            {/* Col 4: Contact & Hours */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-widest border-b border-gray-800 pb-2.5 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" /> HEAD OFFICE & HOURS
              </h4>
              <div className="space-y-3.5 text-xs text-gray-300 font-medium">
                <a href={ACADEMY_INFO.headOffice.mapUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 hover:text-amber-400 transition-colors group">
                  <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="leading-relaxed">Andiyoorkunnu Road, Pulikkal, Malappuram, Kerala - 673637</span>
                </a>

                <a href={`tel:${ACADEMY_INFO.headOffice.phone}`} className="flex items-center gap-2.5 hover:text-amber-400 transition-colors font-mono">
                  <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{ACADEMY_INFO.headOffice.phone}</span>
                </a>

                <a href={`mailto:${ACADEMY_INFO.headOffice.email}`} className="flex items-center gap-2.5 hover:text-amber-400 transition-colors">
                  <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{ACADEMY_INFO.headOffice.email}</span>
                </a>

                <div className="pt-3 border-t border-gray-800/80 space-y-1">
                  <strong className="text-amber-400 block uppercase text-[10px] tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" /> DOJO BATCH TIMINGS
                  </strong>
                  <p className="text-[11px] text-gray-300">Morning: 5:00 AM - 8:00 AM</p>
                  <p className="text-[11px] text-gray-300">Evening: 4:00 PM - 8:30 PM (All Branches)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright & Core Values Ribbon */}
          <div className="pt-8 border-t border-gray-800/90 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
            <p className="text-gray-400 text-center sm:text-left">
              © 2026 <strong className="text-white">Brave Academy of Martial Arts (B.A.M.A.)</strong>. All Rights Reserved.
            </p>

            <div className="flex items-center gap-3 text-amber-400 font-black text-[11px] uppercase tracking-wider bg-black/60 px-4 py-2 rounded-full border border-gray-800">
              <span>DISCIPLINE</span> • <span>RESPECT</span> • <span>STRENGTH</span> • <span>EXCELLENCE</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
