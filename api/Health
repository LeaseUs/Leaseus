export const config = { runtime: "edge" };

export default async function handler(req) {
  return new Response(
    JSON.stringify({
      status: "ok",
      model: process.env.OLLAMA_MODEL || "llama3.2:latest",
      cloud: true,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}