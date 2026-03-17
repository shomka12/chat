"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Save, Server, User, Key } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // Загружаем сохранённые настройки из localStorage
    const savedServerUrl = localStorage.getItem("chat_server_url") || "";
    const savedUsername = localStorage.getItem("chat_username") || "";
    setServerUrl(savedServerUrl);
    setUsername(savedUsername);
  }, []);

  const handleSave = () => {
    if (!serverUrl) {
      toast.error("Введите URL сервера");
      return;
    }
    setLoading(true);
    // Сохраняем в localStorage
    localStorage.setItem("chat_server_url", serverUrl);
    localStorage.setItem("chat_username", username);
    // Здесь можно также обновить глобальный конфиг API
    toast.success("Настройки сохранены");
    setTimeout(() => setLoading(false), 500);
  };

  const handleTestConnection = async () => {
    if (!serverUrl) {
      toast.error("Введите URL сервера");
      return;
    }
    try {
      const res = await fetch(`${serverUrl}/api/health`);
      if (res.ok) {
        toast.success("Соединение успешно");
      } else {
        toast.error("Сервер недоступен");
      }
    } catch (error) {
      toast.error("Ошибка соединения");
    }
  };

  if (status === "loading") {
    return <div className="p-8 text-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Server className="mr-3 h-8 w-8" />
            Настройки подключения
          </h1>
          <p className="text-gray-600 mt-2">
            Укажите адрес сервера и учётные данные для подключения к чату.
          </p>
        </header>

        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Server className="h-4 w-4 mr-2" />
              URL сервера
            </label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://ваш-сервер.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Базовый URL API вашего сервера чата.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Имя пользователя (логин)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center">
              <Key className="h-4 w-4 mr-2" />
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Пароль не сохраняется в открытом виде.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleTestConnection}
              className="px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center justify-center"
            >
              Проверить соединение
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Сохранение..." : "Сохранить настройки"}
            </button>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="font-semibold text-lg mb-3">Текущая сессия</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <span className="font-medium">Пользователь:</span>{" "}
                {session?.user?.name || "Не авторизован"}
              </p>
              <p>
                <span className="font-medium">Роль:</span>{" "}
                {session?.user?.role || "—"}
              </p>
              <p>
                <span className="font-medium">Текущий сервер API:</span>{" "}
                {typeof window !== "undefined"
                  ? localStorage.getItem("chat_server_url") || "не задан"
                  : "не задан"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h4 className="font-semibold text-yellow-800 mb-2">Информация</h4>
          <p className="text-sm text-yellow-700">
            Настройки подключения сохраняются локально в вашем браузере. При
            смене сервера потребуется перезагрузка страницы. Убедитесь, что
            сервер поддерживает CORS и доступен из вашей сети.
          </p>
        </div>
      </div>
    </div>
  );
}