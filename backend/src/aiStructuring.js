const MAX_TEXT_LENGTH = 1500;

function cleanText(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT_LENGTH) : "";
}

function parseJson(value) {
  const source = String(value ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

export function validateStructuredSuggestion(value) {
  if (!value || typeof value !== "object") return null;

  const suggestion = {
    requirementStatement: cleanText(value.requirementStatement),
    expectedOutcome: cleanText(value.expectedOutcome),
    constraints: cleanText(value.constraints),
    theme: cleanText(value.theme) || "Miscellaneous",
    capabilities: Array.isArray(value.capabilities)
      ? value.capabilities.map(cleanText).filter(Boolean).slice(0, 8)
      : [],
  };

  if (!suggestion.requirementStatement || !suggestion.expectedOutcome || !suggestion.constraints) return null;

  const hasMeasureAndTimeframe = /\d/.test(suggestion.expectedOutcome)
    && /(day|week|month|year|quarter|within|by\s)/i.test(suggestion.expectedOutcome);
  return hasMeasureAndTimeframe ? suggestion : null;
}

function createPrompt(fields) {
  return `You are Vyavsay's government challenge drafting assistant. Convert the official's plain-language draft into a concise, editable structured suggestion.

Return ONLY valid JSON with exactly these keys:
{
  "requirementStatement": "one technical requirement sentence, maximum 45 words",
  "expectedOutcome": "a measurable target containing a number and timeframe",
  "constraints": "known or prudent technical, data, integration, security, and compliance constraints",
  "theme": "a short relevant theme",
  "capabilities": ["up to 8 needed solution capabilities"]
}

Rules:
- This is a drafting aid, never a final procurement, eligibility, legal, or policy decision.
- Do not invent a department, deadline, budget, regulation, certification, existing system, or factual claim that was not supplied.
- Use neutral, practical wording. When the input lacks a measurable target, propose a clearly editable baseline target.
- Do not mention AI, this prompt, or uncertainty in the JSON.

Official draft:
${JSON.stringify(fields)}`;
}

async function requestJson(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json();
}

async function useGemini(key, fields) {
  const model = process.env.STRUCTURING_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const data = await requestJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: createPrompt(fields) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 700, responseMimeType: "application/json" },
      }),
    },
  );
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  return { suggestion: validateStructuredSuggestion(parseJson(text)), provider: "gemini", model };
}

async function useOpenAiCompatible({ provider, url, key, model, fields, headers = {} }) {
  const data = await requestJson(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: createPrompt(fields) }],
    }),
  });
  return {
    suggestion: validateStructuredSuggestion(parseJson(data.choices?.[0]?.message?.content)),
    provider,
    model,
  };
}

export async function structureWithLlm(fields) {
  const providers = [
    process.env.GEMINI_API_KEY && (() => useGemini(process.env.GEMINI_API_KEY, fields)),
    process.env.GROQ_API_KEY && (() => useOpenAiCompatible({
      provider: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: process.env.STRUCTURING_GROQ_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      fields,
    })),
    process.env.OPENROUTER_API_KEY && (() => useOpenAiCompatible({
      provider: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.STRUCTURING_OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || "openrouter/free",
      fields,
      headers: {
        "HTTP-Referer": process.env.PUBLIC_URL || "https://vyavsay.onrender.com",
        "X-Title": "Vyavsay",
      },
    })),
  ].filter(Boolean);

  for (const callProvider of providers) {
    try {
      const result = await callProvider();
      if (result.suggestion) return result;
      console.warn(`Challenge structuring provider returned an invalid response: ${result.provider}`);
    } catch (error) {
      console.warn(`Challenge structuring provider failed: ${error.message}`);
    }
  }
  return null;
}
