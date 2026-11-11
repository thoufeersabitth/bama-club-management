import datetime
import re

MIN_VALID_DOB_YEAR = 1940
MAX_VALID_AGE = 90
MIN_VALID_AGE = 2

PLACEHOLDER_EXACT_VALUES = {
    'na', 'n/a', 'none', 'null', 'nil', 'unknown', 'tbd', 'todo', 'pending',
    'test', 'testing', 'dummy', 'sample', 'asdf', 'sdfg', 'dfgh', 'fghj',
    'ghjk', 'qwerty', 'qwert', 'zxcv', 'zxcvb', 'xxx', 'xxxx',
    'full address', 'parent/guardian', 'paren', 'parent', 'father', 'mother',
    'guardian', 'pulikkal, malappuram, kerala',
}

ACADEMY_FALLBACK_PHONES = {'9544085442'}

DUMMY_PHONE_DIGITS = {'1234567890', '0123456789', '9876543210'}

KEYBOARD_SEQUENCES = (
    'qwertyuiop', 'poiuytrewq',
    'asdfghjkl', 'lkjhgfdsa',
    'zxcvbnm', 'mnbvcxz',
    'qazwsxedc', 'wsxedcrfv',
    '1234567890', '0987654321',
)

VOWELS_STRICT = set('aeiou')
VOWELS_WITH_Y = set('aeiouy')
TRUE_CONSONANTS = set('bcdfghjklmnpqrstvwxz')


def _contains_keyboard_run(token: str, min_len: int = 4) -> bool:
    if len(token) < min_len:
        return False
    for seq in KEYBOARD_SEQUENCES:
        for i in range(len(seq) - min_len + 1):
            if seq[i:i + min_len] in token:
                return True
    return False


def _has_excessive_consonants(token: str) -> bool:
    run = 0
    for ch in token:
        if ch in TRUE_CONSONANTS:
            run += 1
            if run >= 5:
                return True
        else:
            run = 0
    return False


def _is_gibberish_token(raw_token: str) -> bool:
    token = raw_token.lower()
    if len(token) < 4:
        return False
    if _contains_keyboard_run(token):
        return True
    if _has_excessive_consonants(token):
        return True
    if len(set(token)) == 1:
        return True
    # 4 leading true consonants (e.g. 'frdduyjh...') when not common loans
    if len(token) >= 6 and all(ch in TRUE_CONSONANTS for ch in token[:4]):
        if not token.startswith(('sthr', 'schl', 'schm', 'schn', 'schw')):
            return True
    if not any(ch in VOWELS_WITH_Y for ch in token):
        return True
    y_count = token.count('y')
    if y_count >= 3 and (y_count / len(token) >= 0.25 or 'yy' in token):
        return True
    if len(token) >= 7:
        vowel_count = sum(1 for ch in token if ch in VOWELS_WITH_Y)
        if vowel_count / len(token) < 0.15:
            return True
    return False


def is_placeholder_text(value) -> bool:
    """
    Returns True if a non-empty text value (such as address or guardian name)
    appears to be dummy placeholder text or random keyboard mash.
    Empty/None values return False (callers check emptiness explicitly).
    """
    if value is None:
        return False
    text = str(value).strip()
    if not text:
        return False

    lower = text.lower()
    if lower in PLACEHOLDER_EXACT_VALUES:
        return True

    # Pure punctuation / symbols
    alnum = re.sub(r'[^a-zA-Z0-9]', '', lower)
    if not alnum:
        return True

    # Repeated single character across the whole string (e.g. 'xxxxx', '.....')
    if len(alnum) >= 2 and len(set(alnum)) == 1:
        return True

    alpha_tokens = re.findall(r'[a-zA-Z]+', lower)
    if not alpha_tokens:
        # Pure digits of length < 4 (not a pin code / house no context) in a name/address is suspicious,
        # though house numbers might be '123' in weird imports; only flag single-char or >15 digits.
        return False

    long_tokens = [tok for tok in alpha_tokens if len(tok) >= 4]
    if not long_tokens:
        # Check short 2-3 char tokens only against explicit placeholders already checked above.
        return False

    # Flag if ANY token contains a keyboard mash run (asdf, sdfg, hjkl, etc.)
    if any(_contains_keyboard_run(tok) for tok in long_tokens):
        return True

    # Flag if ALL >=4-char alphabetic tokens are gibberish (so multi-word addresses
    # containing an acronym like "NEAR GHSS PULIKKAL" remain accepted).
    return all(_is_gibberish_token(tok) for tok in long_tokens)


