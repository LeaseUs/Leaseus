const SYSTEM_PROMPT = `You are LeaseUs AI, a helpful assistant for the LeaseUs service marketplace platform.
LeaseUs connects clients with service providers for home services, professional services and more.
Users can pay with GBP or LEUS (the platform utility token).
Key features:
- Service booking with escrow protection
- MintLeaf: share LEUS value via QR codes
- Loyalty points that convert to LEUS
- Local business LEUS partners shown on map
- Subscription tiers: Basic (free), Standard (£10/mo), Premium (£25/mo)
Keep responses concise, friendly and helpful.
Never make up specific prices or provider details.`;

type Role = "user" | "assistant";
interface Message { role: Role; content: string; }

// ── Core API call ─────────────────────────────────────────────
async function callClaude(messages: Message[]): Promise<string> {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    throw new Error(err?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.content || "I could not generate a response. Please try again.";
}

// ── Chat ──────────────────────────────────────────────────────
export async function chatWithAI(messages: Message[]): Promise<string> {
  return callClaude(messages);
}

// ── Smart search ──────────────────────────────────────────────
export async function smartSearch(query: string): Promise<{
  query: string;
  category: string | null;
  location: string | null;
  max_price_gbp: number | null;
  leus_only: boolean;
}> {
  const result = await callClaude([{
    role: "user",
    content: `Convert this search to JSON (respond with JSON only, no markdown): "${query}"
Format: {"query": string, "category": string|null, "location": string|null, "max_price_gbp": number|null, "leus_only": boolean}`,
  }]);
  try {
    return JSON.parse(result.replace(/```json|```/g, "").trim());
  } catch {
    return { query, category: null, location: null, max_price_gbp: null, leus_only: false };
  }
}

// ── Generate service description ──────────────────────────────
export async function generateDescription(
  title: string,
  category: string,
  keywords: string
): Promise<string> {
  return callClaude([{
    role: "user",
    content: `Write a service description (under 100 words, professional but friendly) for: "${title}" in ${category}. Keywords: ${keywords}. Respond with ONLY the description text.`,
  }]);
}

// ── Get recommendations ───────────────────────────────────────
export async function getRecommendations(
  userHistory: string[],
  preferences: string
): Promise<any[]> {
  const result = await callClaude([{
    role: "user",
    content: `User history: ${userHistory.join(", ")}. Preferences: ${preferences}.
Suggest 3 services from: Cleaning, Plumbing, IT Services, Hair & Beauty, Photography, Tutoring, Gardening, Personal Training.
Return JSON array only: [{"title": string, "category": string, "reason": string}]`,
  }]);
  try {
    return JSON.parse(result.replace(/```json|```/g, "").trim());
  } catch {
    return [];
  }
}

// ── Status check ──────────────────────────────────────────────
export async function checkAIStatus(): Promise<boolean> {
  try {
    const response = await fetch("/api/anthropic");
    if (!response.ok) return false;
    const data = await response.json() as { configured?: boolean };
    return Boolean(data.configured);
  } catch {
    return false;
  }
}
