import React from 'react';
import { Award, CheckCircle2, Shield } from 'lucide-react';

export default function ExamFeeReceipt({ reg }) {
  if (!reg) return null;

  const receiptNo = `EXAM-REC-${reg.registration_no || reg.admission_no || '2026-001'}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const feeAmount = reg.exam_fee || reg.applied_fee || 1500;
  const isPaid = String(reg.payment_status || '').toLowerCase().includes('paid');

  return (
    <div className="bg-white text-black p-6 sm:p-8 max-w-[210mm] mx-auto font-sans leading-tight border-2 border-black rounded-none shadow-none print:m-0 print:p-6 print:border-black print:max-w-full">
      {/* Academy Header & Crests */}
      <div className="border-b-2 border-black pb-4 mb-4 flex items-center justify-between gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-black flex flex-col items-center justify-center p-1 text-center flex-shrink-0">
          <span className="font-black text-xs tracking-wider">B.A.M.A</span>
          <span className="text-[7px] font-bold text-red-700">KERALA</span>
        </div>

        <div className="text-center flex-1 space-y-1">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-900">
            BRAVE ACADEMY OF MARTIAL ARTS
          </h1>
          <p className="text-[11px] font-bold text-gray-800 uppercase tracking-widest">
            Affiliated to Japan Karate Association (JKA)
          </p>
          <p className="text-[9px] text-gray-600">
            Head Office: Near Akshaya Centre, Andiyoorkunnu Road, Pulikkal, Malappuram - 673637
          </p>
          <p className="text-[9px] font-semibold text-gray-700">
            Helpline: +91 95440 85442 | +91 95444 67209
          </p>
        </div>

        <div className="w-16 h-16 rounded-full border-2 border-black flex flex-col items-center justify-center p-1 text-center flex-shrink-0">
          <span className="font-serif font-black text-xs">JKA</span>
          <span className="text-[7px] font-sans font-bold">JAPAN</span>
        </div>
      </div>

      {/* Title Badge */}
      <div className="text-center my-3">
        <div className="inline-block px-6 py-1 bg-gray-100 border-2 border-black text-xs font-black uppercase tracking-widest">
          🥋 OFFICIAL BELT GRADING EXAM FEE RECEIPT
        </div>
      </div>

      {/* Top Meta Details (Receipt No & Date) */}
      <div className="flex justify-between items-center text-xs border border-black p-2.5 bg-gray-50 mb-4">
        <div>
          <span className="text-gray-600 font-bold">RECEIPT NO: </span>
          <strong className="font-mono text-gray-900 text-sm font-black">{receiptNo}</strong>
        </div>
        <div>
          <span className="text-gray-600 font-bold">DATE: </span>
          <strong className="font-mono text-gray-900 font-black">{currentDate}</strong>
        </div>
      </div>

      {/* Candidate Information Card */}
      <div className="border-2 border-black p-3.5 mb-4 space-y-2">
        <div className="text-[10px] font-black uppercase text-gray-700 border-b border-gray-300 pb-1 flex items-center justify-between">
          <span>Cadet Particulars</span>
          <span className="font-mono">REG REF: #{reg.registration_no || 'N/A'}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500 text-[10px] block">Candidate Name</span>
            <strong className="text-sm font-black uppercase text-gray-900">{reg.student_name}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">Admission / Roll No</span>
            <strong className="font-mono text-xs font-black text-gray-900">{reg.admission_no || reg.registration_no || 'BAMA-2026'}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">Branch Dojo</span>
            <strong className="text-xs font-bold text-gray-800">{reg.branch_name || 'Pulikkal Main Dojo'}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">Contact / WhatsApp</span>
            <strong className="font-mono text-xs font-bold text-gray-800">{reg.phone || 'N/A'}</strong>
          </div>
        </div>
      </div>

      {/* Belt Promotion Particulars */}
      <div className="border-2 border-black p-3.5 mb-4 bg-gray-50/50">
        <div className="text-[10px] font-black uppercase text-gray-700 border-b border-gray-300 pb-1 mb-2">
          Examination & Promotion Target
        </div>
        <div className="flex items-center justify-around py-2 text-center">
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold">Present Rank</span>
            <span className="text-sm font-bold text-gray-800">{reg.current_belt || 'White Belt'}</span>
          </div>
          <div className="text-lg font-black text-gray-400">➔</div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase font-bold">Target Exam Belt</span>
            <span className="text-base font-black text-red-700 uppercase">{reg.target_belt || 'Green Belt'}</span>
          </div>
          <div className="border-l border-gray-300 pl-4">
            <span className="text-[10px] text-gray-500 block uppercase font-bold">Form Type</span>
            <span className="text-xs font-bold text-gray-800">{reg.form_type || 'JKK Kyu Form'}</span>
          </div>
        </div>
      </div>

      {/* Payment Details Table */}
      <table className="w-full border-collapse border-2 border-black text-xs mb-4">
        <thead>
          <tr className="bg-gray-100 font-bold border-b-2 border-black">
            <th className="border border-black p-2 text-left w-2/3">Fee Description</th>
            <th className="border border-black p-2 text-right w-1/3">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2.5">
              <div className="font-bold">Belt Grading Examination & JKA Kerala Assessment Fee</div>
              <div className="text-[10px] text-gray-600">Includes Official Examiner Evaluation, Certificate of Rank & Kyu Processing</div>
            </td>
            <td className="border border-black p-2.5 text-right font-mono font-bold text-sm">
              ₹{Number(feeAmount).toFixed(2)}
            </td>
          </tr>
          <tr className="bg-gray-50 font-bold">
            <td className="border border-black p-2 text-right">TOTAL AMOUNT:</td>
            <td className="border border-black p-2 text-right font-mono text-base font-black text-gray-900">
              ₹{Number(feeAmount).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Payment Status & Seal Banner */}
      <div className="border-2 border-black p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Payment Status:</span>
            {isPaid ? (
              <span className="px-3 py-0.5 bg-emerald-100 text-emerald-800 border-2 border-emerald-700 rounded-md text-xs font-black uppercase tracking-wider inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> PAID & VERIFIED
              </span>
            ) : (
              <span className="px-3 py-0.5 bg-amber-100 text-amber-900 border-2 border-amber-700 rounded-md text-xs font-black uppercase tracking-wider">
                {reg.payment_status || 'PENDING'}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-700">
            Payment Mode: <strong>{reg.payment_mode || 'UPI / Cash / Bank'}</strong>
            {reg.transaction_id && <span> • Trx Ref: <strong className="font-mono">{reg.transaction_id}</strong></span>}
          </div>
        </div>

        {/* Official Verified Stamp Graphic */}
        <div className="border-2 border-dashed border-red-700 text-red-700 px-4 py-1.5 rounded-lg text-center transform -rotate-2">
          <div className="text-[10px] font-black uppercase tracking-widest">B.A.M.A. KARATE</div>
          <div className="text-xs font-black uppercase">FEE VERIFIED</div>
          <div className="text-[8px] font-bold font-mono">{currentDate}</div>
        </div>
      </div>

      {/* Signatures & Authorization */}
      <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-black text-xs">
        <div>
          <div className="h-10 border-b border-black"></div>
          <p className="text-[10px] font-bold text-gray-700 pt-1">Parent / Guardian Signature</p>
        </div>
        <div className="text-right">
          <div className="h-10 border-b border-black flex items-end justify-end">
            <span className="font-serif italic font-bold text-xs text-red-900">Sensei Abdul Rahman</span>
          </div>
          <p className="text-[10px] font-black uppercase text-gray-900 pt-1">
            Sensei Abdul Rahman (5th Dan Black Belt, JKA)
          </p>
          <p className="text-[9px] text-gray-600">Chief Examiner & Technical Director, B.A.M.A.</p>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-6 pt-2 border-t border-gray-300 text-center text-[9px] text-gray-500 space-y-0.5">
        <p>This is an official computer-generated fee receipt issued by Brave Academy of Martial Arts.</p>
        <p>Candidates must carry this receipt or their official Kyu Form to the exam venue for identity verification.</p>
      </div>
    </div>
  );
}
