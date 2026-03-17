import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Send, Paperclip, Mic, MicOff, Image,
  MoreVertical, Flag, Ban, Loader2, CheckCheck, Check, X, Play, Pause,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: "text" | "image" | "file" | "voice";
  file_url?: string;
  file_name?: string;
  duration_seconds?: number;
  is_read: boolean;
  created_at: string;
};

export function Conversation() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [profile, setProfile]         = useState<any>(null);
  const [other, setOther]             = useState<any>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [text, setText]               = useState("");
  const [recording, setRecording]     = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [showMenu, setShowMenu]       = useState(false);
  const [showReport, setShowReport]   = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isBlocked, setIsBlocked]     = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);
  const recordTimer   = useRef<NodeJS.Timeout | null>(null);
  const audioRefs     = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`conversation:${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        markRead();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);

      // Get conversation + other user
      const { data: conv } = await supabase
        .from("conversations")
        .select(`
          id, client_id, provider_id,
          client:profiles!client_id(id, full_name, avatar_url, role),
          provider:profiles!provider_id(id, full_name, avatar_url, role)
        `)
        .eq("id", id)
        .single();

      if (conv) {
        const otherUser = conv.client_id === user.id ? conv.provider : conv.client;
        setOther(otherUser);

        // Check if blocked
        const { data: block } = await supabase
          .from("user_blocks")
          .select("id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", otherUser?.id)
          .maybeSingle();
        setIsBlocked(!!block);
      }

      // Fetch messages
      const { data: msgData } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(msgData || []);

      markRead();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", id)
      .neq("sender_id", user.id)
      .eq("is_read", false);
  };

  const sendMessage = async (content: string, type: string = "text", fileUrl?: string, fileName?: string, duration?: number) => {
    if (!profile) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: profile.id,
        content: content || "",
        type,
        file_url: fileUrl || null,
        file_name: fileName || null,
        duration_seconds: duration || null,
        is_read: false,
      });
      if (error) throw error;

      // Update last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", id);

      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // ── File/Image upload ──────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-files")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-files")
        .getPublicUrl(path);

      const isImage = file.type.startsWith("image/");
      await sendMessage(
        isImage ? "" : file.name,
        isImage ? "image" : "file",
        urlData.publicUrl,
        file.name
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Voice recording ────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current   = [];

      mediaRecorder.current.ondataavailable = e => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const blob     = new Blob(audioChunks.current, { type: "audio/webm" });
        const path     = `${profile.id}/voice_${Date.now()}.webm`;
        const duration = recordSeconds;

        const { error: uploadError } = await supabase.storage
          .from("chat-files")
          .upload(path, blob);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("chat-files")
            .getPublicUrl(path);
          await sendMessage("Voice note", "voice", urlData.publicUrl, undefined, duration);
        }

        stream.getTracks().forEach(t => t.stop());
        setRecordSeconds(0);
      };

      mediaRecorder.current.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimer.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
  };

  const cancelRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      audioChunks.current = [];
      mediaRecorder.current.onstop = () => {};
      mediaRecorder.current.stop();
    }
    setRecording(false);
    setRecordSeconds(0);
    if (recordTimer.current) clearInterval(recordTimer.current);
  };

  // ── Voice playback ─────────────────────────────────────────────
  const toggleVoice = (msgId: string, url: string) => {
    if (playingVoice === msgId) {
      audioRefs.current[msgId]?.pause();
      setPlayingVoice(null);
    } else {
      if (playingVoice && audioRefs.current[playingVoice]) {
        audioRefs.current[playingVoice].pause();
      }
      if (!audioRefs.current[msgId]) {
        audioRefs.current[msgId] = new Audio(url);
        audioRefs.current[msgId].onended = () => setPlayingVoice(null);
      }
      audioRefs.current[msgId].play();
      setPlayingVoice(msgId);
    }
  };

  // ── Block user ─────────────────────────────────────────────────
  const handleBlock = async () => {
    if (!other) return;
    if (isBlocked) {
      await supabase.from("user_blocks")
        .delete()
        .eq("blocker_id", profile.id)
        .eq("blocked_id", other.id);
      setIsBlocked(false);
    } else {
      await supabase.from("user_blocks")
        .insert({ blocker_id: profile.id, blocked_id: other.id });
      setIsBlocked(true);
    }
    setShowMenu(false);
  };

  // ── Report user ────────────────────────────────────────────────
  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await supabase.from("reports").insert({
      reporter_id:     profile.id,
      reported_id:     other.id,
      conversation_id: id,
      reason:          reportReason,
    });
    setShowReport(false);
    setReportReason("");
    alert("Report submitted. Our team will review it within 24 hours.");
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?";

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const isMine = (msg: Message) => msg.sender_id === profile?.id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-2xl flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {other?.avatar_url ? (
          <img src={other.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(other?.full_name || "")}
          </div>
        )}

        <div className="flex-1">
          <h2 className="text-white font-semibold text-sm">{other?.full_name || "Unknown"}</h2>
          <p className="text-white/60 text-xs capitalize">{other?.role || "User"}</p>
        </div>

        <button onClick={() => setShowMenu(!showMenu)} className="text-white/80 relative">
          <MoreVertical className="w-5 h-5" />
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 w-48 z-20 overflow-hidden">
              <button onClick={handleBlock}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Ban className="w-4 h-4 text-orange-500" />
                {isBlocked ? "Unblock User" : "Block User"}
              </button>
              <button onClick={() => { setShowMenu(false); setShowReport(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
                <Flag className="w-4 h-4" />
                Report User
              </button>
            </div>
          )}
        </button>
      </div>

      {/* Privacy notice */}
      <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-xs">🔒</span>
        <p className="text-xs text-blue-700">Messages are private. Only admins can view them for dispute resolution.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${isMine(msg) ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
              isMine(msg)
                ? "bg-[#1E3A8A] text-white rounded-br-sm"
                : "bg-white/90 text-gray-800 rounded-bl-sm border border-white/30"
            }`}>
              {/* Text */}
              {msg.type === "text" && (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}

              {/* Image */}
              {msg.type === "image" && msg.file_url && (
                <img src={msg.file_url} alt="Image"
                  className="max-w-full rounded-xl max-h-48 object-cover cursor-pointer"
                  onClick={() => window.open(msg.file_url, "_blank")}
                />
              )}

              {/* File */}
              {msg.type === "file" && msg.file_url && (
                <a href={msg.file_url} target="_blank" rel="noreferrer"
                  className={`flex items-center gap-2 text-sm ${isMine(msg) ? "text-white/90" : "text-[#1E3A8A]"}`}>
                  <Paperclip className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate max-w-[160px]">{msg.file_name || "File"}</span>
                </a>
              )}

              {/* Voice */}
              {msg.type === "voice" && msg.file_url && (
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleVoice(msg.id, msg.file_url!)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isMine(msg) ? "bg-white/20" : "bg-[#1E3A8A]/10"
                    }`}>
                    {playingVoice === msg.id
                      ? <Pause className={`w-4 h-4 ${isMine(msg) ? "text-white" : "text-[#1E3A8A]"}`} />
                      : <Play  className={`w-4 h-4 ${isMine(msg) ? "text-white" : "text-[#1E3A8A]"}`} />}
                  </button>
                  <div className={`flex-1 h-1 rounded-full ${isMine(msg) ? "bg-white/30" : "bg-gray-200"}`}>
                    <div className={`h-full w-1/3 rounded-full ${isMine(msg) ? "bg-white" : "bg-[#1E3A8A]"}`} />
                  </div>
                  <span className={`text-xs ${isMine(msg) ? "text-white/70" : "text-gray-500"}`}>
                    {msg.duration_seconds ? formatDuration(msg.duration_seconds) : "0:00"}
                  </span>
                </div>
              )}

              {/* Time + read receipt */}
              <div className={`flex items-center justify-end gap-1 mt-1 ${
                isMine(msg) ? "text-white/60" : "text-gray-400"
              }`}>
                <span className="text-xs">{formatTime(msg.created_at)}</span>
                {isMine(msg) && (
                  msg.is_read
                    ? <CheckCheck className="w-3 h-3 text-[#10B981]" />
                    : <Check className="w-3 h-3" />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Blocked notice */}
      {isBlocked && (
        <div className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-sm text-orange-700">You have blocked this user. Unblock to send messages.</p>
        </div>
      )}

      {/* Input bar */}
      {!isBlocked && (
        <div className="px-4 pb-6 pt-2 bg-white/50 backdrop-blur-sm border-t border-white/30">
          {recording ? (
            <div className="flex items-center gap-3 bg-white/80 rounded-2xl px-4 py-3 shadow-sm border border-white/30">
              <button onClick={cancelRecording} className="text-red-500">
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-500 font-medium">Recording {formatDuration(recordSeconds)}</span>
              </div>
              <button onClick={stopRecording}
                className="bg-[#10B981] text-white px-4 py-2 rounded-xl text-sm font-medium">
                Send
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              {/* Attach */}
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center shadow-sm border border-white/30 flex-shrink-0">
                {uploading
                  ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  : <Paperclip className="w-4 h-4 text-gray-500" />}
              </button>

              {/* Text input */}
              <div className="flex-1 bg-white/80 rounded-2xl border border-white/30 shadow-sm flex items-end px-4 py-2.5">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (text.trim()) sendMessage(text.trim());
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none max-h-28"
                  style={{ lineHeight: "1.5" }}
                />
              </div>

              {/* Send / Voice */}
              {text.trim() ? (
                <button onClick={() => sendMessage(text.trim())} disabled={sending}
                  className="w-10 h-10 bg-[#1E3A8A] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 disabled:opacity-70">
                  {sending
                    ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                    : <Send className="w-4 h-4 text-white" />}
                </button>
              ) : (
                <button onMouseDown={startRecording} onMouseUp={stopRecording}
                  onTouchStart={startRecording} onTouchEnd={stopRecording}
                  className="w-10 h-10 bg-[#10B981] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <Mic className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center max-w-md mx-auto">
          <div className="w-full bg-white rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Report User</h3>
              <button onClick={() => setShowReport(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Reports are reviewed by our admin team within 24 hours. The reported user will not be notified.
            </p>
            <div className="space-y-2 mb-4">
              {["Spam or scam", "Inappropriate behaviour", "Harassment", "Fake profile", "Other"].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-colors ${
                    reportReason === r
                      ? "border-[#1E3A8A] bg-[#1E3A8A]/5 text-[#1E3A8A]"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={handleReport} disabled={!reportReason}
              className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50">
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
