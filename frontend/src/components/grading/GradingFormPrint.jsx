import React from 'react';

/**
 * Printable Physical Paper Form Component
 * Supports 3 exact physical paper layouts:
 * 1. JKK_KERALA (Image 1 - Kyu Registration Form)
 * 2. BAMA_KYU (Image 2 - Kyu Exam Application Form)
 * 3. JKA_JAPAN (Image 3 - Official JKA Japan Dan/Senior Kyu Examiner's Record)
 */
export default function GradingFormPrint({ reg }) {
  if (!reg) return null;

  const targetBeltStr = (reg.target_belt || reg.current_belt || '').toLowerCase();
  
  let isCategoryC = reg.form_type === 'JAPAN_DIRECT_BLACK_BELT' || ['black', 'dan', 'shodan', 'nidan', 'sandan'].some(t => targetBeltStr.includes(t));
  let isCategoryB = reg.form_type === 'JKK_BROWN' || ['brown-3', 'brown 3', 'brown-2', 'brown 2', 'brown-1', 'brown 1', '3rd kyu', '2nd kyu', '1st kyu'].some(t => targetBeltStr.includes(t));
  let isCategoryA = !isCategoryB && !isCategoryC;

  return (
    <div className="print-only bg-white text-black p-4 text-xs font-sans max-w-[210mm] mx-auto leading-tight border border-black shadow-none my-4">
      
      {/* CATEGORY A: JKK WHITE TO BROWN-4 APPLICATION FORM (EXACT PHYSICAL PAPER FORM MATCH) */}
      {isCategoryA && (
        <div className="space-y-3 font-sans text-black">
          {/* Form Header with Dual Crest & Official Title */}
          <div className="border-2 border-black p-3 relative flex items-center justify-between gap-4">
            <div className="w-16 h-16 rounded-full border border-black flex flex-col items-center justify-center font-black text-[9px] text-center p-1 leading-tight flex-shrink-0">
              <span className="font-serif">B.A.M.A</span>
              <span className="text-[7px]">PULIKKAL</span>
            </div>

            <div className="text-center flex-1 space-y-1">
              <div className="border border-black py-0.5 px-3 bg-gray-100 font-black text-sm uppercase tracking-wider inline-block">
                級受験票 (登録申請書) APPLICATION FOR KYU EXAMINATION
              </div>
              <h1 className="text-base font-black uppercase tracking-tight">
                BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)
              </h1>
              <p className="text-[10px] font-bold text-gray-800">
                Affiliated to Japan Karate Association
              </p>
              <p className="text-[9px] font-medium text-gray-700">
                Near Akshaya Centre, Andiyoorkunnu Road, PULIKKAL, Pin: 673637, Mob: +91 95440 85442
              </p>
              <div className="text-[9px] font-black uppercase tracking-widest text-red-800 border-t border-b border-black py-0.5 mt-1">
                NOTE: TO BE FILLED IN BLOCK LETTER
              </div>
            </div>

            <div className="w-16 h-16 rounded-full border-2 border-black flex flex-col items-center justify-center font-black text-[9px] text-center p-1 leading-tight flex-shrink-0">
              <span className="font-serif font-black text-xs">JKA</span>
              <span className="text-[7px] font-sans">JAPAN KARATE</span>
            </div>
          </div>

          {/* Section 1: Candidate Particulars Table */}
          <table className="w-full border-collapse border-2 border-black text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100 w-1/4">希望段級 Test for</td>
                <td className="border border-black p-1.5 font-black text-xs text-red-700 w-1/4">{reg.target_belt} (____ Kyu)</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100 w-1/5">会員番号 Membership</td>
                <td className="border border-black p-1.5 font-mono font-bold">{reg.admission_no || reg.registration_no || 'BAMA-2026'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">氏名 Name</td>
                <td className="border border-black p-1.5 font-bold uppercase">{reg.student_name}</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Age & Gender</td>
                <td className="border border-black p-1.5">
                  ({reg.age || 10} Years old / {reg.gender === 'Female' ? '☐ Male ☑ Female' : '☑ Male ☐ Female'})
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">国籍 Nationality</td>
                <td className="border border-black p-1.5 font-bold">INDIAN</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">所属団体名 Club name</td>
                <td className="border border-black p-1.5 font-bold">{reg.branch_name || 'Pulikkal Main Dojo'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">現有段級位 Present rank</td>
                <td className="border border-black p-1.5 font-bold">{reg.current_belt}</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">取得年月日 Date of issue</td>
                <td className="border border-black p-1.5">Year ____ Month ____ Day ____</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">修業年数 Term of training</td>
                <td className="border border-black p-1.5">{reg.training_period_years || '1 Year 0 Months'}</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Contact / WhatsApp</td>
                <td className="border border-black p-1.5 font-bold">{reg.phone}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Address of Applicant</td>
                <td colSpan={3} className="border border-black p-1.5">{reg.address}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Name of School</td>
                <td className="border border-black p-1.5">{reg.school_or_employer || 'N/A'}</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Class / Occupation</td>
                <td className="border border-black p-1.5">{reg.class_or_occupation || 'Student'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Signature of Applicant</td>
                <td colSpan={3} className="border border-black p-1.5 text-right font-mono text-[9px] pt-4">
                  ___________________________________________
                </td>
              </tr>
            </tbody>
          </table>

          {/* Section 2: Technical Assessment Scoring Grid */}
          <div className="border-2 border-black p-2 space-y-1">
            <div className="bg-black text-white font-black text-center text-[10px] uppercase tracking-widest py-0.5">
              EXAMINER TECHNICAL GRADING SCORES (EXAMINER USE ONLY)
            </div>
            <table className="w-full border-collapse border border-black text-center text-[9px]">
              <thead>
                <tr className="bg-gray-200 font-bold">
                  <th className="border border-black p-1">基本 Kihon</th>
                  <th className="border border-black p-1">型 Kata</th>
                  <th className="border border-black p-1">組手 Kumite</th>
                  <th className="border border-black p-1">応用技 Adaptation</th>
                  <th className="border border-black p-1">決定 Decision</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 text-left space-y-1">
                    <div>手技 Hands: <span className="font-bold text-xs">{reg.kihon_score || '___'} / 10</span></div>
                    <div>足技 Legs: <span className="font-bold text-xs">___ / 10</span></div>
                  </td>
                  <td className="border border-black p-1 text-left space-y-1">
                    <div>自由型 Free: <span className="font-bold text-xs">{reg.kata_score || '___'} / 10</span></div>
                    <div>基本型 Imposed: <span className="font-bold text-xs">___ / 10</span></div>
                  </td>
                  <td className="border border-black p-1 text-left space-y-1">
                    <div>攻撃 Offence: <span className="font-bold text-xs">{reg.kumite_score || '___'} / 10</span></div>
                    <div>守備 Defence: <span className="font-bold text-xs">___ / 10</span></div>
                  </td>
                  <td className="border border-black p-1 align-middle font-bold text-sm">
                    {reg.adaptation_score || '___'} / 10
                  </td>
                  <td className="border border-black p-1 text-left space-y-1 text-[9px] font-bold">
                    <div>{reg.exam_status === 'Passed' ? '☑ 合格 Pass' : '☐ 合格 Pass'}</div>
                    <div>☐ 不合格 Fail</div>
                    <div>☐ 保留 Defer</div>
                    <div>☐ 再審査 Re-take</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Official Use Only Footer */}
          <table className="w-full border-collapse border-2 border-black text-[9px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100 w-1/4">登録番号 Number</td>
                <td colSpan={3} className="border border-black p-1 font-mono italic text-gray-600">for Official use only</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">審査日 Date of exam</td>
                <td className="border border-black p-1 font-bold">Year 2026 Month ____ Day ____</td>
                <td className="border border-black p-1 font-bold bg-gray-100">審査場所 Place of exam</td>
                <td className="border border-black p-1 font-bold">{reg.branch_name || 'Pulikkal Main Dojo'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">主催事業体 Host organization</td>
                <td colSpan={3} className="border border-black p-1 font-bold uppercase">BRAVE ACADEMY OF MARTIAL ARTS (B.A.M.A.)</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">審査長 Chief examiner</td>
                <td colSpan={3} className="border border-black p-1 font-bold">Sensei Abdul Rahman (5th Dan)</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">Remarks / Fee Status</td>
                <td colSpan={3} className="border border-black p-1 font-mono">
                  Applied Fee: ₹{reg.applied_fee || reg.exam_fee} | Payment: {reg.payment_mode} ({reg.payment_status})
                </td>
              </tr>
              <tr className="h-10">
                <td className="border border-black p-1 font-bold align-bottom">Signature of Examiner</td>
                <td className="border border-black p-1 text-right align-bottom font-mono text-[8px]">___________________________</td>
                <td className="border border-black p-1 font-bold align-bottom">Signature of Instructor</td>
                <td className="border border-black p-1 text-right align-bottom font-mono text-[8px]">___________________________</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* CATEGORY B: JKK BROWN KYU REGISTRATION FORM (BROWN-3 TO BROWN-1 - 1:1 PAPER FORM MATCH) */}
      {isCategoryB && (
        <div className="space-y-3 font-sans text-black max-w-[210mm] mx-auto bg-white p-2">
          {/* Header & Logo */}
          <div className="text-center border-2 border-black p-3 space-y-1 relative">
            <div className="w-10 h-10 rounded-full border-2 border-black mx-auto flex items-center justify-center font-bold text-xs bg-black text-white">
              ●
            </div>
            <h1 className="text-lg font-black uppercase tracking-tight text-black">
              Japan Karate Association of India - Kerala
            </h1>
            <p className="text-[10px] font-bold text-gray-800">Mob. : +91 95440 85442</p>
            <div className="bg-black text-white py-1 px-4 text-xs font-black uppercase tracking-wider inline-block">
              APPLICATION FOR "KYU" REGISTRATION
            </div>
            <p className="text-[9px] font-medium text-gray-800 leading-tight px-4 pt-1">
              I would like to request that you list my rank in the kyuholder's register of your association. I Declare that I will perform no acts which might harm the honour of kyuholder.
            </p>
          </div>

          <div className="border border-black text-center bg-gray-100 font-bold py-0.5 text-[9px] uppercase tracking-widest">
            PLEASE FILL IN BLOCK LETTERS ONLY
          </div>

          {/* Candidate Particulars Table 1 */}
          <table className="w-full border-collapse border-2 border-black text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100 w-1/4">Japan Karate Association of India - Kerala</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100 w-1/8">Branch</td>
                <td className="border border-black p-1.5 font-bold w-1/4">{reg.branch_name || 'Pulikkal Dojo'}</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100 w-1/8">Member No</td>
                <td colSpan={3} className="border border-black p-1.5 font-mono font-bold">{reg.admission_no || reg.registration_no || 'BAMA-2026'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Name</td>
                <td colSpan={6} className="border border-black p-1.5 font-bold uppercase text-xs">{reg.student_name}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Date of Birth</td>
                <td colSpan={2} className="border border-black p-1.5 font-bold">{reg.dob || 'N/A'} (Age: {reg.age || 10})</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Height cms.</td>
                <td className="border border-black p-1.5 font-bold">{reg.height_cm || 150}</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Weight Kgs.</td>
                <td className="border border-black p-1.5 font-bold">{reg.weight_kg || 40}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Address</td>
                <td colSpan={4} className="border border-black p-1.5">{reg.address}</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Tel. :</td>
                <td className="border border-black p-1.5 font-mono font-bold">{reg.phone}</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Instructor Reference</td>
                <td className="border border-black p-1.5 font-bold bg-gray-100">Name / Address</td>
                <td colSpan={5} className="border border-black p-1.5 font-bold">
                  {reg.instructor_reference_name || 'Sensei Abdul Rahman'} ({reg.instructor_reference_address || 'Pulikkal, Malappuram'})
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kyu Date of Conferral Table */}
          <table className="w-full border-collapse border-2 border-black text-center text-[9px]">
            <thead>
              <tr className="bg-gray-200 font-bold">
                <th className="border border-black p-1">Kyu</th>
                <th className="border border-black p-1">Date of Conferral</th>
                <th className="border border-black p-1">Kyu</th>
                <th className="border border-black p-1">Date of Conferral</th>
                <th className="border border-black p-1">Kyu</th>
                <th className="border border-black p-1">Date of Conferral</th>
                <th className="border border-black p-1">Kyu</th>
                <th className="border border-black p-1">Date of Conferral</th>
                <th className="border border-black p-1">Kyu</th>
                <th className="border border-black p-1">Date of Conferral</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 font-bold">10</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_10_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">8</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_8_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">6</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_6_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">4</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_4_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">2</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_2_date || '___/___/___'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold">9</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_9_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">7</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_7_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">5</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_5_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">3</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_3_date || '___/___/___'}</td>
                <td className="border border-black p-1 font-bold">1</td>
                <td className="border border-black p-1 font-mono text-[8px]">{reg.kyu_1_date || '___/___/___'}</td>
              </tr>
            </tbody>
          </table>

          {/* Technical Assessment Grid */}
          <table className="w-full border-collapse border-2 border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-200 font-bold">
                <th className="border border-black p-1 w-1/4">Presented Kyu</th>
                <th className="border border-black p-1 w-1/6">KIHON</th>
                <th className="border border-black p-1 w-1/6">KATA</th>
                <th className="border border-black p-1 w-1/6">KUMITE</th>
                <th className="border border-black p-1 w-1/6">Kyu Tested For</th>
                <th className="border border-black p-1 w-1/6">Examiner's Sign.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold text-left align-top">
                  <div>Presented: <strong className="text-xs">{reg.current_belt}</strong></div>
                  <div className="pt-2 text-[9px]">Period of Practice: <strong>{reg.training_period_years || '2 Years'}</strong></div>
                  <div className="pt-1 text-[9px]">Synthesis: <strong>Satisfactory</strong></div>
                </td>
                <td className="border border-black p-2 font-mono font-bold text-base align-middle">{reg.kihon_score || '___'}</td>
                <td className="border border-black p-2 font-mono font-bold text-base align-middle">{reg.kata_score || '___'}</td>
                <td className="border border-black p-2 font-mono font-bold text-base align-middle">{reg.kumite_score || '___'}</td>
                <td className="border border-black p-2 font-black text-red-700 text-sm align-middle">{reg.target_belt}</td>
                <td className="border border-black p-2 text-left text-[9px] space-y-1 align-top">
                  <div className="font-bold border-b border-black pb-0.5">RESULT</div>
                  <div>{reg.exam_status === 'Passed' ? '☑ Pass' : '☐ Pass'}</div>
                  <div>☐ Probation</div>
                  <div>☐ Fail</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bottom Authorization Slip */}
          <div className="border-t-2 border-dashed border-black pt-2 space-y-1">
            <table className="w-full border-collapse border-2 border-black text-[9px]">
              <tbody>
                <tr>
                  <td className="border border-black p-1.5 font-bold bg-gray-100 w-1/4">Rank Being Tested for:</td>
                  <td colSpan={2} className="border border-black p-1.5 font-bold uppercase">
                    AUTHORIZATION TO TAKE EXAMINATION<br />
                    Name: <strong className="text-xs uppercase">{reg.student_name}</strong>
                  </td>
                  <td className="border border-black p-1.5 font-bold bg-gray-100">Refund</td>
                  <td className="border border-black p-1.5 font-bold bg-gray-100">Payment Mode</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 font-bold text-xs text-red-700">{reg.target_belt}</td>
                  <td className="border border-black p-1.5 font-bold bg-gray-100">Branch No.</td>
                  <td className="border border-black p-1.5 font-bold">{reg.branch_name || 'Pulikkal'}</td>
                  <td className="border border-black p-1.5 font-bold bg-gray-100">Date of Exam</td>
                  <td className="border border-black p-1.5 font-mono font-bold">{reg.payment_mode || 'UPI / GPay'}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[8px] font-medium text-gray-700 text-center italic">
              Sign this slip and hand it in within three weeks to receive "Kyu" certificate or in case of failure to receive refund of registration fee.
            </p>
          </div>
        </div>
      )}

      {/* CATEGORY C: JAPAN DIRECT BLACK BELT & DAN EXAMINATION FORM (1:1 PAPER FORM MATCH media_1787681616013.png) */}
      {isCategoryC && (
        <div className="space-y-3 font-serif text-black max-w-[210mm] mx-auto bg-white p-2 text-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-2">
            <div>
              <span className="text-[10px] block">社団法人 日本空手協会</span>
              <span className="font-bold text-xs uppercase tracking-wider">JAPAN KARATE ASSOCIATION</span>
              <h1 className="text-xl font-black tracking-widest mt-1">段位審査用紙</h1>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">EXAMINER'S RECORD</h2>
            </div>
            <div className="text-right text-[9px] font-mono space-y-1">
              <div>提出 Date: Year 2026 Month ___ Day ___</div>
              <div>審査日 Date of Exam: Year 2026 Month ___ Day ___</div>
            </div>
          </div>

          {/* Section 1: Candidate Profile Table */}
          <table className="w-full border-collapse border-2 border-black text-[9px]">
            <tbody>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100 w-24">氏 名 Name</td>
                <td colSpan={2} className="border border-black p-1 font-bold text-sm uppercase">{reg.student_name}</td>
                <td className="border border-black p-1 font-bold bg-gray-100 w-12 text-center">Sex</td>
                <td className="border border-black p-1 font-bold text-center w-20">{reg.gender === 'Female' ? 'Female 女' : 'Male 男'}</td>
                <td className="border border-black p-1 font-bold bg-gray-100 w-16">Date of Birth</td>
                <td className="border border-black p-1 font-bold">{reg.dob || 'N/A'} (Age: {reg.age})</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">Karate Organization</td>
                <td className="border border-black p-1 font-bold text-xs">{reg.organization || reg.jka_organization || 'JKA INDIA'}</td>
                <td className="border border-black p-1 font-bold bg-gray-100">JKA Member Reg No</td>
                <td colSpan={2} className="border border-black p-1 font-mono font-bold">{reg.jka_member_no || reg.admission_no || 'Pending'}</td>
                <td className="border border-black p-1 font-bold bg-gray-100">Height / Weight</td>
                <td className="border border-black p-1 font-bold">{reg.height_cm || 165} cm / {reg.weight_kg || 55} kg</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">Nationality</td>
                <td colSpan={6} className="border border-black p-1 font-bold">{reg.nationality || reg.jka_nationality || 'INDIAN'}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">Present Address</td>
                <td colSpan={4} className="border border-black p-1">{reg.address}</td>
                <td className="border border-black p-1 font-bold bg-gray-100">Tel( )</td>
                <td className="border border-black p-1 font-mono font-bold">{reg.phone}</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">Place of Employment / School</td>
                <td colSpan={2} className="border border-black p-1">{reg.school_or_employer || 'BAMA Academy'}</td>
                <td colSpan={2} className="border border-black p-1 font-bold bg-gray-100">Address of Employer</td>
                <td colSpan={2} className="border border-black p-1">Pulikkal, Malappuram</td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold bg-gray-100">Reference</td>
                <td className="border border-black p-1 font-bold">Name: {reg.instructor_reference_name || 'Sensei Abdul Rahman'}</td>
                <td colSpan={2} className="border border-black p-1 font-bold bg-gray-100">Relationship</td>
                <td className="border border-black p-1 font-bold text-center">TEACHER</td>
                <td className="border border-black p-1 font-bold bg-gray-100">Tel( )</td>
                <td className="border border-black p-1 font-mono font-bold">{reg.instructor_reference_phone || '+91 95440 85442'}</td>
              </tr>
            </tbody>
          </table>

          {/* Section 2: Technical Assessment Scoring Matrix (採点表) */}
          <div className="border-2 border-black p-2 space-y-1">
            <div className="text-center font-black text-sm uppercase tracking-widest border-b border-black pb-1">
              採 点 表 (EXAMINER SCORING RECORD)
            </div>

            <div className="grid grid-cols-12 gap-2 text-[9px] pt-1">
              {/* Left Column Particulars */}
              <div className="col-span-5 border border-black p-2 space-y-1 bg-gray-50">
                <div className="flex justify-between border-b border-gray-300 pb-0.5">
                  <span className="font-bold">Rank Being Tested for:</span>
                  <strong className="text-xs text-red-700 font-black">{reg.target_belt}</strong>
                </div>
                <div className="flex justify-between border-b border-gray-300 pb-0.5">
                  <span>Present Rank:</span>
                  <strong className="font-bold">{reg.current_belt}</strong>
                </div>
                <div className="flex justify-between border-b border-gray-300 pb-0.5">
                  <span>Date of Conferral:</span>
                  <span>Year ___ Month ___ Day ___</span>
                </div>
                <div className="flex justify-between border-b border-gray-300 pb-0.5">
                  <span>Dan Kyu Registration No:</span>
                  <span className="font-mono">{reg.registration_no || 'BAMA-DAN'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-300 pb-0.5">
                  <span>Karate Training Period:</span>
                  <strong>{reg.training_period_years || '3 Years'}</strong>
                </div>
                <div className="pt-1 text-[8px] space-y-0.5">
                  <div className="font-bold">Present Qualifications:</div>
                  <div>Instructor: ___ Kyu | Examiner: ___ Kyu | Judge: ___ Kyu</div>
                </div>
              </div>

              {/* Middle & Right Technical Scoring Box */}
              <div className="col-span-7 border border-black p-1 space-y-2">
                <table className="w-full border-collapse border border-black text-center text-[9px]">
                  <thead>
                    <tr className="bg-gray-200 font-bold">
                      <th className="border border-black p-1">基本 Kihon</th>
                      <th className="border border-black p-1">形 Kata</th>
                      <th className="border border-black p-1">組手 Kumite</th>
                      <th className="border border-black p-1">応用技/研究 Adaptation</th>
                      <th className="border border-black p-1">綜合 Synthesis</th>
                      <th className="border border-black p-1">決定 Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-10">
                      <td className="border border-black p-1 font-mono font-bold text-base">{reg.kihon_score || '___'}</td>
                      <td className="border border-black p-1 font-mono font-bold text-base">{reg.kata_score || '___'}</td>
                      <td className="border border-black p-1 font-mono font-bold text-base">{reg.kumite_score || '___'}</td>
                      <td className="border border-black p-1 font-bold">___ / 10</td>
                      <td className="border border-black p-1 font-bold">Pass</td>
                      <td className="border border-black p-1 text-left text-[8px] font-bold space-y-0.5">
                        <div>{reg.exam_status === 'Passed' ? '☑ 合格 Pass' : '☐ 合格 Pass'}</div>
                        <div>☐ 不合格 Fail</div>
                        <div>☐ 再審査 Retake</div>
                        <div>☐ 保留 Defer</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="border border-black p-1 text-[8px] flex justify-between">
                  <span>Examiner Sign: ___________________________</span>
                  <span>Chief Examiner: Sensei Abdul Rahman (5th Dan)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bottom Authorization Voucher (受験票) */}
          <div className="border-t-2 border-dashed border-black pt-2 space-y-1">
            <div className="flex justify-between items-center bg-gray-100 p-1 border border-black font-bold text-[10px]">
              <span>受験票 AUTHORIZATION TO TAKE EXAMINATION</span>
              <span>社団法人 日本空手協会</span>
            </div>

            <table className="w-full border-collapse border border-black text-[9px]">
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-bold bg-gray-50 w-1/4">Rank Being Tested for</td>
                  <td className="border border-black p-1 font-bold text-xs text-red-700 w-1/4">{reg.target_belt}</td>
                  <td className="border border-black p-1 font-bold bg-gray-50 w-1/6">Candidate Name</td>
                  <td className="border border-black p-1 font-bold uppercase">{reg.student_name}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold bg-gray-50">Karate Organization</td>
                  <td className="border border-black p-1 font-bold">{reg.organization || 'JKA INDIA'}</td>
                  <td className="border border-black p-1 font-bold bg-gray-50">Date of Exam</td>
                  <td className="border border-black p-1 font-bold">Year 2026 Month ___ Day ___</td>
                </tr>
              </tbody>
            </table>

            <p className="text-[8px] text-gray-700 text-center font-medium pt-1">
              Sign this slip and hand it in within three months to receive "dan" certificate or, in case of failure, to receive refund of registration fee.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
