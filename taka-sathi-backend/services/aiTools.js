/**
 * aiTools.js
 *
 * OpenAI-style tool/function definitions exposed to Gemma 4's native
 * function-calling. Keeping these centralized makes it easy to add new
 * capabilities (e.g., inventory tracking) without touching gemmaService.js.
 *
 * Gemma 4 calls these to fetch or
 * structure data — it never computes financial numbers itself.
 */

const parseTransactionTool = {
  type: "function",
  function: {
    name: "return_parsed_transaction",
    description:
      "Return the structured transaction extracted from the vendor's free text or transcribed voice input.",
    parameters: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description:
            "The monetary amount mentioned, in Bangladeshi Taka, as a positive number.",
        },
        type: {
          type: "string",
          enum: ["income", "expense"],
          description:
            "Whether this transaction is money coming in (sale) or going out (cost).",
        },
        category: {
          type: "string",
          enum: [
            "sales",
            "inventory",
            "rent",
            "transport",
            "utilities",
            "wages",
            "loan_repayment",
            "personal",
            "other",
          ],
          description: "Best-fit category for this transaction.",
        },
        note: {
          type: "string",
          description: "A short cleaned-up description of the transaction.",
        },
      },
      required: ["amount", "type", "category"],
    },
  },
};

module.exports = { parseTransactionTool };
