import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function CadetFeeReceiptPrint({ receipt }) {
  if (!receipt) return null;

  const student = receipt.student_detail || {};
  const studentName = student.name || receipt.student_name || 'Cadet';
  const admissionNo = student.admissionNo || student.admission_no || receipt.admission_no || 'BAMA-2026';
  const branchName = receipt.branch || student.branch || 'Pulikkal Head Office';
  const shiftBatch = receipt.shift || student.shift || 'Regular Batch';
  const receiptNo = receipt.receipt_no || `REC-${admissionNo}-01`;
  const paidAmount = receipt.amount ?? receipt.paid_amount ?? 0;
  const clearedPeriod = receipt.month || `${receipt.billing_month || 'Current Month'} ${receipt.year || 2026}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div
      className="bg-white text-black p-6 sm:p-8 max-w-[210mm] mx-auto font-sans leading-tight border-2 border-black shadow-none print:m-0 print:p-6 print:border-black print:max-w-full"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      {/* Academy Header & Crests */}
      <div className="border-b-2 border-black pb-4 mb-4 flex items-center justify-between gap-4">
        <div className="w-14 h-14 rounded-full border-2 border-black flex flex-col items-center justify-center p-1 text-center flex-shrink-0">
          <span className="font-black text-xs tracking-wider">B.A.M.A</span>
          <span className="text-[7px] font-bold text-red-700">KERALA</span>
        </div>

        <div className="text-center flex-1 space-y-1">
          <h1 className="text-xl font-black uppercase tracking-tight text-gray-900">
            BRAVE ACADEMY OF MARTIAL ARTS
          </h1>
          <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
            Affiliated to Japan Karate Association (JKA)
          </p>
          <p className="text-[9px] text-gray-600">
            Near Akshaya Centre, Andiyoorkunnu Road, Pulikkal, Malappuram - 673637 | Mob: +91 95440 85442
          </p>
        </div>

        <div className="w-14 h-14 rounded-full border-2 border-black flex flex-col items-center justify-center p-1 text-center flex-shrink-0">
          <span className="font-serif font-black text-xs">JKA</span>
          <span className="text-[7px] font-sans font-bold">JAPAN</span>
        </div>
      </div>

      {/* Title Badge */}
      <div className="text-center my-3">
        <div className="inline-block px-6 py-1 bg-gray-100 border-2 border-black text-xs font-black uppercase tracking-widest">
          🥋 OFFICIAL MONTHLY / TERM FEE PAYMENT RECEIPT
        </div>
      </div>

      {/* Meta Bar: Receipt No & Issue Date */}
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

      {/* Cadet Information Box */}
      <div className="border-2 border-black p-3.5 mb-4 space-y-2">
        <div className="text-[10px] font-black uppercase text-gray-700 border-b border-gray-300 pb-1 flex items-center justify-between">
          <span>Cadet Particulars</span>
          <span className="font-mono text-red-700 font-bold">ADM: {admissionNo}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500 text-[10px] block">Cadet Name</span>
            <strong className="text-sm font-black uppercase text-gray-900">{studentName}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">Branch Dojo</span>
            <strong className="text-xs font-bold text-gray-800">{branchName}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">Training Shift / Batch</span>
            <strong className="text-xs font-bold text-amber-900">{shiftBatch}</strong>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">Billing Plan</span>
            <strong className="text-xs font-bold text-gray-800">
              {receipt.is_quarterly ? 'School Batch (3-Month Term Plan)' : 'Regular Dojo (Monthly Plan)'}
            </strong>
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
              <div className="font-bold">Karate Tuition Training Fee</div>
              <div className="text-[10px] text-gray-600">Cleared Billing Period: <strong className="text-gray-900 font-mono">{clearedPeriod}</strong></div>
            </td>
            <td className="border border-black p-2.5 text-right font-mono font-bold text-sm">
              ₹{Number(paidAmount).toFixed(2)}
            </td>
          </tr>
          <tr className="bg-gray-50 font-bold">
            <td className="border border-black p-2 text-right">TOTAL PAID:</td>
            <td className="border border-black p-2 text-right font-mono text-base font-black text-gray-900">
              ₹{Number(paidAmount).toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Payment Status & Seal Banner */}
      <div className="border-2 border-black p-3 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Payment Status:</span>
            <span className="px-3 py-0.5 bg-emerald-100 text-emerald-800 border-2 border-emerald-700 rounded-md text-xs font-black uppercase tracking-wider inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> PAID & CLEARED
            </span>
          </div>
          <div className="text-[11px] text-gray-700">
            Payment Mode: <strong>{receipt.payment_mode || 'Cash / UPI / Online'}</strong>
          </div>
        </div>

        {/* Official Verified Stamp Graphic */}
        <div className="border-2 border-dashed border-red-700 text-red-700 px-4 py-1.5 rounded-lg text-center transform -rotate-2">
          <div className="text-[10px] font-black uppercase tracking-widest">B.A.M.A. KARATE</div>
          <div className="text-xs font-black uppercase">FEE RECEIVED</div>
          <div className="text-[8px] font-bold font-mono">{currentDate}</div>
        </div>
      </div>

      {/* Signatures & Authorization */}
      <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-black text-xs">
        <div>
          <div className="h-8 border-b border-black"></div>
          <p className="text-[10px] font-bold text-gray-700 pt-1">Parent / Guardian Signature</p>
        </div>
        <div className="text-right">
          <div className="h-8 border-b border-black flex items-end justify-end">
            <span className="font-serif italic font-bold text-xs text-red-900">
              {localStorage.getItem('bama_examiner_name') || 'Sensei Abdul Nafih'}
            </span>
          </div>
          <p className="text-[10px] font-black uppercase text-gray-900 pt-1">
            {localStorage.getItem('bama_examiner_name') || 'Sensei Abdul Nafih'}
          </p>
          <p className="text-[9px] text-gray-600">Authorized Official, B.A.M.A.</p>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-4 pt-2 border-t border-gray-300 text-center text-[9px] text-gray-500">
        <p>This is a computer-generated official payment receipt issued by Brave Academy of Martial Arts.</p>
      </div>
    </div>
  );
}
