import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Award, Video, X, ZoomIn, Maximize2, Sparkles, FolderOpen, ExternalLink, Download } from 'lucide-react';
import { getCmsConfig } from '../../services/cmsService';
import useScrollReveal from '../../hooks/useScrollReveal';
import { fetchGoogleDrivePhotos, getStoredDrivePhotos, GOOGLE_DRIVE_FOLDER_URL } from '../../services/googleDriveService';

const FALLBACK_GALLERY = [
  { id: 'g1', title: 'Annual Belt Exam 2026', category: 'GRADING', desc: 'Sensei Abdul Rahman examining green & brown belt candidates in Pulikkal Dojo.', img: '/assets/prog_competition.jpg' },
  { id: 'g2', title: 'Kerala State Karate Championship', category: 'COMPETITION', desc: 'B.A.M.A. cadets winning 12 Gold Medals in Kata & Kumite events.', img: '/assets/prog_adults.jpg' },
  { id: 'g3', title: "Women's Self-Defence Workshop", category: 'EVENTS', desc: 'Special situational defense seminar conducted at Chungam branch.', img: '/assets/prog_self_defence.jpg' },
  { id: 'g4', title: 'Kick Boxing Sparring Session', category: 'TRAINING', desc: 'High-intensity conditioning session with heavy bags and pad drills.', img: '/assets/prog_kickboxing.jpg' },
  { id: 'g5', title: 'Junior Cadet Kata Practice', category: 'TRAINING', desc: 'Cadets practicing Shotokan Heian Shodan kata under supervision.', img: '/assets/prog_kids.jpg' },
  { id: 'g6', title: 'Conditioning & Stamina Workout', category: 'TRAINING', desc: 'Dojo fitness training and core conditioning session.', img: '/assets/prog_fitness.jpg' }
];

