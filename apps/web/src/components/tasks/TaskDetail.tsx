"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Task } from "@/stores/taskStore";

interface ActivityEntry {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const { data } = await api.get<ActivityEntry[]>(
          `/tasks/${task.id}/activity`
        );
        setLogs(data);
      } catch {
        // Activity log is non-critical
      } finally {
        setLoadingLogs(false);
      }
    }
    loadActivity();
  }, [task.id]);

  function formatField(field: string | null) {
    if (!field) return "";
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase());
  }

  function formatValue(field: string | null, value: string | null) {
    if (value === null || value === "null") return "None";
    if (field === "status")
      return value.replace(/_/g, " ").toLowerCase();
    if (field === "dueDate")
      return new Date(value).toLocaleDateString();
    return value;
  }

  const isOverdue =
    task.dueDate &&
    task.status !== "DONE" &&
    new Date(task.dueDate) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md animate-slide-up overflow-y-auto border-l border-gray-800 bg-gray-950 p-6">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-bold text-gray-100">{task.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={task.status} />
              {isOverdue && (
                <span className="rounded bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400">
                  Overdue
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div className="space-y-4">
          {task.description && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Description
              </h3>
              <p className="text-sm text-gray-300">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Assignee
              </h3>
              <p className="text-sm text-gray-300">
                {task.assignee?.name ?? "Unassigned"}
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Due date
              </h3>
              <p className={`text-sm ${isOverdue ? "text-red-400" : "text-gray-300"}`}>
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No due date"}
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Created by
              </h3>
              <p className="text-sm text-gray-300">{task.creator.name}</p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Created
              </h3>
              <p className="text-sm text-gray-300">
                {new Date(task.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="mt-8">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Activity
          </h3>

          {loadingLogs ? (
            <div className="flex justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-600">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 border-l-2 border-gray-800 pl-3"
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">{log.user.name}</span>{" "}
                      {log.action === "created" && "created this task"}
                      {log.action === "deleted" && "deleted this task"}
                      {log.action === "updated" && log.field && (
                        <>
                          changed {formatField(log.field)} from{" "}
                          <span className="text-gray-500">
                            {formatValue(log.field, log.oldValue)}
                          </span>{" "}
                          to{" "}
                          <span className="text-brand-400">
                            {formatValue(log.field, log.newValue)}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    TODO: "bg-gray-700/60 text-gray-300",
    IN_PROGRESS: "bg-amber-900/40 text-amber-400",
    DONE: "bg-emerald-900/40 text-emerald-400",
  };

  const labels: Record<string, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Done",
  };

  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
