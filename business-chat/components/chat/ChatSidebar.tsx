"use client";

import { useState, useEffect } from "react";
import { Search, Users, Plus, ChevronDown, Hash, MessageCircle, Star, Lock, Globe, Settings } from "lucide-react";
import { toast } from "sonner";

interface Chat {
  id: string;
  name: string;
  description?: string;
  type: string;
  members: any[];
  messages: any[];
  _count?: {
    messages: number;
    members: number;
  };
}

interface ChatSidebarProps {
  onSelectChat: (chatId: string) => void;
  selectedChat: string | null;
}

type SidebarSection = "channels" | "direct" | "favorites";

export default function ChatSidebar({ onSelectChat, selectedChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SidebarSection>("channels");

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
      toast.error("Не удалось загрузить чаты");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = () => {
    const name = prompt("Введите название чата");
    if (!name) return;

    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: "GROUP" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create chat");
        return res.json();
      })
      .then(() => {
        toast.success("Чат создан");
        fetchChats();
      })
      .catch(() => toast.error("Не удалось создать чат"));
  };

  // Mock data for channels and direct messages
  const channels = [
    { id: "general", name: "general", icon: <Globe className="h-4 w-4" />, unread: 0 },
    { id: "random", name: "random", icon: <Hash className="h-4 w-4" />, unread: 3 },
    { id: "support", name: "support", icon: <Lock className="h-4 w-4" />, unread: 0 },
  ];
  const directMessages = [
    { id: "user1", name: "John Doe", status: "online" },
    { id: "user2", name: "Jane Smith", status: "away" },
    { id: "user3", name: "Alex Johnson", status: "offline" },
  ];
  const favorites = [
    { id: "fav1", name: "general", type: "channel" },
    { id: "fav2", name: "John Doe", type: "dm" },
  ];

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Rocket.Chat</h2>
          <button
            onClick={handleCreateChat}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            title="Создать чат"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 text-sm font-medium ${activeSection === "channels" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveSection("channels")}
        >
          <Hash className="inline-block h-4 w-4 mr-2" />
          Каналы
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium ${activeSection === "direct" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveSection("direct")}
        >
          <MessageCircle className="inline-block h-4 w-4 mr-2" />
          Личные
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium ${activeSection === "favorites" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          onClick={() => setActiveSection("favorites")}
        >
          <Star className="inline-block h-4 w-4 mr-2" />
          Избранное
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === "channels" && (
          <>
            <div className="mb-4">
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Публичные каналы</h3>
              <ul className="space-y-1">
                {channels.map((ch) => (
                  <li
                    key={ch.id}
                    className="flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => onSelectChat(ch.id)}
                  >
                    <span className="text-gray-500 mr-2">{ch.icon}</span>
                    <span className="flex-1">#{ch.name}</span>
                    {ch.unread > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                        {ch.unread}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Групповые чаты</h3>
              {loading ? (
                <div className="text-center py-4 text-gray-500">Загрузка...</div>
              ) : chats.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Чатов пока нет</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {chats.map((chat) => (
                    <li
                      key={chat.id}
                      className={`p-3 rounded-lg cursor-pointer transition ${selectedChat === chat.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{chat.name}</h4>
                          <p className="text-xs text-gray-500">
                            {chat._count?.members ?? 0} участников • {chat._count?.messages ?? 0} сообщений
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {activeSection === "direct" && (
          <div>
            <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Личные сообщения</h3>
            <ul className="space-y-2">
              {directMessages.map((dm) => (
                <li
                  key={dm.id}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => onSelectChat(dm.id)}
                >
                  <div className="relative mr-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      {dm.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${dm.status === "online" ? "bg-green-500" : dm.status === "away" ? "bg-yellow-500" : "bg-gray-400"}`}></div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{dm.name}</h4>
                    <p className="text-xs text-gray-500">{dm.status === "online" ? "В сети" : dm.status === "away" ? "Отошел" : "Не в сети"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeSection === "favorites" && (
          <div>
            <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2">Избранное</h3>
            <ul className="space-y-2">
              {favorites.map((fav) => (
                <li
                  key={fav.id}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => onSelectChat(fav.id)}
                >
                  <Star className="h-4 w-4 text-yellow-500 mr-3" />
                  <span className="font-medium">{fav.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({fav.type === "channel" ? "канал" : "ЛС"})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* User profile footer */}
      <div className="p-4 border-t border-gray-200 flex items-center">
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold mr-3">
          U
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-800">Пользователь</p>
          <p className="text-xs text-gray-500">Online</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded">
          <Settings className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}