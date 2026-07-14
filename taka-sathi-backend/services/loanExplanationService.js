const gemmaService = require('./gemmaService');

/**
 * Takes the deterministic output of loanEligibilityEngine.matchLoanProducts
 * and asks Gemma 4 to write a short, plain-Bangla "reason" string for each
 * match, explaining status and (if applicable) what's missing.
 *
 * Batched into a single model call to stay within the <10s latency NFR
 * even when comparing against many loan products.
 */
async function explainLoanMatches(matches, language = 'bn') {
  if (matches.length === 0) return matches;

  const compactMatches = matches.map((m, idx) => ({
    idx,
    lenderName: m.lenderName,
    status: m.status,
    daysUntilEligible: m.daysUntilEligible,
    reasonCodes: m.reasonCodes,
    criteria: m.criteria,
    vendorProfile: m.vendorProfile,
  }));

  const prompt = `A vendor's loan eligibility has already been computed deterministically (do NOT change any status or numbers). For each item below, write a short (1-2 sentence) ${
    language === 'bn' ? 'plain Bangla' : 'plain English'
  } explanation of why they got that status, and if status is "eligible_in_x_days" or "not_eligible", give one concrete next step.

reasonCodes meaning: "business_type_mismatch" = wrong business category for this product, "insufficient_revenue" = monthly revenue too low, "insufficient_record_history" = not enough days of logged transactions yet.

Data:
${JSON.stringify(compactMatches, null, 2)}

Respond ONLY with a JSON array (no markdown), same length and order as the input, in this shape:
[{ "idx": 0, "reason": "..." }, ...]`;

  const raw = await gemmaService.generateText(prompt);
  const explanations = safeParseJsonArray(raw);

  return matches.map((match, idx) => {
    const found = explanations.find((e) => e.idx === idx);
    return {
      ...match,
      reason: found?.reason || fallbackReason(match),
    };
  });
}

function fallbackReason(match) {
  if (match.status === 'eligible') return 'আপনি এই ঋণের জন্য যোগ্য।';
  if (match.status === 'eligible_in_x_days') {
    return `আরও ${match.daysUntilEligible} দিন নিয়মিত হিসাব রাখলে আপনি যোগ্য হবেন।`;
  }
  return 'বর্তমানে আপনি এই ঋণের শর্ত পূরণ করছেন না।';
}

function safeParseJsonArray(raw) {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    return [];
  }
}

module.exports = { explainLoanMatches };
