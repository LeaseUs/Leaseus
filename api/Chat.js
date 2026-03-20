export const config = { runtime: "edge" };

const MODEL = process.env.OLLAMA_MODEL || "llama3.2:latest";
const API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_URL = "https://ollama.com/api/chat";

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { messages } = await req.json();

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, stream: false }),
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${text}`);
    }

    const data = JSON.parse(text);
    const content = data.message?.content || data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}