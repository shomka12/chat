"use client";

import { useState, useEffect } from "react";
import { Search, Users, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Chat {
  id: string;
  name: string;
  description?: string;
  type: string;
  members: any[];
  messages: any[];
  _count: {
    messages: number;
    members: number;
  };
}

interface ChatSidebarProps {
  onSelectChat: (chatId: string) => void;
  selectedChat: string | null;
}

export default function ChatSidebar({ onSelectChat, selectedChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      setChats(data);
    } catch (error) {
      toast.error("Could not load chats");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = () => {
    const name = prompt("Enter chat name");
    if (!name) return;

    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: "GROUP" }),
    })
      .then((res) => res.json())
      .then((newChat) => {
        setChats([newChat, ...chats]);
        toast.success("Chat created");
      })
      .catch(() => toast.error("Failed to create chat"));
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Chats</h2>
          <button
            onClick={handleCreateChat}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No chats yet. Create one!</p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-4 rounded-lg mb-2 cursor-pointer transition ${
                selectedChat === chat.id
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{chat.name}</h3>
                    <p className="text-sm text-gray-500">
                      {chat._count.members} members • {chat._count.messages} messages
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
              {chat.description && (
                <p className="text-sm text-gray-600 mt-2">{chat.description}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Hierarchy Info */}
      <div className="p-4 border-t text-sm text-gray-500">
        <p>
          <strong>Hierarchy:</strong> Departments → Teams → Chats
        </p>
      </div>
    </div>
  );
}