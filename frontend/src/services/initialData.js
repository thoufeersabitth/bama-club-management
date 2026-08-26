export const ACADEMY_INFO = {
  name: "Brave Academy of Martial Arts (B.A.M.A.)",
  tagline: "Discipline • Respect • Strength • Excellence",
  regNo: "MPM/CA/15/2023",
  policePermitNo: "2/2021/PT/SDOK/21",
  logoUrl: "/logo bama_240616_200739.jpg.jpeg",
  headOffice: {
    address: "Andiyoorkunnu Road, Pulikkal, Malappuram, Kerala - 673637, India",
    phone: "+91 95440 85442",
    whatsapp: "+91 95440 85442",
    email: "braveacademypkl@gmail.com",
    instagram: "https://www.instagram.com/invites/contact/?i=pued5vosli46&utm_content=1u8fwts",
    facebook: "https://www.facebook.com/abdul.nafih.1656",
    mapUrl: "https://maps.google.com/?q=Pulikkal+Malappuram+Kerala"
  },
  affiliations: [
    { name: "Japan Karate Association (JKA India)", code: "JKA-IND" },
    { name: "Kick Boxing Association of Kerala", code: "KBAK" },
    { name: "Kerala Karate Association (KKA)", code: "KKA" }
  ]
};

export const SHIFT_OPTIONS = [
  "Evening Batch (5:00 PM - 7:00 PM)",
  "Morning Batch (6:00 AM - 7:30 AM)",
  "Night / Late Evening Batch (7:00 PM - 8:30 PM)",
  "Weekend Special Batch (Sat & Sun: 7:00 AM - 9:00 AM)",
  "Ladies Special Batch",
  "Kids Special Batch (4:00 PM - 5:00 PM)",
  "Custom Shift / Flexible"
];

// Helper to resolve active training shift schedules dynamically from Branch Management storage
export const getDynamicShiftOptions = () => {
  try {
    const stored = localStorage.getItem('bama_training_schedules');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => `${s.name} (${s.time})`);
      } else if (Array.isArray(parsed) && parsed.length === 0) {
        return ['General Training Batch (Regular)'];
      }
    }
  } catch (e) {}
  return SHIFT_OPTIONS;
};

export const BELT_LEVELS = [
  { level: 1, name: "White Belt", kyu: "10th Kyu", color: "#FFFFFF", textColor: "#000000", order: 1, description: "Beginner level focusing on basic stances, discipline, block techniques, and fundamental kicks.", durationMonths: 3 },
  { level: 2, name: "Yellow Belt", kyu: "9th Kyu", color: "#FACC15", textColor: "#000000", order: 2, description: "Developing basic strikes, counter-punches, and Heian Shodan kata fundamentals.", durationMonths: 3 },
  { level: 3, name: "Orange Belt", kyu: "8th Kyu", color: "#FB923C", textColor: "#FFFFFF", order: 3, description: "Advanced basic techniques, footwork, speed combinations, and Heian Nidan kata.", durationMonths: 4 },
  { level: 4, name: "Green Belt", kyu: "7th Kyu", color: "#4ADE80", textColor: "#FFFFFF", order: 4, description: "Intermediate belt emphasizing precision sparring (Kumite), agility, and Heian Sandan.", durationMonths: 4 },
  { level: 5, name: "Blue Belt", kyu: "6th Kyu", color: "#60A5FA", textColor: "#FFFFFF", order: 5, description: "Fluidity in motion, powerful strikes, open-hand blocks, and Heian Yondan kata mastery.", durationMonths: 6 },
  { level: 6, name: "Purple Belt", kyu: "5th Kyu", color: "#C084FC", textColor: "#FFFFFF", order: 6, description: "Advanced mental focus, combination fighting tactics, and Heian Godan kata mastery.", durationMonths: 6 },
  { level: 7, name: "Brown 4", kyu: "4th Kyu", color: "#A16207", textColor: "#FFFFFF", order: 7, description: "Advanced kyu level focusing on Tekki Shodan and foundational brown belt kata.", durationMonths: 6 },
  { level: 8, name: "Brown 3", kyu: "3rd Kyu", color: "#854D0E", textColor: "#FFFFFF", order: 8, description: "Intermediate brown belt refining Bassai Dai, endurance, and advanced Kumite.", durationMonths: 6 },
  { level: 9, name: "Brown 2", kyu: "2nd Kyu", color: "#713F12", textColor: "#FFFFFF", order: 9, description: "Pre-black belt senior rank mastering Jion and competitive sparring tactics.", durationMonths: 6 },
  { level: 10, name: "Brown 1", kyu: "1st Kyu", color: "#542E0C", textColor: "#FFFFFF", order: 10, description: "Senior 1st Kyu rank preparing for Dan examination, leadership, and teaching assistance.", durationMonths: 6 },
  { level: 11, name: "Black Belt", kyu: "1st Dan", color: "#111827", textColor: "#F59E0B", order: 11, description: "Mastery level representing technical excellence, discipline, teaching ability, and honor.", durationMonths: 24 }
];

