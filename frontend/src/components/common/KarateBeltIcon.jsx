import React from 'react';

/**
 * Ultra-Realistic 3D Martial Arts Obi Belt SVG Component
 * Featuring woven fabric texture, realistic knot folds, Japanese kanji label,
 * embroidered gold rank stripes, and dynamic micro-animations.
 */
export default function KarateBeltIcon({ color = '#FFFFFF', name = '', level = 1, className = "w-20 h-20" }) {
  const isWhite = color === '#FFFFFF' || color.toLowerCase() === '#ffffff';
  const isYellow = name.toLowerCase().includes('yellow');
  const isOrange = name.toLowerCase().includes('orange');
  const isGreen = name.toLowerCase().includes('green');
  const isBlue = name.toLowerCase().includes('blue');
  const isPurple = name.toLowerCase().includes('purple');
  const isBrown = name.toLowerCase().includes('brown');
  const isBlack = color === '#111827' || name.toLowerCase().includes('black');

  // Exact belt colors with 3D highlights and shadow tones
  let mainColor = color;
  let shadowColor = '#000000';
  let highlightColor = '#FFFFFF';

  if (isWhite) {
    mainColor = '#F9FAFB';
    shadowColor = '#9CA3AF';
    highlightColor = '#FFFFFF';
  } else if (isYellow) {
    mainColor = '#EAB308';
    shadowColor = '#854D0E';
    highlightColor = '#FEF08A';
  } else if (isOrange) {
    mainColor = '#F97316';
    shadowColor = '#9A3412';
    highlightColor = '#FFEDD5';
  } else if (isGreen) {
    mainColor = '#16A34A';
    shadowColor = '#14532D';
    highlightColor = '#BBF7D0';
  } else if (isBlue) {
    mainColor = '#2563EB';
    shadowColor = '#1E3A8A';
    highlightColor = '#BFDBFE';
  } else if (isPurple) {
    mainColor = '#9333EA';
    shadowColor = '#581C87';
    highlightColor = '#E9D5FF';
  } else if (isBrown) {
    if (name.includes('4')) mainColor = '#B45309';
    else if (name.includes('3')) mainColor = '#92400E';
    else if (name.includes('2')) mainColor = '#78350F';
    else mainColor = '#451A03';
    shadowColor = '#290D02';
    highlightColor = '#FDE68A';
  } else if (isBlack) {
    mainColor = '#111827';
    shadowColor = '#030712';
    highlightColor = '#4B5563';
  }

  // Calculate rank stripes
  let stripes = 0;
  if (name.includes('4')) stripes = 4;
  else if (name.includes('3')) stripes = 3;
  else if (name.includes('2')) stripes = 2;
  else if (name.includes('1') && isBrown) stripes = 1;

  const filterId = `belt-shadow-${level}-${name.replace(/\s+/g, '')}`;
  const gradId = `belt-grad-${level}-${name.replace(/\s+/g, '')}`;

  return (
    <div className="relative group/belt inline-block cursor-pointer">
      {/* Background Glow Aura on Hover */}
      <div
        className="absolute -inset-2 rounded-full opacity-0 group-hover/belt:opacity-80 transition-opacity duration-500 blur-md"
        style={{ backgroundColor: isWhite ? '#FFFFFF' : mainColor }}
      ></div>

      <svg
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${className} relative z-10 transition-transform duration-500 group-hover/belt:scale-110 group-hover/belt:-rotate-1 drop-shadow-xl`}
      >
        <defs>
          {/* Main 3D Belt Gradient */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={highlightColor} stopOpacity={isWhite ? 1 : 0.45} />
            <stop offset="35%" stopColor={mainColor} />
            <stop offset="100%" stopColor={shadowColor} />
          </linearGradient>

          {/* Golden Embroidery Thread Gradient */}
          <linearGradient id="gold-thread" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          {/* Shimmer Reflection */}
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Soft Drop Shadow Filter */}
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        <g filter={`url(#${filterId})`}>
          {/* Left Hanging Belt Tail (Natural Curved Drape) */}
          <path
            d="M 52 58 C 48 72, 34 102, 32 120 C 32 124, 46 124, 48 120 C 50 102, 60 72, 62 58 Z"
            fill={`url(#${gradId})`}
            stroke={isWhite ? '#9CA3AF' : '#000000'}
            strokeWidth="1.2"
            className="transition-transform duration-700 origin-top group-hover/belt:rotate-2"
          />

          {/* Right Hanging Belt Tail */}
          <path
            d="M 78 58 C 82 72, 94 102, 98 122 C 98 126, 112 126, 110 122 C 104 102, 88 72, 84 58 Z"
            fill={`url(#${gradId})`}
            stroke={isWhite ? '#9CA3AF' : '#000000'}
            strokeWidth="1.2"
            className="transition-transform duration-700 origin-top group-hover/belt:-rotate-2"
          />

          {/* Left Tail Seam Stitching */}
          <path
            d="M 37 116 L 53 62"
            stroke={isWhite ? '#9CA3AF' : '#FFFFFF'}
            strokeOpacity="0.3"
            strokeDasharray="3 2"
            strokeWidth="1"
          />
          {/* Right Tail Seam Stitching */}
          <path
            d="M 103 118 L 83 62"
            stroke={isWhite ? '#9CA3AF' : '#FFFFFF'}
            strokeOpacity="0.3"
            strokeDasharray="3 2"
            strokeWidth="1"
          />

          {/* Main Folded Belt Loop (Obi Band) */}
          <path
            d="M 15 36 C 15 28, 125 28, 125 36 L 125 54 C 125 62, 15 62, 15 54 Z"
            fill={`url(#${gradId})`}
            stroke={isWhite ? '#9CA3AF' : '#000000'}
            strokeWidth="1.5"
          />

          {/* Obi Band Stitching Rows */}
          <path d="M 18 42 H 122" stroke={isWhite ? '#9CA3AF' : '#FFFFFF'} strokeOpacity="0.35" strokeDasharray="4 2" strokeWidth="1" />
          <path d="M 18 48 H 122" stroke={isWhite ? '#9CA3AF' : '#FFFFFF'} strokeOpacity="0.35" strokeDasharray="4 2" strokeWidth="1" />

          {/* Realistic Tied Square Knot in Center */}
          <g className="transition-transform duration-300 group-hover/belt:scale-105 origin-center">
            {/* Knot Base Shadow */}
            <path
              d="M 46 32 C 46 25, 94 25, 94 32 L 90 60 C 90 67, 50 67, 50 60 Z"
              fill={shadowColor}
              opacity="0.4"
            />
            {/* Knot Main Fold */}
            <path
              d="M 48 30 C 48 24, 92 24, 92 30 L 88 58 C 88 64, 52 64, 52 58 Z"
              fill={`url(#${gradId})`}
              stroke={isWhite ? '#6B7280' : '#000000'}
              strokeWidth="2"
            />
            {/* Knot Crease Details */}
            <path d="M 58 30 Q 56 44 60 58" stroke={isWhite ? '#9CA3AF' : '#000000'} strokeOpacity="0.5" strokeWidth="1.5" />
            <path d="M 80 30 Q 82 44 78 58" stroke={isWhite ? '#9CA3AF' : '#000000'} strokeOpacity="0.5" strokeWidth="1.5" />
          </g>

          {/* Japanese Kanji Label Patch on Right Belt Tip */}
          <rect
            x="96"
            y="94"
            width="12"
            height="18"
            transform="rotate(-15 96 94)"
            fill="#05060A"
            stroke={isWhite ? '#9CA3AF' : '#374151'}
            strokeWidth="0.8"
            rx="1.5"
          />
          {/* Kanji Characters (Shotokan / B.A.M.A. Symbol) */}
          <text
            x="98"
            y="106"
            transform="rotate(-15 98 106)"
            fill="url(#gold-thread)"
            fontSize="7"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            空手
          </text>

          {/* Embroidered Rank Stripes for Brown 4, 3, 2, 1 */}
          {stripes > 0 && Array.from({ length: stripes }).map((_, i) => (
            <rect
              key={i}
              x={93 - i * 4.5}
              y={84 - i * 6}
              width="10"
              height="3.5"
              transform={`rotate(-15 ${93 - i * 4.5} ${84 - i * 6})`}
              fill="url(#gold-thread)"
              stroke="#000000"
              strokeWidth="0.5"
              rx="0.5"
            />
          ))}

          {/* Black Belt Gold Master Embroidered Dan Bar & Emblem */}
          {isBlack && (
            <>
              <rect
                x="92"
                y="76"
                width="12"
                height="4"
                transform="rotate(-15 92 76)"
                fill="url(#gold-thread)"
                stroke="#000000"
                strokeWidth="0.6"
                rx="0.5"
              />
              <circle cx="70" cy="44" r="4.5" fill="url(#gold-thread)" stroke="#000000" strokeWidth="0.8" />
            </>
          )}

          {/* Animated Shimmer Lens Flare Effect on Hover */}
          <rect
            x="0"
            y="0"
            width="140"
            height="140"
            fill="url(#shimmer)"
            className="opacity-0 group-hover/belt:opacity-100 transition-opacity duration-700 pointer-events-none"
          />
        </g>
      </svg>
    </div>
  );
}
