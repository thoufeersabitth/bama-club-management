import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export default function BamaPageLoader({ 
  message = 'Loading B.A.M.A. Academy Database...', 
  subMessage = 'Synchronizing Martial Arts Records • Real-time Cloud Sync',
  fullScreen = true 
}) {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fadeIn">
      {/* Martial Arts Glowing Crest & Aura */}
      <div className="relative flex items-center justify-center">
        {/* Outer Pulsing Glow */}
        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-red-600/30 via-amber-500/20 to-red-600/30 blur-xl animate-pulse"></div>
        
        {/* Spinning Progress Ring */}
        <div className="w-24 h-24 rounded-full border-3 border-gray-200/20 border-t-amber-500 border-r-red-600 animate-spin"></div>
        
        {/* Inner Karate Crest Emblem */}
        <div className="absolute w-16 h-16 rounded-2xl bg-gradient-to-br from-[#121526] to-[#0A0C14] border border-amber-400/60 shadow-2xl flex flex-col items-center justify-center text-amber-400">
          <span className="font-serif font-black text-xs text-red-500 tracking-tighter block leading-none mb-0.5">BAMA</span>
          <Shield className="w-6 h-6 text-amber-400 animate-bounce" />
        </div>
      </div>

      {/* Title & Animated Status */}
      <div className="space-y-1.5 max-w-sm mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-amber-300 text-[10px] font-black tracking-widest uppercase font-mono shadow-md">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>BRAVE ACADEMY OF MARTIAL ARTS</span>
        </div>

        <h3 className="text-base font-black text-white tracking-tight">
          {message}
        </h3>

        <p className="text-xs text-gray-400 font-medium leading-relaxed">
          {subMessage}
        </p>
      </div>

      {/* Martial Arts Progress Bar */}
      <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden relative shadow-inner">
        <div className="h-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600 rounded-full w-2/3 animate-pulse"></div>
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999] bg-[#07080D]/90 backdrop-blur-md flex items-center justify-center">
      {content}
    </div>
  );
}
