import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Send, Paperclip, Mic,
  MoreVertical, Flag, Ban, Loader2, CheckCheck, Check, X, Play, Pause,
  CalendarPlus, ChevronDown, RefreshCw,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  type: "text" | "image" | "file" | "voice" | "booking_offer" | "reschedule_offer";
  file_url?: string;
  file_name?: string;
  duration_seconds?: number;
  offer_price_pence?: number;
  offer_date?: string;
  offer_time?: string;
  offer_duration?: string;
  offer_description?: string;
  offer_status?: "pending" | "accepted" | "declined";
  reschedule_date?: string;
  reschedule_time?: string;
  reschedule_status?: "pending" | "accepted" | "declined";
  is_read: boolean;
  created_at: string;
};

export function Conversation() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [profile, setProfile]             = useState<any>(null);
  const [other, setOther]                 = useState<any>(null);
  const [conv, setConv]                   = useState<any>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [text, setText]                   = useState("");
  const [recording, setRecording]         = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [showMenu, setShowMenu]           = useState(false);
  const [showReport, setShowReport]       = useState(false);
  const [reportReason, setReportReason]   = useState("");
  const [isBlocked, setIsBlocked]         = useState(false);
  const [playingVoice, setPlayingVoice]   = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [offerForm, setOfferForm]         = useState({ description: "", date: "", time: "", duration: "1 hour", price: "" });
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "", bookingId: "" });
  const [sendingOffer, setSendingOffer]   = useState(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks   = useRef<Blob[]>([]);
  const recordTimer   = useRef<NodeJS.Timeout | null>(null);
  const audioRefs     = useRef<Record<string, HTMLAudioElement>>({});

  const isProvider = profile?.role === "provider" || profile?.role === "local_business";

  useEffect(() => {
    fetchData();
    const channel = supabase.channel(`conversation:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => { setMessages(prev => [...prev, payload.new as Message]); markRead(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => { setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m)); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);

      const { data: convData } = await supabase.from("conversations")
        .select(`id, client_id, provider_id,
          client:profiles!client_id(id, full_name, avatar_url, role),
          provider:profiles!provider_id(id, full_name, avatar_url, role)`)
        .eq("id", id).single();

      if (convData) {
        setConv(convData);
        const otherUser = convData.client_id === user.id ? convData.provider : convData.client;
        setOther(otherUser);
        const { data: block } = await supabase.from("user_blocks").select("id")
          .eq("blocker_id", user.id).eq("blocked_id", otherUser?.id).maybeSingle();
        setIsBlocked(!!block);

        // Fetch active booking for this conversation
        const { data: booking } = await supabase.from("bookings")
          .select("id, title, status, scheduled_at")
          .eq("client_id", convData.client_id)
          .eq("provider_id", convData.provider_id)
          .in("status", ["pending", "confirmed"])
          .order("created_at", { ascending: false })
          .limit(1).maybeSingle();
        setActiveBooking(booking);
        if (booking) setRescheduleForm(f => ({ ...f, bookingId: booking.id }));
      }

      const { data: msgData } = await supabase.from("messages").select("*")
        .eq("conversation_id", id).order("created_at", { ascending: true });
      setMessages(msgData || []);
      markRead();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("messages").update({ is_read: true })
      .eq("conversation_id", id).neq("sender_id", user.id).eq("is_read", false);
  };

  const sendMessage = async (body: string, type = "text", fileUrl?: string, fileName?: string, duration?: number) => {
    if (!profile) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: id, sender_id: profile.id, body: body || "", type,
        file_url: fileUrl || null, file_name: fileName || null,
        duration_seconds: duration || null, is_read: false,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
      setText("");
    } catch (err: any) { console.error(err.message); }
    finally { setSending(false); }
  };

  // ── Send booking offer ─────────────────────────────────────────
  const handleSendOffer = async () => {
    if (!offerForm.description || !offerForm.date || !offerForm.time || !offerForm.price) return;
    setSendingOffer(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id:   id, sender_id: profile.id,
        body:              "Booking offer", type: "booking_offer",
        offer_description: offerForm.description, offer_date: offerForm.date,
        offer_time:        offerForm.time, offer_duration: offerForm.duration,
        offer_price_pence: Math.round(parseFloat(offerForm.price) * 100),
        offer_status:      "pending", is_read: false,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
      setShowOfferForm(false);
      setOfferForm({ description: "", date: "", time: "", duration: "1 hour", price: "" });
    } catch (err: any) { console.error(err.message); }
    finally { setSendingOffer(false); }
  };

  // ── Send reschedule offer ──────────────────────────────────────
  const handleSendReschedule = async () => {
    if (!rescheduleForm.date || !rescheduleForm.time) return;
    setSendingOffer(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id:  id, sender_id: profile.id,
        body:             "Reschedule request", type: "reschedule_offer",
        reschedule_date:  rescheduleForm.date,
        reschedule_time:  rescheduleForm.time,
        reschedule_status: "pending", is_read: false,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
      setShowRescheduleForm(false);
    } catch (err: any) { console.error(err.message); }
    finally { setSendingOffer(false); }
  };

  // ── Accept/Decline booking offer ───────────────────────────────
  const handleOfferResponse = async (msg: Message, status: "accepted" | "declined") => {
    try {
      await supabase.from("messages").update({ offer_status: status }).eq("id", msg.id);
      if (status === "accepted" && conv) {
        // Deduct 50% deposit from client wallet
        const { data: clientProfile } = await supabase.from("profiles")
          .select("fiat_balance_pence, leus_balance").eq("id", conv.client_id).single();
        const depositPence = Math.round((msg.offer_price_pence || 0) * 0.5);

        if (clientProfile && clientProfile.fiat_balance_pence >= depositPence) {
          await supabase.from("profiles")
            .update({ fiat_balance_pence: clientProfile.fiat_balance_pence - depositPence })
            .eq("id", conv.client_id);
        }

        const scheduledAt = new Date(`${msg.offer_date} ${msg.offer_time}`).toISOString();
        await supabase.from("bookings").insert({
          listing_id:    null,
          client_id:     conv.client_id,
          provider_id:   conv.provider_id,
          title:         msg.offer_description || "Custom Booking",
          description:   msg.offer_description,
          scheduled_at:  scheduledAt,
          status:        "confirmed",
          payment_method: "fiat",
          amount_pence:  msg.offer_price_pence,
          deposit_pence: depositPence,
          deposit_held:  true,
        });
        navigate("/home/bookings");
      }
    } catch (err: any) { console.error(err.message); }
  };

  // ── Accept/Decline reschedule ──────────────────────────────────
  const handleRescheduleResponse = async (msg: Message, status: "accepted" | "declined") => {
    try {
      await supabase.from("messages").update({ reschedule_status: status }).eq("id", msg.id);
      if (status === "accepted" && activeBooking) {
        const newScheduledAt = new Date(`${msg.reschedule_date} ${msg.reschedule_time}`).toISOString();
        await supabase.from("bookings").update({
          scheduled_at:     newScheduledAt,
          reschedule_status: "accepted",
        }).eq("id", activeBooking.id);
        setActiveBooking((b: any) => ({ ...b, scheduled_at: newScheduledAt }));
      }
    } catch (err: any) { console.error(err.message); }
  };

  // ── File upload ────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop(); const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      const isImage = file.type.startsWith("image/");
      await sendMessage(isImage ? "" : file.name, isImage ? "image" : "file", urlData.publicUrl, file.name);
    } catch (err) { console.error(err); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  // ── Voice recording ────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current   = [];
      mediaRecorder.current.ondataavailable = e => { audioChunks.current.push(e.data); };
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const path = `${profile.id}/voice_${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, blob);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
          await sendMessage("Voice note", "voice", urlData.publicUrl, undefined, recordSeconds);
        }
        stream.getTracks().forEach(t => t.stop()); setRecordSeconds(0);
      };
      mediaRecorder.current.start(); setRecording(true); setRecordSeconds(0);
      recordTimer.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err) { console.error(err); }
  };

  const stopRecording = () => { mediaRecorder.current?.stop(); setRecording(false); if (recordTimer.current) clearInterval(recordTimer.current); };
  const cancelRecording = () => {
    if (mediaRecorder.current?.state === "recording") { audioChunks.current = []; mediaRecorder.current.onstop = () => {}; mediaRecorder.current.stop(); }
    setRecording(false); setRecordSeconds(0); if (recordTimer.current) clearInterval(recordTimer.current);
  };

  const toggleVoice = (msgId: string, url: string) => {
    if (playingVoice === msgId) { audioRefs.current[msgId]?.pause(); setPlayingVoice(null); }
    else {
      if (playingVoice && audioRefs.current[playingVoice]) audioRefs.current[playingVoice].pause();
      if (!audioRefs.current[msgId]) { audioRefs.current[msgId] = new Audio(url); audioRefs.current[msgId].onended = () => setPlayingVoice(null); }
      audioRefs.current[msgId].play(); setPlayingVoice(msgId);
    }
  };

  const handleBlock = async () => {
    if (!other) return;
    if (isBlocked) { await supabase.from("user_blocks").delete().eq("blocker_id", profile.id).eq("blocked_id", other.id); setIsBlocked(false); }
    else { await supabase.from("user_blocks").insert({ blocker_id: profile.id, blocked_id: other.id }); setIsBlocked(true); }
    setShowMenu(false);
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await supabase.from("reports").insert({ reporter_id: profile.id, reported_id: other.id, conversation_id: id, reason: reportReason });
    setShowReport(false); setReportReason(""); alert("Report submitted.");
  };

  const getInitials  = (name: string) => name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?";
  const formatTime   = (dateStr: string) => new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const formatDur    = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const isMine       = (msg: Message) => msg.sender_id === profile?.id;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" /></div>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-2xl flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft className="w-5 h-5" /></button>
        {other?.avatar_url
          ? <img src={other.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          : <div className="w-10 h-10 rounded-full bg-[#10B981] flex items-center justify-center text-white font-semibold text-sm">{getInitials(other?.full_name || "")}</div>}
        <div className="flex-1">
          <h2 className="text-white font-semibold text-sm">{other?.full_name || "Unknown"}</h2>
          <p className="text-white/60 text-xs capitalize">{other?.role || "User"}</p>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="text-white/80 relative">
          <MoreVertical className="w-5 h-5" />
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 w-48 z-20 overflow-hidden">
              <button onClick={handleBlock} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Ban className="w-4 h-4 text-orange-500" />{isBlocked ? "Unblock User" : "Block User"}
              </button>
              <button onClick={() => { setShowMenu(false); setShowReport(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
                <Flag className="w-4 h-4" />Report User
              </button>
            </div>
          )}
        </button>
      </div>

      {/* Active booking banner */}
      {activeBooking && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-800">{activeBooking.title}</p>
            <p className="text-xs text-blue-600 capitalize">{activeBooking.status} · {activeBooking.scheduled_at ? new Date(activeBooking.scheduled_at).toLocaleDateString("en-GB") : "TBD"}</p>
          </div>
          <button onClick={() => navigate("/home/bookings")} className="text-xs text-blue-700 font-medium">View →</button>
        </div>
      )}

      {/* Privacy notice */}
      <div className="mx-4 mt-2 bg-white/50 border border-white/30 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-xs">🔒</span>
        <p className="text-xs text-gray-500">Messages are private. Only admins can view them for dispute resolution.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
            {!isProvider && <p className="text-gray-300 text-xs mt-1">Discuss the service, then the provider will send you a booking offer.</p>}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${isMine(msg) ? "justify-end" : "justify-start"}`}>

            {/* Booking offer card */}
            {msg.type === "booking_offer" && (
              <div className="max-w-[85%] w-full">
                <div className={`rounded-2xl overflow-hidden shadow-sm border ${isMine(msg) ? "border-[#1E3A8A]/20" : "border-[#10B981]/30"}`}>
                  <div className={`px-4 py-3 flex items-center gap-2 ${isMine(msg) ? "bg-[#1E3A8A]" : "bg-[#10B981]"}`}>
                    <CalendarPlus className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-semibold">Booking Offer</span>
                    {msg.offer_status === "accepted" && <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">✓ Accepted</span>}
                    {msg.offer_status === "declined" && <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">✗ Declined</span>}
                  </div>
                  <div className="bg-white/90 px-4 py-3 space-y-2">
                    <p className="text-sm font-medium text-gray-800">{msg.offer_description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">Date</span><p className="font-medium text-gray-800">{msg.offer_date}</p></div>
                      <div><span className="text-gray-400">Time</span><p className="font-medium text-gray-800">{msg.offer_time}</p></div>
                      <div><span className="text-gray-400">Duration</span><p className="font-medium text-gray-800">{msg.offer_duration}</p></div>
                      <div><span className="text-gray-400">Total Price</span><p className="font-medium text-[#1E3A8A]">£{((msg.offer_price_pence || 0) / 100).toFixed(2)}</p></div>
                    </div>
                    <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                      50% deposit on accept: £{(((msg.offer_price_pence || 0) / 100) * 0.5).toFixed(2)}
                    </div>
                    {!isMine(msg) && !isProvider && msg.offer_status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleOfferResponse(msg, "declined")}
                          className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">Decline</button>
                        <button onClick={() => handleOfferResponse(msg, "accepted")}
                          className="flex-1 bg-[#10B981] text-white py-2 rounded-xl text-sm hover:bg-[#0d9668] transition-colors">Accept & Pay Deposit</button>
                      </div>
                    )}
                  </div>
                  <div className="bg-white/90 px-4 pb-2 flex justify-end">
                    <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reschedule offer card */}
            {msg.type === "reschedule_offer" && (
              <div className="max-w-[85%] w-full">
                <div className="rounded-2xl overflow-hidden shadow-sm border border-orange-200">
                  <div className="px-4 py-3 flex items-center gap-2 bg-orange-500">
                    <RefreshCw className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-semibold">Reschedule Request</span>
                    {msg.reschedule_status === "accepted" && <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">✓ Accepted</span>}
                    {msg.reschedule_status === "declined" && <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">✗ Declined</span>}
                  </div>
                  <div className="bg-white/90 px-4 py-3 space-y-2">
                    <p className="text-xs text-gray-500">New proposed time:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">Date</span><p className="font-medium text-gray-800">{msg.reschedule_date}</p></div>
                      <div><span className="text-gray-400">Time</span><p className="font-medium text-gray-800">{msg.reschedule_time}</p></div>
                    </div>
                    {!isMine(msg) && msg.reschedule_status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleRescheduleResponse(msg, "declined")}
                          className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">Decline</button>
                        <button onClick={() => handleRescheduleResponse(msg, "accepted")}
                          className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm hover:bg-orange-600 transition-colors">Accept</button>
                      </div>
                    )}
                  </div>
                  <div className="bg-white/90 px-4 pb-2 flex justify-end">
                    <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Regular message */}
            {msg.type !== "booking_offer" && msg.type !== "reschedule_offer" && (
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isMine(msg) ? "bg-[#1E3A8A] text-white rounded-br-sm" : "bg-white/90 text-gray-800 rounded-bl-sm border border-white/30"}`}>
                {(msg.type === "text" || !msg.type) && <p className="text-sm leading-relaxed">{msg.body}</p>}
                {msg.type === "image" && msg.file_url && (
                  <img src={msg.file_url} alt="Image" className="max-w-full rounded-xl max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.file_url, "_blank")} />
                )}
                {msg.type === "file" && msg.file_url && (
                  <a href={msg.file_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 text-sm ${isMine(msg) ? "text-white/90" : "text-[#1E3A8A]"}`}>
                    <Paperclip className="w-4 h-4 flex-shrink-0" /><span className="truncate max-w-[160px]">{msg.file_name || "File"}</span>
                  </a>
                )}
                {msg.type === "voice" && msg.file_url && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleVoice(msg.id, msg.file_url!)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isMine(msg) ? "bg-white/20" : "bg-[#1E3A8A]/10"}`}>
                      {playingVoice === msg.id ? <Pause className={`w-4 h-4 ${isMine(msg) ? "text-white" : "text-[#1E3A8A]"}`} /> : <Play className={`w-4 h-4 ${isMine(msg) ? "text-white" : "text-[#1E3A8A]"}`} />}
                    </button>
                    <div className={`flex-1 h-1 rounded-full ${isMine(msg) ? "bg-white/30" : "bg-gray-200"}`}>
                      <div className={`h-full w-1/3 rounded-full ${isMine(msg) ? "bg-white" : "bg-[#1E3A8A]"}`} />
                    </div>
                    <span className={`text-xs ${isMine(msg) ? "text-white/70" : "text-gray-500"}`}>{msg.duration_seconds ? formatDur(msg.duration_seconds) : "0:00"}</span>
                  </div>
                )}
                <div className={`flex items-center justify-end gap-1 mt-1 ${isMine(msg) ? "text-white/60" : "text-gray-400"}`}>
                  <span className="text-xs">{formatTime(msg.created_at)}</span>
                  {isMine(msg) && (msg.is_read ? <CheckCheck className="w-3 h-3 text-[#10B981]" /> : <Check className="w-3 h-3" />)}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isBlocked && (
        <div className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-sm text-orange-700">You have blocked this user. Unblock to send messages.</p>
        </div>
      )}

      {/* Booking offer form */}
      {showOfferForm && isProvider && (
        <div className="mx-4 mb-2 bg-white/90 backdrop-blur-md rounded-2xl border border-[#1E3A8A]/20 shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-[#1E3A8A]" />New Booking Offer</h3>
            <button onClick={() => setShowOfferForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Service description *</label>
            <input value={offerForm.description} onChange={e => setOfferForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Deep house cleaning"
              className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date *</label>
              <input type="date" value={offerForm.date} min={new Date().toISOString().split("T")[0]}
                onChange={e => setOfferForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Time *</label>
              <input type="time" value={offerForm.time} onChange={e => setOfferForm(f => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Duration</label>
              <div className="relative">
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <select value={offerForm.duration} onChange={e => setOfferForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#10B981]">
                  {["30 mins","1 hour","1.5 hours","2 hours","3 hours","4 hours","Half day","Full day"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total Price (£) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input type="number" value={offerForm.price} onChange={e => setOfferForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full pl-7 pr-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
              </div>
            </div>
          </div>
          {offerForm.price && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
              Client pays 50% deposit on accept: £{(parseFloat(offerForm.price || "0") * 0.5).toFixed(2)}
            </div>
          )}
          <button onClick={handleSendOffer} disabled={sendingOffer || !offerForm.description || !offerForm.date || !offerForm.time || !offerForm.price}
            className="w-full bg-[#1E3A8A] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#152d6b] transition-colors">
            {sendingOffer ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><CalendarPlus className="w-4 h-4" />Send Booking Offer</>}
          </button>
        </div>
      )}

      {/* Reschedule form */}
      {showRescheduleForm && isProvider && activeBooking && (
        <div className="mx-4 mb-2 bg-white/90 backdrop-blur-md rounded-2xl border border-orange-200 shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-orange-500" />Propose Reschedule</h3>
            <button onClick={() => setShowRescheduleForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <p className="text-xs text-gray-500">Current booking: <span className="font-medium text-gray-700">{activeBooking.title}</span></p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">New Date *</label>
              <input type="date" value={rescheduleForm.date} min={new Date().toISOString().split("T")[0]}
                onChange={e => setRescheduleForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">New Time *</label>
              <input type="time" value={rescheduleForm.time} onChange={e => setRescheduleForm(f => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>
          </div>
          <button onClick={handleSendReschedule} disabled={sendingOffer || !rescheduleForm.date || !rescheduleForm.time}
            className="w-full bg-orange-500 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-orange-600 transition-colors">
            {sendingOffer ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><RefreshCw className="w-4 h-4" />Send Reschedule Request</>}
          </button>
        </div>
      )}

      {/* Input bar */}
      {!isBlocked && (
        <div className="px-4 pb-6 pt-2 bg-white/50 backdrop-blur-sm border-t border-white/30">
          {recording ? (
            <div className="flex items-center gap-3 bg-white/80 rounded-2xl px-4 py-3 shadow-sm border border-white/30">
              <button onClick={cancelRecording} className="text-red-500"><X className="w-5 h-5" /></button>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-500 font-medium">Recording {formatDur(recordSeconds)}</span>
              </div>
              <button onClick={stopRecording} className="bg-[#10B981] text-white px-4 py-2 rounded-xl text-sm font-medium">Send</button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-10 h-10 bg-white/80 rounded-xl flex items-center justify-center shadow-sm border border-white/30 flex-shrink-0">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <Paperclip className="w-4 h-4 text-gray-500" />}
              </button>

              {/* Provider: booking offer button */}
              {isProvider && (
                <button onClick={() => { setShowOfferForm(f => !f); setShowRescheduleForm(false); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border flex-shrink-0 transition-colors ${showOfferForm ? "bg-[#1E3A8A] border-[#1E3A8A]" : "bg-white/80 border-white/30 hover:border-[#1E3A8A]"}`}>
                  <CalendarPlus className={`w-4 h-4 ${showOfferForm ? "text-white" : "text-[#1E3A8A]"}`} />
                </button>
              )}

              {/* Provider: reschedule button (only if active booking exists) */}
              {isProvider && activeBooking && (
                <button onClick={() => { setShowRescheduleForm(f => !f); setShowOfferForm(false); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border flex-shrink-0 transition-colors ${showRescheduleForm ? "bg-orange-500 border-orange-500" : "bg-white/80 border-white/30 hover:border-orange-400"}`}>
                  <RefreshCw className={`w-4 h-4 ${showRescheduleForm ? "text-white" : "text-orange-500"}`} />
                </button>
              )}

              <div className="flex-1 bg-white/80 rounded-2xl border border-white/30 shadow-sm flex items-end px-4 py-2.5">
                <textarea value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) sendMessage(text.trim()); } }}
                  placeholder="Type a message..." rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none max-h-28"
                  style={{ lineHeight: "1.5" }} />
              </div>

              {text.trim() ? (
                <button onClick={() => sendMessage(text.trim())} disabled={sending}
                  className="w-10 h-10 bg-[#1E3A8A] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 disabled:opacity-70">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                </button>
              ) : (
                <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
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
              <button onClick={() => setShowReport(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {["Spam or scam","Inappropriate behaviour","Harassment","Fake profile","Other"].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-colors ${reportReason === r ? "border-[#1E3A8A] bg-[#1E3A8A]/5 text-[#1E3A8A]" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
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


