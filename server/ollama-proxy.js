import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.OLLAMA_API_KEY;
const MODEL = process.env.OLLAMA_MODEL || "gemma3:1b-cloud";

// Correct Ollama cloud API base URL
const OLLAMA_CLOUD = "http://localhost:11434/api";

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", model: MODEL, cloud: true });
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  try {
    const response = await fetch(`${OLLAMA_CLOUD}/chat`, {
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
    res.json({ content: data.message?.content || "" });

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await fetch(`${OLLAMA_CLOUD}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`Ollama error ${response.status}: ${text}`);

    const data = JSON.parse(text);
    res.json({ content: data.message?.content || "" });

  } catch (err) {
    console.error("Generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ LeaseUs AI proxy running at http://localhost:${PORT}`);
  console.log(`☁️  Ollama cloud: ${OLLAMA_CLOUD}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🔑 API key: ${API_KEY ? "✅ Set" : "❌ Missing!"}`);
});
