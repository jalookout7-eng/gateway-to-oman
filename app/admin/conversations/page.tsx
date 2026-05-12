"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";

interface Conversation {
  id: string;
  session_id: string;
  outcome: string | null;
  started_at: string;
  ended_at: string | null;
}

interface ConversationDetail extends Conversation {
  messages: { role: string; content: string; created_at: string }[];
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token")}` };
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterSource, setFilterSource] = useState("");

  useEffect(() => {
    async function fetch_() {
      const params = new URLSearchParams();
      if (filterOutcome) params.set("outcome", filterOutcome);
      if (filterSource) params.set("source", filterSource);
      const qs = params.toString();
      const res = await fetch(`/api/conversations${qs ? `?${qs}` : ""}`, { headers: authHeaders() });
      if (res.ok) setConversations(await res.json());
      setLoading(false);
    }
    fetch_();
  }, [filterOutcome, filterSource]);

  async function selectConversation(conv: Conversation) {
    const res = await fetch(`/api/conversations/${conv.id}`, { headers: authHeaders() });
    if (res.ok) setSelected(await res.json());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Conversations</h1>
        <p className="text-sm text-gray-500 mt-1">{conversations.length} total conversations</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Outcomes</option>
          <option value="captured">Captured</option>
          <option value="abandoned">Abandoned</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="">All Sources</option>
          <option value="main">Main site</option>
          <option value="businesses">Businesses</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        {/* Conversation list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden lg:col-span-1">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-navy">All Conversations</p>
          </div>
          <div className="overflow-y-auto h-full">
            {loading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No conversations yet</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-warm-white transition-colors ${
                    selected?.id === conv.id ? "bg-warm-white" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-400">{conv.id.slice(0, 8)}...</span>
                    {conv.outcome && (
                      <Badge variant={conv.outcome === "captured" ? "converted" : conv.outcome === "abandoned" ? "cold" : "closed"}>
                        {conv.outcome}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conv.started_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-navy">
              {selected ? `Conversation ${selected.id.slice(0, 8)}...` : "Select a conversation"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Click a conversation to view its transcript
              </div>
            ) : selected.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No messages in this conversation
              </div>
            ) : (
              selected.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "bg-gold/10 text-navy rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
