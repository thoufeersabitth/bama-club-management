const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toNumber = (value, fallback = 0) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeMonthsList = (student) => {
  const raw = Array.isArray(student?.paid_months)
    ? student.paid_months
    : Array.isArray(student?.paidMonths)
      ? student.paidMonths
      : [];
  return raw.map((item) => String(item || '').trim()).filter(Boolean);
};

const parseJoiningDate = (student, fallbackDate) => {
  const raw = student?.joiningDate || student?.joining_date || student?.created_at;
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return { year: parsed.getFullYear(), monthIndex: parsed.getMonth(), iso: parsed.toISOString().split('T')[0] };
    }
  }
  return { year: fallbackDate.getFullYear(), monthIndex: fallbackDate.getMonth(), iso: null };
};

const matchesPaidMonthLabel = (paidList, monthName, year) => {
  const fullLabel = `${monthName} ${year}`.toLowerCase();
  const shortMonth = monthName.toLowerCase();
  return paidList.some((entry) => {
    const clean = entry.toLowerCase();
    return clean === fullLabel || clean.includes(fullLabel) || clean === shortMonth;
  });
};

/**
 * Resolves the billing plan, fee rates, and admission fee status for a cadet.
 */
export function resolveStudentFeePlan(student = {}, globalFeeSettings = {}) {
  const freq = String(student?.fee_frequency || student?.feeFrequency || '').toUpperCase();
  const shiftLow = String(student?.shift || '').toLowerCase();
  const isQuarterly = (
    freq === 'QUARTERLY' ||
    freq === '3_MONTHS' ||
    freq === 'SCHOOL_BATCH' ||
    student?.billingPlan === 'SCHOOL_BATCH' ||
    student?.billing_plan === 'SCHOOL_BATCH' ||
    student?.feeCycleMonths === 3 ||
    shiftLow.includes('school')
  );

  const defaultMonthly = toNumber(globalFeeSettings?.defaultMonthlyFee, 500) || 500;
  const defaultSchool = toNumber(globalFeeSettings?.defaultSchoolBatchFee, 500) || 500;
  const rawCustomRate = toNumber(student?.fee_amount ?? student?.feeAmount, 0);
  const feeRate = rawCustomRate > 0 ? rawCustomRate : (isQuarterly ? defaultSchool : defaultMonthly);

  const admissionFee = Math.max(0, toNumber(student?.admission_fee ?? student?.admissionFee, 1000));
  const rawAdmPaid = toNumber(student?.admission_fee_paid_amount ?? student?.admissionFeePaidAmount, 0);
  const admFlagPaid = student?.admission_fee_paid === true || student?.admissionFeePaid === true;
  const isAdmissionWaived = admissionFee === 0;
  const admissionPaid = isAdmissionWaived
    ? 0
    : admFlagPaid
      ? Math.max(rawAdmPaid, admissionFee)
      : Math.min(admissionFee, Math.max(0, rawAdmPaid));
  const admissionPending = isAdmissionWaived || admFlagPaid
    ? 0
    : Math.max(0, admissionFee - admissionPaid);

  return {
    isQuarterly,
    planLabel: isQuarterly ? 'School Batch (3-Month Term Plan)' : 'Regular Dojo (Monthly Plan)',
    feeRate,
    admissionFee,
    admissionPaid,
    admissionPending,
    isAdmissionWaived,
  };
}

/**
 * Builds a complete, itemized tuition & admission fee ledger for a cadet.
 */