def normalize_phone_digits(value) -> str:
    """
    Extracts digits from a phone/WhatsApp string and strips Indian country code (91)
    or trunk prefix (0) when normalizing 11/12-digit domestic numbers to 10 digits.
    """
    if not value:
        return ''
    digits = re.sub(r'\D', '', str(value))
    if len(digits) == 12 and digits.startswith('91'):
        return digits[2:]
    if len(digits) == 11 and digits.startswith('0'):
        return digits[1:]
    return digits


def is_invalid_or_academy_phone(value) -> str | None:
    """
    Validates a non-empty student phone/WhatsApp number.
    Returns an error message string if invalid/dummy/academy fallback, or None if valid.
    Empty values return None (callers decide whether blank is allowed).
    """
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None

    all_digits = re.sub(r'\D', '', raw)
    if not all_digits:
        return 'Please enter a valid mobile number.'

    norm = normalize_phone_digits(raw)
    if norm in ACADEMY_FALLBACK_PHONES or all_digits in ACADEMY_FALLBACK_PHONES:
        return "Academy contact number (+91 9544085442) cannot be used as a student's parent number."

    if norm in DUMMY_PHONE_DIGITS or len(set(norm)) == 1:
        return 'Dummy or repeated phone numbers are not allowed.'

    # International +numbers (non-India) are typically 10-15 digits
    is_intl_non_india = raw.startswith('+') and not all_digits.startswith('91')
    if is_intl_non_india:
        if len(all_digits) < 10 or len(all_digits) > 15:
            return 'Please enter a valid international phone number (10 to 15 digits).'
        return None

    if len(norm) != 10:
        return 'Please enter a valid 10-digit mobile number.'

    return None


def parse_valid_dob(value, today=None) -> datetime.date | None:
    """
    Parses a DOB string or date object into a validated datetime.date.
    Accepts YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, YYYY/MM/DD.
    Returns None for blank/None values.
    Raises ValueError for malformed dates or out-of-range years (<1940 or future).
    """
    if value is None or value == '':
        return None

    if isinstance(value, datetime.datetime):
        parsed = value.date()
    elif isinstance(value, datetime.date):
        parsed = value
    else:
        raw = str(value).strip()
        if not raw:
            return None
        parsed = None
        for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d'):
            try:
                parsed = datetime.datetime.strptime(raw, fmt).date()
                break
            except ValueError:
                continue
        if parsed is None:
            raise ValueError(
                'Invalid Date of Birth format. Use YYYY-MM-DD (or DD/MM/YYYY).'
            )

    ref_today = today or datetime.date.today()
    if parsed.year < MIN_VALID_DOB_YEAR or parsed > ref_today:
        raise ValueError(
            f'Date of Birth year must be between {MIN_VALID_DOB_YEAR} and {ref_today.isoformat()}.'
        )
    return parsed


def calculate_age_from_dob(dob_val, today=None) -> int | None:
    """
    Calculates exact age in completed years from a valid DOB, or None if missing/invalid.
    """
    try:
        dob_date = parse_valid_dob(dob_val, today=today)
    except ValueError:
        return None
    if dob_date is None:
        return None
    ref_today = today or datetime.date.today()
    age = ref_today.year - dob_date.year - (
        (ref_today.month, ref_today.day) < (dob_date.month, dob_date.day)
    )
    if age < 0 or age > 120:
        return None
    return age
