const gemmaService = require('./gemmaService');
const gemmaConfig = require('../config/gemmaConfig');
const { parseTransactionTool } = require('./aiTools');

/**
 * Uses Gemma 4's native function-calling to turn a vendor's free-text or
 * voice-transcribed sentence (e.g. "আজ ৫০০ টাকার সবজি কিনেছি") into a
 * structured transaction object. Falls back to a light regex heuristic
 * if the model call fails, so voice entry never hard-blocks the user.
 *
 * @param {string} text - raw transcript or typed free text
 * @returns {Object} { amount, type, category, note }
 */
/**
 * Normalizes decomposed Bengali characters (like য + ়) into their precomposed forms (য়)
 * to fix regex matching bugs with voice transcriptions.
 */
function normalizeBengaliText(str) {
  if (!str) return str;
  return str
    .replace(/\u09AF\u09BC/g, '\u09DF') // য + ় -> য়
    .replace(/\u09A1\u09BC/g, '\u09DC') // ড + ় -> ড়
    .replace(/\u09A2\u09BC/g, '\u09DD'); // ঢ + ় -> ঢ়
}

async function parseTransactionText(rawText) {
  const text = normalizeBengaliText(rawText);
  const messages = [
    {
      role: 'system',
      content:
        gemmaConfig.systemPrompt +
        '\nYour task right now: extract one transaction from the text using the return_parsed_transaction tool. Always call the tool — do not answer in plain text.',
    },
    { role: 'user', content: text },
  ];

  try {
    let parsed = null;

    await gemmaService.runWithTools(
      messages,
      [parseTransactionTool],
      {
        return_parsed_transaction: async (args) => {
          parsed = args;
          return { status: 'received' };
        },
      },
      2,
      gemmaConfig.parserTimeoutMs
    );

    if (parsed && typeof parsed.amount === 'number' && parsed.amount > 0) {
      let type = parsed.type;
      const expenseKeywords = /কিনলাম|কিনেছি|খরচ|দিলাম|দিয়েছি|ধার|নিয়ে গেসে|নিয়ে গেছে|bought|paid|expense|spent|gave|give|away|lent/i;
      
      // Override if Gemma mistakenly classified a clear expense as income
      if (type === 'income' && expenseKeywords.test(text)) {
        type = 'expense';
      } else if (type !== 'expense' && type !== 'income') {
        type = expenseKeywords.test(text) ? 'expense' : 'income';
      }
      
      return {
        amount: Math.abs(parsed.amount),
        type,
        category: parsed.category || 'other',
        note: parsed.note || text,
      };
    }
    throw new Error('Model did not return a valid parsed transaction with amount > 0');
  } catch (err) {
    return heuristicFallbackParse(text);
  }
}

function convertBanglaDigitsToEnglish(str) {
  const banglaDigits = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (char) => banglaDigits[char]);
}

/**
 * Last-resort fallback if Gemma 4 is unreachable — a naive regex parse so
 * the app degrades gracefully rather than blocking data entry entirely.
 */
function heuristicFallbackParse(rawText) {
  const text = normalizeBengaliText(rawText);
  const normalizedText = convertBanglaDigitsToEnglish(text);
  const amountMatch = normalizedText.match(/(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;

  if (amount <= 0) {
    throw new Error('Transaction amount must be greater than zero');
  }

  const expenseKeywords = /কিনলাম|কিনেছি|খরচ|দিলাম|দিয়েছি|ধার|নিয়ে গেসে|নিয়ে গেছে|bought|paid|expense|spent|gave|give|away|lent/i;
  const isExpense = expenseKeywords.test(text);

  return {
    amount,
    type: isExpense ? 'expense' : 'income',
    category: isExpense ? 'inventory' : 'sales',
    note: text,
  };
}

module.exports = { parseTransactionText };