export default function Gallery() {
  useScrollReveal();

  const [filter, setFilter] = useState('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [drivePhotos, setDrivePhotos] = useState(getStoredDrivePhotos);
  const [activeViewTab, setActiveViewTab] = useState('DRIVE'); // 'DRIVE' | 'GRID'

  const [rawCmsGallery, setRawCmsGallery] = useState(() => {
    try {
      const saved = localStorage.getItem('bama_cms_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.gallery && parsed.gallery.length > 0) return parsed.gallery;
      }
    } catch (e) {}
    return FALLBACK_GALLERY;
  });

  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      const data = await getCmsConfig();
      if (isMounted && data && data.gallery && data.gallery.length > 0) {
        setRawCmsGallery(data.gallery);
      }
    };
    fetchLatest();

    fetchGoogleDrivePhotos(false).then(res => {
      if (isMounted && Array.isArray(res) && res.length > 0) {
        setDrivePhotos(res);
      }
    }).catch(() => {});

    const handleSync = () => {
      fetchLatest();
      setDrivePhotos(getStoredDrivePhotos());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('cms_updated', handleSync);
    window.addEventListener('bama_gdrive_updated', handleSync);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('cms_updated', handleSync);
      window.removeEventListener('bama_gdrive_updated', handleSync);
    };
  }, []);

  const items = React.useMemo(() => {
    if (drivePhotos && drivePhotos.length > 0) {
      return [...drivePhotos, ...rawCmsGallery];
    }
    return rawCmsGallery;
  }, [drivePhotos, rawCmsGallery]);

  const filtered = filter === 'ALL' ? items : items.filter(i => i.category === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Header PRO MAX */}
      <div className="reveal-on-scroll slide-up text-center space-y-4">
        <span className="px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
          Memories & Championship Medals
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase pt-2">
          ACADEMY <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">PHOTO GALLERY</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto font-medium leading-relaxed">
          Explore moments, tournament achievements, belt examinations, and training memories at Brave Academy of Martial Arts.
        </p>

        {/* View Switcher: Live Embedded Google Drive vs Featured Showcase */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveViewTab('DRIVE')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shadow-xl ${
              activeViewTab === 'DRIVE'
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black border border-amber-300 scale-105 shadow-amber-500/30'
                : 'bg-[#10121D] text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>☁️ Live Google Drive (Open Live)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('GRID')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shadow-xl ${
              activeViewTab === 'GRID'
                ? 'bg-gradient-to-r from-red-600 via-red-600 to-amber-600 text-white border border-amber-300 scale-105 shadow-red-600/30'
                : 'bg-[#10121D] text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700'
            }`}
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>🥋 Featured Highlights ({items.length} Photos)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DIRECT LIVE EMBEDDED GOOGLE DRIVE WINDOW */}
      {activeViewTab === 'DRIVE' && (
        <div className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#121526] via-[#0E101D] to-[#07080E] rounded-3xl p-4 sm:p-6 border border-amber-500/40 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Official Live Google Drive Archive
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-700/60 animate-pulse">
                    Live Auto-Sync
                  </span>
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  Official cloud gallery • Photos uploaded to Google Drive from your phone appear here live
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={GOOGLE_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-black/80 hover:bg-black text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Drive App</span>
              </a>
            </div>
          </div>

          {/* Embedded Google Drive Live Folder Frame */}
          <div className="w-full h-[650px] sm:h-[750px] rounded-2xl overflow-hidden border border-gray-800 bg-black/90 relative shadow-2xl">
            <iframe
              src={`https://drive.google.com/embeddedfolderview?id=${GOOGLE_DRIVE_FOLDER_ID}#grid`}
              className="w-full h-full border-0 rounded-2xl"
              title="B.A.M.A. Official Google Drive Live Gallery"
              allow="autoplay; encrypted-media; fullscreen"
            />
          </div>
        </div>
      )}

      {/* VIEW 2: CURATED PHOTO SHOWCASE GRID */}
      {activeViewTab === 'GRID' && (
        <>
          {/* Filter Tabs */}
          <div className="reveal-on-scroll slide-up flex flex-wrap justify-center gap-3">
            {['ALL', 'GRADING', 'COMPETITION', 'TRAINING', 'EVENTS'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filter === cat
                    ? 'bg-gradient-to-r from-red-600 via-red-600 to-amber-600 text-white shadow-xl border border-amber-300/50 scale-105'
                    : 'bg-[#10121D] text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => setSelectedPhoto(item)}
            style={{ transitionDelay: `${idx * 0.08}s` }}
            className="reveal-on-scroll zoom-in bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-5 border border-gray-800/90 flex flex-col justify-between cursor-pointer group hover:border-amber-400 transition-all duration-500 shadow-2xl hover:shadow-[0_20px_40px_rgba(245,158,11,0.3)] hover:-translate-y-2.5"
          >
            <div className="h-56 rounded-2xl overflow-hidden mb-4 relative border border-gray-800">
              <img
                src={item.thumbnail || item.img || '/assets/prog_competition.jpg'}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F111D] via-transparent to-transparent opacity-80"></div>
              <span className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/40 text-[9px] font-black font-mono rounded-full uppercase tracking-wider shadow-lg">
                {item.category}
              </span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="w-12 h-12 rounded-2xl bg-red-600/90 text-white flex items-center justify-center shadow-2xl border border-amber-400/50 transform group-hover:scale-110 transition-transform">
                  <Maximize2 className="w-5 h-5 text-amber-300" />
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-white text-base group-hover:text-amber-400 transition-colors uppercase">{item.title}</h3>
              <p className="text-xs text-gray-300 leading-snug line-clamp-2 font-medium">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-[#121526] via-[#0E101D] to-[#07080E] border border-amber-400/50 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl relative space-y-0"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/80 text-gray-300 hover:text-white border border-gray-700 hover:border-red-500 transition-all cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5 text-amber-400" />
            </button>

            <div className="relative h-72 sm:h-96 w-full bg-black overflow-hidden border-b border-gray-800">
              <img
                src={selectedPhoto.img || selectedPhoto.thumbnail || '/assets/prog_competition.jpg'}
                alt={selectedPhoto.title}
                className="w-full h-full object-cover filter brightness-105 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121526] via-transparent to-transparent opacity-90"></div>

              <span className="absolute top-4 left-4 px-3.5 py-1 bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/50 text-xs font-black font-mono rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {selectedPhoto.category}
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                  {selectedPhoto.title}
                </h3>
                {selectedPhoto.viewUrl && (
                  <a
                    href={selectedPhoto.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider transition"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>View in Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed font-medium">
                {selectedPhoto.desc}
              </p>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
