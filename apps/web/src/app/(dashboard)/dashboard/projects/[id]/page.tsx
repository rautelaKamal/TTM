"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

interface Member {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  joinedAt: string;
}

interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: Member[];
  taskSummary: TaskSummary;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  const loadProject = useCallback(async () => {
    try {
      const { data } = await api.get<Project>(`/projects/${params.id}`);
      setProject(data);
    } catch {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    setAdding(true);

    try {
      await api.post(`/projects/${params.id}/members`, { email: addEmail });
      setAddEmail("");
      await loadProject();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setAddError(axiosErr.response?.data?.error || "Failed to add member");
      } else {
        setAddError("Failed to add member");
      }
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(userId: string) {
    try {
      await api.delete(`/projects/${params.id}/members/${userId}`);
      await loadProject();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || "Failed to remove member");
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!project) return null;

  const { taskSummary } = project;
  const progress =
    taskSummary.total > 0
      ? Math.round((taskSummary.done / taskSummary.total) * 100)
      : 0;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-gray-400">{project.description}</p>
          )}
        </div>
        <Link
          href={`/dashboard/projects/${params.id}/board`}
          className="btn-primary"
        >
          Board view
        </Link>
      </div>

      {/* Task Summary */}
      <div className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Task summary
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <Stat label="Total" value={taskSummary.total} />
          <Stat label="To do" value={taskSummary.todo} color="text-gray-300" />
          <Stat label="In progress" value={taskSummary.inProgress} color="text-amber-400" />
          <Stat label="Done" value={taskSummary.done} color="text-emerald-400" />
        </div>
        {taskSummary.total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Members ({project.members.length})
        </h2>

        <ul className="space-y-2">
          {project.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">
                    {m.user.name}
                  </p>
                  <p className="text-xs text-gray-500">{m.user.email}</p>
                </div>
              </div>
              {isAdmin && m.userId !== session?.user?.id && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="text-xs text-gray-500 transition-colors hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {isAdmin && (
          <form onSubmit={addMember} className="mt-4 flex gap-2">
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="Add member by email"
              className="input flex-1"
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="btn-primary whitespace-nowrap"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </form>
        )}

        {addError && (
          <p className="mt-2 text-xs text-red-400">{addError}</p>
        )}
        {error && project && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "text-gray-100",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
