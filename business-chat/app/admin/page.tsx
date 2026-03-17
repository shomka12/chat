"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building, Users, FolderTree, Plus, Trash2, Edit, History, Download, Trash } from "lucide-react";
import { toast } from "sonner";

interface OrgNode {
  id: string;
  name: string;
  type: "department" | "team" | "channel";
  isActive?: boolean;
  children?: OrgNode[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tree, setTree] = useState<OrgNode[]>([
    {
      id: "1",
      name: "Компания",
      type: "department",
      children: [
        {
          id: "2",
          name: "Разработка",
          type: "department",
          children: [
            { id: "3", name: "Frontend", type: "team" },
            { id: "4", name: "Backend", type: "team" },
          ],
        },
        {
          id: "5",
          name: "Маркетинг",
          type: "department",
          children: [{ id: "6", name: "Контент", type: "team" }],
        },
      ],
    },
  ]);
  const [activeTab, setActiveTab] = useState<"hierarchy" | "users" | "history">(
    "hierarchy",
  );
  const [users, setUsers] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      session &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      toast.error("Доступ только для администраторов");
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setUserLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error("Не удалось загрузить пользователей");
    } finally {
      setUserLoading(false);
    }
  };

  const addUser = async () => {
    const email = prompt("Введите email нового пользователя:");
    if (!email) return;
    const name = prompt("Введите имя:");
    const password = prompt("Введите временный пароль:");
    if (!password) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      if (res.ok) {
        toast.success("Пользователь добавлен");
        fetchUsers();
      } else {
        toast.error("Ошибка добавления");
      }
    } catch (error) {
      toast.error("Ошибка добавления");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Удалить пользователя? Это действие нельзя отменить.")) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Пользователь удалён");
        fetchUsers();
      } else {
        toast.error("Ошибка удаления");
      }
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  };

  const addNode = (parentId: string, type: OrgNode["type"]) => {
    const name = prompt(
      `Введите название ${type === "department" ? "отдела" : "команды"}:`,
    );
    if (!name) return;

    const newNode: OrgNode = {
      id: Date.now().toString(),
      name,
      type,
    };

    const insert = (nodes: OrgNode[]): OrgNode[] => {
      return nodes.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...(node.children || []), newNode],
          };
        }
        if (node.children) {
          return { ...node, children: insert(node.children) };
        }
        return node;
      });
    };

    setTree(insert(tree));
    toast.success("Узел добавлен");
  };

  const deleteNode = (id: string) => {
    if (!confirm("Удалить этот узел и все подузлы?")) return;

    const remove = (nodes: OrgNode[]): OrgNode[] => {
      return nodes.filter((node) => {
        if (node.id === id) return false;
        if (node.children) {
          node.children = remove(node.children);
        }
        return true;
      });
    };

    setTree(remove(tree));
    toast.info("Узел удалён");
  };

  const editNode = (id: string) => {
    const newName = prompt("Введите новое название узла:");
    if (!newName) return;

    const update = (nodes: OrgNode[]): OrgNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    };

    setTree(update(tree));
    toast.success("Название обновлено");
  };

  const toggleActive = (id: string) => {
    const update = (nodes: OrgNode[]): OrgNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, isActive: !node.isActive };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    };

    setTree(update(tree));
    toast.info("Активность изменена");
  };

  const exportHistory = async () => {
    if (!confirm("Экспортировать всю историю сообщений в файл JSON?")) return;
    try {
      const res = await fetch("/api/admin/history/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `messages_export_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Экспорт завершён");
      } else {
        toast.error("Ошибка экспорта");
      }
    } catch (error) {
      toast.error("Ошибка экспорта");
    }
  };

  const clearHistory = async () => {
    if (!confirm("Очистить всю историю сообщений? Это действие необратимо.")) return;
    try {
      const res = await fetch("/api/admin/history/clear", {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("История очищена");
      } else {
        toast.error("Ошибка очистки");
      }
    } catch (error) {
      toast.error("Ошибка очистки");
    }
  };

  const renderTree = (nodes: OrgNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.id} className="ml-6 border-l border-gray-300 pl-4 py-2">
        <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            {node.type === "department" ? (
              <Building className="h-5 w-5 text-blue-600" />
            ) : (
              <Users className="h-5 w-5 text-green-600" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{node.name}</h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${node.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                >
                  {node.isActive !== false ? "Активен" : "Неактивен"}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {node.type === "department" ? "Отдел" : "Команда"} • ID:{" "}
                {node.id}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => toggleActive(node.id)}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              title="Переключить активность"
            >
              <input
                type="checkbox"
                checked={node.isActive !== false}
                readOnly
                className="h-4 w-4"
              />
            </button>
            <button
              onClick={() => editNode(node.id)}
              className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
              title="Редактировать название"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                addNode(
                  node.id,
                  node.type === "department" ? "team" : "channel",
                )
              }
              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              title="Добавить подразделение"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteNode(node.id)}
              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              title="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  if (status === "loading") {
    return <div className="p-8 text-center">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FolderTree className="mr-3 h-8 w-8" />
            Админ-панель
          </h1>
          <p className="text-gray-600 mt-2">
            Управление организацией, пользователями и настройками.
          </p>
          <div className="flex border-b border-gray-200 mt-6">
            <button
              className={`px-6 py-3 font-medium ${activeTab === "hierarchy" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("hierarchy")}
            >
              Иерархия
            </button>
            <button
              className={`px-6 py-3 font-medium ${activeTab === "users" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("users")}
            >
              Пользователи
            </button>
            <button
              className={`px-6 py-3 font-medium ${activeTab === "history" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("history")}
            >
              История
            </button>
          </div>
        </header>

        {activeTab === "hierarchy" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Дерево иерархии */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Дерево организации</h2>
                  <button
                    onClick={() => addNode("1", "department")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить отдел
                  </button>
                </div>
                <div className="mt-4">{renderTree(tree)}</div>
              </div>
            </div>

            {/* Панель управления */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-lg mb-4">Статистика</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between">
                    <span>Всего отделов</span>
                    <span className="font-bold">3</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Команд</span>
                    <span className="font-bold">5</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Пользователей</span>
                    <span className="font-bold">42</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Активных чатов</span>
                    <span className="font-bold">18</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-lg mb-4">Быстрые действия</h3>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Создать корпоративный чат
                  </button>
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Назначить администратора
                  </button>
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Экспорт структуры
                  </button>
                  <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Настройки видимости
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  Информация
                </h4>
                <p className="text-sm text-yellow-700">
                  Иерархия определяет доступы и видимость чатов. Изменения
                  влияют на всех пользователей.
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === "users" ? (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                Управление пользователями
              </h2>
              <button
                onClick={addUser}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить пользователя
              </button>
            </div>
            {userLoading ? (
              <div className="text-center py-8">Загрузка пользователей...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Пользователи не найдены
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left">ID</th>
                      <th className="p-3 text-left">Имя</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Отдел</th>
                      <th className="p-3 text-left">Роль</th>
                      <th className="p-3 text-left">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{user.id.substring(0, 8)}...</td>
                        <td className="p-3 font-medium">{user.name || "—"}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">{user.department || "—"}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${user.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">История сообщений</h2>
              <div className="flex space-x-4">
                <button
                  onClick={exportHistory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт истории
                </button>
                <button
                  onClick={clearHistory}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Очистить историю
                </button>
              </div>
            </div>
            <div className="text-gray-600 mb-4">
              Здесь вы можете управлять историей сообщений всей системы.
              Экспорт создаст файл JSON со всеми сообщениями. Очистка удалит все
              сообщения из базы данных (действие необратимо).
            </div>
            <div className="border border-gray-200 rounded-lg p-6 text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">История хранится на сервере</h3>
              <p className="text-gray-500">
                Все сообщения, файлы и реакции сохраняются в базе данных
                PostgreSQL. Вы можете экспортировать их для анализа или очистить
                для освобождения места.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">1,245</div>
                  <div className="text-sm text-gray-500">Сообщений</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">342</div>
                  <div className="text-sm text-gray-500">Файлов</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">89</div>
                  <div className="text-sm text-gray-500">Пользователей</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