export const INITIAL_BRANCHES = [
  {
    id: "283e0cc2-0009-494f-a3e1-7d8b14356213",
    name: "Pulikkal Branch (Head Office)",
    code: "BAMA-DOJO-01",
    address: "Andiyoorkunnu Road, Pulikkal, Malappuram, Kerala - 673637",
    phone: "+91 95440 85442",
    whatsapp: "+91 95440 85442",
    email: "pulikkal@bama.org",
    branch_head: "Sensei Abdul Rahman (5th Dan)",
    head: "Sensei Abdul Rahman (5th Dan)",
    timings: "Mon, Wed, Fri: 5:00 PM - 7:00 PM | Sat & Sun: 7:00 AM - 9:00 AM",
    facilities: ["🥋 Tatami Safety Mats", "🥊 Punching Heavy Bags", "❄️ AC Dojo Hall", "🏆 Tournament Sparring Ring"],
    status: "Active",
    isHeadOffice: true,
    mapUrl: "https://maps.google.com/?q=Pulikkal+Malappuram"
  },
  {
    id: "20c924cd-2dc7-4f82-a459-5e86286748c5",
    name: "Chungam Branch Dojo",
    code: "BAMA-DOJO-02",
    address: "Main Road Junction, Chungam, Malappuram, Kerala - 673638",
    phone: "+91 98471 22334",
    whatsapp: "+91 98471 22334",
    email: "chungam@bama.org",
    branch_head: "Sensei Rahul Kumar (3rd Dan)",
    head: "Sensei Rahul Kumar (3rd Dan)",
    timings: "Tue, Thu, Sat: 5:30 PM - 7:30 PM",
    facilities: ["🥋 High-Density Mats", "🎯 Focus Strike Pads", "📢 Smart Sound System"],
    status: "Active",
    isHeadOffice: false,
    mapUrl: "https://maps.google.com/?q=Chungam+Malappuram"
  },
  {
    id: "d4639193-c693-46e2-a46e-5e25dcf427a1",
    name: "Mongam Branch Dojo",
    code: "BAMA-DOJO-03",
    address: "Main Road, Mongam, Malappuram, Kerala - 673639",
    phone: "+91 97450 67890",
    whatsapp: "+91 97450 67890",
    email: "mongam@bama.org",
    branch_head: "Sensei Muhammed Haneen (2nd Dan)",
    head: "Sensei Muhammed Haneen (2nd Dan)",
    timings: "Mon, Wed, Fri: 6:00 AM - 7:30 AM & 5:00 PM - 7:00 PM",
    facilities: ["🥋 Pro Karate Mats", "🥊 Kickboxing Shields", "🛡️ First Aid Station"],
    status: "Active",
    isHeadOffice: false,
    mapUrl: "https://maps.google.com/?q=Mongam+Malappuram"
  }
];

