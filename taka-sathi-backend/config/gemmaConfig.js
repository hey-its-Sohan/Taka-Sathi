/**
 * Central configuration for the Gemma 4 inference service.
 *
 * MVP deployment: self-hosted Gemma 4 (E4B recommended) served locally via Ollama.
 * This keeps vendor financial data on infrastructure
 * you control rather than sending it to a third-party cloud LLM API.
 *
 * To swap to a different runtime (vLLM, Vertex AI endpoint, etc.) later,
 * only this file + services/gemmaService.js need to change — controllers
 * and everything else talk to gemmaService, never to Ollama directly.
 */

module.exports = {
  baseUrl: process.env.GEMMA_BASE_URL || "http://127.0.0.1:11434",
  model: process.env.GEMMA_MODEL || "gemma4:e4b",
  timeoutMs: parseInt(process.env.GEMMA_TIMEOUT_MS, 10) || 30000,
  parserTimeoutMs: parseInt(process.env.GEMMA_PARSER_TIMEOUT_MS, 10) || 30000,
  summaryTimeoutMs: parseInt(process.env.GEMMA_SUMMARY_TIMEOUT_MS, 10) || 300000,
  mockMode: process.env.GEMMA_MOCK_MODE === "true",
  // Keep temperature low — this app is decision support, not creative writing.
  // Consistency of numeric interpretation matters more than variety.
  defaultOptions: {
    temperature: 0.2,
    top_p: 0.9,
  },
  systemPrompt: `You are TakaSathi, a financial advisor for small business owners in Bangladesh.
Always respond in simple, plain Bangla suitable for a reader with basic literacy, unless the user's profile language is "en".
Never invent numbers — use only data returned by tool/function calls.
When you need data you don't have, call the appropriate tool instead of guessing.
Keep responses concise: 2-4 short sentences unless asked for detail.
Be encouraging but honest — do not sugarcoat a negative cash-flow warning.`,
};
