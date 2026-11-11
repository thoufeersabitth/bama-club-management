export const MIN_VALID_DOB_YEAR = 1940;

const PLACEHOLDER_EXACT_VALUES = new Set([
  'na', 'n/a', 'none', 'null', 'nil', 'unknown', 'tbd', 'todo', 'pending',
  'test', 'testing', 'dummy', 'sample', 'asdf', 'sdfg', 'dfgh', 'fghj',
  'ghjk', 'qwerty', 'qwert', 'zxcv', 'zxcvb', 'xxx', 'xxxx',
  'full address', 'parent/guardian',
]);

const KEYBOARD_SEQUENCES = [
  'qwertyuiop', 'poiuytrewq',
  'asdfghjkl', 'lkjhgfdsa',
  'zxcvbnm', 'mnbvcxz',
  'qazwsxedc', 'wsxedcrfv',
  '1234567890', '0987654321',
];

const VOWELS_WITH_Y = new Set('aeiouy'.split(''));
const TRUE_CONSONANTS = new Set('bcdfghjklmnpqrstvwxz'.split(''));

export function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function containsKeyboardRun(token, minLen = 4) {
  if (token.length < minLen) return false;
  for (const seq of KEYBOARD_SEQUENCES) {
    for (let i = 0; i <= seq.length - minLen; i++) {
      if (token.includes(seq.slice(i, i + minLen))) return true;
    }
  }
  return false;
}

function hasExcessiveConsonants(token) {
  let run = 0;
  for (const ch of token) {
    if (TRUE_CONSONANTS.has(ch)) {
      run += 1;
      if (run >= 5) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

function isGibberishToken(rawToken) {
  const token = rawToken.toLowerCase();
  if (token.length < 4) return false;
  if (containsKeyboardRun(token)) return true;
  if (hasExcessiveConsonants(token)) return true;
  if (new Set(token).size === 1) return true;

  if (token.length >= 6 && [...token.slice(0, 4)].every((ch) => TRUE_CONSONANTS.has(ch))) {
    if (!['sthr', 'schl', 'schm', 'schn', 'schw'].some((p) => token.startsWith(p))) {
      return true;
    }
  }

  if (![...token].some((ch) => VOWELS_WITH_Y.has(ch))) return true;

  const yCount = [...token].filter((ch) => ch === 'y').length;
  if (yCount >= 3 && (yCount / token.length >= 0.25 || token.includes('yy'))) {
    return true;
  }

  if (token.length >= 7) {
    const vowelCount = [...token].filter((ch) => VOWELS_WITH_Y.has(ch)).length;
    if (vowelCount / token.length < 0.15) return true;
  }

  return false;
}

/**
 * Returns true if a non-empty text field looks like dummy text or keyboard mash.
 * Empty / null values return false so callers check missingness explicitly.
 */
export function isPlaceholderText(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (!text) return false;

  const lower = text.toLowerCase();
  if (PLACEHOLDER_EXACT_VALUES.has(lower)) return true;

  const alnum = lower.replace(/[^a-z0-9]/g, '');
  if (!alnum) return true;

  if (alnum.length >= 2 && new Set(alnum).size === 1) return true;

  const alphaTokens = lower.match(/[a-z]+/g) || [];
  if (alphaTokens.length === 0) return false;

  const longTokens = alphaTokens.filter((tok) => tok.length >= 4);
  if (longTokens.length === 0) return false;

  if (longTokens.some((tok) => containsKeyboardRun(tok))) return true;

  return longTokens.every((tok) => isGibberishToken(tok));
}

/**
 * Normalizes a DOB input ('YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD')
 * into 'YYYY-MM-DD' if it represents a real calendar date between 1940-01-01 and today.
 * Returns null if blank, invalid, out-of-range, or future.
 */
export function normalizeDobToISO(dobValue) {
  if (!dobValue) return null;
  const raw = String(dobValue).trim();
  if (!raw) return null;

  let year;
  let month;
  let day;

  let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    year = parseInt(m[1], 10);
    month = parseInt(m[2], 10);
    day = parseInt(m[3], 10);
  } else {
    m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (!m) return null;
    day = parseInt(m[1], 10);
    month = parseInt(m[2], 10);
    year = parseInt(m[3], 10);
  }

  if (year < MIN_VALID_DOB_YEAR || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Use Date(year, monthIndex, day) to avoid UTC timezone shift and verify calendar day exists
  const checkDate = new Date(year, month - 1, day);
  if (
    checkDate.getFullYear() !== year ||
    checkDate.getMonth() !== month - 1 ||
    checkDate.getDate() !== day
  ) {
    return null;
  }

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (iso > getTodayISO()) return null;

  return iso;
}

export function isValidStudentDOB(dobValue) {
  return normalizeDobToISO(dobValue) !== null;
}

/**
 * Calculates completed years of age from a valid DOB, or returns null when missing/invalid.
 */
export function calculateAgeFromDOB(dobString) {
  const iso = normalizeDobToISO(dobString);
  if (!iso) return null;

  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

export function needsProfileUpdate(student) {
  if (!student) {
    return { missingDob: false, missingAddress: false, missingGuardian: false, needsAttention: false };
  }
  const missingDob = !isValidStudentDOB(student.dob);
  const addr = String(student.address || '').trim();
  const missingAddress = !addr || isPlaceholderText(addr);
  const guard = String(student.guardianName || student.guardian_name || '').trim();
  const missingGuardian = !guard || isPlaceholderText(guard);
  return {
    missingDob,
    missingAddress,
    missingGuardian,
    needsAttention: missingDob || missingAddress,
  };
}