export const INITIAL_STAFF = [
  {
    id: 'STF-001',
    username: 'nafih',
    name: 'Sensei Nafih',
    role: 'SUPER_ADMIN',
    designation: 'Chief Administrator & Head Instructor',
    branch: 'Pulikkal Branch (Head Office)',
    phone: '+91 95440 85442',
    email: 'braveacademypkl@gmail.com',
    password: 'Pulikkal@1',
    salary: '50000',
    joiningDate: '2020-01-01',
    status: 'ACTIVE',
    classesTaken: 0,
    lastClassDate: '2026-08-26',
    permissions: { students: true, attendance: true, fees: true, whatsapp: true, beltGrading: true, reports: true, instructors: true, branches: true, settings: true, cms: true }
  }
];

export const DEMO_USERS = INITIAL_STAFF.map(s => ({
  id: s.id,
  username: s.username,
  role: s.role,
  name: s.name,
  branch: s.branch,
  assigned_branch_id: s.assigned_branch_id,
  email: s.email,
  password: s.password,
  permissions: s.permissions
}));

export const SAMPLE_STUDENTS = [];

export const UPCOMING_EVENTS = [];

export const WHATSAPP_TEMPLATES = [
  {
    id: "tpl-fee-due-exact",
    name: "Official Monthly Fee Reminder (Standard)",
    category: "Financial",
    body: "Dear Parent,\n\nThis is a reminder that the monthly fee for {STUDENT_NAME} is pending. Kindly make the payment at your earliest convenience.\n\nThank you,\nBrave Academy of Martial Arts."
  },
  {
    id: "tpl-fee-due",
    name: "Monthly Fee Due Reminder (Detailed)",
    category: "Financial",
    body: "Dear {GUARDIAN_NAME}, this is a reminder from Brave Academy of Martial Arts (B.A.M.A.). The monthly fee of ₹{AMOUNT} for cadet {STUDENT_NAME} ({BRANCH_NAME}) for the current month is due. Kindly pay at office or via GooglePay to +91 95440 85442. Thank you! OSS 🥋"
  },
  {
    id: "tpl-fee-receipt",
    name: "Fee Payment Receipt",
    category: "Financial",
    body: "Dear {GUARDIAN_NAME}, received fee payment of ₹{AMOUNT} for cadet {STUDENT_NAME} ({BRANCH_NAME}). Official Receipt No: {RECEIPT_NO}. Thank you for your support! OSS 🥋"
  },
  {
    id: "tpl-attendance-absent",
    name: "Cadet Absence Alert",
    category: "Attendance",
    body: "Notice: Cadet {STUDENT_NAME} was marked ABSENT for today's Karate training session ({DATE}) at {BRANCH_NAME}. If this is an unexpected absence, kindly update the Sensei. OSS 🥋"
  },
  {
    id: "tpl-grading-invite",
    name: "Belt Examination & Camp Schedule",
    category: "Belt Grading",
    body: "OSS! Dear Parent, {STUDENT_NAME} has been selected for the upcoming {EVENT_TITLE}! Date: {EXAM_DATE}, Time: {TIME}, Venue: {VENUE}. Registration Fee: ₹{FEE}. Please confirm attendance. Sensei B.A.M.A."
  },
  {
    id: "tpl-holiday",
    name: "Holiday & Dojo Notice",
    category: "General",
    body: "Notice: Brave Academy of Martial Arts ({BRANCH_NAME}) will remain closed on {DATE} due to {REASON}. Regular training classes will resume on {RESUME_DATE}. OSS!"
  }
];

