const financeEngine = require("./financeEngine");
const gemmaService = require("./gemmaService");
const Transaction = require("../models/Transaction");
const gemmaConfig = require("../config/gemmaConfig");

const PERIOD_DAYS = { daily: 1, weekly: 7, monthly: 30 };

/**
 * Fetches transactions for a period, runs all deterministic finance
 * calculations, then asks Gemma 4 to turn the *already-computed* numbers
 * into a plain-Bangla narrative. The model is given numbers, not asked
 * to produce them.
 *
 * @param {string} userId
 * @param {'daily'|'weekly'|'monthly'} periodType
 * @param {'bn'|'en'} language
 */
async function generateFinancialSummary(userId, periodType, language = "bn") {
  const days = PERIOD_DAYS[periodType] || 7;
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setHours(0, 0, 0, 0); // Anchor to midnight (start of day)
  periodStart.setDate(now.getDate() - days);

  const previousStart = new Date(periodStart);
  previousStart.setDate(periodStart.getDate() - days);

  const [currentTxns, previousTxns, allTxns] = await Promise.all([
    Transaction.find({ userId, date: { $gte: periodStart, $lte: now } }).lean(),
    Transaction.find({
      userId,
      date: { $gte: previousStart, $lt: periodStart },
    }).lean(),
    Transaction.find({ userId }).sort({ date: -1 }).limit(500).lean(),
  ]);

  const current = financeEngine.computeTotals(currentTxns);
  const previous = financeEngine.computeTotals(previousTxns);
  const categoryBreakdown = financeEngine.computeCategoryBreakdown(currentTxns);
  const daysWithEntries = financeEngine.computeDaysWithEntries(currentTxns);

  const healthScore = financeEngine.computeHealthScore({
    current,
    previous,
    daysWithEntries,
    totalDaysInPeriod: days,
  });

  const cashflow = financeEngine.computeCashflowForecast(allTxns, {
    startingBalance: current.netProfit,
    forecastDays: 7,
    lookbackDays: 30,
  });

  const narrative = await generateSummaryNarrative({
    periodType,
    current,
    previous,
    categoryBreakdown,
    healthScore,
    cashflow,
    language,
  });

  return {
    periodStart,
    periodEnd: now,
    totalIncome: current.totalIncome,
    totalExpense: current.totalExpense,
    netProfit: current.netProfit,
    healthScore,
    healthScoreExplanation: narrative.healthScoreExplanation,
    cashflowForecast: cashflow.forecast,
    warningFlag: cashflow.willGoNegative,
    warningMessage: narrative.warningMessage,
    summaryText: narrative.summaryText,
  };
}

/**
 * Single Gemma 4 call that produces all three narrative pieces at once
 * (summary, health score explanation, warning message) to minimize
 * inference round-trips — important for the <10s latency NFR.
 */
async function generateSummaryNarrative({
  periodType,
  current,
  previous,
  categoryBreakdown,
  healthScore,
  cashflow,
  language,
}) {
  const topExpense = categoryBreakdown[0];

  const dataForModel = {
    periodType,
    totalIncome: current.totalIncome,
    totalExpense: current.totalExpense,
    netProfit: current.netProfit,
    previousNetProfit: previous.netProfit,
    topExpenseCategory: topExpense ? topExpense.category : null,
    topExpenseAmount: topExpense ? topExpense.amount : 0,
    healthScore,
    forecastAvgDailyNet: cashflow.avgDailyNet,
    willGoNegative: cashflow.willGoNegative,
    negativeOnDate: cashflow.negativeOnDate,
  };

  const prompt = `Here is a vendor's already-computed financial data (JSON). Do NOT recompute or alter any numbers — only explain them.

${JSON.stringify(dataForModel, null, 2)}

Respond ONLY with a JSON object (no markdown, no extra text) in this exact shape:
{
  "summaryText": "2-3 sentence ${periodType} summary comparing to the previous period, in ${language === "bn" ? "plain Bangla" : "plain English"}",
  "healthScoreExplanation": "1-2 sentences explaining what is driving the health score of ${healthScore}/100, in ${language === "bn" ? "plain Bangla" : "plain English"}",
  "warningMessage": "${cashflow.willGoNegative ? `1-2 sentence urgent but constructive warning that cash flow may go negative around ${cashflow.negativeOnDate}, with one concrete suggestion, in ${language === "bn" ? "plain Bangla" : "plain English"}` : "empty string since there is no warning"}"
}`;

  const raw = await gemmaService.generateText(prompt, { timeout: gemmaConfig.summaryTimeoutMs });
  return safeParseJsonResponse(raw, {
    summaryText:
      current.netProfit >= 0
        ? "আপনার ব্যবসা লাভজনক অবস্থায় আছে।"
        : "এই সময়ে আপনার খরচ আয়ের চেয়ে বেশি হয়েছে।",
    healthScoreExplanation: `আপনার স্কোর ${healthScore}/১০০।`,
    warningMessage: cashflow.willGoNegative
      ? "সতর্কতা: আপনার নগদ প্রবাহ শীঘ্রই ঋণাত্মক হতে পারে। খরচ কমানোর কথা বিবেচনা করুন।"
      : "",
  });
}

/**
 * Robustly parses a JSON object out of a model response, tolerating
 * stray markdown code fences or leading/trailing text — small local models
 * don't always perfectly follow "JSON only" instructions.
 */
function safeParseJsonResponse(raw, fallback) {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in model response");
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    return fallback;
  }
}

module.exports = { generateFinancialSummary };
