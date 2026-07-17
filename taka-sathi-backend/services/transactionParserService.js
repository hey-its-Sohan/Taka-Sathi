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
async function parseTransactionText(text) {
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
      2
    );

    if (parsed && typeof parsed.amount === 'number') {
      return {
        amount: Math.abs(parsed.amount),
        type: parsed.type === 'expense' ? 'expense' : 'income',
        category: parsed.category || 'other',
        note: parsed.note || text,
      };
    }
    throw new Error('Model did not return a valid parsed transaction');
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
function heuristicFallbackParse(text) {
  const normalizedText = convertBanglaDigitsToEnglish(text);
  const amountMatch = normalizedText.match(/(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  const expenseKeywords = /কিনলাম|কিনেছি|খরচ|দিলাম|bought|paid|expense|spent/i;
  const isExpense = expenseKeywords.test(text);

  return {
    amount,
    type: isExpense ? 'expense' : 'income',
    category: isExpense ? 'inventory' : 'sales',
    note: text,
  };
}

module.exports = { parseTransactionText };
