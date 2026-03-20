// AI service — talks to the local Ollama proxy
// Proxy runs on your laptop at port 3001

const AI_PROXY = import.meta.env.VITE_AI_PROXY_URL || "http://localhost:3001";

const SYSTEM_PROMPTS = {
  assistant: `You are LeaseUs AI, a helpful assistant for the LeaseUs service marketplace platform. 
LeaseUs connects clients with service providers for home services, professional services and more.
Users can pay with GBP or LEUS (the platform's utility token).
Keep responses concise, friendly and helpful. Focus on helping users find services, understand bookings and use the platform.
Never make up specific prices or provider details.`,

  recommendations: `You are a service recommendation engine for LeaseUs marketplace.
Based on user preferences and history, suggest relevant services.
Always respond in valid JSON format only, no markdown, no explanation outside the JSON.`,

  description: `You are a professional copywriter for LeaseUs service marketplace.
Write compelling, concise service descriptions that highlight benefits and build trust.
Keep descriptions under 100 words. Use professional but friendly tone.
Respond with ONLY the description text, no extra commentary.`,

  search: `You are a smart search assistant for LeaseUs marketplace.
Convert natural language queries into structured search parameters.
Always respond in valid JSON format only: {"query": string, "category": string|null, "location": string|null, "max_price_gbp": number|null, "leus_only": boolean}`,
};

type Role = "user" | "assistant" | "system";
interface Message { role: Role; content: string; }

async function callProxy(endpoint: string, body: object): Promise<string> {
  try {
    const response = await fetch(`${AI_PROXY}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Proxy error: ${response.statusText}`);

    const data = await response.json() as any;
    if (data.error) throw new Error(data.error);
    return data.content || "";
  } catch (err: any) {
    if (err.message?.includes("fetch")) {
      throw new Error("AI assistant is offline. Make sure Ollama and the proxy server are running.");
    }
    throw err;
  }
}

// ── Chat with context ─────────────────────────────────────────
export async function chatWithAI(
  messages: Message[],
  systemPrompt = SYSTEM_PROMPTS.assistant
): Promise<string> {
  const fullMessages: Message[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];
  return callProxy("/api/chat", { messages: fullMessages });
}

// ── Smart search ──────────────────────────────────────────────
export async function smartSearch(query: string): Promise<{
  query: string;
  category: string | null;
  location: string | null;
  max_price_gbp: number | null;
  leus_only: boolean;
}> {
  const prompt = `Convert this search query into JSON search parameters: "${query}"`;
  const result = await callProxy("/api/chat", {
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.search },
      { role: "user", content: prompt },
    ],
  });

  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { query, category: null, location: null, max_price_gbp: null, leus_only: false };
  }
}

// ── Generate service description ──────────────────────────────
export async function generateDescription(serviceTitle: string, category: string, keywords: string): Promise<string> {
  const prompt = `Write a service description for: "${serviceTitle}" in the ${category} category. Keywords: ${keywords}`;
  return callProxy("/api/chat", {
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.description },
      { role: "user", content: prompt },
    ],
  });
}

// ── Get recommendations ───────────────────────────────────────
export async function getRecommendations(userHistory: string[], preferences: string): Promise<any[]> {
  const prompt = `User booking history: ${userHistory.join(", ")}. 
Preferences: ${preferences}.
Suggest 3 services they might like from these categories: Cleaning, Plumbing, IT Services, Hair & Beauty, Photography, Tutoring, Gardening, Personal Training.
Return JSON array: [{"title": string, "category": string, "reason": string}]`;

  const result = await callProxy("/api/chat", {
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.recommendations },
      { role: "user", content: prompt },
    ],
  });

  try {
    const cleaned = result.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// ── Check if AI is available ──────────────────────────────────
export async function checkAIStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${AI_PROXY}/health`);
    return response.ok;
  } catch {
    return false;
  }
}