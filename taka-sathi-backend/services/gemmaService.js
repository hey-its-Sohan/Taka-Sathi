const axios = require("axios");
const gemmaConfig = require("../config/gemmaConfig");
const logger = require("../utils/logger");

/**
 * gemmaService.js
 *
 * Thin, swappable client for talking to a self-hosted Gemma 4 model via Ollama's
 * OpenAI-compatible chat endpoint (Ollama >= 0.4 supports /v1/chat/completions
 * with tools for tool-calling-capable models, which Gemma 4 is — native
 * function-calling support,).
 *
 * If you swap Ollama for vLLM or a Vertex AI endpoint later, this is the
 * ONLY file that needs to change — controllers/services call the exported
 * functions below, never the HTTP layer directly.
 */

const http = axios.create({
  baseURL: gemmaConfig.baseUrl,
  timeout: gemmaConfig.timeoutMs,
});

/**
 * Low-level call to the model's chat completion endpoint.
 * @param {Array} messages - OpenAI-style message array
 * @param {Array} [tools] - OpenAI-style tool/function definitions
 * @returns {Object} raw assistant message object { role, content, tool_calls? }
 */
async function chatCompletion(messages, tools = null) {
  if (gemmaConfig.mockMode) {
    return mockChatCompletion(messages, tools);
  }

  try {
    const payload = {
      model: gemmaConfig.model,
      messages,
      stream: false,
      options: gemmaConfig.defaultOptions,
    };
    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    const { data } = await http.post("/v1/chat/completions", payload);
    const choice = data.choices && data.choices[0];
    if (!choice) {
      throw new Error("Gemma 4 returned no choices in response");
    }
    return choice.message;
  } catch (err) {
    logger.error("Gemma 4 inference call failed:", err.message);
    throw new Error(
      `Gemma 4 inference failed (${err.message}). Is Ollama running at ${gemmaConfig.baseUrl}? ` +
        `Set GEMMA_MOCK_MODE=true in .env to develop without a live model.`,
    );
  }
}

/**
 * Runs a full function-calling loop:
 *  1. Send messages + tool definitions to Gemma 4
 *  2. If the model requests a tool call, execute the matching local handler
 *  3. Feed the tool result back to the model
 *  4. Repeat until the model returns a plain text answer (or maxIterations hit)
 *
 * @param {Array} initialMessages - conversation so far (system + user messages)
 * @param {Array} toolDefinitions - OpenAI-style tool schema array
 * @param {Object} toolHandlers - map of { toolName: async (args) => resultObject }
 * @param {number} maxIterations - safety cap to prevent infinite tool-call loops
 * @returns {string} final plain-text content from the model
 */
async function runWithTools(
  initialMessages,
  toolDefinitions,
  toolHandlers,
  maxIterations = 4,
) {
  let messages = [...initialMessages];

  for (let i = 0; i < maxIterations; i++) {
    const assistantMessage = await chatCompletion(messages, toolDefinitions);

    const toolCalls = assistantMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // Model gave a final answer — done.
      return assistantMessage.content || "";
    }

    // Append the assistant's tool-call request to the conversation
    messages.push(assistantMessage);

    // Execute every requested tool call and append results
    for (const call of toolCalls) {
      const fnName = call.function?.name;
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch (e) {
        logger.warn(
          `Failed to parse tool call arguments for ${fnName}:`,
          call.function?.arguments,
        );
      }

      const handler = toolHandlers[fnName];
      let result;
      if (!handler) {
        result = { error: `Unknown tool requested: ${fnName}` };
      } else {
        try {
          result = await handler(args);
        } catch (err) {
          result = { error: `Tool ${fnName} failed: ${err.message}` };
        }
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: fnName,
        content: JSON.stringify(result),
      });
    }
  }

  logger.warn(
    "Gemma 4 tool-calling loop hit maxIterations without a final answer",
  );
  return "দুঃখিত, এই মুহূর্তে উত্তর তৈরি করা যাচ্ছে না। আবার চেষ্টা করুন।"; // "Sorry, couldn't generate a response right now, please retry."
}

/**
 * Simple (non-tool-calling) generation — used for the final narrative step
 * once all numbers are already computed deterministically and just need
 * to be turned into plain-Bangla prose.
 */
async function generateText(userPrompt, { systemPrompt } = {}) {
  const messages = [
    { role: "system", content: systemPrompt || gemmaConfig.systemPrompt },
    { role: "user", content: userPrompt },
  ];
  const message = await chatCompletion(messages);
  return message.content || "";
}

/* -------------------------------------------------------------------------- */
/* Mock mode — lets the whole backend run and be demoed/tested even without   */
/* Ollama installed. Toggle via GEMMA_MOCK_MODE=true in .env.                 */
/* -------------------------------------------------------------------------- */
function mockChatCompletion(messages, tools) {
  const lastMsg = messages[messages.length - 1];
  if (lastMsg && lastMsg.role === "tool") {
    return {
      role: "assistant",
      content: "Transaction parsed successfully.",
    };
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const text = lastUserMsg?.content || "";

  // If tools were offered and this looks like a transaction-parsing prompt,
  // simulate a tool call so the parse_transaction flow is still exercisable.
  if (
    tools &&
    tools.some((t) => t.function?.name === "return_parsed_transaction")
  ) {
    const amountMatch = text.match(/(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : 500;
    const isExpense = /কিনলাম|খরচ|expense|bought|paid/i.test(text);
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "mock-call-1",
          function: {
            name: "return_parsed_transaction",
            arguments: JSON.stringify({
              amount,
              type: isExpense ? "expense" : "income",
              category: isExpense ? "inventory" : "sales",
              note: text,
            }),
          },
        },
      ],
    };
  }

  return {
    role: "assistant",
    content: `[MOCK MODE] TakaSathi সংক্ষিপ্ত বিবরণ: আপনার ডেটার ভিত্তিতে ব্যবসা স্থিতিশীল দেখাচ্ছে। (Set GEMMA_MOCK_MODE=false and run Ollama for real Gemma 4 output.)`,
  };
}

module.exports = { chatCompletion, runWithTools, generateText };
