import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Check } from "lucide-react";
import { generateDescription } from "../../lib/ai";

interface AIDescriptionGeneratorProps {
  serviceTitle: string;
  category: string;
  onGenerated: (description: string) => void;
}

export function AIDescriptionGenerator({ serviceTitle, category, onGenerated }: AIDescriptionGeneratorProps) {
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!serviceTitle) { setError("Please enter a service title first."); return; }
    setLoading(true);
    setError("");
    setGenerated("");

    try {
      const description = await generateDescription(serviceTitle, category, keywords);
      setGenerated(description);
    } catch (err: any) {
      setError(err.message || "Failed to generate description.");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    onGenerated(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-[#10B981]/30 rounded-xl p-4 bg-[#10B981]/5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#10B981]" />
        <p className="text-sm font-semibold text-[#10B981]">AI Description Generator</p>
        <span className="text-xs bg-[#10B981]/20 text-[#10B981] px-2 py-0.5 rounded-full">Gemma</span>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Keywords (optional)</label>
        <input
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          placeholder="e.g. eco-friendly, fast, professional"
          className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
        />
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {generated && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 leading-relaxed">{generated}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-[#10B981] text-white py-2.5 rounded-lg text-sm hover:bg-[#0d9668] transition-colors disabled:opacity-70"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
            : generated
            ? <><RefreshCw className="w-4 h-4" />Regenerate</>
            : <><Sparkles className="w-4 h-4" />Generate</>}
        </button>

        {generated && (
          <button
            onClick={handleUse}
            className="flex items-center gap-2 bg-[#1E3A8A] text-white px-4 py-2.5 rounded-lg text-sm hover:bg-[#152d6b] transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : "Use"}
          </button>
        )}
      </div>
    </div>
  );
}