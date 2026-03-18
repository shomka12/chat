
"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Smile, Image as ImageIcon, Forward, Megaphone, X, Reply, Edit } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";

interface Message {
  id: string;
  content: string;
  encryptedContent?: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  attachments: any[];
  reactions: any[];
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  isEncrypted: boolean;
  isEdited?: boolean;
  updatedAt?: string;
  forwardedFrom?: {
    id: string;
    sender: { name: string };
    content: string;
  };
  parentId?: string;
  replies?: Message[];
}

interface ChatWindowProps {
  chatId: string;
}

interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export default function ChatWindow({ chatId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [forwardModal, setForwardModal] = useState<{ open: boolean; messageId?: string }>({ open: false });
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [targetChatId, setTargetChatId] = useState("");
  const [broadcastUsers, setBroadcastUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    }
  }, [chatId]);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      toast.error("Не удалось загрузить пользователей");
    }
  };

  const handleBroadcast = async () => {
    if (!input.trim()) {
      toast.error("Введите сообщение для рассылки");
      return;
    }
    if (broadcastUsers.length === 0) {
      toast.error("Выберите хотя бы одного пользователя");
      return;
    }
    try {
      const res = await fetch("/api/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: input,
          userIds: broadcastUsers,
        }),
      });
      if (res.ok) {
        toast.success("Рассылка отправлена");
        setBroadcastModal(false);
        setBroadcastUsers([]);
        setInput("");
      } else {
        toast.error("Ошибка рассылки");
      }
    } catch (error) {
      toast.error("Ошибка рассылки");
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?chatId=${chatId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      toast.error("Не удалось загрузить сообщения");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const uploadFile = async (file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    const data = await res.json();
    return {
      url: data.url,
      name: data.fileName,
      size: data.fileSize,
      type: data.attachmentType || "OTHER",
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const attachment = await uploadFile(file);
        setAttachments((prev) => [...prev, attachment]);
      }
      toast.success("Файлы загружены");
    } catch (error) {
      toast.error("Ошибка загрузки файлов");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const message = {
      chatId,
      content: input,
      parentId: replyingTo?.id || null,
      attachments: attachments.map((att) => ({
        type: att.type,
        url: att.url,
        name: att.name,
        size: att.size,
        isEncrypted: false,
        encryptionKey: null,
      })),
    };

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      if (res.ok) {
        const newMessage = await res.json();
        // Если это ответ, обновим родительское сообщение, добавив ответ в replies
        if (replyingTo) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === replyingTo.id
                ? { ...msg, replies: [...(msg.replies || []), newMessage] }
                : msg
            )
          );
        } else {
          setMessages([...messages, newMessage]);
        }
        setInput("");
        setAttachments([]);
        setShowEmoji(false);
        setReplyingTo(null);
      }
    } catch (error) {
      toast.error("Не удалось отправить сообщение");
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setInput(input + emojiObject.emoji);
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);

  const handleReaction = async (messageId: string, emoji: string) => {
    // Временная заглушка: обновляем локальное состояние
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId) {
          // Проверяем, есть ли уже такая реакция от текущего пользователя
          const existing = msg.reactions.find((r: any) => r.emoji === emoji && r.userId === "self");
          if (existing) {
            // Удаляем реакцию
            return {
              ...msg,
              reactions: msg.reactions.filter((r: any) => !(r.emoji === emoji && r.userId === "self"))
            };
          } else {
            // Добавляем реакцию
            return {
              ...msg,
              reactions: [...msg.reactions, { emoji, userId: "self", user: { name: "You" } }]
            };
          }
        }
        return msg;
      })
    );
    // TODO: отправить запрос на сервер
    // await fetch(`/api/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) });
  };

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim()) {
      toast.error("Сообщение не может быть пустым");
      return;
    }
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        const updatedMessage = await res.json();
        // Обновляем сообщение в основном массиве и в replies
        const updateMessageInTree = (msgs: Message[]): Message[] =>
          msgs.map((msg) => {
            if (msg.id === messageId) {
              return { ...msg, content: updatedMessage.content, isEdited: true, updatedAt: updatedMessage.updatedAt };
            }
            if (msg.replies && msg.replies.length > 0) {
              return { ...msg, replies: updateMessageInTree(msg.replies) };
            }
            return msg;
          });
        setMessages((prev) => updateMessageInTree(prev));
        setEditingMessageId(null);
        setEditContent("");
        toast.success("Сообщение отредактировано");
      } else {
        const error = await res.json();
        toast.error(error.error || "Ошибка редактирования");
      }
    } catch (error) {
      toast.error("Ошибка редактирования");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {loading ? (
          <div className="text-center py-8">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Сообщений пока нет. Начните общение!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender.id === "self" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xl rounded-2xl px-4 py-3 ${msg.sender.id === "self" ? "bg-blue-600 text-white" : "bg-white border border-gray-200"}`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">
                      {msg.sender.name.charAt(0)}
                    </div>
                    <span className="font-semibold">{msg.sender.name}</span>
                    <span className="text-xs opacity-70">
                      {format(new Date(msg.createdAt), "dd.MM.yyyy HH:mm")}
                      {msg.isEdited && <span className="text-xs text-gray-500 ml-1">(изменено)</span>}
                    </span>
                    {msg.sender.id === "self" && (
                      <div className="flex items-center space-x-1">
                        {msg.readAt ? (
                          <span className="text-xs text-blue-500" title="Прочитано">
                            ✓✓
                          </span>
                        ) : msg.deliveredAt ? (
                          <span className="text-xs text-gray-500" title="Доставлено">
                            ✓
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300" title="Отправлено">
                            ↻
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {editingMessageId === msg.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <button
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditContent("");
                          }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleEdit(msg.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.isEncrypted && (
                    <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-2">
                      🔒 Зашифровано
                    </span>
                  )}
                  {msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm bg-gray-100 hover:bg-gray-200 rounded px-3 py-1"
                        >
                          <Paperclip className="h-3 w-3 mr-1" />
                          {att.name || "File"}
                        </a>
                      ))}
                    </div>
                  )}
                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(
                        msg.reactions.reduce((acc: Record<string, number>, reaction: any) => {
                          acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-1 flex items-center"
                          onClick={() => handleReaction(msg.id, emoji)}
                          title={`${count} reactions`}
                        >
                          <span>{emoji}</span>
                          <span className="ml-1 text-gray-600">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleReaction(msg.id, '👍')}
                        className="text-xs p-1 rounded-full hover:bg-gray-100"
                        title="Добавить реакцию"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleReaction(msg.id, '❤️')}
                        className="text-xs p-1 rounded-full hover:bg-gray-100"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={() => handleReaction(msg.id, '😂')}
                        className="text-xs p-1 rounded-full hover:bg-gray-100"
                      >
                        😂
                      </button>
                      <button
                        onClick={() => setReactionPickerFor(msg.id)}
                        className="text-xs p-1 rounded-full hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="text-xs flex items-center text-gray-500 hover:text-green-600"
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Ответить
                      </button>
                      <button
                        onClick={() => setForwardModal({ open: true, messageId: msg.id })}
                        className="text-xs flex items-center text-gray-500 hover:text-blue-600"
                      >
                        <Forward className="h-3 w-3 mr-1" />
                        Переслать
                      </button>
                      {msg.sender.id === "self" && Date.now() - new Date(msg.createdAt).getTime() < 5000 && (
                        <button
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditContent(msg.content);
                          }}
                          className="text-xs flex items-center text-gray-500 hover:text-yellow-600"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Редактировать
                        </button>
                      )}
                    </div>
                  </div>
                  {msg.replies && msg.replies.length > 0 && (
                    <div className="mt-3 ml-6 pl-4 border-l-2 border-gray-300 space-y-2">
                      {msg.replies.map((reply) => (
                        <div key={reply.id} className="text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                            <span className="font-medium">{reply.sender.name}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(reply.createdAt), "dd.MM.yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="mt-1">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        {showEmoji && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Прикрепленные файлы:</span>
              <button
                onClick={() => setAttachments([])}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Очистить все
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, index) => (
                <div
                  key={index}
                  className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2"
                >
                  <Paperclip className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm truncate max-w-xs">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {replyingTo && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Ответ на:</span>
              <span className="ml-2 text-gray-700">{replyingTo.content.substring(0, 50)}...</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-3 rounded-full hover:bg-gray-100"
          >
            <Smile className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={handleFileUploadClick}
            disabled={uploading}
            className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={handleFileUploadClick}
            disabled={uploading}
            className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <ImageIcon className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => {
              loadUsers();
              setBroadcastModal(true);
            }}
            className="p-3 rounded-full hover:bg-gray-100"
            title="Рассылка"
          >
            <Megaphone className="h-5 w-5 text-gray-600" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={replyingTo ? "Напишите ответ..." : "Введите сообщение..."}
            className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || uploading}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 flex justify-between">
          <span>Enter для отправки • @ для упоминания</span>
          <span>🔒 Доступно сквозное шифрование</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {/* Forward Modal */}
      {forwardModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Переслать сообщение</h3>
            <p className="text-sm text-gray-600 mb-4">
              Выберите чат или пользователя для пересылки
            </p>
            <input
              type="text"
              placeholder="ID целевого чата или пользователя"
              value={targetChatId}
              onChange={(e) => setTargetChatId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setForwardModal({ open: false })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (!forwardModal.messageId || !targetChatId) {
                    toast.error("Укажите целевой чат");
                    return;
                  }
                  try {
                    const res = await fetch("/api/messages/forward", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        messageId: forwardModal.messageId,
                        targetChatId: targetChatId,
                      }),
                    });
                    if (res.ok) {
                      toast.success("Сообщение переслано");
                      setForwardModal({ open: false });
                      setTargetChatId("");
                    } else {
                      toast.error("Ошибка пересылки");
                    }
                  } catch (error) {
                    toast.error("Ошибка пересылки");
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Переслать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {broadcastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Рассылка сообщения</h3>
            <p className="text-sm text-gray-600 mb-4">
              Выберите пользователей для рассылки текущего сообщения
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Сообщение:
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                rows={3}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Пользователи:
              </label>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {availableUsers.length === 0 ? (
                  <p className="text-gray-500">Загрузка...</p>
                ) : (
                  availableUsers.map((user) => (
                    <div key={user.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={broadcastUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBroadcastUsers([...broadcastUsers, user.id]);
                          } else {
                            setBroadcastUsers(
                              broadcastUsers.filter((id) => id !== user.id),
                            );
                          }
                        }}
                        className="mr-3"
                      />
                      <span>{user.name || user.email}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({user.role})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBroadcastModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleBroadcast}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Отправить рассылку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