export function buildCadetFeeSummary(student = {}, globalFeeSettings = {}, referenceDate = new Date()) {
  const plan = resolveStudentFeePlan(student, globalFeeSettings);
  const paidMonthsList = normalizeMonthsList(student);
  const tuitionPaidTotal = Math.max(0, toNumber(student?.initial_paid_amount ?? student?.initialPaidAmount, 0));
  const explicitPending = Math.max(0, toNumber(student?.pending_amount ?? student?.pendingAmount, 0));
  const explicitStatusLow = String(student?.fee_status || student?.feeStatus || '').trim().toLowerCase();

  const curYear = referenceDate.getFullYear();
  const curMonthIdx = referenceDate.getMonth();
  const curGlobalIdx = curYear * 12 + curMonthIdx;

  const joining = parseJoiningDate(student, referenceDate);
  const joinGlobalIdx = joining.year * 12 + joining.monthIndex;

  if (plan.isQuarterly) {
    const terms = [];
    for (let t = 0; t < 4; t++) {
      const termMonths = [];
      const termStartGlobalIdx = joinGlobalIdx + (t * 3);
      for (let i = 0; i < 3; i++) {
        const gIdx = termStartGlobalIdx + i;
        const mIdx = gIdx % 12;
        const yr = Math.floor(gIdx / 12);
        termMonths.push(`${MONTH_NAMES[mIdx]} ${yr}`);
      }

      const startM = termMonths[0].split(' ')[0];
      const endM = termMonths[2].split(' ')[0];
      const yr1 = termMonths[0].split(' ')[1];
      const yr2 = termMonths[2].split(' ')[1];
      const yrLabel = yr1 === yr2 ? yr1 : `${yr1}–${yr2}`;

      const anyMonthInList = termMonths.some((m) => {
        const [mn, my] = m.split(' ');
        return matchesPaidMonthLabel(paidMonthsList, mn, Number(my));
      });
      const coveredByTotal = tuitionPaidTotal >= (t + 1) * plan.feeRate;
      const isPartialTerm = (
        anyMonthInList &&
        explicitStatusLow === 'partial' &&
        explicitPending > 0 &&
        tuitionPaidTotal < (t + 1) * plan.feeRate &&
        tuitionPaidTotal > t * plan.feeRate
      );
      const isPaid = (anyMonthInList && !isPartialTerm) || coveredByTotal;
      const isCurrentOrPast = termStartGlobalIdx <= curGlobalIdx;

      const paidForTerm = isPaid
        ? plan.feeRate
        : isPartialTerm
          ? Math.max(0, plan.feeRate - explicitPending)
          : 0;
      const dueForTerm = isPaid
        ? 0
        : isPartialTerm
          ? explicitPending
          : isCurrentOrPast
            ? plan.feeRate
            : 0;

      terms.push({
        id: `term-${t + 1}`,
        label: `Term ${t + 1}`,
        period: `${startM} – ${endM} ${yrLabel}`,
        months: termMonths,
        rate: plan.feeRate,
        paidAmount: paidForTerm,
        pendingAmount: dueForTerm,
        status: isPaid ? 'PAID' : isPartialTerm ? 'PARTIAL' : isCurrentOrPast ? 'DUE' : 'UPCOMING',
      });
    }

    const duePeriods = terms.filter((t) => t.status === 'DUE' || t.status === 'PARTIAL');
    const paidPeriods = terms.filter((t) => t.status === 'PAID');
    const upcomingPeriods = terms.filter((t) => t.status === 'UPCOMING');
    const tuitionPendingTotal = duePeriods.reduce((sum, t) => sum + t.pendingAmount, 0);
    const totalPaid = plan.admissionPaid + tuitionPaidTotal;
    const totalPending = plan.admissionPending + tuitionPendingTotal;

    return {
      ...plan,
      joiningDate: joining.iso,
      paidMonthsList,
      periods: terms,
      paidPeriods,
      duePeriods,
      upcomingPeriods,
      tuitionPaidTotal,
      tuitionPendingTotal,
      totalPaid,
      totalPending,
      overallStatus: totalPending === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING',
    };
  }

  // Regular Dojo Monthly Ledger (for the active calendar year)
  const displayYear = curYear;
  const lastPaidLabel = paidMonthsList.length > 0 ? paidMonthsList[paidMonthsList.length - 1].toLowerCase() : '';
  const hasPartialLatestMonth = (
    explicitStatusLow === 'partial' &&
    explicitPending > 0 &&
    explicitPending < plan.feeRate &&
    paidMonthsList.length > 0
  );

  const periods = MONTH_NAMES.map((mName, idx) => {
    const periodGlobalIdx = displayYear * 12 + idx;
    const isBeforeJoining = periodGlobalIdx < joinGlobalIdx;
    const label = `${mName} ${displayYear}`;
    const inPaidList = matchesPaidMonthLabel(paidMonthsList, mName, displayYear);
    const isThisPartialMonth = (
      hasPartialLatestMonth &&
      inPaidList &&
      (lastPaidLabel === label.toLowerCase() || lastPaidLabel.includes(mName.toLowerCase()))
    );
    const isPaid = !isBeforeJoining && inPaidList && !isThisPartialMonth;
    const isCurrentOrPast = periodGlobalIdx <= curGlobalIdx;

    let status = 'UPCOMING';
    let paidAmount = 0;
    let pendingAmount = 0;

    if (isBeforeJoining) {
      status = 'BEFORE_JOINING';
    } else if (isThisPartialMonth) {
      status = 'PARTIAL';
      pendingAmount = explicitPending;
      paidAmount = Math.max(0, plan.feeRate - explicitPending);
    } else if (isPaid) {
      status = 'PAID';
      paidAmount = plan.feeRate;
    } else if (isCurrentOrPast) {
      status = 'DUE';
      pendingAmount = plan.feeRate;
    } else {
      status = 'UPCOMING';
    }

    return {
      id: `${mName.toLowerCase()}-${displayYear}`,
      label,
      shortLabel: mName.slice(0, 3),
      rate: plan.feeRate,
      paidAmount,
      pendingAmount,
      status,
    };
  });

  const paidPeriods = periods.filter((p) => p.status === 'PAID');
  const duePeriods = periods.filter((p) => p.status === 'DUE' || p.status === 'PARTIAL');
  const upcomingPeriods = periods.filter((p) => p.status === 'UPCOMING');

  // If the student paid months from a prior year or has recorded initial payment while no monthly dues are open
  let tuitionPendingTotal = duePeriods.reduce((sum, p) => sum + p.pendingAmount, 0);
  if (duePeriods.length === 0 && explicitStatusLow !== 'paid' && explicitPending > 0 && paidPeriods.length === 0) {
    tuitionPendingTotal = explicitPending;
  }

  const totalPaid = plan.admissionPaid + tuitionPaidTotal;
  const totalPending = plan.admissionPending + tuitionPendingTotal;

  return {
    ...plan,
    displayYear,
    joiningDate: joining.iso,
    paidMonthsList,
    periods,
    paidPeriods,
    duePeriods,
    upcomingPeriods,
    tuitionPaidTotal,
    tuitionPendingTotal,
    totalPaid,
    totalPending,
    overallStatus: totalPending === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING',
  };
}
