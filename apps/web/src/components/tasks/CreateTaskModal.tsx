"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useTaskStore } from "@/stores/taskStore";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Member {
  userId: string;
  user: { id: string; name: string; email: string };
}

interface CreateTaskModalProps {
  projectId: string;
  onClose: () => void;
}

export function CreateTaskModal({
  projectId,
  onClose,
}: CreateTaskModalProps) {
  const { addTask } = useTaskStore();
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "TODO" },
  });

  useEffect(() => {
    async function loadMembers() {
      try {
        const { data } = await api.get(`/projects/${projectId}`);
        setMembers(data.members);
      } catch {
        // Members list is non-critical for task creation
      }
    }
    loadMembers();
  }, [projectId]);

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
      };

      if (data.dueDate) {
        payload.dueDate = new Date(data.dueDate).toISOString();
      }
      if (data.assigneeId) {
        payload.assigneeId = data.assigneeId;
      }

      const { data: task } = await api.post(
        `/projects/${projectId}/tasks`,
        payload
      );
      addTask(task);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || "Failed to create task");
      } else {
        setError("Failed to create task");
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg animate-fade-in rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-bold">New task</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="task-title"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Title
            </label>
            <input
              id="task-title"
              className="input"
              placeholder="What needs to be done?"
              {...register("title")}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Description{" "}
              <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              id="task-description"
              rows={3}
              className="input resize-none"
              placeholder="Add details..."
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-status"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Status
              </label>
              <select
                id="task-status"
                className="input"
                {...register("status")}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-due"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                className="input"
                {...register("dueDate")}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="task-assignee"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Assignee
            </label>
            <select
              id="task-assignee"
              className="input"
              {...register("assigneeId")}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? "Creating…" : "Create task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
