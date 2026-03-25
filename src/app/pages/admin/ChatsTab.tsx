import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MessageSquare, Search } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface ConversationSummary {
  id: string;
  created_at: string;
  last_message_at: string | null;
  booking_id: string | null;
  client: { id: string; full_name: string | null; avatar_url: string | null } | null;
  provider: { id: string; full_name: string | null; avatar_url: string | null } | null;
  lastMessage: {
    body: string | null;
    type: string | null;
    created_at: string;
    sender_id: string;
    is_read: boolean;
  } | null;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  body: string;
  type: string | null;
  created_at: string;
  is_read: boolean;
  sender: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export function ChatsTab() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id, created_at, last_message_at, booking_id,
          client:profiles!client_id(id, full_name, avatar_url),
          provider:profiles!provider_id(id, full_name, avatar_url)
        `)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const decorated = await Promise.all(
        (data || []).map(async (conversation: any) => {
          const [{ data: lastMessage }, { count: unreadCount }] = await Promise.all([
            supabase
              .from("messages")
              .select("body, type, created_at, sender_id, is_read")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conversation.id)
              .eq("is_read", false),
          ]);

          return {
            ...conversation,
            lastMessage: lastMessage || null,
            unreadCount: unreadCount || 0,
          };
        })
      );

      setConversations(decorated);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id, sender_id, body, type, created_at, is_read,
          sender:profiles!sender_id(id, full_name, avatar_url)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectConversation = (conversation: ConversationSummary) => {
    setSelectedConversation(conversation);
    void fetchMessages(conversation.id);
  };

  const conversationName = (conversation: ConversationSummary) => {
    const clientName = conversation.client?.full_name || "Unknown client";
    const providerName = conversation.provider?.full_name || "Unknown provider";
    return `${clientName} / ${providerName}`;
  };

  const getMessagePreview = (message: ConversationSummary["lastMessage"]) => {
    if (!message) return "No messages yet";
    if (message.type === "image") return "Image";
    if (message.type === "voice") return "Voice note";
    if (message.type === "file") return "File";
    return message.body || "New message";
  };

  const filteredConversations = conversations.filter((conversation) =>
    conversationName(conversation).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex w-full flex-col border-r border-gray-200 md:w-1/3">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation)}
              className={`w-full border-b p-4 text-left hover:bg-gray-50 ${
                selectedConversation?.id === conversation.id ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{conversationName(conversation)}</p>
                  <p className="truncate text-xs text-gray-500">{getMessagePreview(conversation.lastMessage)}</p>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-gray-400">
                    {new Date(conversation.last_message_at || conversation.created_at).toLocaleDateString()}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#10B981] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">No conversations found.</div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            <div className="flex items-center gap-2 border-b p-4">
              <button
                onClick={() => setSelectedConversation(null)}
                className="rounded-lg p-1 hover:bg-gray-100 md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h3 className="font-semibold">{conversationName(selectedConversation)}</h3>
                {selectedConversation.booking_id && (
                  <p className="text-xs text-gray-500">Booking: {selectedConversation.booking_id.slice(0, 8)}</p>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messagesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">No messages in this conversation.</div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold">
                      {message.sender?.full_name?.[0] || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {message.sender?.full_name || "Unknown sender"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{message.body || "Shared an attachment"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
