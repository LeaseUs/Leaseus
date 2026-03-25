import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Send, Loader2, Bot, User, CheckCircle, ChevronLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Message { role: "user" | "assistant"; content: string; }

const SYSTEM_PROMPT = (category: string) => `You are a professional skills assessor for LeaseUs, a UK service marketplace platform. Your job is to assess whether a provider is genuinely qualified and experienced to offer ${category} services.

Your assessment approach:
1. Start with a warm professional greeting and explain the process
2. Ask 8-10 targeted questions specific to ${category} — covering technical knowledge, safety practices, qualifications, insurance, experience and client management
3. Ask natural follow-up questions based on their answers
4. Be conversational but thorough — probe vague answers
5. After completing all questions, output EXACTLY this JSON on a new line (nothing else after it):
   ASSESSMENT_COMPLETE: {"score": <0-100>, "recommendation": "<approve|review|reject>", "summary": "<2 sentence summary>"}

Scoring guide:
- 80-100: Strong candidate, approve
- 60-79: Adequate, manual review recommended  
- Below 60: Insufficient knowledge, reject

Be professional and fair. Do not be harsh but do not approve someone who clearly lacks knowledge.
Current category being assessed: ${category}`;

async function callAssessmentAI(category: string, messages: Message[]): Promise<string> {
  const response = await fetch("/api/anthropic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT(category),
      messages: messages.map(message => ({ role: message.role, content: message.content })),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Assessment AI request failed.");
  }

  return data.content || "";
}

export function KYCAssessment() {
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const [kycId, setKycId] = useState(searchParams.get("kycId"));
  const [category, setCategory] = useState(searchParams.get("category") || "");

  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore]         = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const messagesEndRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    void bootstrapAssessment();
  }, []);

  const bootstrapAssessment = async () => {
    setBootstrapping(true);
    try {
      let resolvedKycId = searchParams.get("kycId");
      let resolvedCategory = searchParams.get("category") || "";

      if (!resolvedKycId || !resolvedCategory) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        const { data: kyc, error } = await supabase
          .from("provider_kyc")
          .select("id, category, assessment_status, status, current_step")
          .eq("provider_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (!kyc?.id) {
          navigate("/home/kyc", { replace: true });
          return;
        }
        if ((kyc.current_step ?? 0) < 3) {
          navigate("/home/kyc", { replace: true });
          return;
        }
        if (kyc.status === "submitted" || kyc.status === "under_review") {
          navigate("/kyc-pending", { replace: true });
          return;
        }
        if (kyc.assessment_status === "completed") {
          navigate("/kyc-pending", { replace: true });
          return;
        }

        resolvedKycId = kyc.id;
        resolvedCategory = kyc.category || "";
      }

      setKycId(resolvedKycId);
      setCategory(resolvedCategory || "General Services");
      await startAssessment(resolvedCategory || "General Services");
    } catch (err) {
      console.error(err);
      setMessages([
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Assessment setup failed.",
        },
      ]);
    } finally {
      setBootstrapping(false);
    }
  };

  const startAssessment = async (resolvedCategory: string) => {
    setLoading(true);
    try {
      const openingMessage: Message = { role: "user", content: "Hello, I'm ready for my skills assessment." };
      const reply = await callAssessmentAI(resolvedCategory, [openingMessage]);
      setMessages([
        openingMessage,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      console.error(err);
      setMessages([
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Assessment AI is unavailable right now.",
        },
      ]);
    }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await callAssessmentAI(category || "General Services", newMessages);

      if (reply.includes("ASSESSMENT_COMPLETE:")) {
        const jsonMatch = reply.match(/ASSESSMENT_COMPLETE:\s*({.*})/s);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[1] ?? "{}");
            setScore(result.score);
            const cleanReply = reply.replace(/ASSESSMENT_COMPLETE:.*$/s, "").trim();
            const finalMessages = [...newMessages, { role: "assistant" as const, content: cleanReply || "Thank you for completing the assessment. Your responses have been recorded." }];
            setMessages(finalMessages);
            await saveAssessment(finalMessages, result);
            setCompleted(true);
            return;
          } catch { /* parse error, continue */ }
        }
      }

      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Assessment AI is unavailable right now.",
        },
      ]);
    }
    finally { setLoading(false); }
  };

  const saveAssessment = async (transcript: Message[], result: any) => {
    if (!kycId) return;
    setSaving(true);
    try {
      await supabase.from("provider_kyc").update({
        assessment_transcript: transcript,
        assessment_score: result.score,
        assessment_status: "completed",
        assessment_passed: result.score >= 60,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        current_step: 5,
        updated_at: new Date().toISOString(),
      }).eq("id", kycId);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-[#1E3A8A]/90 backdrop-blur-lg px-4 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Skills Assessment
            </h1>
            <p className="text-white/70 text-xs">Category: {category}</p>
          </div>
        </div>
      </div>

      {completed ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${score !== null && score >= 60 ? "bg-green-100" : "bg-orange-100"}`}>
            <CheckCircle className={`w-10 h-10 ${score !== null && score >= 60 ? "text-[#10B981]" : "text-orange-500"}`} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Assessment Complete!</h2>
          <p className="text-gray-500 text-sm">
            {score !== null && score >= 60
              ? "Great job! Your assessment has been submitted for review."
              : "Your assessment has been submitted. Our team will review your responses."}
          </p>
            {score !== null && (
            <div className="bg-gray-50 rounded-xl p-4 w-full max-w-xs">
              <p className="text-xs text-gray-500 mb-1">Your score</p>
              <p className="text-3xl font-bold text-[#1E3A8A]">{score}<span className="text-lg text-gray-400">/100</span></p>
            </div>
          )}
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />Saving results...
            </div>
          )}
          <button onClick={() => navigate("/kyc-pending", { replace: true })}
            className="w-full max-w-xs bg-[#1E3A8A] text-white py-3 rounded-xl text-sm">
            Continue to Review Status
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-[#1E3A8A]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-[#1E3A8A]" />
                  </div>
                )}
                <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#1E3A8A] text-white rounded-tr-sm"
                    : "bg-white/80 backdrop-blur-md text-gray-800 rounded-tl-sm border border-white/30"
                }`}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-[#10B981]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-[#10B981]" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 bg-[#1E3A8A]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <div className="bg-white/80 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/30 flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-4 border-t border-white/20 bg-white/80 backdrop-blur-md flex-shrink-0">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
              <button onClick={sendMessage} disabled={!input.trim() || loading}
                className="w-12 h-12 bg-[#1E3A8A] text-white rounded-xl flex items-center justify-center disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
