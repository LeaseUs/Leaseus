export const config = { runtime: "edge" };

const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return json({});

  if (req.method === "GET") {
    return json({ configured: Boolean(API_KEY) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!API_KEY) {
    return json({ error: "AI is not configured on the server." }, 500);
  }

  try {
    const { system = "", messages = [], max_tokens = 1024, model = MODEL } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "At least one message is required." }, 400);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });

    const text = await response.text();
    if (!response.ok) {
      let message = `Anthropic error: ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message || message;
      } catch {}
      return json({ error: message }, response.status);
    }

    const data = JSON.parse(text);
    return json({ content: data.content?.[0]?.text || "" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown AI error." }, 500);
  }
}
