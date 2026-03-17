import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { MessageCircle, Search, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function Messages() {
  const navigate = useNavigate();
  const [profile, setProfile]             = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      const isProvider = profileData?.role === "provider" || profileData?.role === "local_business";

      const { data: convData } = await supabase
        .from("conversations")
        .select(`
          id, created_at, last_message_at, booking_id,
          client:profiles!client_id(id, full_name, avatar_url),
          provider:profiles!provider_id(id, full_name, avatar_url)
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      const convsWithLastMsg = await Promise.all(
        (convData || []).map(async (conv: any) => {
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("body, type, created_at, sender_id, is_read")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          const other = isProvider ? conv.client : conv.provider;

          return { ...conv, lastMsg, unreadCount: count || 0, other };
        })
      );

      setConversations(convsWithLastMsg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now  = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000)    return "Just now";
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getLastMsgPreview = (msg: any) => {
    if (!msg) return "No messages yet";
    if (msg.type === "image") return "📷 Image";
    if (msg.type === "voice") return "🎤 Voice note";
    if (msg.type === "file")  return "📎 File";
    return msg.body || "";
  };

  const filtered = conversations.filter(c =>
    c.other?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1E3A8A]/80 backdrop-blur-lg px-4 pt-6 pb-4 rounded-b-3xl">
        <h1 className="text-xl text-white mb-1">Messages</h1>
        <p className="text-white/70 text-sm">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
        </p>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/20 rounded-xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      <div className="px-4 mt-4 pb-6">
        {filtered.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-10 text-center border border-white/30 mt-6">
            <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No conversations yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Messages appear when you book or get booked for a service
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/home/conversation/${conv.id}`)}
                className="w-full bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/30 flex items-center gap-3 text-left hover:shadow-md transition-shadow"
              >
                {/* Avatar */}
                {conv.other?.avatar_url ? (
                  <img
                    src={conv.other.avatar_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#10B981] flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {getInitials(conv.other?.full_name || "")}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                      {conv.other?.full_name || "Unknown"}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {conv.lastMsg
                        ? formatTime(conv.lastMsg.created_at)
                        : formatTime(conv.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                      {getLastMsgPreview(conv.lastMsg)}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 w-5 h-5 bg-[#10B981] rounded-full text-white text-xs flex items-center justify-center">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
