/**
 * Contact filter — scans outbound messages for:
 *   1. Phone numbers (Nigerian + international, including obfuscated forms like "zero eight zero")
 *   2. Email addresses
 *   3. External URLs (anything not on our domain whitelist)
 *   4. Suspicious phrases that hint at moving the deal off-platform
 *
 * Returns: { clean, flagged, reasons[], blocked }
 *   - blocked=true means the message was so egregious we replaced its body
 *   - flagged=true with blocked=false means we redacted parts but let it through
 */

// Words for digits — used to spot "zero eight zero one two three four five six seven eight"
const NUMBER_WORDS = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};

const PHONE_REGEX = /(\+?234|0)\s*[\d\-\s().]{9,15}/g;
const GENERIC_DIGIT_RUN = /(?:\d[\s\-.]*){10,}/g; // Any 10+ digits with separators
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>]+|\b[a-z0-9-]+\.(?:com|ng|org|net|io|co|app|me)\b[^\s]*)/gi;

const SUSPICIOUS_PHRASES = [
  /\bwhats?app\b/i,
  /\btelegram\b/i,
  /\bsignal app\b/i,
  /\bdm me\b/i,
  /\bcall me\b/i,
  /\btext me\b/i,
  /\bcontact me\b/i,
  /\boutside\s+(the\s+)?(app|platform|site)\b/i,
  /\bpay\s+(direct|directly|cash|outside)\b/i,
  /\bbank\s+transfer\b/i,
  /\baccount\s+(number|details)\b/i,
  /\bgtbank|gtb|access bank|first bank|zenith|opay|kuda|moniepoint|palmpay\b/i,
  /\bcheaper\s+if\s+you\s+pay/i,
];

// Harassment / threat / abuse patterns — moderate but don't auto-block
// (the spec calls for AI moderation; until an LLM is wired, these heuristics catch the worst).
const ABUSE_PATTERNS = [
  /\b(idiot|stupid|fool|nonsense|rubbish)\b/i,
  /\b(kill|hurt|attack|beat)\s+(you|u|him|her|them)\b/i,
  /\bf+u+c+k+\b/i, /\bs+h+i+t+\b/i, /\bb+i+t+c+h+\b/i,
  /\b(scam|fraud|419)\b/i, // can also be legitimate accusation; flag for admin review
];

const ALLOWED_DOMAINS = ['tenanto.ng', 'tenanto.com'];

function reconstructWordedPhone(text) {
  // Catches "zero eight zero one two three four..." — collapses to digits and tests length
  const tokens = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  let digits = '';
  for (const t of tokens) {
    if (NUMBER_WORDS[t] !== undefined) digits += NUMBER_WORDS[t];
    else digits += ' ';
  }
  // Look for any run of 10+ digits in the reconstructed string
  return /\d{10,}/.test(digits.replace(/\s/g, ''));
}

function urlIsAllowed(url) {
  return ALLOWED_DOMAINS.some((d) => url.toLowerCase().includes(d));
}

function filterMessage(text) {
  const reasons = new Set();
  let working = text;

  // 1. Phone numbers
  if (PHONE_REGEX.test(text) || GENERIC_DIGIT_RUN.test(text)) {
    reasons.add('phone');
    working = working.replace(PHONE_REGEX, '[blocked: phone]')
                     .replace(GENERIC_DIGIT_RUN, '[blocked: phone]');
  }
  if (reconstructWordedPhone(text)) {
    reasons.add('phone');
    // Don't try to redact word-form — flag the whole thing
  }

  // 2. Emails
  if (EMAIL_REGEX.test(text)) {
    reasons.add('email');
    working = working.replace(EMAIL_REGEX, '[blocked: email]');
  }

  // 3. External URLs
  const urlMatches = text.match(URL_REGEX) || [];
  for (const u of urlMatches) {
    if (!urlIsAllowed(u)) {
      reasons.add('external_link');
      working = working.replace(u, '[blocked: link]');
    }
  }

  // 4. Suspicious phrases
  for (const re of SUSPICIOUS_PHRASES) {
    if (re.test(text)) {
      reasons.add('suspicious_phrase');
      break;
    }
  }

  // 5. Abuse / harassment — flag but don't auto-block (false positives common)
  for (const re of ABUSE_PATTERNS) {
    if (re.test(text)) {
      reasons.add('abuse');
      break;
    }
  }

  const flagged = reasons.size > 0;
  // Block outright if it looks like a deliberate bypass attempt
  // (phone OR email OR (suspicious phrase + external link))
  const blocked =
    reasons.has('phone') ||
    reasons.has('email') ||
    (reasons.has('suspicious_phrase') && reasons.has('external_link'));

  const clean = blocked
    ? '⚠️ This message was blocked because it appeared to share contact info or push the conversation off-platform. Payments outside the platform are not protected.'
    : working;

  return { clean, flagged, reasons: [...reasons], blocked };
}

module.exports = { filterMessage, llmModerate };

/**
 * Async LLM-backed moderation hook. Plug in OpenAI moderation, Anthropic
 * moderation, or your own classifier. Default: same as filterMessage but
 * asynchronous, so the chat handler can `await` it without changing shape.
 *
 *   const result = await llmModerate(text);
 *   // { flagged, blocked, reasons[], categoryScores?: {...} }
 */
async function llmModerate(text) {
  // If you set MODERATION_PROVIDER=openai with OPENAI_API_KEY, swap in their
  // /v1/moderations endpoint here. We default to the regex filter so the app
  // works offline and degrades gracefully.
  const provider = process.env.MODERATION_PROVIDER;
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      const axios = require('axios');
      const { data } = await axios.post(
        'https://api.openai.com/v1/moderations',
        { input: text, model: 'omni-moderation-latest' },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 5000 }
      );
      const r = data.results?.[0] || {};
      return {
        flagged: !!r.flagged,
        blocked: !!r.flagged,
        reasons: Object.keys(r.categories || {}).filter((k) => r.categories[k]),
        categoryScores: r.category_scores,
      };
    } catch (e) {
      console.warn('[moderation] LLM call failed, falling back to regex:', e.message);
    }
  }
  return filterMessage(text);
}