export const PROGRAMS = [
  {
    id: "prog-kids",
    title: "Little Ninjas & Kids Karate",
    ageGroup: "Ages 5 - 12",
    description: "Builds rock-solid self-discipline, respect, motor agility, and foundational Shotokan Karate stances.",
    image: "/assets/prog_kids.jpg",
    img: "/assets/prog_kids.jpg",
    features: ["Safety & Anti-Bullying Tactics", "Focus & Academic Concentration", "JKA Syllabus Belt Grading"]
  },
  {
    id: "prog-adults",
    title: "Teens & Adults Shotokan Karate",
    ageGroup: "Ages 13+",
    description: "Master high-impact Kumite sparring, Katas, realistic street self-defence, and physical conditioning.",
    image: "/assets/prog_adults.jpg",
    img: "/assets/prog_adults.jpg",
    features: ["Advanced Sparring Tactics", "Stress Relief & Core Fitness", "Certified Dan Graduation Pathway"]
  },
  {
    id: "prog-traditional",
    title: "Traditional Shotokan Kata & Kihon",
    ageGroup: "All Ages",
    description: "Authentic traditional Japanese Shotokan Kata mastery, stance precision, breath control, and classical bunkai applications.",
    image: "/assets/prog_competition.jpg",
    img: "/assets/prog_competition.jpg",
    features: ["Heian to Dan Master Katas", "Traditional Bunkai Application", "Stance & Form Perfection"]
  },
  {
    id: "prog-kickboxing",
    title: "Kickboxing & Tactical Fitness",
    ageGroup: "All Ages",
    description: "High-intensity cardio kickboxing combined with pad work, heavy bag drills, and explosive endurance.",
    image: "/assets/prog_kickboxing.jpg",
    img: "/assets/prog_kickboxing.jpg",
    features: ["Calorie Burning & Strength", "Focus Pad & Shield Strikes", "State Tournament Entry"]
  },
  {
    id: "prog-selfdefence",
    title: "Women's & General Self Defence",
    ageGroup: "All Ages",
    description: "Practical tactical escape techniques, joint locks, situational awareness drills, and threat neutralization.",
    image: "/assets/prog_self_defence.jpg",
    img: "/assets/prog_self_defence.jpg",
    features: ["Close Combat Deflection", "Real-World Threat Escape", "Confidence & Reflex Drills"]
  },
  {
    id: "prog-tournament",
    title: "Tournament Competition & Kumite Squad",
    ageGroup: "All Ages",
    description: "Specialized elite competition squad coaching for WKF, JKA India, and KKA State/National championship medals.",
    image: "/assets/prog_fitness.jpg",
    img: "/assets/prog_fitness.jpg",
    features: ["WKF Official Rules Coaching", "Speed & Reflex Sparring", "State & National Medal Pathway"]
  }
];

export const FACILITIES = [
  { id: "fac-1", title: "Standard Tatami Matting", desc: "High-density impact absorbing safety mats for throwing & grappling." },
  { id: "fac-2", title: "Heavy Bags & Strike Shields", desc: "Professional Everlast punch bags and thai strike pads for kick power." },
  { id: "fac-3", title: "Digital Attendance & RFID", desc: "Automated student attendance tracking & instant parent WhatsApp updates." },
  { id: "fac-4", title: "Certified Black Belt Instructors", desc: "Direct guidance by JKA & KKA accredited 4th and 5th Dan Senseis." }
];

export const TESTIMONIALS = [
  {
    id: "t-1",
    name: "Dr. K. Suresh Kumar",
    relation: "Parent of Adithya (Green Belt)",
    comment: "B.A.M.A. has completely transformed my son's focus and physical posture. The Senseis are deeply respectful and disciplined."
  },
  {
    id: "t-2",
    name: "Fathima Zahra",
    relation: "Student (Brown Belt Cadet)",
    comment: "The training here gives me extreme confidence. Winning gold in the Kerala State Tournament was a dream come true."
  }
];

export const ACADEMY_STATS = [
  { label: "Active Students", value: "350+" },
  { label: "Black Belt Graduates", value: "25+" },
  { label: "Tournament Medals", value: "120+" },
  { label: "Dojo Branches", value: "3" }
];
