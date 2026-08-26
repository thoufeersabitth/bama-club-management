import React, { useState } from 'react';
import { MapPin, Phone, Mail, MessageSquare, Send, CheckCircle2, Shield, Sparkles } from 'lucide-react';
import { ACADEMY_INFO } from '../../services/initialData';
import useScrollReveal from '../../hooks/useScrollReveal';

export default function Contact() {
  useScrollReveal();

  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedInquiry, setLastSubmittedInquiry] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    branch: 'Pulikkal (Head Office)',
    program: 'Kids Karate',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const newInquiry = {
      id: `INQ-${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      email: formData.email || 'N/A',
      branch: formData.branch,
      program: formData.program,
      message: formData.message || 'No additional notes provided',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'PENDING'
    };

    setLastSubmittedInquiry(newInquiry);

    // Save Lead to bama_admission_inquiries
    try {
      const existingInquiries = JSON.parse(localStorage.getItem('bama_admission_inquiries') || '[]');
      const updatedInquiries = [newInquiry, ...existingInquiries];
      localStorage.setItem('bama_admission_inquiries', JSON.stringify(updatedInquiries));

      // Generate Admin Notification
      const existingNotifs = JSON.parse(localStorage.getItem('bama_admin_notifications') || '[]');
      const newNotif = {
        id: `notif-${Date.now()}`,
        type: 'INQUIRY',
        title: `📥 New Admission Inquiry from ${formData.name}!`,
        desc: `Branch: ${formData.branch} | Program: ${formData.program} | Phone: ${formData.phone}`,
        time: 'Just now',
        read: false,
        inquiryId: newInquiry.id
      };
      localStorage.setItem('bama_admin_notifications', JSON.stringify([newNotif, ...existingNotifs]));

      // Dispatch global event for header bell badge
      window.dispatchEvent(new Event('bama_notification_updated'));
    } catch (err) {}

    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Header PRO MAX */}
      <div className="reveal-on-scroll slide-up text-center space-y-4">
        <span className="px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-950/80 text-amber-400 border border-red-800/60 shadow-lg">
          Get In Touch & Reserve Dojo Seat
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase pt-2">
          CONTACT <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">B.A.M.A. ACADEMY</span>
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto text-sm sm:text-base font-medium">
          Have questions about admissions, fees, or class schedules? Reach out to our head office or visit any dojo branch.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Info Card */}
        <div className="reveal-on-scroll slide-left space-y-8">
          <div className="bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-8 border border-gray-800/90 shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-500 flex-shrink-0" /> Head Office & Inquiry
            </h3>

            <div className="space-y-4 text-xs sm:text-sm text-gray-300 font-medium">
              <div className="flex items-start gap-3 bg-black/50 p-4 rounded-2xl border border-gray-800">
                <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block uppercase text-[10px] tracking-wider mb-1">Headquarters Address:</strong>
                  <span>{ACADEMY_INFO.headOffice.address}</span>
                </div>
              </div>

              <a
                href={`tel:${ACADEMY_INFO.headOffice.phone.replace(/[^0-9+]/g, '')}`}
                className="flex items-center gap-3 bg-black/50 hover:bg-red-950/40 p-4 rounded-2xl border border-gray-800 hover:border-red-500/60 transition cursor-pointer group"
              >
                <Phone className="w-5 h-5 text-red-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <strong className="text-white block uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
                    <span>Phone / Helpline:</span>
                    <span className="text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">Click to Call 📞</span>
                  </strong>
                  <span className="hover:text-amber-300 transition font-mono font-bold text-amber-300 text-sm sm:text-base">
                    {ACADEMY_INFO.headOffice.phone}
                  </span>
                </div>
              </a>

              <div className="flex items-center gap-3 bg-black/50 p-4 rounded-2xl border border-gray-800">
                <Mail className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <strong className="text-white block uppercase text-[10px] tracking-wider mb-1">Official Email:</strong>
                  <a href={`mailto:${ACADEMY_INFO.headOffice.email}`} className="hover:text-amber-300 transition font-bold">{ACADEMY_INFO.headOffice.email}</a>
                </div>
              </div>
            </div>

            <a
              href={`https://wa.me/919544085442?text=Hello%20BAMA%20Karate%20Academy%20Admissions`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl border border-green-400/40 transition cursor-pointer"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Instant Chat on WhatsApp →</span>
            </a>
          </div>

          <div className="bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-6 border border-gray-800 text-xs text-gray-300 space-y-2">
            <p><strong className="text-amber-400">Govt Reg No:</strong> {ACADEMY_INFO.regNo}</p>
            <p><strong className="text-amber-400">Police Permit No:</strong> {ACADEMY_INFO.policePermitNo}</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="reveal-on-scroll slide-right bg-gradient-to-b from-[#0F111D] to-[#0A0C14] rounded-3xl p-8 border border-gray-800/90 shadow-2xl">
          <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Send Admission Inquiry
          </h3>

          {submitted ? (
            <div className="p-8 text-center bg-green-950/60 border border-green-500/60 rounded-3xl space-y-4">
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto animate-bounce" />
              <h4 className="text-xl font-black text-white uppercase">Inquiry Sent Successfully!</h4>
              <p className="text-xs text-gray-300 font-medium">
                Our sensei team will review your message and contact you via Phone / WhatsApp shortly.
              </p>
              {lastSubmittedInquiry && (
                <a
                  href={`https://wa.me/919544085442?text=Hello%20BAMA%20Karate%20Academy!%20I%20just%20submitted%20an%20admission%20inquiry%20for%20${encodeURIComponent(lastSubmittedInquiry.name)}%20at%20${encodeURIComponent(lastSubmittedInquiry.branch)}.`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg border border-green-400/40 transition cursor-pointer mt-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Connect Instantly on WhatsApp →</span>
                </a>
              )}
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 text-xs font-black text-amber-400 underline uppercase tracking-wider cursor-pointer block mx-auto"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/60 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-bold uppercase tracking-wider mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-black/60 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-black/60 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-bold uppercase tracking-wider mb-1.5">Select Branch *</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-4 py-3 bg-black/60 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
                  >
                    <option value="Pulikkal (Head Office)">Pulikkal Dojo (Head Office)</option>
                    <option value="Chungam Branch">Chungam Dojo Branch</option>
                    <option value="Mongam Branch">Mongam Dojo Branch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold uppercase tracking-wider mb-1.5">Select Program *</label>
                  <select
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    className="w-full px-4 py-3 bg-black/60 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
                  >
                    <option value="Kids Karate">Kids Karate (Ages 5-12)</option>
                    <option value="Adults Shotokan Karate">Adults Shotokan Karate</option>
                    <option value="Women's Self Defence">Women's Self Defence</option>
                    <option value="Kick Boxing">Kick Boxing & Striking</option>
                    <option value="Martial Fitness">Martial Fitness Training</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold uppercase tracking-wider mb-1.5">Message / Note</label>
                <textarea
                  rows="3"
                  placeholder="Tell us about your training goals..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 bg-black/60 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-400 font-medium"
                ></textarea>
              </div>

              <button
                type="submit"
                className="shimmer-btn-wrapper w-full py-4 bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 border border-amber-400/40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Admission Inquiry →</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
